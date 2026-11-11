import type {Book} from '../../lib/storybook/books';
import {planStorybook} from '../../lib/storybook/book-layout';
import {storyQualityProfile} from '../../lib/storybook/quality';
import {jpegPdf,type PdfImagePage} from '../../lib/storybook/book-pdf';

// 화면의 펼침면(StoryBookSpreads)과 같은 배치로 쪽을 그립니다.
// 펼침면 1쪽 = 가로 12인치 × 세로 8인치, 표지 = 8 × 12인치. 2400px 폭이면 인쇄해도 200dpi입니다.
const spreadSize={width:2400,height:1600,pt:{width:864,height:576}};
const coverSize={width:1200,height:1800,pt:{width:576,height:864}};
const paper='#fff9ee',ink='#3b2f22',folio='#9f8d73';
const quality=0.88;

type Art=CanvasImageSource&{width:number;height:number};
export type LoadArt=(index:number)=>Promise<Blob|null>;

function fontFamily(){
  try{return getComputedStyle(document.body).fontFamily||'sans-serif';}catch{return 'sans-serif';}
}

async function decode(blob:Blob|null):Promise<Art|null>{
  if(!blob)return null;
  const url=URL.createObjectURL(blob);
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    return image;
  }finally{URL.revokeObjectURL(url);}
}

function canvasOf(width:number,height:number){
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  if(!context)throw Error('이 브라우저에서는 PDF를 만들 수 없어요.');
  context.fillStyle=paper;context.fillRect(0,0,width,height);
  context.textBaseline='top';
  return {canvas,context};
}

/** 상자를 꽉 채우되 그림 비율은 지키고 넘치는 부분만 자릅니다(CSS object-fit: cover). */
function drawCover(context:CanvasRenderingContext2D,art:Art,x:number,y:number,width:number,height:number){
  const scale=Math.max(width/art.width,height/art.height);
  const sw=width/scale,sh=height/scale;
  context.drawImage(art,(art.width-sw)/2,(art.height-sh)/2,sw,sh,x,y,width,height);
}
/** 그림 전체가 보이게 상자 안에 넣습니다(CSS object-fit: contain). */
function drawContain(context:CanvasRenderingContext2D,art:Art,x:number,y:number,width:number,height:number){
  const scale=Math.min(width/art.width,height/art.height);
  const w=art.width*scale,h=art.height*scale;
  context.drawImage(art,x+(width-w)/2,y+(height-h)/2,w,h);
}

/** 한국어는 어절 단위로 줄을 바꿉니다(word-break: keep-all). 한 어절이 너무 길 때만 글자 단위로 나눕니다. */
export function wrapText(measure:(text:string)=>number,text:string,width:number){
  const lines:string[]=[];
  for(const raw of text.split('\n')){
    let line='';
    for(const token of raw.match(/\S+\s*/g)||['']){
      if(measure((line+token).trimEnd())<=width){line+=token;continue;}
      if(line.trim())lines.push(line.trimEnd());
      line='';
      let piece=Array.from(token);
      while(piece.length&&measure(piece.join('').trimEnd())>width){
        let cut=1;
        while(cut<piece.length&&measure(piece.slice(0,cut+1).join(''))<=width)cut++;
        lines.push(piece.slice(0,cut).join(''));
        piece=piece.slice(cut);
      }
      line=piece.join('');
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** 문단들을 상자 안에 그립니다. 넘치면 글씨를 조금씩 줄입니다. */
function drawParagraphs(context:CanvasRenderingContext2D,paragraphs:string[],x:number,y:number,width:number,height:number,family:string,{size=50,min=24,align='left' as CanvasTextAlign,weight='400',color=ink,middle=false}={}){
  for(let fontSize=size;;fontSize-=2){
    context.font=weight+' '+fontSize+'px '+family;
    const lineHeight=fontSize*1.75,gap=fontSize*0.7;
    const blocks=paragraphs.map(text=>wrapText(value=>context.measureText(value).width,text,width));
    const total=blocks.reduce((sum,lines)=>sum+lines.length*lineHeight,0)+gap*Math.max(0,blocks.length-1);
    if(total<=height||fontSize<=min){
      context.fillStyle=color;context.textAlign=align;
      const left=align==='center'?x+width/2:x;
      // 글이 적은 쪽은 글 영역의 세로 가운데에 둡니다.
      let top=y+(fontSize*0.375)+(middle?Math.max(0,(height-total)/2):0);
      for(const lines of blocks){
        for(const line of lines){context.fillText(line,left,top);top+=lineHeight;}
        top+=gap;
      }
      context.textAlign='left';
      return;
    }
  }
}

function drawFolio(context:CanvasRenderingContext2D,text:string,centerX:number,y:number,family:string){
  context.font='400 26px '+family;context.fillStyle=folio;context.textAlign='center';
  context.fillText(text,centerX,y);context.textAlign='left';
}

/** 그림과 글이 맞닿는 곳을 화면처럼 종이색으로 부드럽게 이어 줍니다. */
function fadeEdge(context:CanvasRenderingContext2D,x:number,y:number,width:number,towardTop:boolean){
  const size=56;
  const top=towardTop?y:y-size;
  const gradient=context.createLinearGradient(0,top,0,top+size);
  gradient.addColorStop(towardTop?0:1,paper);
  gradient.addColorStop(towardTop?1:0,'rgba(255,249,238,0)');
  context.fillStyle=gradient;context.fillRect(x,top,width,size);
}

async function toPage(canvas:HTMLCanvasElement,pt:{width:number;height:number}):Promise<PdfImagePage>{
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(!blob)throw Error('PDF 쪽을 만들지 못했어요. 브라우저 메모리가 부족할 수 있어요.');
  const page={jpeg:new Uint8Array(await blob.arrayBuffer()),pixelWidth:canvas.width,pixelHeight:canvas.height,...pt};
  canvas.width=0;canvas.height=0;
  return page;
}

function drawCoverPage(art:Art|null,title:string,family:string){
  const {width,height}=coverSize;
  const {canvas,context}=canvasOf(width,height);
  if(art)drawCover(context,art,0,0,width,height);
  const band=height*0.34;
  const gradient=context.createLinearGradient(0,height-band,0,height);
  gradient.addColorStop(0,'rgba(255,249,238,0)');
  gradient.addColorStop(0.35,'rgba(255,249,238,0.9)');
  gradient.addColorStop(1,'rgba(255,249,238,0.96)');
  context.fillStyle=gradient;context.fillRect(0,height-band,width,band);
  drawParagraphs(context,['낭만한줄 · 나만의 동화'],80,height-330,width-160,50,family,{size:30,min:20,align:'center',color:folio});
  drawParagraphs(context,[title],80,height-262,width-160,200,family,{size:76,min:40,align:'center',weight:'700'});
  return canvas;
}

export async function storyPdf(book:Book,loadArt:LoadArt,onProgress?:(done:number,total:number)=>void):Promise<Blob>{
  if(typeof document!=='undefined'&&document.fonts?.ready)await document.fonts.ready;
  const family=fontFamily();
  const pages:PdfImagePage[]=[];
  const spreads=book.qualityProfile===storyQualityProfile?planStorybook(book):null;
  const total=1+(spreads?spreads.spreads.length:book.chapters.length);
  onProgress?.(0,total);
  pages.push(await toPage(drawCoverPage(await decode(await loadArt(0)),book.title,family),coverSize.pt));
  onProgress?.(1,total);
  const {width:W,height:H}=spreadSize;
  const half=W/2,pad=110;
  if(spreads){
    const {pages:textPages}=spreads;
    for(const [index,spread] of spreads.spreads.entries()){
      const {canvas,context}=canvasOf(W,H);
      const arts=await Promise.all(spread.artIndices.map(async art=>decode(await loadArt(art))));
      const textOf=(page:number)=>textPages[page].parts.map(part=>part.text);
      if(spread.shared){
        // 화면과 같이 홀수 번째 펼침면은 그림이 위, 짝수 번째는 아래에 옵니다.
        const artFirst=index%2===1,artH=W/3;
        const artY=artFirst?0:H-artH,textY=artFirst?artH:0,textH=H-artH;
        if(arts[0]){drawCover(context,arts[0],0,artY,W,artH);fadeEdge(context,0,artFirst?artH:artY,W,!artFirst);}
        spread.pageIndices.forEach((page,column)=>{
          drawParagraphs(context,textOf(page),column*half+pad,textY+80,half-pad*2,textH-80-110,family,{middle:true});
          drawFolio(context,String(page+1),column*half+half/2,textY+textH-56,family);
        });
      }else{
        // 쪽마다 따로 그린 장면: 위에 그림, 아래에 글.
        const artH=half*2/3;
        spread.pageIndices.forEach((page,column)=>{
          const art=arts[column],x=column*half;
          if(art)drawContain(context,art,x+40,40,half-80,artH-40);
          drawParagraphs(context,textOf(page),x+pad,artH+60,half-pad*2,H-artH-60-110,family,{middle:true});
          drawFolio(context,String(page+1),x+half/2,H-56,family);
        });
        if(spread.pageIndices.length===1){
          drawParagraphs(context,['끝'],half+pad,H/2-140,half-pad*2,120,family,{size:96,min:60,align:'center',weight:'700'});
          drawParagraphs(context,[book.title],half+pad,H/2+10,half-pad*2,200,family,{size:40,min:26,align:'center',color:folio});
        }
      }
      pages.push(await toPage(canvas,spreadSize.pt));
      onProgress?.(pages.length,total);
    }
  }else{
    // 예전 형식(장마다 그림 1장) 동화: 왼쪽 그림, 오른쪽 글.
    for(const [index,chapter] of book.chapters.entries()){
      const {canvas,context}=canvasOf(W,H);
      const art=await decode(await loadArt(index+1));
      if(art)drawContain(context,art,60,60,half-120,H-120);
      const x=art?half+pad/2:pad,width=art?half-pad*1.5:W-pad*2;
      drawParagraphs(context,[chapter.title],x,90,width,120,family,{size:54,min:32,weight:'700'});
      drawParagraphs(context,chapter.text.split(/\n\s*\n/),x,240,width,H-240-120,family,{size:40,min:20});
      drawFolio(context,String(index+1),W/2,H-56,family);
      pages.push(await toPage(canvas,spreadSize.pt));
      onProgress?.(pages.length,total);
    }
  }
  return new Blob([jpegPdf(pages,book.title)],{type:'application/pdf'});
}

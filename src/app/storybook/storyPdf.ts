import type {Book} from '../../lib/storybook/books';
import {planStorybook} from '../../lib/storybook/book-layout';
import {storyQualityProfile} from '../../lib/storybook/quality';
import {needsSafeStoryFont,safeStoryFont,validStoryUnicode} from '../../lib/storybook/story-font';
import {jpegPdf,type PdfImagePage} from '../../lib/storybook/book-pdf';
import {emphasizePages,type EmphasisPiece} from '../../lib/storybook/emphasis';

// 화면의 펼침면(StoryBookSpreads)과 같은 배치로 쪽을 그립니다.
// 32쪽 동화의 펼침면 = 가로 12인치 × 세로 6인치(아래 2/3는 3:1 삽화, 위는 글), 표지 = 8 × 12인치.
// 예전 형식(장마다 그림 1장) 동화의 쪽 = 12 × 8인치. 2400px 폭이면 인쇄해도 200dpi입니다.
const spreadSize={width:2400,height:1600,pt:{width:864,height:576}};
const bookSpreadSize={width:2400,height:1200,pt:{width:864,height:432}};
const coverSize={width:1200,height:1800,pt:{width:576,height:864}};
const paper='#fff9ee',ink='#3b2f22',folio='#9f8d73';
const quality=0.88;

type Art=CanvasImageSource&{width:number;height:number};
export type LoadArt=(index:number)=>Promise<Blob|null>;

/** 화면 본문과 같은 손글씨 글꼴(layout.tsx의 --font-story-hand). 없으면 기본 글꼴을 씁니다. */
function handFamily(fallback:string){
  try{
    const name=getComputedStyle(document.documentElement).getPropertyValue('--font-story-hand').trim();
    return name?name+', '+fallback:fallback;
  }catch{return fallback;}
}
/** 한글 손글씨 글꼴은 글자 묶음별로 나뉘어 있어, 쓸 글자를 미리 받아 둬야 캔버스에 그 글꼴로 그려집니다. */
async function loadGlyphs(family:string,text:string,weight=700){
  try{
    if(!document.fonts?.load)throw Error('Font loading unavailable');
    for(let at=0;at<text.length;at+=4000){const part=text.slice(at,at+4000);const faces=await document.fonts.load(weight+' 48px '+family,part);if(!faces.length||!document.fonts.check(weight+' 48px '+family,part))throw Error('Story font unavailable');}
  }catch{throw Error('동화 글꼴을 불러오지 못했어요. 연결을 확인하고 PDF를 다시 받아 주세요.');}
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
  context.save();
  context.shadowBlur=0;context.textBaseline='middle';context.font='700 32px '+family;context.textAlign='center';
  const width=Math.max(76,context.measureText(text).width+36);
  context.fillStyle='#fff9ee';context.fillRect(centerX-width/2,y-8,width,46);
  context.strokeStyle='#b9a381';context.lineWidth=2;context.strokeRect(centerX-width/2,y-8,width,46);
  context.fillStyle='#463522';context.fillText(text,centerX,y+15);context.restore();
}

const emphasisStyle:Record<EmphasisPiece['kind'],{scale:number;color:string;spacing:number}>={
  plain:{scale:1,color:'#2a2017',spacing:-0.02},
  speech:{scale:1.22,color:'#4a2410',spacing:-0.02},
  sound:{scale:1.38,color:'#b0461f',spacing:0.04},
};
type RichToken={text:string;kind:EmphasisPiece['kind']};
type SpacedContext=CanvasRenderingContext2D&{letterSpacing?:string};

/** 강조(대사·흉내말)마다 크기와 색이 다른 글을 어절 단위로 줄 바꿈해 그립니다. 넘치면 글씨를 조금씩 줄입니다. */
function drawRich(context:SpacedContext,paragraphs:EmphasisPiece[][],x:number,y:number,width:number,height:number,family:string,{size=56,min=30}={}){
  const setFont=(kind:RichToken['kind'],fontSize:number)=>{
    const style=emphasisStyle[kind],px=fontSize*style.scale;
    context.font='700 '+Math.round(px)+'px '+family;
    if('letterSpacing' in context)context.letterSpacing=(style.spacing*px).toFixed(1)+'px';
  };
  const measure=(token:RichToken,fontSize:number)=>{setFont(token.kind,fontSize);return context.measureText(token.text).width;};
  for(let fontSize=size;;fontSize-=2){
    type Line={tokens:RichToken[];height:number;gap:number};
    const lines:Line[]=[];
    const heightOf=(tokens:RichToken[])=>Math.max(fontSize,...tokens.map(token=>fontSize*emphasisStyle[token.kind].scale))*1.6;
    for(const pieces of paragraphs){
      let line:RichToken[]=[],lineWidth=0;
      const flush=()=>{if(line.length)lines.push({tokens:line,height:heightOf(line),gap:0});line=[];lineWidth=0;};
      const words:RichToken[]=pieces.flatMap(piece=>(piece.text.match(/\S+\s*|\s+/g)||[]).map(text=>({text,kind:piece.kind})));
      for(const word of words){
        const w=measure({text:word.text.trimEnd(),kind:word.kind},fontSize);
        if(line.length&&lineWidth+w>width)flush();
        if(!line.length&&w>width){
          // 한 어절이 한 줄보다 길 때만 글자 단위로 나눕니다.
          let rest=Array.from(word.text);
          while(rest.length){
            let cut=1;
            while(cut<rest.length&&measure({text:rest.slice(0,cut+1).join(''),kind:word.kind},fontSize)<=width)cut++;
            line.push({text:rest.slice(0,cut).join(''),kind:word.kind});
            rest=rest.slice(cut);
            if(rest.length)flush();
          }
          lineWidth=measure(line[line.length-1],fontSize);
          continue;
        }
        line.push(word);lineWidth+=measure(word,fontSize);
      }
      flush();
      if(lines.length)lines[lines.length-1].gap=fontSize*0.55;
    }
    if(lines.length)lines[lines.length-1].gap=0;
    const total=lines.reduce((sum,line)=>sum+line.height+line.gap,0);
    if(total<=height||fontSize<=min){
      let top=y;
      context.textBaseline='alphabetic';
      for(const line of lines){
        const base=top+line.height*0.76;
        let left=x;
        line.tokens.forEach((token,index)=>{
          const text=index===line.tokens.length-1?token.text.trimEnd():token.text;
          setFont(token.kind,fontSize);
          context.fillStyle=emphasisStyle[token.kind].color;
          // 흐린 그림 위에서도 읽히게 종이색으로 번진 테두리를 먼저 깔고 글씨를 씁니다(화면의 text-shadow).
          context.shadowColor=paper;context.shadowBlur=fontSize*0.7;
          context.fillText(text,left,base);context.fillText(text,left,base);
          context.shadowBlur=0;
          context.fillText(text,left,base);
          left+=context.measureText(token.text).width;
        });
        top+=line.height+line.gap;
      }
      context.textBaseline='top';
      if('letterSpacing' in context)context.letterSpacing='0px';
      return;
    }
  }
}

/** 그림을 아주 작게 줄였다 키워 흐리게 만든 뒤 상자를 채웁니다(화면의 흐린 하늘 배경). 브라우저마다 결과가 같습니다. */
function drawBlurred(context:CanvasRenderingContext2D,art:Art,x:number,y:number,width:number,height:number){
  const small=document.createElement('canvas');
  small.width=Math.max(8,Math.round(width/60));small.height=Math.max(8,Math.round(height/60));
  const tiny=small.getContext('2d');
  if(!tiny)return;
  drawCover(tiny,art,0,0,small.width,small.height);
  context.save();
  context.beginPath();context.rect(x,y,width,height);context.clip();
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.drawImage(small,x-width*0.1,y-height*0.1,width*1.2,height*1.2);
  context.restore();
}

/** 삽화의 위쪽 가장자리를 흐린 배경으로 부드럽게 이어 그립니다. */
function drawFadedArt(context:CanvasRenderingContext2D,art:Art,x:number,y:number,width:number,height:number,fade:number){
  const layer=document.createElement('canvas');
  layer.width=Math.round(width);layer.height=Math.round(height);
  const own=layer.getContext('2d');
  if(!own){drawCover(context,art,x,y,width,height);return;}
  if(width/height>2.5&&art.width/art.height<2.5)drawContain(own,art,0,0,layer.width,layer.height);else drawCover(own,art,0,0,layer.width,layer.height);
  own.globalCompositeOperation='destination-in';
  const mask=own.createLinearGradient(0,0,0,fade);
  mask.addColorStop(0,'rgba(0,0,0,0)');mask.addColorStop(1,'rgba(0,0,0,1)');
  // destination-in은 칠한 곳 밖을 모두 지우므로 그림 전체를 칠합니다(fade 아래는 마지막 색, 즉 불투명).
  own.fillStyle=mask;own.fillRect(0,0,layer.width,layer.height);
  context.drawImage(layer,x,y);
  layer.width=0;layer.height=0;
}

/** 32쪽 동화의 펼침면: 그림이 종이 전체를 채우고 글은 위쪽 흐린 하늘에 놓입니다(화면과 같은 배치). */
function drawBookSpread(context:CanvasRenderingContext2D,arts:(Art|null)[],shared:boolean,pages:{number:number;pieces:EmphasisPiece[][]}[],hand:string,family:string){
  const {width:W,height:H}=bookSpreadSize;
  const half=W/2,artH=W/3,artY=H-artH,fade=Math.round(artH*0.16);
  const slots=shared?[{art:arts[0],x:0,width:W}]:arts.map((art,index)=>({art,x:index*half,width:half}));
  for(const slot of slots)if(slot.art)drawBlurred(context,slot.art,slot.x,0,slot.width,H);
  const wash=context.createLinearGradient(0,0,0,H);
  wash.addColorStop(0,'rgba(255,249,238,0.8)');wash.addColorStop(0.35,'rgba(255,249,238,0.6)');wash.addColorStop(0.6,'rgba(255,249,238,0)');
  context.fillStyle=wash;context.fillRect(0,0,W,H);
  for(const slot of slots)if(slot.art)drawFadedArt(context,slot.art,slot.x,artY,slot.width,artH,fade);
  const fold=context.createLinearGradient(half-36,0,half+36,0);
  fold.addColorStop(0,'rgba(59,47,34,0)');fold.addColorStop(0.5,'rgba(59,47,34,0.13)');fold.addColorStop(1,'rgba(59,47,34,0)');
  context.fillStyle=fold;context.fillRect(half-36,0,72,H);
  const padX=120,padY=80;
  pages.forEach((page,column)=>{
    // 글이 길면 삽화의 흐린 윗부분까지 내려올 수 있습니다(화면도 같음).
    drawRich(context,page.pieces,column*half+padX,padY,half-padX*2,artY+fade*2-padY,hand);
    context.save();context.shadowColor=paper;context.shadowBlur=12;
    drawFolio(context,String(page.number),column*half+half/2,H-46,family);
    context.restore();
  });
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
  const text=book.title+book.chapters.map(chapter=>chapter.title+chapter.text).join('');
  if(!validStoryUnicode(text))throw Error('동화에 손상된 문자가 있어요. 글을 확인한 뒤 PDF를 받아 주세요.');
  // Use one complete Korean font for the whole book, rather than mixing an
  // unsupported syllable (such as 렜) into the middle of handwriting.
  const safe=needsSafeStoryFont(text);
  const family=safeStoryFont;
  await loadGlyphs(family,text+'0123456789 끝');
  await loadGlyphs(family,text+'0123456789',400);
  const pages:PdfImagePage[]=[];
  const spreads=book.qualityProfile===storyQualityProfile?planStorybook(book):null;
  const total=2+(spreads?spreads.spreads.length:book.chapters.length);
  onProgress?.(0,total);
  pages.push(await toPage(drawCoverPage(await decode(await loadArt(0)),book.title,family),coverSize.pt));
  onProgress?.(1,total);
  const {width:W,height:H}=spreadSize;
  const half=W/2,pad=110;
  if(spreads){
    const {pages:textPages}=spreads;
    const hand=safe?safeStoryFont:handFamily(family);
    const marked=emphasizePages(textPages);
    await loadGlyphs(hand,textPages.flatMap(page=>page.parts.map(part=>part.text)).join('')+'0123456789 끝');
    for(const spread of spreads.spreads){
      const {canvas,context}=canvasOf(bookSpreadSize.width,bookSpreadSize.height);
      const arts=await Promise.all(spread.artIndices.map(async art=>decode(await loadArt(art))));
      drawBookSpread(context,arts,spread.shared,spread.pageIndices.map(page=>({number:page+1,pieces:marked[page]})),hand,family);
      pages.push(await toPage(canvas,bookSpreadSize.pt));
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
  const {canvas:endingCanvas,context:endingContext}=canvasOf(bookSpreadSize.width,bookSpreadSize.height);
  drawParagraphs(endingContext,['끝'],200,370,2000,190,family,{size:120,min:70,align:'center',weight:'700'});
  drawParagraphs(endingContext,[book.title],200,600,2000,180,family,{size:44,min:28,align:'center'});
  pages.push(await toPage(endingCanvas,bookSpreadSize.pt));onProgress?.(pages.length,total);
  return new Blob([jpegPdf(pages,book.title)],{type:'application/pdf'});
}

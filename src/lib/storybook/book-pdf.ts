/**
 * 그림(JPEG)으로 그린 쪽들을 한 PDF 파일로 묶습니다.
 * 쪽마다 JPEG 한 장을 종이 전체에 깔기 때문에 글꼴을 PDF에 넣을 필요가 없고, 외부 라이브러리도 쓰지 않습니다.
 * 고객 브라우저에서 바로 만들므로 서버 비용과 AI 호출이 없습니다.
 */
export type PdfImagePage={
  /** 3색(RGB) baseline JPEG. 브라우저 canvas.toBlob('image/jpeg') 결과 그대로. */
  jpeg:Uint8Array;
  pixelWidth:number;
  pixelHeight:number;
  /** 종이 크기(pt, 1/72인치) */
  width:number;
  height:number;
};

const number=(value:number)=>String(Math.round(value*100)/100);

function utf16Hex(text:string){
  let hex='FEFF';
  for(let index=0;index<text.length;index++)hex+=text.charCodeAt(index).toString(16).toUpperCase().padStart(4,'0');
  return '<'+hex+'>';
}

export function jpegPdf(pages:PdfImagePage[],title=''):Uint8Array<ArrayBuffer>{
  if(!pages.length)throw Error('PDF에 넣을 쪽이 없습니다.');
  const encoder=new TextEncoder();
  const chunks:Uint8Array[]=[];
  const offsets:number[]=[];
  let length=0;
  const push=(data:Uint8Array|string)=>{const bytes=typeof data==='string'?encoder.encode(data):data;chunks.push(bytes);length+=bytes.length;};
  const object=(id:number,...body:(Uint8Array|string)[])=>{offsets[id]=length;push(id+' 0 obj\n');body.forEach(push);push('\nendobj\n');};
  push('%PDF-1.4\n');
  push(new Uint8Array([0x25,0xE2,0xE3,0xCF,0xD3,0x0A]));
  const pageId=(index:number)=>4+index*3;
  object(1,'<</Type/Catalog/Pages 2 0 R>>');
  object(2,'<</Type/Pages/Kids['+pages.map((_,index)=>pageId(index)+' 0 R').join(' ')+']/Count '+pages.length+'>>');
  object(3,'<</Title '+utf16Hex(title.slice(0,200))+'/Producer (Nangman Hanjul)>>');
  pages.forEach((page,index)=>{
    const id=pageId(index);
    if(!(page.pixelWidth>0&&page.pixelHeight>0&&page.width>0&&page.height>0))throw Error('PDF 쪽 크기가 올바르지 않습니다.');
    if(page.jpeg[0]!==0xFF||page.jpeg[1]!==0xD8)throw Error('PDF 쪽 그림이 JPEG가 아닙니다.');
    object(id,'<</Type/Page/Parent 2 0 R/MediaBox[0 0 '+number(page.width)+' '+number(page.height)+']/Resources<</XObject<</Im0 '+(id+2)+' 0 R>>>>/Contents '+(id+1)+' 0 R>>');
    const draw='q '+number(page.width)+' 0 0 '+number(page.height)+' 0 0 cm /Im0 Do Q';
    object(id+1,'<</Length '+encoder.encode(draw).length+'>>\nstream\n',draw,'\nendstream');
    object(id+2,'<</Type/XObject/Subtype/Image/Width '+page.pixelWidth+'/Height '+page.pixelHeight+'/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length '+page.jpeg.length+'>>\nstream\n',page.jpeg,'\nendstream');
  });
  const size=pageId(pages.length);
  const xref=length;
  push('xref\n0 '+size+'\n0000000000 65535 f \n');
  for(let id=1;id<size;id++)push(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
  push('trailer\n<</Size '+size+'/Root 1 0 R/Info 3 0 R>>\nstartxref\n'+xref+'\n%%EOF\n');
  const out=new Uint8Array(length);
  let at=0;
  for(const chunk of chunks){out.set(chunk,at);at+=chunk.length;}
  return out;
}

/** 내려받을 파일 이름. 운영체제가 막는 문자는 뺍니다. */
export function pdfFileName(title:string){
  const clean=title.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,60);
  return (clean||'나의 동화')+'.pdf';
}

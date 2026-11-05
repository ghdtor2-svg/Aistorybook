'use client';
/**
 * 받은 그림을 보관할 수 있는 크기로 줄입니다.
 *
 * 왜 필요한가: 그림 API 가 돌려주는 1024px PNG 은 base64 로 1.5MB 안팎입니다.
 * 브라우저 저장소는 통틀어 5MB 쯤이고 책장이 그 절반을 쓸 수 있습니다.
 * 받은 그대로 넣으면 동화 한 권의 삽화만으로 저장소가 찹니다. 줄여야 합니다.
 *
 * 512px WebP 로 줄이면 40~90KB 가 됩니다. 화면에서 읽는 크기(최대 760px 폭의
 * 본문 안)에서는 차이를 느끼기 어렵습니다. WebP 를 못 만드는 기기에서는
 * JPEG 로 떨어집니다(둘 다 실패하면 그림을 버립니다 — 글은 그대로입니다).
 *
 * 그림은 바깥으로 나가지 않습니다. 줄이는 일도 모두 이 브라우저 안에서 합니다.
 */
export const SHRINK_MAX_EDGE=512;
export const SHRINK_QUALITY=0.72;

/** 캔버스가 이 형식을 실제로 만들 수 있는지 확인한다. 선언만 보고 믿지 않는다. */
function canMake(canvas:HTMLCanvasElement,type:string){
 try{return canvas.toDataURL(type,SHRINK_QUALITY).startsWith('data:'+type);}catch{return false;}
}

export function shrinkImage(dataUrl:string,maxEdge=SHRINK_MAX_EDGE):Promise<string>{
 return new Promise((resolve,reject)=>{
  const image=new Image();
  // 데이터 URL 이라 바깥 요청이 없습니다. 그래도 교차 출처 오염을 막아 둡니다.
  image.decoding='async';
  image.onload=()=>{
   try{
    const scale=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight));
    const width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');
    if(!context){reject(Error('이 브라우저에서는 그림을 보관할 수 있는 크기로 줄이지 못했습니다.'));return;}
    context.drawImage(image,0,0,width,height);
    const type=canMake(canvas,'image/webp')?'image/webp':'image/jpeg';
    const out=canvas.toDataURL(type,SHRINK_QUALITY);
    if(!out.startsWith('data:image/')){reject(Error('그림을 보관할 수 있는 형식으로 바꾸지 못했습니다.'));return;}
    resolve(out);
   }catch{reject(Error('그림을 줄이는 중에 문제가 생겼습니다. 동화 글은 그대로입니다.'));}
  };
  image.onerror=()=>reject(Error('받은 그림을 열지 못했습니다. 동화 글은 그대로입니다.'));
  image.src=dataUrl;
 });
}

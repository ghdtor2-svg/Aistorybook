/**
 * 동화 삽화 보관 — 그림만 따로 두는 서랍.
 *
 * ── 왜 책장(ai-office:books:v1)에 같이 넣지 않았나 ───────────────────
 * 그림은 글보다 수백 배 큽니다. 책장은 글 기준으로 1,000권까지 받도록
 * 만들어져 있고 5MB 에서 거부합니다. 그림을 책장에 섞으면 동화 두세 권
 * 만에 그 한도를 넘고, 그 순간 parseBooks 가 책장 전체를 열지 못합니다.
 * 그림 때문에 글까지 잃습니다. 그래서 서랍을 따로 둡니다.
 *
 * 서랍이 가득 차거나 깨져도 동화는 그대로 읽힙니다. 그림은 읽는 데
 * 필요한 것이 아니라 더해지는 것입니다. 이 파일의 모든 결정이 그 전제를
 * 따릅니다 — 막히면 그림을 버리고 글을 지킵니다.
 *
 * ── 자리가 모자랄 때 ────────────────────────────────────────────────
 * 오래된 동화의 그림부터 통째로 버립니다. 한 권의 그림을 일부만 남기면
 * 중간 장만 그림이 있는 이상한 책이 됩니다. 버릴 때는 권 단위로 버립니다.
 * 글은 책장에 그대로 있으므로 그림만 사라지고 동화는 남습니다.
 */
export const IMAGE_STORE_KEY='ai-office:book-images:v1';
export const IMAGE_STORE_LOCK='ai-office:book-images:v1';
/** 서랍 전체 한도. localStorage 는 보통 5MB 이고 책장이 그 절반을 쓸 수 있습니다. */
export const IMAGE_STORE_LIMIT=2_500_000;
/** 그림 한 장 한도. 화면에서 줄여서 넣으므로 이보다 커지면 줄이기가 실패한 것입니다. */
export const IMAGE_MAX_LENGTH=400_000;
/** 한 권에 담을 수 있는 그림 수. 장 수 상한(8)과 맞춥니다. */
export const IMAGE_PER_BOOK=8;

export type BookImage={bookId:string;chapter:number;dataUrl:string;createdAt:string};
export type ImageStore={version:1;images:BookImage[]};

export const emptyImageStore=():ImageStore=>({version:1,images:[]});

/** 화면에서 만든 그림만 받습니다. 바깥 주소를 넣으면 파일을 열 때 바깥으로 요청이 나갑니다. */
function isDataUrl(value:unknown):value is string{
 return typeof value==='string'&&value.length<=IMAGE_MAX_LENGTH&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * 서랍을 읽습니다. 깨져 있으면 빈 서랍으로 돌려줍니다 — 던지지 않습니다.
 * 그림 서랍이 깨졌다고 동화 화면이 멈추면 안 됩니다.
 */
export function parseImageStore(raw:string|null):ImageStore{
 if(raw===null)return emptyImageStore();
 try{
  if(raw.length>IMAGE_STORE_LIMIT*2)return emptyImageStore();
  const value=JSON.parse(raw);
  if(!value||value.version!==1||!Array.isArray(value.images))return emptyImageStore();
  const images=value.images.filter((image:unknown)=>{
   if(!image||typeof image!=='object'||Array.isArray(image))return false;
   const item=image as Record<string,unknown>;
   return typeof item.bookId==='string'&&!!item.bookId&&item.bookId.length<=200
    &&Number.isInteger(item.chapter)&&(item.chapter as number)>=0&&(item.chapter as number)<IMAGE_PER_BOOK
    &&isDataUrl(item.dataUrl)
    &&typeof item.createdAt==='string'&&item.createdAt.length<=100;
  }).map((image:Record<string,unknown>)=>({bookId:image.bookId as string,chapter:image.chapter as number,dataUrl:image.dataUrl as string,createdAt:image.createdAt as string}));
  return {version:1,images};
 }catch{return emptyImageStore();}
}

export const serializeImageStore=(store:ImageStore)=>JSON.stringify(store);

/** 한 권의 그림을 장 번호 순서로. 없는 장은 빈 문자열입니다. */
export function bookImages(store:ImageStore,bookId:string,chapters:number):string[]{
 const out=Array.from({length:chapters},()=>'');
 for(const image of store.images)if(image.bookId===bookId&&image.chapter<chapters)out[image.chapter]=image.dataUrl;
 return out;
}

export const hasBookImages=(store:ImageStore,bookId:string)=>store.images.some(image=>image.bookId===bookId);

/** 한 권의 그림을 모두 버립니다(동화를 지울 때, 자리를 비울 때). */
export function removeBookImages(store:ImageStore,bookId:string):ImageStore{
 return {version:1,images:store.images.filter(image=>image.bookId!==bookId)};
}

/** 그 권에서 가장 오래된 그림의 시각. 버릴 순서를 정할 때 씁니다. */
function oldestAt(store:ImageStore,bookId:string):number{
 const times=store.images.filter(image=>image.bookId===bookId).map(image=>Date.parse(image.createdAt)).filter(Number.isFinite);
 return times.length?Math.min(...times):0;
}

/**
 * 한 권의 그림을 넣습니다. 자리가 모자라면 **다른** 오래된 권부터 버립니다.
 *
 * 지금 넣는 권은 절대 버리지 않습니다. 방금 그린 그림을 넣자마자 버리면
 * 돈만 쓰고 아무것도 남지 않습니다. 그 권 하나로도 한도를 넘으면 넣지 않고
 * 그 사실을 알립니다 — 조용히 버리면 왜 그림이 없는지 알 수 없습니다.
 */
export function putBookImages(store:ImageStore,bookId:string,images:{chapter:number;dataUrl:string}[],now=new Date().toISOString()):{store:ImageStore;evicted:string[]}{
 const accepted=images
  .filter(image=>Number.isInteger(image.chapter)&&image.chapter>=0&&image.chapter<IMAGE_PER_BOOK&&isDataUrl(image.dataUrl))
  .slice(0,IMAGE_PER_BOOK)
  .map(image=>({bookId,chapter:image.chapter,dataUrl:image.dataUrl,createdAt:now}));
 if(accepted.length===0)throw Error('보관할 수 있는 그림이 없습니다. 동화 내용은 그대로입니다.');
 let next:ImageStore={version:1,images:[...removeBookImages(store,bookId).images,...accepted]};
 if(serializeImageStore({version:1,images:accepted}).length>IMAGE_STORE_LIMIT)throw Error('그림이 보관 한도보다 큽니다. 동화 글은 그대로 보관했습니다.');
 const evicted:string[]=[];
 while(serializeImageStore(next).length>IMAGE_STORE_LIMIT){
  const others=[...new Set(next.images.map(image=>image.bookId))].filter(id=>id!==bookId);
  if(others.length===0)break;
  const victim=others.sort((a,b)=>oldestAt(next,a)-oldestAt(next,b))[0];
  next=removeBookImages(next,victim);
  evicted.push(victim);
 }
 if(serializeImageStore(next).length>IMAGE_STORE_LIMIT)throw Error('그림을 보관할 자리를 만들지 못했습니다. 동화 글은 그대로 보관했습니다.');
 return {store:next,evicted};
}

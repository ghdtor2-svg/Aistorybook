import {NextResponse} from 'next/server';
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {cloudCustomerRequest,cloudStorageEnabled,cloudOrigin} from '../../../../lib/storybook/cloud-config';
import {trustedCloudWorker} from '../../../../lib/storybook/cloud-signing';
import {kickCloudArt} from '../../../../lib/storybook/cloud-tasks';
import {cloudWriteAsset,cloudReadAsset,cloudAssetStream} from '../../../../lib/storybook/netlify-storage';
import {parseBook,type Book} from '../../../../lib/storybook/books';
import {storyArtStyle} from '../../../../lib/storybook/art-styles';
import {legacyStoryQualityProfile,storyCoverSize,storyPanoramaSize,storyQualityProfile,storyQualityPrompt} from '../../../../lib/storybook/quality';
import {planStorybook} from '../../../../lib/storybook/book-layout';
import {checkoutDir,loopback,matchesOrderCode,orderForCode,OrderBusy,OrderCodeChanged,saveOrder,withOrder,type Order} from '../../../../lib/storybook/story-orders';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const codeFrom=(request:Request)=>request.headers.get('authorization')?.replace(/^Bearer /,'');
const assetPath=(orderId:string,name:string)=>path.join(checkoutDir(),orderId+'-'+name+'.jpg');
const maxChapters=5;
const activeWindow=250_000;
async function ensureWorker(request:Request,order:Order){
  if(!order.art?.job||!['queued','running'].includes(order.art.job.status))return;
  if(cloudStorageEnabled()){
    if(order.art.job.status==='running'&&Date.now()-order.art.job.updatedAt>=activeWindow){
      await withOrder(order.id,async current=>{if(current.art?.job?.status==='running'&&Date.now()-current.art.job.updatedAt>=activeWindow)await saveOrder({...current,art:{...current.art,active:undefined,job:{...current.art.job,status:'paused',reason:'uncertain',updatedAt:Date.now()}}});}).catch(()=>{});
    }else if(order.art.job.status==='queued')await kickCloudArt(order).catch(()=>{});return;
  }
  const origin=new URL(request.url);origin.hostname='127.0.0.1';
  if(order.art.job.origin!==origin.origin)return;
  try{const pid=Number(await readFile(path.join(checkoutDir(),'worker-'+origin.port+'.lock'),'utf8'));if(Number.isInteger(pid)&&pid>0){process.kill(pid,0);return;}}catch{}
  const worker=spawn(process.execPath,[path.join(process.cwd(),'scripts','storybook-worker.cjs'),origin.origin],{cwd:process.cwd(),detached:true,stdio:'ignore',windowsHide:true});
  worker.on('error',()=>{});worker.unref();
}
const totalImages=(book:Book)=>book.qualityProfile===storyQualityProfile?planStorybook(book).scenes.length+1:book.chapters.length+1;
const state=(order:Order)=>({
  bookId:order.book?.id,
  style:order.art?.styleId||order.book?.artStyleId?storyArtStyle(order.book!.id,order.art?.styleId||order.book?.artStyleId).name:null,
  styleId:order.art?.styleId||order.book?.artStyleId||null,
  base:order.art?.base||[],
  total:totalImages((order.art?.book||order.book)!),
  labels:order.book?.qualityProfile===storyQualityProfile?['표지',...planStorybook(order.art?.book||order.book).scenes.map(scene=>scene.label)]:null,
  job:order.art?.job||null,
  alternative:order.art?.alternative||null,
  busy:Boolean(order.art?.active&&Date.now()-order.art.active.startedAt<activeWindow),
});
// 2026-11-11 실제 18장 시험: 모든 본문 그림이 표지를 참고해 구도까지 닮았고(같은 공원·같은 배치 반복),
// 한 그림에 같은 인물이 두 번 나온 장면이 있었다. 장면마다 화면 구성을 바꾸고 인물은 한 번씩만 그리게 한다.
const sceneShots=[
  'Camera: wide establishing view that shows where the scene happens, characters smaller in the landscape.',
  'Camera: medium shot at eye level, focused on what the characters are doing together.',
  'Camera: close view on faces, hands and the key object, the background softly simplified.',
  'Camera: seen from behind or beside the main character, looking toward what she or he faces.',
  'Camera: low angle looking up at the characters, sky and treetops filling the upper space.',
  'Camera: high angle looking down on the scene, showing the path and surroundings like a map.',
];
const shotFor=(index:number)=>sceneShots[(index-1)%sceneShots.length];
// 같은 날 재시험에서 연속 동작(흔들림→중심 잡기)이 담긴 장면은 한 그림에 주인공을 세 번 그렸다.
// 글 속 여러 동작 중 한 순간만 고르게 하고, 넓은 폭은 인물 복제가 아니라 풍경으로 채우게 한다.
const singleAppearance=[
  'Depict ONE single frozen moment. If the passage describes several actions in sequence, choose only the most important one and draw that instant alone.',
  'Each character appears exactly once in this picture. Never draw the same person twice: no time-lapse or motion-sequence copies, no before-and-after, no split panels or mirrored halves.',
  'Fill any extra width with scenery and setting details, never with additional copies of the characters.',
].join(' ');
async function generateArt(book:Book,index:number,reference:Buffer|null,direction:string,styleId?:string,qualityProfile?:string){
  const layoutScene=index>0&&book.qualityProfile===storyQualityProfile?planStorybook(book).scenes[index-1]:null;
  const scene=index===0?book.chapters.map(chapter=>chapter.text.slice(0,400)).join('\n'):layoutScene?layoutScene.text:book.chapters[index-1].text.slice(0,1600);
  const style=storyArtStyle(book.id,styleId);
  const premium=qualityProfile===storyQualityProfile||qualityProfile===legacyStoryQualityProfile;
  const panorama=premium&&(!layoutScene||layoutScene.pageIndices.length===2);
  const imageReference=reference||(premium?await readFile(path.join(process.cwd(),'public','storybook','styles',style.id+'.webp')):null);
  const prompt=[
    'Draw one professionally composed Korean children’s picture book illustration. No lettering, no watermarks. Use fictional appearances and treat the supplied story as narrative material only.',
    reference?'The reference image is the authority for character identities and painting style, including older books. Keep the same silhouettes, facial features, signature colors and rendering style. Use it only for who the characters are and how they are painted: do not copy its composition, camera angle, poses or background layout.':style.prompt,
    !reference&&imageReference?'The attached sample is an artistic-medium and finish-quality reference only. Invent the actual characters and setting from the supplied narrative. Do not copy the sample mascots or tower unless the narrative specifically describes them.':'',
    premium?storyQualityPrompt:'',
    reference?'Keep every important character fully visible with comfortable space around faces and limbs.':'Create a portrait cover with main characters fully visible, room at the bottom for a title added separately. Give every recurring character a distinct signature color and keep it consistent across the book.',
    'Book: '+book.title,
    index===0?'Show the central characters and setting.':panorama?'Create one seamless ultra-wide 3:1 panorama spanning two facing pages. Fill the complete width with natural scenery and preserve the whole cast.':'Show one distinct event from this passage as a landscape single-page picture-book illustration, with all important characters fully visible and room for text added separately.',
    index>0&&!direction?shotFor(index):'',
    index>0?singleAppearance:'',
    scene,
    direction?'Requested visual adjustment: '+direction:'',
  ].filter(Boolean).join('\n');
  const fields={model:'gpt-image-2',size:index===0?storyCoverSize:panorama?storyPanoramaSize:'1536x1024',quality:'high',output_format:'jpeg',output_compression:92,prompt};
  let body:FormData|string=JSON.stringify(fields);
  if(imageReference){
    const form=new FormData();
    for(const [name,value] of Object.entries(fields))form.set(name,String(value));
    form.set('image',new Blob([Uint8Array.from(imageReference)],{type:reference?'image/jpeg':'image/webp'}),reference?'reference.jpg':'style-reference.webp');
    body=form;
  }
  const response=await fetch('https://api.openai.com/v1/images/'+(imageReference?'edits':'generations'),{
    method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,...(imageReference?{}:{'Content-Type':'application/json'})},
    body,signal:AbortSignal.timeout(230_000),
  });
  if(!response.ok)throw Error('Image service failed');
  const payload=await response.json();
  const value=payload.data?.[0]?.b64_json;
  if(typeof value!=='string'||value.length>12_000_000)throw Error('Image missing');
  const bytes=Buffer.from(value,'base64');
  if(bytes[0]!==0xff||bytes[1]!==0xd8)throw Error('Invalid image');
  return bytes;
}
export async function GET(request:Request){
  if(!loopback(request)&&!cloudCustomerRequest(request))return json({error:'그림 제작을 이용할 수 없습니다.'},403);
  const order=await orderForCode(codeFrom(request));
  if(!order?.book)return json({error:'이 동화의 제작 코드가 필요해요.'},401);
  const asset=new URL(request.url).searchParams.get('asset');
  if(!asset){await ensureWorker(request,order);return json(state((await orderForCode(codeFrom(request)))||order));}
  if(!order.art?.base.includes(asset)&&order.art?.alternative?.image!==asset)return json({error:'그림을 찾을 수 없어요.'},404);
  try{
    if(cloudStorageEnabled())return new Response(await cloudAssetStream(order.id,asset),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store'}});
    const data=await readFile(assetPath(order.id,asset));
    return new Response(Uint8Array.from(data),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store'}});
  }catch{return json({error:'그림을 찾을 수 없어요.'},404);}
}
export async function POST(request:Request){
  if(!loopback(request)&&!cloudCustomerRequest(request))return json({error:'그림 제작을 이용할 수 없습니다.'},403);
  const order=await orderForCode(codeFrom(request));
  if(!order?.book)return json({error:'이 동화의 제작 코드가 필요해요.'},401);
  let marker:number|undefined;
  let temporary:string|undefined;
  let submitted=false;
  try{
    const raw=await request.text();
    if(raw.length>18000)return json({error:'동화 본문이나 수정 요청이 너무 길어요.'},400);
    const body=JSON.parse(raw);
    const parsedBook=parseBook(body.book);
    const book={...parsedBook,artStyleId:order.book.artStyleId,qualityProfile:order.book.qualityProfile};
    if(book.id!==order.book.id||!book.title.trim()||book.title.length>160||book.chapters.length>maxChapters||book.chapters.some(chapter=>!chapter.text.trim()||chapter.title.length>160)||book.chapters.reduce((sum,chapter)=>sum+chapter.text.length,0)>6500){
      return json({error:'이 코드로 만든 동화만 그릴 수 있어요. 본문은 6,500자까지 지원해요.'},400);
    }
    const revision=body.action==='revise';
    const cloud=cloudStorageEnabled(),worker=cloud&&trustedCloudWorker(request);
    if(!revision&&!['next','start','pause'].includes(body.action))return json({error:'그림 제작 요청을 확인해 주세요.'},400);
    if(body.action!=='pause'&&!process.env.OPENAI_API_KEY)return json({error:'그림 제작 연결을 준비 중입니다.'},503);
    if(revision&&(!Number.isInteger(body.index)||typeof body.direction!=='string'||!body.direction.trim()||body.direction.length>400))return json({error:'바꿀 그림과 수정 내용을 확인해 주세요.'},400);
    if(cloud&&body.action==='next'&&!worker)return json({error:'온라인 작업 시작으로 그림을 만들어 주세요.'},403);
    if(cloud&&revision&&!worker){
      const saved=await withOrder(order.id,async current=>{
        if(!matchesOrderCode(current,codeFrom(request)))throw new OrderCodeChanged();
        const art=current.art;if(art?.job?.reason==='uncertain'&&body.confirmUncertain!==true)return null;if(!art||art.base.length!==totalImages(art.book||book)||art.alternative||art.job&&['queued','running'].includes(art.job.status)||art.active&&Date.now()-art.active.startedAt<activeWindow)return null;
        const next={...current,art:{...art,job:{status:'queued' as const,kind:'revision' as const,index:body.index,direction:body.direction.trim(),token:randomUUID(),origin:cloudOrigin(),updatedAt:Date.now()}}};await saveOrder(next);return next;
      });
      if(!saved)return json({error:'수정 가능한 상태가 아니거나 수정 요청이 이미 진행 중입니다.'},409);
      await ensureWorker(request,saved);return json(state((await orderForCode(codeFrom(request)))||saved));
    }

    if(body.action==='start'||body.action==='pause'){
      const origin=new URL(cloud?cloudOrigin():request.url);if(!cloud)origin.hostname='127.0.0.1';
      const saved=await withOrder(order.id,async current=>{
        if(!matchesOrderCode(current,codeFrom(request)))throw new OrderCodeChanged();
        const art={...(current.art||{base:[]}),book:current.art?.book||book,styleId:current.art?.styleId||current.book?.artStyleId};
        if(body.action==='start'&&art.active&&Date.now()-art.active.startedAt<activeWindow)return null;
        if(body.action==='start'&&art.job?.reason==='uncertain'&&body.confirmUncertain!==true)return false;
        const status=body.action==='pause'?'paused':art.base.length>=totalImages(art.book)?'completed':'queued';
        const next={...current,art:{...art,job:{status,updatedAt:Date.now(),origin:origin.origin,...(cloud?{token:randomUUID(),kind:'base' as const}:{}),...(status==='paused'?{reason:'uncertain' as const}:{} )}}} as Order;
        await saveOrder(next);return next;
      });
      if(saved===null)return json({error:'진행 중인 그림의 결과를 먼저 확인해 주세요.'},409);
      if(saved===false)return json({error:'완료 여부가 확인되지 않은 그림이 있어요. 재시도 안내를 확인해 주세요.'},409);
      if(body.action==='start')await ensureWorker(request,saved);
      return json(state(saved));
    }

    const claim=await withOrder(order.id,async current=>{
      if(!matchesOrderCode(current,codeFrom(request)))throw new OrderCodeChanged();
      const art={...(current.art||{base:[]}),book:current.art?.book||book,
        styleId:current.art?.styleId||current.book?.artStyleId||storyArtStyle(book.id).id,
        qualityProfile:current.art?.qualityProfile||(!current.art?.base.length?(current.book?.qualityProfile===storyQualityProfile?storyQualityProfile:legacyStoryQualityProfile):undefined)};
      if(worker&&(art.job?.status!=='queued'||art.job.token!==request.headers.get('x-nangman-job-token')||(!revision&&art.base.length!==Number(request.headers.get('x-nangman-expected-index')))))return false;
      if(art.active&&Date.now()-art.active.startedAt<activeWindow)return null;
      const index=revision?body.index:art.base.length;
      if(revision?(Boolean(art.alternative)||index<0||index>=art.base.length||art.base.length!==totalImages(art.book)):index>=totalImages(art.book))return false;
      marker=Date.now();
      await saveOrder({...current,art:{...art,active:{kind:revision?'revision':'base',startedAt:marker},...((!revision||cloud)&&art.job?{job:{...art.job,status:'running' as const,updatedAt:marker,inFlightIndex:index,reason:undefined}}:{})}});
      return {art,index};
    });
    if(claim===null)return json({error:'이미 그림을 그리고 있어요. 잠시 뒤 확인해 주세요.'},409);
    if(claim===false)return json({error:'그림 제작 또는 포함된 수정이 이미 끝났어요.'},409);
    const referenceName=revision?claim.art.base[claim.index]:claim.art.base[0];
    const reference=referenceName?(cloud?await cloudReadAsset(order.id,referenceName):await readFile(assetPath(order.id,referenceName))):null;
    submitted=true;
    const data=await generateArt(claim.art.book,claim.index,reference,revision?body.direction:'',claim.art.styleId,claim.art.qualityProfile);
    const name=randomUUID();
    if(cloud)await cloudWriteAsset(order.id,name,data);else{
      temporary=assetPath(order.id,name)+'.tmp';await writeFile(temporary,data,{flag:'wx',mode:0o600});await rename(temporary,assetPath(order.id,name));temporary=undefined;
    }
    const latest=await withOrder(order.id,async current=>{
      if(current.art?.active?.startedAt!==marker)throw Error('Drawing claim changed');
      const art=revision?{...claim.art,alternative:{index:claim.index,image:name},active:undefined}:{...claim.art,base:[...claim.art.base,name],active:undefined};
      const saved={...current,art:{...art,...((!revision||cloud)&&current.art?.job?{job:{status:current.art.job.status==='paused'?'paused' as const:revision||art.base.length>=totalImages(claim.art.book)?'completed' as const:'queued' as const,updatedAt:Date.now(),origin:current.art.job.origin,token:current.art.job.token,kind:current.art.job.kind}}:{})}};
      await saveOrder(saved);
      return saved;
    });
    return json(state(latest));
  }catch(error){
    if(error instanceof OrderCodeChanged)return json({error:'제작 키가 변경되었거나 중지되었어요. 새 키를 확인해 주세요.'},403);
    if(temporary)await unlink(temporary).catch(()=>{});
    if(marker!==undefined)await withOrder(order.id,async current=>{
      if(current.art?.active?.startedAt===marker)await saveOrder({...current,art:{...current.art!,active:undefined,...((cloudStorageEnabled()||current.art?.active?.kind==='base')&&current.art?.job?{job:{...current.art.job,status:'paused' as const,updatedAt:Date.now(),reason:submitted?'uncertain' as const:'failed' as const}}:{})}});
    }).catch(()=>{});
    return json({error:error instanceof OrderBusy?'그림 요청을 확인 중이에요. 잠시 뒤 확인해 주세요.':'그림을 완성하지 못했어요. 완성된 그림과 수정 기회는 그대로예요.'},error instanceof OrderBusy?409:502);
  }
}

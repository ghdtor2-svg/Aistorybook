import {NextResponse} from 'next/server';
import {parseGeneratedBook} from '../../../../lib/storybook/books';
import {defaultStoryArtStyle,isOfferedStoryArtStyle,storyArtStyle,type StoryArtStyleId} from '../../../../lib/storybook/art-styles';
import {storyQualityProfile,storyTextMax,storyTextMin} from '../../../../lib/storybook/quality';
import {MAX_STORY_BRIEF_LENGTH,MAX_STORY_REQUEST_LENGTH} from '../../../../lib/storybook/story-brief';
import {loopback,matchesOrderCode,orderForCode,OrderBusy,OrderCodeChanged,saveOrder,withOrder} from '../../../../lib/storybook/story-orders';
import {cloudCustomerRequest,cloudStorageEnabled} from '../../../../lib/storybook/cloud-config';
import {trustedCloudWorker} from '../../../../lib/storybook/cloud-signing';
import {kickCloudText} from '../../../../lib/storybook/cloud-tasks';
import {storedBook} from '../../../../lib/storybook/order-assets';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const codeFrom=(request:Request)=>request.headers.get('authorization')?.replace(/^Bearer /,'');
const requestIdPattern=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const runningWindow=270_000;
// 대기 중인 요청은 3초마다 다시 깨운다. 이 시간 안에 아무 작업도 집어 가지 않으면 멈춘 것으로 본다.
const queuedWindow=75_000;
// 실패 이유는 고정된 진단 코드로만 남긴다. 키·본문·원본 오류는 기록하지 않는다.
class StoryFailure extends Error {constructor(public code:string,public measured?:number){super(code);}}
// 결과를 확실히 아는 실패(글이 짧음·형식 오류·요청 거절)는 비용이 겹칠 걱정 없이 다시 시작할 수 있다.
const definiteFailure=(reason?:string)=>!!reason&&(/^story_/.test(reason)||/^ai_http_4/.test(reason));
const failureCode=(error:unknown)=>error instanceof StoryFailure?error.code:error instanceof SyntaxError?'story_format':error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError')?'ai_timeout':'unexpected';
const failureTexts:Record<string,string>={
  ai_http_401:'AI 연결 키를 확인해야 해요.',ai_http_403:'AI 연결 권한을 확인해야 해요.',ai_http_404:'설정한 AI 글 모델을 찾을 수 없어요.',
  ai_http_429:'AI 사용 한도 또는 잔액을 확인해야 해요.',ai_timeout:'AI 응답이 제한 시간 안에 오지 않았어요.',
  story_format:'AI가 돌려준 글의 형식이 맞지 않았어요.',story_short:'AI가 쓴 글이 기준보다 짧았어요.',story_long:'AI가 쓴 글이 기준보다 길었어요.',story_cut:'AI 글이 중간에 끊겼어요.',
};
const withCode=(message:string,code?:string,measured?:number)=>code&&/^[a-z0-9_]{1,40}$/.test(code)?[failureTexts[code]||(code.startsWith('ai_http_')?'AI 서비스가 요청을 처리하지 못했어요.':''),definiteFailure(code)?'글이 만들어지지 않았어요. ‘대기 기록 해제’를 누른 뒤 다시 만들 수 있어요.':message,'(진단 코드: '+code+(Number.isInteger(measured)?', '+measured+'자':'')+')'].filter(Boolean).join(' '):message;

export async function GET(request:Request){
  if(!loopback(request)&&!cloudCustomerRequest(request))return json({error:'동화 제작을 이용할 수 없습니다.'},403);
  const order=await orderForCode(codeFrom(request));
  if(!order)return json({error:'결제 후 받은 제작 코드를 입력해 주세요.'},401);
  // 코드로 다시 불러올 때는 그림과 짝이 맞는 보관본(그림을 시작할 때의 글)을 돌려준다.
  if(order.book)return json({state:'completed',book:storedBook(order)});
  // A queued request that no worker picked up must not look like it is running forever.
  if(order.request?.status==='queued'&&Date.now()-order.request.startedAt>=queuedWindow)return json({state:'paused',requestId:order.request.id,error:'온라인 작업이 시작되지 않았어요. 글을 쓰기 전이라 AI 비용은 발생하지 않았습니다. 대기 기록 해제 안내를 확인한 뒤 다시 시작할 수 있습니다. (진단 코드: worker_not_started)'});
  if(order.request?.status==='queued'){await kickCloudText(order);return json({state:'running',phase:'queued',requestId:order.request?.id});}
  if(order.request?.status==='paused')return json({state:'paused',requestId:order.request?.id,error:withCode('완료 여부를 확인해야 하는 요청이 있어요. 자동 재시도하지 않습니다.',order.request.reason,order.request.measured)});
  if(cloudStorageEnabled()&&order.request&&Date.now()-order.request.startedAt>=runningWindow)return json({state:'paused',requestId:order.request?.id,error:'이전 작업의 완료 여부를 먼저 확인해 주세요.'});
  const running=order.request&&Date.now()-order.request.startedAt<runningWindow;
  return json({state:running?'running':'ready',...(running?{phase:'writing'}:{}),requestId:order.request?.id});
}

export async function POST(request:Request){
  if(!loopback(request)&&!cloudCustomerRequest(request))return json({error:'동화 제작을 이용할 수 없습니다.'},403);
  if(!process.env.OPENAI_API_KEY)return json({error:'동화 생성 연결을 준비 중입니다.'},503);
  const order=await orderForCode(codeFrom(request));
  if(!order)return json({error:'결제 후 받은 제작 코드를 입력해 주세요.'},401);

  let id:string;
  let brief:string;
  let styleId:StoryArtStyleId;
  let confirmedRetry=false;
  try{
    const raw=await request.text();
    if(raw.length>MAX_STORY_REQUEST_LENGTH)throw Error();
    const body=JSON.parse(raw);
    if(typeof body.id!=='string'||!requestIdPattern.test(body.id)||typeof body.brief!=='string'||!body.brief.trim()||body.brief.length>MAX_STORY_BRIEF_LENGTH)throw Error();
    id=body.id;
    brief=body.brief;
    confirmedRetry=body.confirmUncertain===true;
    if(body.styleId!==undefined&&body.styleId!=='random'&&!isOfferedStoryArtStyle(body.styleId))throw Error();
    styleId=body.styleId==='random'?storyArtStyle(id).id:body.styleId||defaultStoryArtStyle;
  }catch{return json({error:'동화에 담을 내용을 확인해 주세요.'},400);}

  let claimed=false;
  try{
    const cloud=cloudStorageEnabled(),worker=cloud&&trustedCloudWorker(request);
    if(cloud&&!worker){
      const queued=await withOrder(order.id,async current=>{
        if(!matchesOrderCode(current,codeFrom(request)))throw new OrderCodeChanged();
        if(current.book)return {book:current.book};
        if(current.request&&Date.now()-current.request.startedAt<runningWindow&&current.request.status!=='paused')return {pending:current};
        if(current.request&&!confirmedRetry&&!(current.request.status==='paused'&&definiteFailure(current.request.reason)))return {uncertain:true};
        const next={...current,request:{id,brief,styleId,startedAt:Date.now(),status:'queued' as const}};await saveOrder(next);return {pending:next};
      });
      if(queued.book)return json(queued.book);
      if(queued.uncertain)return json({error:'이전 요청의 완료 여부가 불확실합니다. 대기 기록 해제 안내를 확인한 뒤 재시작해 주세요.'},409);
      if(queued.pending)await kickCloudText(queued.pending);
      return json({state:'running',phase:'queued',requestId:queued.pending?.request?.id},202);
    }
    const decision=await withOrder(order.id,async current=>{
      if(!matchesOrderCode(current,codeFrom(request)))throw new OrderCodeChanged();
      if(current.book)return {book:current.book};
      if(current.request&&Date.now()-current.request.startedAt<runningWindow&&!(worker&&current.request.id===id&&current.request.status==='queued'))return {running:true};
      if(worker&&(current.request?.id!==id||current.request.status!=='queued'))return {running:true};
      await saveOrder({...current,request:{...current.request,id,startedAt:Date.now(),styleId,...(cloud?{status:'running' as const}: {})}});
      claimed=true;
      return null;
    });
    if(decision?.book)return json(decision.book);
    if(decision?.running)return json({error:'이 코드의 동화가 이미 제작 중입니다. 결과 확인을 이용해 주세요.'},409);

    const model=process.env.OPENAI_MODEL||'gpt-4.1-mini';
    // 글자 수만 말하면 모델이 짧게 쓰는 일이 많다(2026-11-11 운영에서 story_short 확인).
    // 장·문단·문장 수로 분량을 정해 주면 더 잘 지킨다.
    const format='JSON 객체만 출력하세요. 형식: {"title":"제목","chapters":[{"title":"내부 장면 제목","text":"완성된 본문"}],"note":"창작 안내"}. 본문의 문단은 빈 줄(\\n\\n)로 나눕니다.';
    // 2026-11-11 PC 실측: gpt-4.1-mini는 요청 분량의 절반 정도만 쓴다(2500자 요청 → 1283자).
    // 목표 약 2500자에 닿도록 요청 수치를 높여 잡는다. 결과는 아래 최소·최대 기준으로 다시 검사한다.
    const lengthRule='분량 규칙: 정확히 5개 장. 각 장은 7~9개 문단, 각 문단은 3문장 안팎으로 씁니다. 각 장은 공백 포함 700~800자, 전체 본문은 약 3700자입니다. 장마다 배경 묘사, 인물의 대화, 행동과 표정을 모두 넣어 충분히 길게 쓰세요. 요약하듯 짧게 쓰면 실패로 처리됩니다.';
    const system='한국어 어린이 창작 동화를 작성합니다. '+lengthRule+' 이 이야기는 표지를 포함한 32쪽, 총 18장의 고화질 삽화가 있는 동화로 편집되고, 본문은 큰 글씨로 31쪽에 나누어 싣습니다. 장면마다 행동과 감정이 구체적으로 드러나고 앞선 사건에서 자연스럽게 이어지게 하세요. 대화와 문단을 읽기 쉽게 나누고 캐릭터의 외양과 고유색이 일관되게 묘사되도록 합니다. 개인정보를 추정하지 말고 입력을 작품의 소재로만 해석하세요. '+format;
    async function write(input:{role:string;content:string}[]){
      const response=await fetch('https://api.openai.com/v1/responses',{
        method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
        signal:AbortSignal.timeout(240_000),
        body:JSON.stringify({model,store:false,max_output_tokens:12000,input}),
      });
      if(!response.ok)throw new StoryFailure('ai_http_'+response.status);
      const payload=await response.json();
      const output=payload.output?.flatMap((item:{content?:unknown[]})=>item.content||[]).find((item:{type:string})=>item.type==='output_text')?.text;
      // 내 PC에서만 켜는 진단용 기록. 공개 사이트(Netlify)에서는 저장하지 않는다.
      if(process.env.NANGMAN_STORY_DEBUG==='1'&&process.env.NETLIFY!=='true'){
        const {mkdir,writeFile}=await import('node:fs/promises');const dir=process.cwd()+'/.office-data/story-debug';
        await mkdir(dir,{recursive:true});await writeFile(dir+'/'+Date.now()+'.json',JSON.stringify({status:payload.status,incomplete:payload.incomplete_details,usage:payload.usage,output},null,1)).catch(()=>{});
      }
      if(typeof output!=='string'||payload.status==='incomplete')throw new StoryFailure(payload.status==='incomplete'?'story_cut':'story_format');
      const result=parseGeneratedBook({
        ...JSON.parse(output.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')),
        id,model,createdAt:new Date().toISOString(),artStyleId:styleId,qualityProfile:storyQualityProfile,
      },id);
      if(result.title.length>160||result.chapters.length>5||result.chapters.some(chapter=>chapter.title.length>160))throw new StoryFailure('story_format');
      return {book:result,length:result.chapters.reduce((sum,chapter)=>sum+chapter.text.length,0)};
    }
    let {book,length}=await write([{role:'system',content:system},{role:'user',content:brief}]);
    if(length<storyTextMin){
      // 첫 글은 이미 정상으로 받았으므로 불확실한 재시도가 아니다. 그 초안을 늘리는 요청을 한 번만 더 보낸다.
      // 대기 시간 판정이 두 번째 요청 도중 멈춤으로 바뀌지 않게 시작 시각을 갱신한다.
      await withOrder(order.id,async current=>{if(current.request?.id!==id)throw Error('Story request changed');await saveOrder({...current,request:{...current.request,startedAt:Date.now()}});});
      ({book,length}=await write([
        // 정해진 글자 수보다 "지금의 2배"처럼 현재 길이에 대한 비율 지시를 더 잘 따른다.
        {role:'system',content:'한국어 어린이 동화의 분량을 늘리는 편집자입니다. 제목·인물·사건 순서·결말·장 제목은 그대로 두고, 장면 묘사·대화·인물의 행동과 표정을 더해 각 장을 지금의 2배 길이로 다시 씁니다. 정확히 5개 장을 유지하고 문단은 빈 줄로 나눕니다. '+format},
        {role:'user',content:'【원래 제작 요청】\n'+brief+'\n\n【현재 초안 · 전체 '+length+'자로 너무 짧음】\n'+JSON.stringify({title:book.title,chapters:book.chapters,note:book.note})},
      ]));
    }
    if(length<storyTextMin)throw new StoryFailure('story_short',length);
    if(length>storyTextMax)throw new StoryFailure('story_long',length);
    await withOrder(order.id,async current=>{
      if(current.request?.id!==id)throw Error('Story request changed');
      await saveOrder({...current,book,request:undefined});
    });
    return json(book);
  }catch(error){
    if(error instanceof OrderCodeChanged)return json({error:'제작 키가 변경되었거나 중지되었어요. 새 키를 확인해 주세요.'},403);
    if(claimed){
      await withOrder(order.id,async current=>{
        if(current.request?.id===id)await saveOrder({...current,request:cloudStorageEnabled()?{...current.request,status:'paused',reason:failureCode(error),...(error instanceof StoryFailure&&error.measured!==undefined?{measured:error.measured}:{})}:undefined});
      }).catch(()=>{});
    }
    return json({error:error instanceof OrderBusy?'이 주문을 확인 중입니다. 잠시 뒤 결과를 확인해 주세요.':withCode('동화를 완성하지 못했어요. 제작 코드를 다시 사용할 수 있습니다.',failureCode(error),error instanceof StoryFailure?error.measured:undefined)},error instanceof OrderBusy?409:502);
  }
}

import {NextResponse} from 'next/server';
import {parseGeneratedBook} from '../../../../lib/storybook/books';
import {defaultStoryArtStyle,isStoryArtStyleId,storyArtStyle,type StoryArtStyleId} from '../../../../lib/storybook/art-styles';
import {storyQualityProfile,storyTextMax,storyTextMin} from '../../../../lib/storybook/quality';
import {MAX_STORY_BRIEF_LENGTH,MAX_STORY_REQUEST_LENGTH} from '../../../../lib/storybook/story-brief';
import {loopback,matchesOrderCode,orderForCode,OrderBusy,OrderCodeChanged,saveOrder,withOrder} from '../../../../lib/storybook/story-orders';
import {cloudCustomerRequest,cloudStorageEnabled} from '../../../../lib/storybook/cloud-config';
import {trustedCloudWorker} from '../../../../lib/storybook/cloud-signing';
import {kickCloudText} from '../../../../lib/storybook/cloud-tasks';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const codeFrom=(request:Request)=>request.headers.get('authorization')?.replace(/^Bearer /,'');
const requestIdPattern=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const runningWindow=270_000;
// 대기 중인 요청은 3초마다 다시 깨운다. 이 시간 안에 아무 작업도 집어 가지 않으면 멈춘 것으로 본다.
const queuedWindow=75_000;
// 실패 이유는 고정된 진단 코드로만 남긴다. 키·본문·원본 오류는 기록하지 않는다.
class StoryFailure extends Error {constructor(public code:string){super(code);}}
const failureCode=(error:unknown)=>error instanceof StoryFailure?error.code:error instanceof SyntaxError?'story_format':error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError')?'ai_timeout':'unexpected';
const failureTexts:Record<string,string>={
  ai_http_401:'AI 연결 키를 확인해야 해요.',ai_http_403:'AI 연결 권한을 확인해야 해요.',ai_http_404:'설정한 AI 글 모델을 찾을 수 없어요.',
  ai_http_429:'AI 사용 한도 또는 잔액을 확인해야 해요.',ai_timeout:'AI 응답이 제한 시간 안에 오지 않았어요.',
  story_format:'AI가 돌려준 글의 형식이 맞지 않았어요.',story_short:'AI가 쓴 글이 기준보다 짧았어요.',story_long:'AI가 쓴 글이 기준보다 길었어요.',story_cut:'AI 글이 중간에 끊겼어요.',
};
const withCode=(message:string,code?:string)=>code&&/^[a-z0-9_]{1,40}$/.test(code)?[failureTexts[code]||(code.startsWith('ai_http_')?'AI 서비스가 요청을 처리하지 못했어요.':''),message,'(진단 코드: '+code+')'].filter(Boolean).join(' '):message;

export async function GET(request:Request){
  if(!loopback(request)&&!cloudCustomerRequest(request))return json({error:'동화 제작을 이용할 수 없습니다.'},403);
  const order=await orderForCode(codeFrom(request));
  if(!order)return json({error:'결제 후 받은 제작 코드를 입력해 주세요.'},401);
  if(order.book)return json({state:'completed',book:order.book});
  // A queued request that no worker picked up must not look like it is running forever.
  if(order.request?.status==='queued'&&Date.now()-order.request.startedAt>=queuedWindow)return json({state:'paused',requestId:order.request.id,error:'온라인 작업이 시작되지 않았어요. 글을 쓰기 전이라 AI 비용은 발생하지 않았습니다. 대기 기록 해제 안내를 확인한 뒤 다시 시작할 수 있습니다. (진단 코드: worker_not_started)'});
  if(order.request?.status==='queued'){await kickCloudText(order);return json({state:'running',phase:'queued',requestId:order.request?.id});}
  if(order.request?.status==='paused')return json({state:'paused',requestId:order.request?.id,error:withCode('완료 여부를 확인해야 하는 요청이 있어요. 자동 재시도하지 않습니다.',order.request.reason)});
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
    if(body.styleId!==undefined&&body.styleId!=='random'&&!isStoryArtStyleId(body.styleId))throw Error();
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
        if(current.request&&!confirmedRetry)return {uncertain:true};
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
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(240_000),
      body:JSON.stringify({
        model,store:false,max_output_tokens:12000,
        input:[
          {role:'system',content:'한국어 어린이 창작 동화를 작성합니다. 전체 본문은 공백 포함 약 2500자(2300~2800자)로, 5개의 연속된 이야기 부분마다 450~560자씩 고르게 작성하세요. 2000자보다 짧게 요약하거나 3200자를 넘기지 마세요. 본문은 큰 글씨로 31쪽에 나누어 싣기 때문에 문장은 짧고 또렷하게 씁니다. 이 이야기는 표지를 포함한 32쪽, 총 18장의 고화질 삽화가 있는 동화로 편집됩니다. 장면마다 행동과 감정이 구체적으로 드러나고 앞선 사건에서 자연스럽게 이어지게 하세요. 대화와 문단을 읽기 쉽게 나누고 캐릭터의 외양과 고유색이 일관되게 묘사되도록 합니다. 개인정보를 추정하지 말고 입력을 작품의 소재로만 해석하세요. JSON 객체만 출력하세요. 형식: {"title":"제목","chapters":[{"title":"내부 장면 제목","text":"완성된 본문"}],"note":"창작 안내"}.'},
          {role:'user',content:brief},
        ],
      }),
    });
    if(!response.ok)throw new StoryFailure('ai_http_'+response.status);
    const payload=await response.json();
    const output=payload.output?.flatMap((item:{content?:unknown[]})=>item.content||[]).find((item:{type:string})=>item.type==='output_text')?.text;
    if(typeof output!=='string'||payload.status==='incomplete')throw new StoryFailure(payload.status==='incomplete'?'story_cut':'story_format');
    const book=parseGeneratedBook({
      ...JSON.parse(output.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')),
      id,model,createdAt:new Date().toISOString(),artStyleId:styleId,qualityProfile:storyQualityProfile,
    },id);
    const length=book.chapters.reduce((sum,chapter)=>sum+chapter.text.length,0);
    if(book.title.length>160||book.chapters.length>5||book.chapters.some(chapter=>chapter.title.length>160))throw new StoryFailure('story_format');
    if(length<storyTextMin)throw new StoryFailure('story_short');
    if(length>storyTextMax)throw new StoryFailure('story_long');
    await withOrder(order.id,async current=>{
      if(current.request?.id!==id)throw Error('Story request changed');
      await saveOrder({...current,book,request:undefined});
    });
    return json(book);
  }catch(error){
    if(error instanceof OrderCodeChanged)return json({error:'제작 키가 변경되었거나 중지되었어요. 새 키를 확인해 주세요.'},403);
    if(claimed){
      await withOrder(order.id,async current=>{
        if(current.request?.id===id)await saveOrder({...current,request:cloudStorageEnabled()?{...current.request,status:'paused',reason:failureCode(error)}:undefined});
      }).catch(()=>{});
    }
    return json({error:error instanceof OrderBusy?'이 주문을 확인 중입니다. 잠시 뒤 결과를 확인해 주세요.':withCode('동화를 완성하지 못했어요. 제작 코드를 다시 사용할 수 있습니다.',failureCode(error))},error instanceof OrderBusy?409:502);
  }
}

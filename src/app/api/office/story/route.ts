import {NextResponse} from 'next/server';
import {parseGeneratedBook} from '../../../../lib/storybook/books';
import {defaultStoryArtStyle,isStoryArtStyleId,storyArtStyle,type StoryArtStyleId} from '../../../../lib/storybook/art-styles';
import {storyQualityProfile} from '../../../../lib/storybook/quality';
import {MAX_STORY_BRIEF_LENGTH,MAX_STORY_REQUEST_LENGTH} from '../../../../lib/storybook/story-brief';
import {loopback,matchesOrderCode,orderForCode,OrderBusy,OrderCodeChanged,saveOrder,withOrder} from '../../../../lib/storybook/story-orders';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const codeFrom=(request:Request)=>request.headers.get('authorization')?.replace(/^Bearer /,'');
const requestIdPattern=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const runningWindow=270_000;

export async function GET(request:Request){
  if(!loopback(request))return json({error:'동화 제작을 이용할 수 없습니다.'},403);
  const order=await orderForCode(codeFrom(request));
  if(!order)return json({error:'결제 후 받은 제작 코드를 입력해 주세요.'},401);
  if(order.book)return json({state:'completed',book:order.book});
  const running=order.request&&Date.now()-order.request.startedAt<runningWindow;
  return json({state:running?'running':'ready'});
}

export async function POST(request:Request){
  if(!loopback(request))return json({error:'동화 제작을 이용할 수 없습니다.'},403);
  if(!process.env.OPENAI_API_KEY)return json({error:'동화 생성 연결을 준비 중입니다.'},503);
  const order=await orderForCode(codeFrom(request));
  if(!order)return json({error:'결제 후 받은 제작 코드를 입력해 주세요.'},401);

  let id:string;
  let brief:string;
  let styleId:StoryArtStyleId;
  try{
    const raw=await request.text();
    if(raw.length>MAX_STORY_REQUEST_LENGTH)throw Error();
    const body=JSON.parse(raw);
    if(typeof body.id!=='string'||!requestIdPattern.test(body.id)||typeof body.brief!=='string'||!body.brief.trim()||body.brief.length>MAX_STORY_BRIEF_LENGTH)throw Error();
    id=body.id;
    brief=body.brief;
    if(body.styleId!==undefined&&body.styleId!=='random'&&!isStoryArtStyleId(body.styleId))throw Error();
    styleId=body.styleId==='random'?storyArtStyle(id).id:body.styleId||defaultStoryArtStyle;
  }catch{return json({error:'동화에 담을 내용을 확인해 주세요.'},400);}

  let claimed=false;
  try{
    const decision=await withOrder(order.id,async current=>{
      if(!matchesOrderCode(current,codeFrom(request)))throw new OrderCodeChanged();
      if(current.book)return {book:current.book};
      if(current.request&&Date.now()-current.request.startedAt<runningWindow)return {running:true};
      await saveOrder({...current,request:{id,startedAt:Date.now(),styleId}});
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
          {role:'system',content:'한국어 어린이 창작 동화를 작성합니다. 전체 본문은 4500~6000자로, 5개의 연속된 이야기 부분마다 900~1200자 분량을 충분히 작성하세요. 전체를 요약하거나 짧게 마무리하지 마세요. 이 이야기는 표지를 포함한 32쪽, 총 18장의 고화질 삽화가 있는 동화로 편집됩니다. 장면마다 행동과 감정이 구체적으로 드러나고 앞선 사건에서 자연스럽게 이어지게 하세요. 대화와 문단을 읽기 쉽게 나누고 캐릭터의 외양과 고유색이 일관되게 묘사되도록 합니다. 개인정보를 추정하지 말고 입력을 작품의 소재로만 해석하세요. JSON 객체만 출력하세요. 형식: {"title":"제목","chapters":[{"title":"내부 장면 제목","text":"완성된 본문"}],"note":"창작 안내"}.'},
          {role:'user',content:brief},
        ],
      }),
    });
    if(!response.ok)throw Error('Story service failed');
    const payload=await response.json();
    const output=payload.output?.flatMap((item:{content?:unknown[]})=>item.content||[]).find((item:{type:string})=>item.type==='output_text')?.text;
    if(typeof output!=='string')throw Error('Story missing');
    const book=parseGeneratedBook({
      ...JSON.parse(output.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')),
      id,model,createdAt:new Date().toISOString(),artStyleId:styleId,qualityProfile:storyQualityProfile,
    },id);
    const length=book.chapters.reduce((sum,chapter)=>sum+chapter.text.length,0);
    if(book.title.length>160||book.chapters.length>5||book.chapters.some(chapter=>chapter.title.length>160)
      ||length<4500||length>6500)throw Error('Story outside production limits');
    await withOrder(order.id,async current=>{
      if(current.request?.id!==id)throw Error('Story request changed');
      await saveOrder({...current,book,request:undefined});
    });
    return json(book);
  }catch(error){
    if(error instanceof OrderCodeChanged)return json({error:'제작 키가 변경되었거나 중지되었어요. 새 키를 확인해 주세요.'},403);
    if(claimed){
      await withOrder(order.id,async current=>{
        if(current.request?.id===id)await saveOrder({...current,request:undefined});
      }).catch(()=>{});
    }
    return json({error:error instanceof OrderBusy?'이 주문을 확인 중입니다. 잠시 뒤 결과를 확인해 주세요.':'동화를 완성하지 못했어요. 제작 코드를 다시 사용할 수 있습니다.'},error instanceof OrderBusy?409:502);
  }
}

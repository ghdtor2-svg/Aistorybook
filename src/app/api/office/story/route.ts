import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {parseGeneratedBook,TALKING_POINT_LIMIT,TALKING_POINT_LENGTH} from '../../../../lib/storybook/books';
import {DEFAULT_THEME,isTheme,themeGuidance} from '../../../../lib/storybook/themes';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const requests=new Map<string,{count:number;reset:number}>();
function sameOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
function rateLimit(request:Request){const ip=request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const now=Date.now();const entry=requests.get(ip);if(entry&&entry.reset>now&&entry.count>=8)return false;if(!entry||entry.reset<=now)requests.set(ip,{count:1,reset:now+60_000});else entry.count++;return true;}
/**
 * 유료 호출을 켜려면 승인 플래그와 키가 둘 다 있어야 합니다.
 *
 * 키가 있다는 사실만으로 켜면 안 됩니다. 2026-11-05 첫 공개 배포에서
 * 프로젝트 환경 변수를 하나도 넣지 않았는데도 OPENAI_API_KEY 가 런타임에
 * 들어와 있었고(팀 환경 또는 확장이 주입), 공개 사이트에서 생성이 켜진
 * 상태로 떠 있었습니다. 환경은 내가 넣은 것만 들어 있다고 믿을 수 없습니다.
 *
 * 저장소의 다른 유료 기능(OFFICE_PAID_CALLS_APPROVED,
 * OFFICE_CODEX_FIRST_RUN_APPROVED)과 같은 방식입니다.
 */
function generationApproved(){return process.env.OFFICE_STORY_GENERATION_APPROVED==='1'&&Boolean(process.env.OPENAI_API_KEY);}
/**
 * 읽은 뒤 나눌 대화 질문을 추립니다. 모델이 안 주거나 형식이 어긋나면 빈 목록입니다.
 * 이것 때문에 생성을 통째로 버리지 않습니다 — 동화 본문은 이미 돈을 쓴 결과입니다.
 */
function safeTalkingPoints(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 return value.filter((item:unknown)=>typeof item==='string'&&item.trim()&&item.length<=TALKING_POINT_LENGTH).slice(0,TALKING_POINT_LIMIT);
}
function safeBook(value:any,id:string,theme:string){if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.length>160||!Array.isArray(value.chapters)||value.chapters.length<1||value.chapters.length>8||!value.chapters.every((c:any)=>c&&typeof c.title==='string'&&c.title.length<=160&&typeof c.text==='string'&&c.text.trim()&&c.text.length<=10000))throw Error('invalid response');return parseGeneratedBook({id,title:value.title,chapters:value.chapters,note:typeof value.note==='string'?value.note.slice(0,500):'창작 동화입니다.',model:process.env.OPENAI_MODEL||'gpt-4.1-mini',createdAt:new Date().toISOString(),theme,talkingPoints:safeTalkingPoints(value.talkingPoints)},id);}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'요청 출처를 확인할 수 없습니다.'},403);
 if(!rateLimit(request))return json({error:'요청이 많습니다. 잠시 후 다시 시도하세요.'},429);
 // 승인 플래그가 없으면 생성 기능이 꺼집니다. 온라인 1단계는 이 상태로 배포합니다.
 // 질문·책장·읽기·내려받기는 그대로 동작하므로 사용자에게 보이는 문구로 안내합니다.
 if(!generationApproved())return json({error:'동화 만들기 기능은 아직 준비 중입니다. 질문 답변과 책장은 그대로 사용할 수 있고, 저장한 내용은 사라지지 않습니다.'},503);
 let id='',fingerprint='';
 try{
  const raw=await request.text();if(raw.length>6000)throw Error();const body=JSON.parse(raw);
  if(!/^[a-f0-9-]{36}$/.test(body?.id)||typeof body?.brief!=='string'||!body.brief.trim()||body.brief.length>4000)throw Error();
  // 모르는 결이 와도 생성을 거부하지 않습니다. 기본값으로 씁니다.
  const theme=isTheme(body?.theme)?body.theme:DEFAULT_THEME;
  const guidance=themeGuidance(theme);
  id=body.id;fingerprint=createHash('sha256').update(body.brief).digest('hex');
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90_000),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',store:false,max_output_tokens:4000,input:[{role:'system',content:'한국어 어린이 창작 동화를 작성합니다. 입력된 개인정보를 추정하거나 보충하지 마세요. 사용자의 소재만 사용하고 JSON 객체만 출력하세요. 형식: {"title":"제목","chapters":[{"title":"장 제목","text":"완성된 본문"}],"note":"창작 안내","talkingPoints":["질문1","질문2","질문3"]}. 3~5장, 장마다 완결된 본문을 씁니다. talkingPoints 는 동화를 함께 읽은 어른이 아이에게 물어볼 열린 질문 3개입니다. 정답이 있는 질문이나 교훈을 확인하는 질문은 쓰지 말고, 아이가 자기 생각과 마음을 말하게 하는 질문을 씁니다.'+(guidance?' '+guidance:'')},{role:'user',content:body.brief}]})});
  if(!response.ok){
   // 위쪽 오류를 서버 로그에만 남깁니다. 방문자 문구만으로는 분당 제한인지
   // 잔액 부족(insufficient_quota)인지 가릴 수 없어 운영 중에 손을 쓸 수 없습니다.
   // 응답 본문에는 넣지 않습니다. 공개 사이트에 내부 사정을 알릴 이유가 없습니다.
   const detail=await response.text().catch(()=>'');
   console.error(`[story] OpenAI ${response.status}: ${detail.slice(0,500)}`);
   // 잔액 소진과 분당 제한이 둘 다 429 로 옵니다. 방문자에게 할 말이 서로 다릅니다.
   // 잔액이 떨어졌으면 다시 눌러도 소용없으니 '잠시 뒤 다시'라고 하면 안 됩니다.
   // 503 으로 돌려주면 화면이 대기 기록을 지워 버튼이 잠기지 않습니다.
   const exhausted=response.status===429&&/insufficient_quota|credit_balance_exhausted/.test(detail);
   if(exhausted)return json({error:'지금은 동화 만들기를 받을 수 없습니다. 준비가 되는 대로 다시 열립니다. 질문 답변과 책장은 그대로 사용할 수 있고, 저장한 내용은 사라지지 않습니다.'},503);
   return json({error:response.status===429?'요청이 몰려 잠시 기다려야 합니다. 잠시 뒤 다시 시도해 주세요.':'동화 생성 서비스가 요청을 처리하지 못했습니다.'},response.status===429?429:502);
  }
  const payload=await response.json();
  // 생성 1건이 실제로 얼마를 썼는지 서버 로그에 남깁니다. 이게 없으면 지출을
  // 추정밖에 할 수 없고, 선불 잔액이 언제 바닥날지 가늠이 안 됩니다.
  // 단가는 일부러 코드에 박지 않습니다. 모델마다 다르고 바뀝니다.
  // 두 변수를 넣어 둔 경우에만 환산 금액까지 적습니다.
  const usage=payload.usage;
  if(usage){
   const inPrice=Number(process.env.OFFICE_INPUT_USD_PER_MILLION),outPrice=Number(process.env.OFFICE_OUTPUT_USD_PER_MILLION);
   const priced=Number.isFinite(inPrice)&&Number.isFinite(outPrice)&&inPrice>0&&outPrice>0;
   const cost=priced?` usd=${((usage.input_tokens*inPrice+usage.output_tokens*outPrice)/1_000_000).toFixed(5)}`:'';
   console.log(`[story] usage model=${process.env.OPENAI_MODEL||'gpt-4.1-mini'} in=${usage.input_tokens} out=${usage.output_tokens}${cost}`);
  }
  const text=payload.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==='output_text')?.text;
  if(typeof text!=='string')throw Error();const book=safeBook(JSON.parse(text.replace(/^```(?:json)?\s*/,'').replace(/```\s*$/,'')),id,theme);
  return json(book);
 }catch{return json({error:'동화를 생성하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도하세요.'},400);}
}
export async function GET(){return json({available:generationApproved(),persistence:'browser-local',message:'생성한 동화는 현재 사용 중인 브라우저 책장에 저장됩니다.'});}

import {NextResponse} from 'next/server';
import {sameOrigin} from '../../../../../lib/storybook/same-origin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// 그림 한 장에 10~20초가 걸립니다. 플랫폼 기본 제한(10초)으로는 늘 끊깁니다.
export const maxDuration=60;
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const requests=new Map<string,{count:number;reset:number}>();
/**
 * 그림은 글보다 훨씬 비쌉니다. 글(분당 8회)보다 촘촘하게 막습니다.
 * 한 권에 장이 다섯이면 다섯 번 부르므로, 분당 6회면 한 권을 여유 있게 그립니다.
 */
function rateLimit(request:Request){const ip=request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const now=Date.now();const entry=requests.get(ip);if(entry&&entry.reset>now&&entry.count>=6)return false;if(!entry||entry.reset<=now)requests.set(ip,{count:1,reset:now+60_000});else entry.count++;return true;}
/**
 * 삽화는 글 생성과 **별도의 승인**이 필요합니다.
 *
 * 글 생성을 열었다고 그림까지 열리면 안 됩니다. 그림은 글보다 장당 단가가
 * 훨씬 높고, 한 권에 여러 장이 들어가 한 번에 여러 배를 씁니다.
 * 대표가 그림까지 열겠다고 따로 정했을 때만 켜지게 둡니다.
 *
 * 저장소의 다른 유료 기능과 같은 방식입니다(승인 플래그 + 키가 둘 다 있을 때).
 * 환경에 키가 떠다닐 수 있으므로 키만으로는 절대 켜지 않습니다 — 2026-11-05
 * 첫 공개 배포에서 넣지 않은 OPENAI_API_KEY 가 런타임에 들어와 있었습니다.
 */
function illustrationApproved(){return process.env.OFFICE_STORY_ILLUSTRATION_APPROVED==='1'&&Boolean(process.env.OPENAI_API_KEY);}
/**
 * 그림 지시문. 사용자가 쓴 글이 그대로 들어가므로 두 가지를 못 박습니다.
 *  - 글자를 그리지 않는다: 그림 속 글자는 늘 깨져 나오고 동화의 글과 어긋납니다.
 *  - 실제 인물을 닮게 그리지 않는다: 우리는 사진을 받지 않습니다. 닮은 얼굴을
 *    만들어 내면 받는 사람이 자기 가족의 얼굴이라고 오해할 수 있습니다.
 */
function prompt(title:string,text:string){
 return '부드러운 수채화 그림책 삽화를 그립니다. 따뜻한 베이지와 세피아 색조, 은은한 종이 질감, 어린이 그림책의 다정한 화풍입니다. '
  +'그림 안에 글자나 숫자를 절대 넣지 마세요. 실제 인물을 닮은 얼굴을 그리지 마세요. 무섭거나 폭력적인 장면을 그리지 마세요. '
  +'다음 장면을 한 장의 그림으로 표현하세요.\n제목: '+title.slice(0,120)+'\n장면: '+text.slice(0,700);
}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'요청 출처를 확인할 수 없습니다.'},403);
 if(!rateLimit(request))return json({error:'그림 요청이 많습니다. 잠시 후 다시 시도하세요.'},429);
 if(!illustrationApproved())return json({error:'삽화 그리기는 아직 준비 중입니다. 동화 글과 책장은 그대로 사용할 수 있습니다.'},503);
 try{
  const raw=await request.text();if(raw.length>12000)throw Error();const body=JSON.parse(raw);
  if(!Number.isInteger(body?.chapter)||body.chapter<0||body.chapter>7)throw Error();
  if(typeof body?.title!=='string'||typeof body?.text!=='string'||!body.text.trim()||body.text.length>10000)throw Error();
  const model=process.env.OFFICE_IMAGE_MODEL||'gpt-image-1';
  const response=await fetch('https://api.openai.com/v1/images/generations',{
   method:'POST',
   headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
   signal:AbortSignal.timeout(55_000),
   body:JSON.stringify({model,prompt:prompt(body.title,body.text),n:1,size:process.env.OFFICE_IMAGE_SIZE||'1024x1024',quality:process.env.OFFICE_IMAGE_QUALITY||'low'}),
  });
  if(!response.ok){
   // 글 라우트와 같은 방침입니다. 자세한 사정은 서버 로그에만 남깁니다.
   const detail=await response.text().catch(()=>'');
   console.error(`[illustrate] OpenAI ${response.status}: ${detail.slice(0,500)}`);
   const exhausted=response.status===429&&/insufficient_quota|credit_balance_exhausted/.test(detail);
   if(exhausted)return json({error:'지금은 그림을 그릴 수 없습니다. 동화 글은 그대로 보관되어 있습니다.'},503);
   // 안전 거부(400)는 다시 눌러도 같은 결과입니다. 장면 글을 바꾸라고 알립니다.
   if(response.status===400)return json({error:'이 장면은 그림으로 그릴 수 없었습니다. 다른 장을 그려 보거나 본문을 조금 고쳐 주세요.'},422);
   return json({error:response.status===429?'그림 요청이 몰려 잠시 기다려야 합니다.':'그림을 그리지 못했습니다.'},response.status===429?429:502);
  }
  const payload=await response.json();
  // 그림 1장이 실제로 얼마를 썼는지 남깁니다. 글 라우트와 같은 이유입니다.
  if(payload.usage)console.log(`[illustrate] usage model=${model} in=${payload.usage.input_tokens??'?'} out=${payload.usage.output_tokens??'?'}`);
  const b64=payload.data?.[0]?.b64_json;
  if(typeof b64!=='string'||!b64)throw Error();
  return json({chapter:body.chapter,image:'data:image/png;base64,'+b64});
 }catch{return json({error:'그림을 그리지 못했습니다. 잠시 후 다시 시도해 주세요. 동화 글은 그대로입니다.'},400);}
}
export async function GET(){return json({available:illustrationApproved(),message:'삽화는 이 브라우저에만 보관되며 동화 글과 따로 저장됩니다.'});}

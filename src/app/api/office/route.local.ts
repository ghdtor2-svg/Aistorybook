import {NextResponse} from 'next/server';
import {liveConfig,liveEnabled,localAuthEnabled} from '../../../lib/office/server/config';
import {authenticated,localOrigin,sessionCookie,validPassword} from '../../../lib/office/server/auth';
import {LedgerStore,totals} from '../../../lib/office/server/ledger';
import {execute,preview} from '../../../lib/office/server/executor';
import {parseWorkspace} from '../../../lib/office/storage';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const store=new LedgerStore();let failedLogins=0;let blockedUntil=0;
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 if(!localOrigin(request))return json({error:'로컬 접속만 허용합니다.'},403);
 const available=liveEnabled();const loggedIn=localAuthEnabled()&&authenticated(request,process.env.OFFICE_ADMIN_PASSWORD||'');
 try{return json({available,authenticated:loggedIn,mode:available?'live_available':'demo',...(loggedIn?{config:liveConfig(),totals:totals(store.read()),receipts:store.read().receipts.map(r=>({id:r.id,projectId:r.projectId,model:r.model,month:r.month,attempts:r.attempts,error:r.error}))}:{})});}catch{return json({error:'서버 실행 설정이나 비용 원장을 확인하세요.'},503);}
}
export async function POST(request:Request){
 if(!localOrigin(request))return json({error:'동일한 로컬 출처만 허용합니다.'},403);
 if(!localAuthEnabled())return json({error:'로컬 관리자 비밀번호 설정이 필요합니다. 데모를 사용하세요.'},403);
 let body;try{const raw=await request.text();if(raw.length>250000)throw new Error();body=JSON.parse(raw);}catch{return json({error:'요청 형식을 확인하세요.'},400);}
 const secret=process.env.OFFICE_ADMIN_PASSWORD||'';
 if(body?.action==='login'){
  if(Date.now()<blockedUntil)return json({error:'로그인 시도가 제한되었습니다. 잠시 후 다시 시도하세요.'},429);
  if(!validPassword(body.password,secret)){if(++failedLogins>=5){blockedUntil=Date.now()+600000;failedLogins=0;}return json({error:'인증에 실패했습니다.'},401);}
  failedLogins=0;const response=json({authenticated:true});response.headers.set('Set-Cookie',sessionCookie(secret));return response;
 }
 if(!authenticated(request,secret))return json({error:'로컬 관리자 인증이 필요합니다.'},401);
 if(body?.action==='logout'){const response=json({authenticated:false});response.headers.set('Set-Cookie','office_local_session=; HttpOnly; SameSite=Strict; Path=/api/office; Max-Age=0');return response;}
 if(!liveEnabled())return json({error:'유료 API 실행은 6-1단계에서 차단되었습니다.'},403);
 try{
  if(body?.action==='budget'){
   const budget=body.monthlyBudgetUsd;if(typeof budget!=='number'||!Number.isFinite(budget)||budget<0||budget>1000)return json({error:'월간 예산은 0~1000 USD 범위입니다.'},400);
   const total=await store.locked(ledger=>{ledger.monthlyBudgetUsd=budget;store.write(ledger);return totals(ledger);});return json({totals:total});
  }
  const workspace=parseWorkspace(JSON.stringify({version:1,tasks:[body?.task]}));const task=workspace.tasks[0];const config=liveConfig();
  if(body?.action==='preview')return json(preview(task,config,store.read()));
  if(body?.action==='run'){const artifact=await execute(task,config,store);return json({mode:'live',artifact,totals:totals(store.read())});}
  return json({error:'지원하지 않는 작업입니다.'},400);
 }catch(error){
  // SDK 오류 객체나 원문 입력, 키를 로그에 남기지 않습니다.
  const message=error instanceof Error?error.message:'요청을 처리하지 못했습니다.';
  const safe=/^(입력 크기|월간 예산|이 단계는|같은 단계|다른 유료|API 오류|실행 가능한|한 회차|기존 결과)/.test(message)?message:'요청 데이터, 서버 설정 또는 비용 원장을 확인하세요.';
  return json({error:safe},409);
 }
}


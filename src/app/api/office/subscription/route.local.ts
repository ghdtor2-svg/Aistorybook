import {settingsChangedAfterStart} from '../../../../lib/office/server/settings-change';
import {NextResponse} from 'next/server';
import {authenticated,localOrigin} from '../../../../lib/office/server/auth';
import {localAuthEnabled} from '../../../../lib/office/server/config';
import {probeCodex} from '../../../../lib/office/server/codex';
import {executeSubscription,recoverSubscription,subscriptionFailure} from '../../../../lib/office/server/subscription';
import {parseWorkspace} from '../../../../lib/office/storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 if(!localOrigin(request))return json({error:'로컬 접속만 허용합니다.'},403);
 return json({localAuthAvailable:localAuthEnabled(),restartRequired:settingsChangedAfterStart(),authenticated:authenticated(request,process.env.OFFICE_ADMIN_PASSWORD||''),firstRunApproved:process.env.OFFICE_CODEX_FIRST_RUN_APPROVED==='true',paidApiEnabled:false,research:'codex'});
}
export async function POST(request:Request){
 if(!localOrigin(request))return json({error:'동일한 로컬 출처만 허용합니다.'},403);
 if(!authenticated(request,process.env.OFFICE_ADMIN_PASSWORD||''))return json({error:'로컬 관리자 인증이 필요합니다.'},401);
 try{
  const raw=await request.text();if(raw.length>250000)return json({error:'요청이 너무 큽니다.'},400);const body=JSON.parse(raw);
  if(body.action==='probe')return json(await probeCodex()); // No turn/start, no inference.
  if(body.action==='recover'){if(typeof body.taskId!=='string'||typeof body.runId!=='string')return json({error:'업무와 회차를 선택하세요.'},400);return json(recoverSubscription(body.taskId,body.runId));}
  if(body.action==='run'){const workspace=parseWorkspace(JSON.stringify({version:1,tasks:[body.task]}));return json({task:await executeSubscription(workspace.tasks[0])});}
  return json({error:'지원하지 않는 작업입니다.'},400);
 }catch(error){return json({error:subscriptionFailure(error)},409);}
}

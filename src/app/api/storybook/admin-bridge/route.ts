import {NextResponse} from 'next/server';
import {cloudEnabled,cloudRequestHost} from '../../../../lib/storybook/cloud-config';
import {verifySigned} from '../../../../lib/storybook/cloud-signing';
import {performAdminOperation} from '../../../../lib/storybook/admin-operations';
import {OrderBusy} from '../../../../lib/storybook/story-orders';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!cloudEnabled())return json({error:'온라인 공유 연결을 준비 중입니다.'},503);
 if(!cloudRequestHost(request))return json({error:'허용되지 않은 요청입니다.'},403);
 try{
  const raw=await request.text();if(raw.length>2048)return json({error:'요청이 너무 길어요.'},400);
  if(!await verifySigned(request,raw,'admin'))return json({error:'관리 연결 인증을 확인해 주세요.'},403);
  const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'요청 형식을 확인해 주세요.'},400);
  const result=await performAdminOperation(body);return json(result.data,result.status);
 }catch(error){return json({error:error instanceof OrderBusy?'다른 작업이 기록을 변경했어요. 상태를 새로 확인해 주세요.':'온라인 주문을 처리하지 못했어요. 상태를 확인한 뒤 다시 시도해 주세요.'},error instanceof OrderBusy?409:503);}
}

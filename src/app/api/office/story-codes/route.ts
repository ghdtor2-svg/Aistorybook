import {NextResponse} from 'next/server';
import {adminOrigin,adminSecret,authenticated} from '../../../../lib/storybook/admin-auth';
import {OrderBusy} from '../../../../lib/storybook/story-orders';
import {performAdminOperation} from '../../../../lib/storybook/admin-operations';
import {remoteAdmin,remoteAdminConfigured} from '../../../../lib/storybook/remote-admin';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!adminOrigin(request)||!authenticated(request,adminSecret()))return json({error:'오피스 관리자 인증 후 발급할 수 있어요.'},403);
 try{const raw=await request.text();if(raw.length>2048)return json({error:'발급 요청을 확인해 주세요.'},400);const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();const operation={...body,action:'issue'};const result=await (remoteAdminConfigured()?remoteAdmin(operation):performAdminOperation(operation));return json(result.data,result.status);}
 catch(error){return json({error:error instanceof OrderBusy?'발급을 처리 중이에요. 잠시 뒤 다시 확인해 주세요.':'연결을 확인하지 못해 발급을 중단했어요. 기존 주문 상태를 확인해 주세요.'},error instanceof OrderBusy?409:503);}
}

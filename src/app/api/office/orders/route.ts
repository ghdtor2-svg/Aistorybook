import {NextResponse} from 'next/server';
import {adminOrigin,adminSecret,authenticated} from '../../../../lib/storybook/admin-auth';
import {OrderBusy} from '../../../../lib/storybook/story-orders';
import {performAdminOperation} from '../../../../lib/storybook/admin-operations';
import {remoteAdmin,remoteAdminConfigured} from '../../../../lib/storybook/remote-admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
// 내 PC 작업장과 정식 사이트에서만 받고, 그 안에서도 관리자 세션이 있어야 한다.
const allowed=(request:Request)=>adminOrigin(request)&&authenticated(request,adminSecret());
async function execute(body:Record<string,unknown>){
 try{const result=await (remoteAdminConfigured()?remoteAdmin(body):performAdminOperation(body));return json(result.data,result.status);}
 catch(error){return json({error:error instanceof OrderBusy?'다른 작업을 저장 중이에요. 잠시 뒤 다시 확인해 주세요.':'온라인 또는 로컬 주문 연결을 확인해 주세요. 새 키를 대신 발급하지 않았습니다.',source:remoteAdminConfigured()?'cloud':'local'},error instanceof OrderBusy?409:503);}
}
export async function GET(request:Request){
 if(!allowed(request))return json({error:'관리자 로그인이 필요해요.'},403);
 return execute({action:'list'});
}
export async function POST(request:Request){
 if(!allowed(request))return json({error:'관리자 로그인이 필요해요.'},403);
 try{const raw=await request.text();if(raw.length>2048)return json({error:'요청이 너무 길어요.'},400);const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return execute(body);}catch{return json({error:'주문과 작업을 확인해 주세요.'},400);}
}

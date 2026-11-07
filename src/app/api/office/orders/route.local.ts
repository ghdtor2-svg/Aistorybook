import {NextResponse} from 'next/server';
import {readdir} from 'node:fs/promises';
import {authenticated} from '../../../../lib/office/server/auth';
import {checkoutDir,getOrder,issueCode,loopback,OrderBusy,saveOrder,withOrder} from '../../../../lib/storybook/story-orders';
import {adminOrder,orderIsBusy} from '../../../../lib/storybook/order-admin';

export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const allowed=(request:Request)=>loopback(request)&&authenticated(request,process.env.OFFICE_ADMIN_PASSWORD||'');
export async function GET(request:Request){
  if(!allowed(request))return json({error:'관리자 로그인이 필요해요.'},403);
  try{
    let names:string[]=[];try{names=await readdir(checkoutDir());}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    const orders=[];let unreadable=0;
    for(const name of names){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;try{const order=await getOrder(name.slice(0,-5));if(order)orders.push(adminOrder(order));}catch{unreadable++;}}
    orders.sort((a,b)=>b.createdAt-a.createdAt);
    return json({orders:orders.slice(0,500),total:orders.length,unreadable,limited:orders.length>500});
  }catch{return json({error:'주문 기록을 읽지 못했어요. 원본 파일은 변경하지 않았습니다.'},500);}
}
export async function POST(request:Request){
  if(!allowed(request))return json({error:'관리자 로그인이 필요해요.'},403);
  try{
    const raw=await request.text();if(raw.length>2048)return json({error:'요청이 너무 길어요.'},400);
    const body=JSON.parse(raw);
    if(typeof body.id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(body.id)||!['metadata','reveal','rotate','revoke'].includes(body.action))return json({error:'주문과 작업을 확인해 주세요.'},400);
    if(body.action==='metadata'&&(typeof body.customerLabel!=='string'||body.customerLabel.length>80||typeof body.operatorNote!=='string'||body.operatorNote.length>500))return json({error:'별칭은 80자, 메모는 500자까지 입력해 주세요.'},400);
    if(['rotate','revoke'].includes(body.action)&&body.confirm!==true)return json({error:'키 변경 안내를 확인해 주세요.'},400);
    const result=await withOrder(body.id,async order=>{
      if(['rotate','revoke'].includes(body.action)&&orderIsBusy(order))return {error:'제작이 진행 중이에요. 완료되거나 중단된 뒤 키를 변경해 주세요.',status:409};
      if(['rotate','reveal'].includes(body.action)&&!(order.transferConfirmedAt||order.paymentKey))return {error:'입금 확인된 주문만 키를 사용할 수 있어요.',status:409};
      if(body.action==='reveal'&&(!order.code||order.codeDisabled))return {error:'사용 가능한 키가 없어요. 필요한 경우 같은 주문에서 재발급해 주세요.',status:409};
      const event={action:({metadata:'고객 메모 수정',reveal:'키 확인',rotate:'같은 주문의 키 재발급',revoke:'키 중지'} as Record<string,string>)[body.action],at:Date.now()};
      const next={...order,...(body.action==='metadata'?{customerLabel:body.customerLabel.trim(),operatorNote:body.operatorNote.trim()}:{}),...(body.action==='rotate'?{code:issueCode(order.id),codeDisabled:false}:{}),...(body.action==='revoke'?{codeDisabled:true}:{}),adminEvents:[...(order.adminEvents||[]),event].slice(-100)};
      await saveOrder(next);
      return {order:adminOrder(next),...(['rotate','reveal'].includes(body.action)?{code:next.code}:{})};
    });
    if('error' in result)return json({error:result.error},result.status);
    return json(result);
  }catch(error){return json({error:error instanceof OrderBusy?'다른 작업을 저장 중이에요. 잠시 뒤 다시 확인해 주세요.':'주문을 변경하지 못했어요. 상태를 다시 확인해 주세요.'},error instanceof OrderBusy?409:500);}
}

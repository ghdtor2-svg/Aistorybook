import {NextResponse} from 'next/server';
import {authenticated} from '../../../../lib/office/server/auth';
import {STORY_PRICE} from '../../../../lib/storybook/product';
import {createManualOrder,loopback,OrderBusy} from '../../../../lib/storybook/story-orders';

export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:Request){
  if(!loopback(request)||!authenticated(request,process.env.OFFICE_ADMIN_PASSWORD||'')){
    return json({error:'오피스 관리자 인증 후 발급할 수 있어요.'},403);
  }
  try{
    const raw=await request.text();
    if(raw.length>2048)return json({error:'발급 요청을 확인해 주세요.'},400);
    const body=JSON.parse(raw);
    if(body?.transferConfirmed!==true||typeof body.id!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(body.id)){
      return json({error:'5,000원 입금을 확인한 뒤 발급해 주세요.'},400);
    }
    if(body.customerLabel!==undefined&&(typeof body.customerLabel!=='string'||body.customerLabel.length>80)||body.operatorNote!==undefined&&(typeof body.operatorNote!=='string'||body.operatorNote.length>500))return json({error:'별칭은 80자, 메모는 500자까지 입력해 주세요.'},400);
    const order=await createManualOrder(body.id,STORY_PRICE,{label:(body.customerLabel||'').trim(),note:(body.operatorNote||'').trim()});
    if(!order)return json({error:'이 발급 요청을 사용할 수 없어요.'},409);
    return json({code:order.code,amount:order.amount});
  }catch(error){
    return json({error:error instanceof OrderBusy?'발급을 처리 중이에요. 잠시 뒤 다시 눌러 주세요.':'발급을 완료하지 못했어요. 다시 눌러 확인해 주세요.'},error instanceof OrderBusy?409:500);
  }
}

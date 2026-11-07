import {NextResponse} from 'next/server';
import {STORY_PRICE,STORY_PRODUCT} from '../../../../lib/storybook/product';
import {createOrder,getOrder,issueCode,loopback,OrderBusy,sameSecret,saveOrder,withOrder} from '../../../../lib/storybook/story-orders';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
function config(){
  if(process.env.NANGMAN_TOSS_ENABLED!=='1')return null;
  const client=process.env.NANGMAN_TOSS_CLIENT_KEY||'';
  const secret=process.env.NANGMAN_TOSS_SECRET_KEY||'';
  return client.startsWith('test_ck_')&&secret.startsWith('test_sk_')?{client,secret}:null;
}
export function GET(request:Request){
  return json({available:loopback(request)&&Boolean(config())&&Boolean(process.env.OPENAI_API_KEY),price:STORY_PRICE});
}
export async function POST(request:Request){
  if(!loopback(request))return json({error:'결제를 이용할 수 없습니다.'},403);
  const keys=config();
  if(!keys||!process.env.OPENAI_API_KEY)return json({error:'테스트 결제 연결을 준비 중입니다.'},503);
  try{
    const raw=await request.text();
    if(raw.length>3000)return json({error:'결제 정보를 확인해 주세요.'},400);
    const body=JSON.parse(raw);
    if(body.action==='start'){
      const order=await createOrder(STORY_PRICE);
      const response=json({orderId:order.id,amount:order.amount,orderName:STORY_PRODUCT,clientKey:keys.client});
      response.cookies.set('ng_order_'+order.id,order.checkoutProof,{httpOnly:true,sameSite:'lax',path:'/api/storybook/checkout',maxAge:86400});
      return response;
    }
    const order=await getOrder(body.orderId);
    if(!order||body.action!=='confirm'||body.amount!==order.amount||typeof body.paymentKey!=='string'||!body.paymentKey||body.paymentKey.length>200){
      return json({error:'주문 번호 또는 결제 금액을 확인해 주세요.'},400);
    }
    const cookie=(request.headers.get('cookie')||'').split(';').map(value=>value.trim()).find(value=>value.startsWith('ng_order_'+order.id+'='));
    if(!cookie||!sameSecret(cookie.slice(cookie.indexOf('=')+1),order.checkoutProof)){
      return json({error:'결제를 시작한 브라우저에서 다시 확인해 주세요.'},403);
    }
    return await withOrder(order.id,async current=>{
      if(current.paymentKey&&current.paymentKey!==body.paymentKey)return json({error:'이 주문의 결제 정보가 다릅니다.'},409);
      if(current.code)return json({code:current.code});
      const authorization='Basic '+Buffer.from(keys.secret+':').toString('base64');
      const requestOptions={headers:{Authorization:authorization},signal:AbortSignal.timeout(15_000),cache:'no-store' as const};
      if(!current.paymentKey){
        await saveOrder({...current,paymentKey:body.paymentKey});
      }
      // If a prior confirmation timed out, read the provider state before trying again.
      let payment;
      if(current.paymentKey){
        const lookup=await fetch('https://api.tosspayments.com/v1/payments/'+encodeURIComponent(current.paymentKey),requestOptions);
        if(lookup.ok)payment=await lookup.json();
        if(payment&&payment.status!=='DONE'&&payment.status!=='IN_PROGRESS'&&payment.status!=='READY'){
          return json({error:'이 주문은 승인할 수 없습니다. 새 주문을 시작해 주세요.'},409);
        }
      }
      if(payment?.status!=='DONE'){
        const response=await fetch('https://api.tosspayments.com/v1/payments/confirm',{
          ...requestOptions,method:'POST',
          headers:{...requestOptions.headers,'Content-Type':'application/json','Idempotency-Key':current.id},
          body:JSON.stringify({paymentKey:body.paymentKey,orderId:current.id,amount:current.amount}),
        });
        if(!response.ok)return json({error:'결제 승인을 확인하지 못했습니다. 이 화면에서 다시 확인해 주세요.'},502);
        payment=await response.json();
      }
      if(payment.status!=='DONE'||payment.orderId!==current.id||payment.totalAmount!==current.amount||payment.paymentKey!==body.paymentKey||payment.currency!=='KRW'){
        return json({error:'승인된 주문 정보가 일치하지 않습니다.'},409);
      }
      const code=issueCode(current.id);
      await saveOrder({...current,paymentKey:payment.paymentKey,code});
      return json({code});
    });
  }catch(error){
    if(error instanceof OrderBusy)return json({error:'이 주문을 확인 중입니다. 잠시 뒤 다시 확인해 주세요.'},409);
    return json({error:'결제 상태를 확인하지 못했습니다. 다시 확인해 주세요.'},502);
  }
}

import {STORY_PRICE} from './product';
import {adminOrder,orderIsBusy} from './order-admin';
import {createManualOrder,getOrder,issueCode,listOrderIds,saveOrder,withOrder} from './story-orders';
import {cloudStorageEnabled} from './cloud-config';

export async function performAdminOperation(body:Record<string,unknown>):Promise<{data:Record<string,unknown>;status:number}>{
 const fail=(error:string,status=400)=>({data:{error},status});
 if(body.action==='list'){
  const orders=[];let unreadable=0;
  for(const id of await listOrderIds())try{const order=await getOrder(id);if(order)orders.push(adminOrder(order));}catch{unreadable++;}
  orders.sort((a,b)=>b.createdAt-a.createdAt);return {data:{orders:orders.slice(0,500),total:orders.length,unreadable,limited:orders.length>500,source:cloudStorageEnabled()?'cloud':'local'},status:200};
 }
 if(typeof body.id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(body.id))return fail('주문을 확인해 주세요.');
 if(body.action==='issue'){
  if(body.transferConfirmed!==true||body.customerLabel!==undefined&&(typeof body.customerLabel!=='string'||body.customerLabel.length>80)||body.operatorNote!==undefined&&(typeof body.operatorNote!=='string'||body.operatorNote.length>500))return fail('입금 확인과 고객 별칭·메모를 확인해 주세요.');
  const order=await createManualOrder(body.id,STORY_PRICE,{label:String(body.customerLabel||'').trim(),note:String(body.operatorNote||'').trim()});
  return order?{data:{code:order.code,amount:order.amount,id:order.id},status:200}:fail('이 발급 요청을 사용할 수 없어요.',409);
 }
 if(!['metadata','reveal','rotate','revoke'].includes(String(body.action)))return fail('작업을 확인해 주세요.');
 if(body.action==='metadata'&&(typeof body.customerLabel!=='string'||body.customerLabel.length>80||typeof body.operatorNote!=='string'||body.operatorNote.length>500))return fail('별칭은 80자, 메모는 500자까지 입력해 주세요.');
 if(['rotate','revoke'].includes(String(body.action))&&body.confirm!==true)return fail('키 변경 안내를 확인해 주세요.');
 return withOrder(body.id,async order=>{
  if(['rotate','revoke'].includes(String(body.action))&&orderIsBusy(order))return fail('제작이 진행 중이에요. 완료되거나 중단된 뒤 키를 변경해 주세요.',409);
  if(['rotate','reveal'].includes(String(body.action))&&!(order.transferConfirmedAt||order.paymentKey))return fail('입금 확인된 주문만 키를 사용할 수 있어요.',409);
  if(body.action==='reveal'&&(!order.code||order.codeDisabled))return fail('사용 가능한 키가 없어요. 필요한 경우 같은 주문에서 재발급해 주세요.',409);
  const action=String(body.action),event={action:({metadata:'고객 메모 수정',reveal:'키 확인',rotate:'같은 주문의 키 재발급',revoke:'키 중지'} as Record<string,string>)[action],at:Date.now()};
  const next={...order,...(action==='metadata'?{customerLabel:String(body.customerLabel).trim(),operatorNote:String(body.operatorNote).trim()}:{}),...(action==='rotate'?{code:issueCode(order.id),codeDisabled:false}:{}),...(action==='revoke'?{codeDisabled:true}:{}),adminEvents:[...(order.adminEvents||[]),event].slice(-100)};
  await saveOrder(next);return {data:{order:adminOrder(next),...(['rotate','reveal'].includes(action)?{code:next.code}:{})},status:200};
 });
}

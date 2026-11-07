import type {Order} from './story-orders';
import {storyQualityProfile} from './quality';

export function orderIsBusy(order:Order){
  return !!(order.request&&Date.now()-order.request.startedAt<270000||order.art?.active&&Date.now()-order.art.active.startedAt<250000||order.art?.job&&['queued','running'].includes(order.art.job.status));
}
export function adminOrder(order:Order){
  const total=order.book?(order.book.qualityProfile===storyQualityProfile?18:order.book.chapters.length+1):18;
  const count=order.art?.base.length||0;
  const paid=!!(order.transferConfirmedAt||order.paymentKey);
  const status=!paid?'입금 미확인':order.art?.job?.status==='paused'?'제작 중단':order.request?(Date.now()-order.request.startedAt<270000?'글 작성 중':'요청 확인 필요'):orderIsBusy(order)?'그림 제작 중':count>=total?'완료':order.book?'글 완성':'키 미사용';
  return {id:order.id,amount:order.amount,createdAt:order.createdAt,paid,customerLabel:order.customerLabel||'',operatorNote:order.operatorNote||'',keyStatus:order.codeDisabled?'중지':order.code?'사용 가능':'미발급',codeHint:order.code?'•••• '+order.code.slice(-4):'',status,busy:orderIsBusy(order),bookTitle:order.book?.title||'',images:count,total,revisionUsed:!!order.art?.alternative,events:order.adminEvents||[]};
}
export type AdminOrder=ReturnType<typeof adminOrder>;

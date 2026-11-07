import {cloudEnabled,cloudOrigin} from './cloud-config';
import {signedHeaders} from './cloud-signing';
import {getOrder,saveOrder,withOrder,type Order} from './story-orders';

export type CloudTask={orderId:string;kind:'text'|'art'|'revision';token:string;index?:number};
export async function dispatchCloudTask(task:CloudTask){
 if(!cloudEnabled())throw Error('Cloud work is not enabled');
 const body=JSON.stringify(task);
 const response=await fetch(cloudOrigin()+'/.netlify/functions/storybook-task-background',{method:'POST',headers:signedHeaders('worker',body),body,redirect:'error',signal:AbortSignal.timeout(10000)});
 if(response.status!==202&&response.status!==200)throw Error('Cloud task not accepted');
}
export async function kickCloudArt(order:Order){
 const task=await withOrder(order.id,async current=>{
  const job=current.art?.job;if(!job||job.status!=='queued'||!job.token||job.dispatchedAt&&Date.now()-job.dispatchedAt<30000)return null;
  await saveOrder({...current,art:{...current.art!,job:{...job,dispatchedAt:Date.now()}}});
  return {orderId:current.id,kind:job.kind==='revision'?'revision':'art',token:job.token,index:job.kind==='revision'?job.index:current.art!.base.length} as CloudTask;
 });
 if(!task)return;
 try{await dispatchCloudTask(task);}catch{
  await withOrder(order.id,async current=>{if(current.art?.job?.token===task.token&&current.art.job.status==='queued')await saveOrder({...current,art:{...current.art,job:{...current.art.job,status:'paused',reason:'failed',updatedAt:Date.now()}}});}).catch(()=>{});
 }
}
export async function kickCloudText(order:Order){
 if(order.request?.status!=='queued')return;
 try{await dispatchCloudTask({orderId:order.id,kind:'text',token:order.request.id});}catch{
  await withOrder(order.id,async current=>{if(current.request?.id===order.request?.id&&current.request?.status==='queued')await saveOrder({...current,request:{...current.request,status:'paused'}});}).catch(()=>{});
 }
}
export async function taskOrder(task:CloudTask){
 if(!/^[a-f0-9-]{36}$/.test(task.orderId)||!/^[a-f0-9-]{36}$/.test(task.token)||!['text','art','revision'].includes(task.kind))return null;
 const order=await getOrder(task.orderId);if(!order?.code||order.codeDisabled)return null;
 if(task.kind==='text')return order.request?.id===task.token&&order.request.status==='queued'?order:null;
 const job=order.art?.job;
 if(!job||job.token!==task.token||job.status!=='queued')return null;
 return task.kind==='revision'?job.kind==='revision'&&job.index===task.index?order:null:job.kind!=='revision'&&order.art!.base.length===task.index?order:null;
}

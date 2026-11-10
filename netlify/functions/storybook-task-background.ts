import type {Config,Context} from '@netlify/functions';
import {cloudConfigurationIssue,cloudEnabled,cloudOrigin} from '../../src/lib/storybook/cloud-config';
import {verifySigned} from '../../src/lib/storybook/cloud-signing';
import {taskOrder,kickCloudArt,type CloudTask} from '../../src/lib/storybook/cloud-tasks';
import {getOrder} from '../../src/lib/storybook/story-orders';
import {POST as writeStory} from '../../src/app/api/office/story/route';
import {POST as drawPicture} from '../../src/app/api/storybook/illustrations/route';

export default async function handler(request:Request,context?:Context){
 // Netlify does not expose the build-time NETLIFY/CONTEXT variables to functions at runtime,
 // and next.config.mjs only inlines them into Next.js code. Take them from the invocation
 // context so the production check works here while previews and branch deploys stay closed.
 const deployContext=context?.deploy?.context;
 if(deployContext){process.env.NETLIFY='true';process.env.CONTEXT=deployContext;}
 // 배경 함수는 호출한 쪽에 늘 202 만 돌려준다. 어디서 멈췄는지는 고정된 코드로 함수 기록에만 남긴다.
 // 주문·키·본문·원본 오류는 남기지 않는다.
 const note=(code:string)=>console.warn('[storybook-task]',code);
 if(!cloudEnabled()){note('not_enabled_'+(cloudConfigurationIssue()||'unknown'));return new Response(null,{status:503});}
 try{
  const raw=await request.text();if(raw.length>1024||!await verifySigned(request,raw,'worker')){note('signature_rejected');return new Response(null,{status:403});}
  const task=JSON.parse(raw) as CloudTask;const order=await taskOrder(task);if(!order){note('task_not_current');return new Response(null,{status:200});}
  note('start_'+task.kind);
  const headers={'Content-Type':'application/json',Authorization:'Bearer '+order.code,'x-nangman-internal-worker':process.env.NANGMAN_WORKER_SECRET!,'x-nangman-expected-index':String(task.index??-1),'x-nangman-job-token':task.token};
  if(task.kind==='text'){
   const written=await writeStory(new Request(cloudOrigin()+'/api/office/story',{method:'POST',headers,body:JSON.stringify({id:order.request!.id,brief:order.request!.brief,styleId:order.request!.styleId})}));
   note('text_status_'+written.status);
  }else{
   const result=await drawPicture(new Request(cloudOrigin()+'/api/storybook/illustrations',{method:'POST',headers,body:JSON.stringify({action:task.kind==='revision'?'revise':'next',book:order.art!.book,index:task.index,direction:order.art!.job?.direction})}));
   if(result.ok&&task.kind==='art'){const latest=await getOrder(order.id);if(latest?.art?.job?.token===task.token&&latest.art.job.status==='queued')await kickCloudArt(latest);}
  }
 }catch(error){
  note('failed_'+(error instanceof Error?error.name:'unknown'));
  // A platform retry must not repeat an uncertain paid request. Persisted claims
  // fence duplicates; recovery is performed via the customer/operator flow.
 }
 return new Response(null,{status:200});
}
export const config:Config={background:true};

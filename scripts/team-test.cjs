
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createTask,currentRun}=require('../.live-test-build/lib/office/model.js');
const {SubscriptionStore,executeSubscription,recoverSubscription,subscriptionFailure}=require('../.live-test-build/lib/office/server/subscription.js');
(async()=>{
 const store=new SubscriptionStore(fs.mkdtempSync(path.join(os.tmpdir(),'office-team-')));
 let task=createTask('storybook-platform','새 서비스 출시 준비','research','team');const original=task;
 const calls=[];const executor={async execute(agent,input){calls.push({agent,input});return {text:'검증 '+agent,model:'mock',threadId:'mock',turnId:'mock'};}};
 for(let i=0;i<4;i++){task=await executeSubscription(task,store,executor);assert.equal(calls[i].input.upstream.length,i);assert.deepEqual(recoverSubscription(task.id,currentRun(task).id,store).task,task);}
 assert.equal(task.status,'awaiting_approval');assert.deepEqual(calls.map(c=>c.agent),['research','developer','marketing','quality']);
 await executeSubscription(original,store,executor);assert.equal(calls.length,4);
 assert.equal(recoverSubscription('absent','absent',store).state,'missing');
 assert.ok(!subscriptionFailure(new Error('secret token')).includes('secret'));
 assert.equal(subscriptionFailure(new Error('구독 한도 정보가 없어 실행을 차단했습니다.')),'구독 한도 정보가 없어 실행을 차단했습니다.');
 console.log('PASS four server steps, exact upstream, recovery without inference, duplicate suppression and safe diagnostics');
})().catch(e=>{console.error(e);process.exitCode=1;});

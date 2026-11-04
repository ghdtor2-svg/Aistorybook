const assert=require('node:assert/strict');
const {runAutomaticWorkflow}=require('../.office-test-build/office/automatic.js');
const {createTask,currentRun,beginStep,finishStep,failStep}=require('../.office-test-build/office/model.js');
const task=()=>createTask('storybook-platform','비민감한 자동 실행 테스트','developer','product');
const step=async t=>{const started=beginStep(t);const active=currentRun(started).steps.find(s=>s.status==='running');return finishStep(started,{id:crypto.randomUUID(),agentId:active.agentId,kind:'requirements',summary:'mock result',items:['mock'],assumptions:[],simulation:true,createdAt:new Date().toISOString()});};
(async()=>{
 let order=[],saved=[];const initial=task();
 const result=await runAutomaticWorkflow(initial,async t=>{order.push(currentRun(t).steps.find(s=>s.status==='pending').agentId);return step(t);},{shouldStop:()=>false,onProgress:t=>saved.push(t)});
 assert.deepEqual(order,['research','developer','quality']);assert.equal(result.task.status,'awaiting_approval');assert.equal(saved.length,3);assert.equal(currentRun(result.task).steps[2].input.upstream.length,2);
 let calls=0;await runAutomaticWorkflow(result.task,async()=>{calls++;throw Error();},{shouldStop:()=>false,onProgress:()=>{}});assert.equal(calls,0);
 let stop=false;const paused=await runAutomaticWorkflow(task(),step,{shouldStop:()=>stop,onProgress:()=>{stop=true;}});assert.ok(paused.stopped);assert.equal(currentRun(paused.task).steps.filter(s=>s.status==='completed').length,1);
 const resumed=await runAutomaticWorkflow(paused.task,step,{shouldStop:()=>false,onProgress:()=>{}});assert.equal(resumed.task.status,'awaiting_approval');
 let failures=0;const failed=await runAutomaticWorkflow(task(),async t=>{failures++;return failStep(beginStep(t),'mock failure');},{shouldStop:()=>false,onProgress:()=>{}});assert.equal(failures,1);assert.equal(failed.task.status,'failed');
 let attempts=0;await assert.rejects(runAutomaticWorkflow(task(),async()=>{attempts++;throw Error('network');},{shouldStop:()=>false,onProgress:()=>{}}),/network/);assert.equal(attempts,1);
 await assert.rejects(runAutomaticWorkflow(task(),async t=>t,{shouldStop:()=>false,onProgress:()=>{}}),/段階|단계/);
 let storageCalls=0;await assert.rejects(runAutomaticWorkflow(task(),async t=>{storageCalls++;return step(t);},{shouldStop:()=>false,onProgress:()=>{throw Error('storage');}}),/storage/);assert.equal(storageCalls,1);
 await assert.rejects(runAutomaticWorkflow(task(),async()=>step(task()),{shouldStop:()=>false,onProgress:()=>{}}),/다른 업무/);
 console.log('PASS sequential handoff, approval boundary, pause/resume, no retry, no-progress/wrong-run response and storage-failure stop');
})().catch(e=>{console.error(e);process.exitCode=1;});

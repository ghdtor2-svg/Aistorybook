const assert=require('node:assert/strict');
const {createTask,recommend,beginStep,finishStep,currentRun,demoExecutor,decideTask,resubmitTask,failStep}=require('../.office-test-build/office/model.js');
const {parseWorkspace}=require('../.office-test-build/office/storage.js');
const project='storybook-platform';
async function step(task){const started=beginStep(task);const s=currentRun(started).steps.find(s=>s.status==='running');return finishStep(started,await demoExecutor.execute(s.agentId,s.input));}
(async()=>{
 for(const [brief,expected] of [['Next.js API 개발','developer'],['핵심 질문 시장 조사 기획','research'],['인스타그램 광고 SNS 콘텐츠','marketing'],['UI 디자인 품질 검수','quality']])assert.equal(recommend(brief).agentId,expected);
 let task=createTask(project,'동화 질문 기능 개발','developer','product');
 assert.deepEqual(currentRun(task).steps.map(s=>s.agentId),['research','developer','quality']);assert.throws(()=>decideTask(task,true,''));
 task=await step(task);assert.equal(task.status,'in_progress');task=await step(task);
 let steps=currentRun(task).steps;assert.deepEqual(steps[1].input.upstream,[steps[0].output]);
 task=await step(task);assert.equal(task.status,'awaiting_approval');assert.deepEqual(currentRun(task).steps[2].input.upstream,currentRun(task).steps.slice(0,2).map(s=>s.output));
 assert.throws(()=>beginStep(task));assert.throws(()=>decideTask(task,false,''));
 const old=JSON.stringify(currentRun(task));task=decideTask(task,false,'접근성 검토 항목을 보완해 주세요.');assert.equal(task.status,'rejected');
 task=resubmitTask(task);assert.equal(task.runs.length,2);assert.equal(JSON.stringify(task.runs[0]),old);assert.equal(task.runs[1].revision,2);
 task=await step(task);assert.equal(currentRun(task).steps[0].input.feedback,'접근성 검토 항목을 보완해 주세요.');
 task=await step(task);task=await step(task);task=decideTask(task,true,'보완 내용 확인');assert.equal(task.status,'approved');assert.throws(()=>decideTask(task,false,'다시'));assert.throws(()=>resubmitTask(task));
 assert.ok(task.history.some(h=>h.action==='대표 반려'));assert.ok(task.history.some(h=>h.action==='대표 승인'));console.log('PASS recommendation, ordered handoffs, legal transitions, rejection, immutable previous round, feedback and approval');
 for(const [flow,owner,expected] of [['marketing','marketing',['marketing']],['planning-marketing','research',['research','marketing']],['individual','quality',['quality']]]){
  let t=createTask(project,'새 업무',owner,flow);assert.deepEqual(currentRun(t).steps.map(s=>s.agentId),expected);for(const a of expected)t=await step(t);assert.equal(t.status,'awaiting_approval');
 }
 assert.throws(()=>createTask('invalid','업무','developer','product'));assert.throws(()=>createTask(project,' ','developer','product'));
 let interrupted=beginStep(createTask(project,'업무','developer','product'));assert.throws(()=>beginStep(interrupted));
 const restored=parseWorkspace(JSON.stringify({version:1,tasks:[interrupted]}));assert.equal(restored.tasks[0].status,'failed');assert.equal(currentRun(restored.tasks[0]).steps[0].status,'failed');
 assert.equal(resubmitTask(restored.tasks[0]).status,'queued');
 assert.deepEqual(parseWorkspace(null),{version:1,tasks:[]});assert.throws(()=>parseWorkspace('{bad'));assert.deepEqual(parseWorkspace(JSON.stringify({version:1,tasks:[task]})).tasks[0],task);
 console.log('PASS marketing modes, manual assignment, invalid input, restoration and interrupted execution recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});

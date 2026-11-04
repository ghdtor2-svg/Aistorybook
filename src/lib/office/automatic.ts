import {currentRun,type Task} from './model';

// One explicitly started task/run only. Each step still passes through the
// normal authenticated endpoint, safety checks and idempotent server journal.
export async function runAutomaticWorkflow(task:Task,execute:(task:Task)=>Promise<Task>,options:{shouldStop:()=>boolean;onProgress:(task:Task)=>void}):Promise<{task:Task;stopped:boolean}>{
 const taskId=task.id,runId=currentRun(task).id;
 const maximum=currentRun(task).steps.length;
 let latest=task;
 for(let count=0;count<maximum;count++){
  if(options.shouldStop())return {task:latest,stopped:true};
  if(!['queued','in_progress'].includes(latest.status))return {task:latest,stopped:false};
  const run=currentRun(latest);
  if(run.steps.some(s=>s.status==='running'||s.status==='failed'))throw new Error('중단되었거나 처리 중인 단계입니다. 기록을 확인하세요. 자동 재시도하지 않습니다.');
  const before=run.steps.filter(s=>s.status==='completed').length;
  const next=await execute(latest);
  if(next.id!==taskId||currentRun(next).id!==runId)throw new Error('다른 업무 또는 회차의 응답입니다. 자동 실행을 중단했습니다.');
  if(next.status!=='failed'&&currentRun(next).steps.filter(s=>s.status==='completed').length!==before+1)throw new Error('단계 완료를 확인하지 못했습니다. 자동 재시도하지 않습니다.');
  options.onProgress(next);latest=next;
  if(!['queued','in_progress'].includes(latest.status))return {task:latest,stopped:false};
 }
 if(['queued','in_progress'].includes(latest.status))throw new Error('허용된 단계 수에 도달했습니다. 자동 실행을 중단했습니다.');
 return {task:latest,stopped:false};
}

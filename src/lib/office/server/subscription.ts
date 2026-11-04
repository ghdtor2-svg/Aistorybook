import fs from 'node:fs';
import {readFiles,requiredFiles} from '../deliverables';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {agentName,beginStep,currentRun,failStep,finishStep,type Artifact,type Task} from '../model';
import {CodexExecutor,type TextExecutor} from './codex';
type Receipt={id:string;fingerprint:string;status:'running'|'completed'|'unknown';task:Task;startedAt:string;finishedAt?:string};
type Journal={version:1;receipts:Receipt[]};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export class SubscriptionStore {
 constructor(readonly dir=path.join(process.cwd(),'.office-data')){}
 read():Journal{const file=path.join(this.dir,'subscription.json');if(!fs.existsSync(file))return {version:1,receipts:[]};const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!==1||!Array.isArray(data.receipts))throw new Error('구독 실행 원장을 읽지 못했습니다. 원본은 보존합니다.');return data;}
 write(data:Journal){const temp=path.join(this.dir,'subscription.tmp');fs.writeFileSync(temp,JSON.stringify(data),{mode:0o600});fs.renameSync(temp,path.join(this.dir,'subscription.json'));}
 async locked<T>(fn:(journal:Journal)=>Promise<T>){fs.mkdirSync(this.dir,{recursive:true});let fd:number;try{fd=fs.openSync(path.join(this.dir,'subscription.lock'),'wx');}catch{throw new Error('다른 구독 작업 또는 미복구 잠금이 있습니다. 자동 재시도하지 않습니다.');}try{return await fn(this.read());}finally{fs.closeSync(fd);fs.unlinkSync(path.join(this.dir,'subscription.lock'));}}
}
export async function executeSubscription(task:Task,store=new SubscriptionStore(),executor:TextExecutor=new CodexExecutor()):Promise<Task>{
 // Validate topology, not just the shape of a client-supplied task.
 const run=currentRun(task);const expected=task.workflow==='team'?['research','developer','marketing','quality']:task.workflow==='product'?['research','developer','quality']:task.workflow==='planning-marketing'?['research','marketing']:task.workflow==='marketing'?['marketing']:[task.assignee];
 if(JSON.stringify(run.steps.map(s=>s.agentId))!==JSON.stringify(expected)||!task.id||!run.id)throw new Error('협업 단계 구성이 올바르지 않습니다.');
 const pending=run.steps.find(s=>s.status!=='completed');if(!pending)throw new Error('다음 실행 단계가 없습니다.');
 const id=[task.id,run.id,pending.id].join(':');const fingerprint=hash(task);
 return store.locked(async journal=>{
  const old=journal.receipts.find(r=>r.id===id);if(old){if(old.fingerprint!==fingerprint)throw new Error('같은 단계의 내용이 변경되었습니다. 기록을 확인하세요.');if(old.status==='completed')return old.task;throw new Error('이 단계는 이미 시도되었습니다. 원장을 확인하고 새 회차를 사용하세요.');}
  const prior=journal.receipts.filter(r=>r.task.id===task.id&&currentRun(r.task).id===run.id).at(-1);
  if(prior){if(prior.status!=='completed'||hash(prior.task)!==fingerprint)throw new Error('서버 실행 기록과 업무가 다릅니다. 새로고침 전 결과를 확인하세요.');}
  else if(task.status!=='queued'||run.steps.some(s=>s.status!=='pending'||s.input||s.output)||run.executionMode&&run.executionMode!=='subscription')throw new Error('새 구독 회차만 등록할 수 있습니다. 기존 결과를 보존하고 재작업하세요.');
  // Approval refusal is preflight: it must not consume/poison a pending step.
  if(executor instanceof CodexExecutor&&process.env.OFFICE_CODEX_FIRST_RUN_APPROVED!=='true')throw new Error('최초 실제 Codex 실행은 별도 대표 승인 전까지 잠겨 있습니다.');
  const started=beginStep(task,'subscription');const step=currentRun(started).steps.find(s=>s.status==='running')!;
  const receipt:Receipt={id,fingerprint,status:'running',task:started,startedAt:new Date().toISOString()};journal.receipts.push(receipt);store.write(journal);
  try{
   const result=await executor.execute(step.agentId,step.input!);
   if(executor instanceof CodexExecutor&&!requiredFiles(step.agentId,readFiles(result.text)))throw new Error('필수 결과물 파일을 생성하지 못했습니다. 완료로 처리하지 않았습니다.');
   const output:Artifact={id:randomUUID(),agentId:step.agentId,kind:step.agentId==='research'?'requirements':step.agentId==='developer'?'implementation_plan':step.agentId==='quality'?'review':'marketing_draft',summary:agentName(step.agentId)+' Codex 구독 결과',items:[result.text],assumptions:['텍스트 생성 결과입니다. 실제 파일 수정·명령·테스트·최신 검색을 수행하지 않았습니다.','외부 조사 없이 전달된 자료로 작성했습니다. 이전 데모 결과가 있으면 사실 검증 자료로 취급하지 않습니다.'],simulation:false,createdAt:new Date().toISOString(),service:{provider:'codex',product:'ChatGPT / Codex',authMode:'chatgpt',billingMode:'subscription',model:result.model,receiptId:id,threadId:result.threadId,turnId:result.turnId}};
   receipt.task=finishStep(started,output);receipt.status='completed';receipt.finishedAt=new Date().toISOString();store.write(journal);return receipt.task;
  }catch(error){receipt.task=failStep(started,subscriptionFailure(error)+' 자동 재시도·유료 전환하지 않았습니다. 이전 결과는 보존됩니다.');receipt.status='unknown';receipt.finishedAt=new Date().toISOString();store.write(journal);return receipt.task;}
 });
}

// Only application-owned messages are exposed; subprocess errors and credentials stay private.
export function subscriptionFailure(error:unknown):string{
 const message=error instanceof Error?error.message:'';
 const safe=[
 '필수 결과물 파일을 생성하지 못했습니다. 완료로 처리하지 않았습니다.',
 '개인 ChatGPT 구독 로그인을 확인하지 못했습니다.',
 '구독 한도 정보가 없어 실행을 차단했습니다.',
 '추가 크레딧 차감 가능성 또는 구독 한도를 확인하세요. 실행을 차단했습니다.',
 '구독 한도 미확인으로 실행을 차단했습니다.',
 '구독 한도 또는 갱신 상태 때문에 실행을 차단했습니다.',
 '인계 자료가 너무 큽니다. 새 업무에서 입력을 줄여 주세요.',
 'Codex 실행 시간이 초과되었습니다. 자동 재시도하지 않습니다.',
 '상속된 Codex 설정을 안전하게 확인하지 못했습니다. 연결을 중단했습니다.',
 '텍스트 이외의 도구 실행이 감지되어 중단했습니다.',
 '다른 구독 작업 또는 미복구 잠금이 있습니다. 자동 재시도하지 않습니다.',
 '이 단계는 이미 시도되었습니다. 원장을 확인하고 새 회차를 사용하세요.',
 '서버 실행 기록과 업무가 다릅니다. 새로고침 전 결과를 확인하세요.',
 '최초 실제 Codex 실행은 별도 대표 승인 전까지 잠겨 있습니다.',
 '같은 단계의 내용이 변경되었습니다. 기록을 확인하세요.'
 ];
 return safe.includes(message)?message:'구독 실행 상태를 확인하지 못했습니다. 서버 기록을 확인하세요.';
}
export function recoverSubscription(taskId:string,runId:string,store=new SubscriptionStore()){
 const receipt=store.read().receipts.filter(r=>r.task.id===taskId&&currentRun(r.task).id===runId).at(-1);
 if(!receipt)return {state:'missing' as const};
 if(receipt.status==='running')return {state:'running' as const};
 return {state:receipt.status,task:receipt.task};
}

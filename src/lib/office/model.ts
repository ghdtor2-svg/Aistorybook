import {assignTask,agents,type AgentId} from '../agents';
export const projects=[{id:'storybook-platform',name:'AI 동화 생성 플랫폼',goal:'경험과 추억을 개인화된 동화로 연결하는 서비스를 개발·운영합니다. 기존 질문 엔진과 저장·수정 기능을 보존합니다.',url:'/storybook'}] as const;
export type Workflow='team'|'product'|'marketing'|'planning-marketing'|'individual';
export type TaskStatus='queued'|'in_progress'|'awaiting_approval'|'approved'|'rejected'|'failed';
export type StepStatus='pending'|'running'|'completed'|'failed';
export type ServiceRecord={provider:'codex'|'demo';product:string;authMode:'chatgpt'|'none';billingMode:'subscription'|'none';model:string|null;receiptId:string;threadId?:string;turnId?:string};
export type Artifact={id:string;agentId:AgentId;kind:'requirements'|'implementation_plan'|'review'|'marketing_draft';summary:string;items:string[];assumptions:string[];simulation:boolean;createdAt:string;service?:ServiceRecord;usage?:{model:string;inputTokens:number|null;outputTokens:number|null;estimatedUsd:number;receiptId:string}};
export type StepInput={taskId:string;projectId:string;brief:string;revision:number;feedback:string;upstream:Artifact[]};
export type Step={id:string;agentId:AgentId;status:StepStatus;input:StepInput|null;output:Artifact|null;startedAt:string|null;finishedAt:string|null;error:string|null};
export type Run={executionMode?:'demo'|'live'|'subscription';id:string;revision:number;steps:Step[];createdAt:string};
export type History={id:string;at:string;actor:AgentId|'owner'|'system';action:string;detail:string;runId:string;stepId?:string};
export type Task={id:string;projectId:string;brief:string;assignee:AgentId;recommended:AgentId;workflow:Workflow;status:TaskStatus;feedback:string;runs:Run[];history:History[];createdAt:string;updatedAt:string};
export type Workspace={version:1;tasks:Task[]};
export const statusLabels:Record<TaskStatus,string>={queued:'등록됨',in_progress:'협업 중',awaiting_approval:'대표 승인 대기',approved:'승인 완료',rejected:'반려',failed:'실행 중단'};
export const stepLabels:Record<StepStatus,string>={pending:'대기',running:'처리 중',completed:'결과 완료',failed:'중단'};
export const workflowLabels:Record<Workflow,string>={team:'전체 협업 · 기획 → 개발 → 마케팅 → 디자인 → 대표',product:'제품 협업 · 기획 → 개발 → 품질 → 대표',marketing:'마케팅 독립 업무 → 대표','planning-marketing':'기획 → 마케팅 → 대표',individual:'지정 직원 단독 업무 → 대표'};
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
export const agentName=(agentId:AgentId)=>agents.find(a=>a.id===agentId)?.role??agentId;
export function recommend(brief:string){const assignment=assignTask(brief);return {agentId:assignment.lead,workflow:'team' as Workflow,reason:assignment.reason};}
function workflowAgents(workflow:Workflow,assignee:AgentId):AgentId[]{
 if(workflow==='team')return ['research','developer','marketing','quality'];
 if(workflow==='product')return ['research','developer','quality'];
 if(workflow==='planning-marketing')return ['research','marketing'];
 if(workflow==='marketing')return ['marketing'];
 return [assignee];
}
function makeRun(workflow:Workflow,assignee:AgentId,revision:number):Run{return {id:id(),revision,createdAt:now(),steps:workflowAgents(workflow,assignee).map(agentId=>({id:id(),agentId,status:'pending',input:null,output:null,startedAt:null,finishedAt:null,error:null}))};}
export function currentRun(task:Task){return task.runs[task.runs.length-1];}
function log(task:Task,actor:History['actor'],action:string,detail:string,stepId?:string):Task{return {...task,updatedAt:now(),history:[...task.history,{id:id(),at:now(),actor,action,detail,runId:currentRun(task).id,...(stepId?{stepId}:{})}]};}
export function createTask(projectId:string,brief:string,assignee:AgentId,workflow:Workflow):Task{
 if(!projects.some(p=>p.id===projectId))throw new Error('프로젝트를 선택해 주세요.');
 if(!brief.trim()||brief.length>4000)throw new Error('업무는 1~4000자로 입력해 주세요.');
 if(!agents.some(a=>a.id===assignee)||!Object.hasOwn(workflowLabels,workflow))throw new Error('담당자와 협업 방식을 확인해 주세요.');
 if((workflow==='marketing'&&assignee!=='marketing')||(workflow==='planning-marketing'&&assignee!=='research'&&assignee!=='marketing'))throw new Error('선택한 협업 방식과 담당자가 맞지 않습니다. 단독 업무 또는 제품 협업을 선택하세요.');
 const time=now();const task:Task={id:id(),projectId,brief:brief.trim(),assignee,recommended:recommend(brief).agentId,workflow,status:'queued',feedback:'',runs:[makeRun(workflow,assignee,1)],history:[],createdAt:time,updatedAt:time};
 return log(task,'owner','업무 등록',`담당: ${agentName(assignee)} · ${workflowLabels[workflow]}`);
}
function replaceStep(task:Task,step:Step):Task{const run=currentRun(task);return {...task,runs:task.runs.map(r=>r.id===run.id?{...r,steps:r.steps.map(s=>s.id===step.id?step:s)}:r)};}
export function beginStep(task:Task,mode:'demo'|'live'|'subscription'='demo'):Task{
 if(!['queued','in_progress'].includes(task.status))throw new Error('실행 가능한 상태가 아닙니다.');
 const run=currentRun(task);if(run.executionMode&&run.executionMode!==mode)throw new Error('한 회차에서 실행 모드를 바꿀 수 없습니다.');if(run.steps.some(s=>s.output&&(mode==='subscription'?(s.output.simulation&&!(s.agentId==='research'&&s.output.service?.provider==='demo')):s.output.simulation!==(mode==='demo'))))throw new Error('기존 결과와 실행 모드가 다릅니다.');if(run.steps.some(s=>s.status==='running'))throw new Error('이미 처리 중입니다.');
 const next=run.steps.find(s=>s.status!=='completed');if(!next||next.status!=='pending')throw new Error('다음 단계를 실행할 수 없습니다.');
 const input:StepInput={taskId:task.id,projectId:task.projectId,brief:task.brief,revision:run.revision,feedback:task.feedback,upstream:run.steps.filter(s=>s.status==='completed').map(s=>s.output!)};
 const prepared={...task,runs:task.runs.map(r=>r.id===run.id?{...r,executionMode:mode}:r)};
 return log({...replaceStep(prepared,{...next,status:'running',input,startedAt:now()}),status:'in_progress'},next.agentId,mode==='demo'?'데모 단계 시작':'실제 AI 단계 시작','구조화된 입력과 이전 직원 결과를 인계했습니다.',next.id);
}
export function finishStep(task:Task,output:Artifact):Task{
 const mode=currentRun(task).executionMode;const step=currentRun(task).steps.find(s=>s.status==='running');if(!step||step.agentId!==output.agentId||output.simulation!==(mode==='demo'||mode===undefined))throw new Error('실행 단계와 결과가 일치하지 않습니다.');
 let next=replaceStep(task,{...step,status:'completed',output,finishedAt:now()});
 next=log(next,step.agentId,output.simulation?'데모 결과 인계':'실제 AI 결과 인계',output.summary,step.id);
 if(currentRun(next).steps.every(s=>s.status==='completed'))next=log({...next,status:'awaiting_approval'},'system','대표 승인 요청','모든 직원 결과가 준비되었습니다. 대표가 검토해 주세요.');
 return next;
}
export function failStep(task:Task,message:string):Task{
 const step=currentRun(task).steps.find(s=>s.status==='running');if(!step)throw new Error('처리 중인 단계가 없습니다.');
 return log({...replaceStep(task,{...step,status:'failed',error:message,finishedAt:now()}),status:'failed'},'system','실행 중단',message,step.id);
}
export function decideTask(task:Task,approved:boolean,reason:string):Task{
 if(task.status!=='awaiting_approval')throw new Error('승인 대기 업무만 결정할 수 있습니다.');
 if(approved&&currentRun(task).steps.some(step=>step.status!=='completed'||!step.output))throw new Error('완료된 산출물이 빠져 있어 승인할 수 없습니다.');
 if(!approved&&!reason.trim())throw new Error('반려 사유를 입력해 주세요.');
 if(reason.length>2000)throw new Error('검토 의견은 2000자 이내로 입력해 주세요.');
 return log({...task,status:approved?'approved':'rejected',feedback:reason.trim()},'owner',approved?'대표 승인':'대표 반려',reason.trim()||(approved?'이번 회차의 산출물 검토를 완료했습니다.':''));
}
export function resubmitTask(task:Task):Task{
 if(!['rejected','failed'].includes(task.status))throw new Error('반려 또는 중단된 업무만 재작업할 수 있습니다.');
 const run=makeRun(task.workflow,task.assignee,currentRun(task).revision+1);
 return log({...task,status:'queued',runs:[...task.runs,run]},'owner','재작업 등록','이전 결과와 반려 사유를 보존하고 새 회차를 시작합니다.');
}
// 실제 실행기를 나중에 연결할 수 있는 비동기 경계. 현 라우트와 UI는 데모만 사용합니다.
export interface ExecutionEngine {mode:'demo'|'live';execute(agentId:AgentId,input:StepInput):Promise<Artifact>}
export const demoExecutor:ExecutionEngine={mode:'demo',async execute(agentId,input){
 const data:Record<AgentId,{kind:Artifact['kind'];items:string[]}>={
 research:{kind:'requirements',items:['대표 지시를 요구사항과 완료 기준으로 정리','기존 /storybook과 저장·수정 기능 보존','조사할 가설과 미확인 사항 구분']},
 developer:{kind:'implementation_plan',items:['기획 입력을 기반으로 변경 범위와 구현 순서 제안','코드를 수정하지 않고 테스트 계획 작성','TypeScript·빌드·회귀 검증 항목 정의']},
 quality:{kind:'review',items:['기획·개발 계획의 누락과 일관성 검토','UI/UX·접근성·기존 기능 회귀 점검 항목 제시','실제 테스트를 수행한 결과가 아니므로 대표 검토 필요']},
 marketing:{kind:'marketing_draft',items:['인스타그램·블로그 채널별 콘텐츠 초안 구성','기획 산출물이 있으면 목표 고객과 메시지 반영','광고 예산·유입 지표는 대표와 합의, 실제 게시·집행 없음']}
 };
 const value=data[agentId];return {id:id(),agentId,kind:value.kind,summary:`${agentName(agentId)}의 규칙 기반 데모 결과`,items:[...value.items,`업무: ${input.brief}`,`인계 자료: ${input.upstream.map(a=>a.id+' ('+a.kind+')').join(', ')||'없음'}`,...(input.feedback?[`대표 피드백 반영 대상으로 접수: ${input.feedback}`]:[])],assumptions:['실제 코드 작성·조사·외부 실행을 하지 않은 시뮬레이션입니다.','내용의 적합성과 사실 여부는 별도로 검증해야 합니다.'],simulation:true,createdAt:now()};
}};


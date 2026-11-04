import {agents} from '../agents';
import {failStep,projects,statusLabels,stepLabels,workflowLabels,type Workspace} from './model';
export const OFFICE_STORAGE_KEY='ai-office:workspace:v1';
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown)=>typeof value==='string';
const agent=(value:unknown)=>agents.some(a=>a.id===value);
function validUsage(value:unknown){return value===undefined||(record(value)&&text(value.model)&&text(value.receiptId)&&typeof value.estimatedUsd==='number'&&Number.isFinite(value.estimatedUsd)&&value.estimatedUsd>=0&&(value.inputTokens===null||Number.isInteger(value.inputTokens))&&(value.outputTokens===null||Number.isInteger(value.outputTokens)));}
function validService(value:unknown){return value===undefined||(record(value)&&['codex','demo'].includes(value.provider as string)&&text(value.product)&&['chatgpt','none'].includes(value.authMode as string)&&['subscription','none'].includes(value.billingMode as string)&&(value.model===null||text(value.model))&&text(value.receiptId)&&(value.threadId===undefined||text(value.threadId))&&(value.turnId===undefined||text(value.turnId)));}
function artifact(value:unknown):boolean{return record(value)&&validService(value.service)&&validUsage(value.usage)&&text(value.id)&&agent(value.agentId)&&['requirements','implementation_plan','review','marketing_draft'].includes(value.kind as string)&&text(value.summary)&&Array.isArray(value.items)&&value.items.every(text)&&Array.isArray(value.assumptions)&&value.assumptions.every(text)&&typeof value.simulation==='boolean'&&text(value.createdAt);}
export function parseWorkspace(raw:string|null,options:{recoverInterrupted?:boolean}={}):Workspace{
 if(raw===null)return {version:1,tasks:[]};
 if(raw.length>5000000)throw new Error('업무 저장 용량을 확인해 주세요.');
 const value:unknown=JSON.parse(raw);
 if(!record(value)||value.version!==1||!Array.isArray(value.tasks)||value.tasks.length>200)throw new Error('업무 저장 형식이 올바르지 않습니다.');
 for(const t of value.tasks){
  if(!record(t)||!text(t.id)||!projects.some(p=>p.id===t.projectId)||!text(t.brief)||!agent(t.assignee)||!agent(t.recommended)||!text(t.status)||!Object.hasOwn(statusLabels,t.status)||!text(t.workflow)||!Object.hasOwn(workflowLabels,t.workflow)||!text(t.feedback)||!text(t.createdAt)||!text(t.updatedAt)||!Array.isArray(t.runs)||!t.runs.length||t.runs.length>100||!Array.isArray(t.history))throw new Error('업무 기록을 읽을 수 없습니다.');
  for(const r of t.runs){
   if(!record(r)||(r.executionMode!==undefined&&!['demo','live','subscription'].includes(r.executionMode as string))||!text(r.id)||!Number.isInteger(r.revision)||!text(r.createdAt)||!Array.isArray(r.steps)||!r.steps.length||r.steps.length>4)throw new Error('협업 회차를 읽을 수 없습니다.');
   for(const s of r.steps){
    if(!record(s)||!text(s.id)||!agent(s.agentId)||!text(s.status)||!Object.hasOwn(stepLabels,s.status)||(s.output!==null&&!artifact(s.output)))throw new Error('직원 작업을 읽을 수 없습니다.');
    if(s.input!==null&&(!record(s.input)||!text(s.input.brief)||!text(s.input.feedback)||!text(s.input.taskId)||!text(s.input.projectId)||!Number.isInteger(s.input.revision)||!Array.isArray(s.input.upstream)||!s.input.upstream.every(artifact)))throw new Error('입력 자료를 읽을 수 없습니다.');
    if(s.status==='completed'&&!s.output)throw new Error('결과가 없는 완료 단계입니다.');
   }
  }
  for(const h of t.history)if(!record(h)||!text(h.id)||!text(h.at)||!text(h.action)||!text(h.detail)||!text(h.runId)||(!agent(h.actor)&&!['system','owner'].includes(h.actor as string)))throw new Error('진행 이력을 읽을 수 없습니다.');
 }
 const workspace=value as unknown as Workspace;
 if(new Set(workspace.tasks.map(t=>t.id)).size!==workspace.tasks.length)throw new Error('중복된 업무 기록입니다.');
 if(options.recoverInterrupted===false)return workspace;
 // 새로고침 중 중단된 단계는 자동 재실행하지 않습니다. 결과를 보존한 채 재작업을 허용합니다.
 return {...workspace,tasks:workspace.tasks.map(task=>task.runs.at(-1)!.steps.some(s=>s.status==='running')?failStep(task,'페이지를 떠나 데모 처리가 중단되었습니다. 재작업으로 다시 시작하세요.'):task)};
}



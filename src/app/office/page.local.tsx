'use client';
import type {AutonomousStatus} from '../../lib/office/autonomous-status';
import AutonomousWork from './AutonomousWork';
import ChatCleanup from './ChatCleanup';
import OfficeViewTabs from './OfficeViewTabs';
import StaffDashboard from './StaffDashboard';
import DevelopmentBoard from './DevelopmentBoard';
import ApprovalCenter,{ApprovalChecklist} from './ApprovalCenter';
import ApprovalResults from './ApprovalResults';
import {approvalDetails} from '../../lib/office/approvals';
import {useInputDraft} from './useInputDraft';
import {useUnsavedBookGuard as useUnsavedInputGuard} from '../storybook/useUnsavedBookGuard';
import StorageRescue from '../../components/StorageRescue';
import OfficeBackup from './OfficeBackup';
import {mergeOffice,exportOffice} from '../../lib/office/backup';
import {saveWorkspace,OFFICE_WRITER_LOCK} from '../../lib/office/workspace-write';
import TaskExplorer from './TaskExplorer';
import {resultRun} from '../../lib/office/task-search';
import StaffChat from './StaffChat';
import {parseChat,reconcileChat,serializeChat} from '../../lib/office/chat';
import Deliverables from './Deliverables';
import {readFiles} from '../../lib/office/deliverables';
import Office3DPanel from '../../components/office3d/Office3DPanel';
import Link from 'next/link';
import ManualStoryCode from './ManualStoryCode';
import {SubscriptionControls,subscriptionRequest,type SubscriptionStatus} from './subscription-controls';
import {LiveControls,officeRequest,type LiveStatus} from './live-controls';
import {useEffect,useRef,useState} from 'react';
import {agents,type AgentId} from '../../lib/agents';
import {agentName,beginStep,createTask,currentRun,decideTask,demoExecutor,failStep,finishStep,projects,recommend,resubmitTask,statusLabels,stepLabels,workflowLabels,type Task,type Workflow,type Workspace} from '../../lib/office/model';
import {OFFICE_STORAGE_KEY,parseWorkspace} from '../../lib/office/storage';
import {runAutomaticWorkflow} from '../../lib/office/automatic';
export default function Office(){
 const [view,setView]=useState<'office'|'review'>('office');const [actionCount,setActionCount]=useState<number|null>(null);const [sourceStatus,setSourceStatus]=useState<AutonomousStatus|null>(null);
 const [liveStatus,setLiveStatus]=useState<LiveStatus|null>(null);const [mode,setMode]=useState<'demo'|'live'|'subscription'>('demo');
 const [subscriptionStatus,setSubscriptionStatus]=useState<SubscriptionStatus|null>(null);
 async function refreshSubscription(){try{const res=await fetch('/api/office/subscription',{cache:'no-store',signal:AbortSignal.timeout(8000)});setSubscriptionStatus(res.ok?await res.json():null);}catch{setSubscriptionStatus(null);}}
 useEffect(()=>{void refreshSubscription();},[]);
 async function refreshLive(){try{const res=await fetch('/api/office');if(res.ok)setLiveStatus(await res.json());}catch{setLiveStatus(null);}}
 useEffect(()=>{void refreshLive();},[]);
 const [workspace,setWorkspace]=useState<Workspace>({version:1,tasks:[]});const [ready,setReady]=useState(false);const [storageBlocked,setBlocked]=useState(false);const [access,setAccess]=useState<'checking'|'writer'|'viewer'|'unsupported'>('checking');const writer=useRef(false),writeFailed=useRef(false),claiming=useRef(false),releaseWriter=useRef<(()=>void)|null>(null),expectedWorkspace=useRef<string|null>(null),workspaceRef=useRef(workspace);workspaceRef.current=workspace;const blocked=storageBlocked||access!=='writer';
 const [projectId,setProjectId]=useState<string>(projects[0].id);const briefDraft=useInputDraft('ai-office:input:brief:'+projectId,4000);const brief=briefDraft.value,setBrief=briefDraft.set;const [manual,setManual]=useState<AgentId|''>('');const [flow,setFlow]=useState<Workflow|'auto'>('auto');
 const [selected,setSelected]=useState('');const [error,setError]=useState('');const [storageError,setStorageError]=useState('');const reviewDraft=useInputDraft('ai-office:input:review:'+selected+':'+(workspace.tasks.find(t=>t.id===selected)?.runs.at(-1)?.id||'none'),2000);const review=reviewDraft.value,setReview=reviewDraft.set;const [busy,setBusy]=useState(false);const running=useRef(false);
 const [automatic,setAutomatic]=useState(false);const [automaticMessage,setAutomaticMessage]=useState('');
 const stopRequested=useRef(false);const mounted=useRef(true);
 useUnsavedInputGuard(()=>briefDraft.unsaved||reviewDraft.unsaved);
 useEffect(()=>{mounted.current=true;const leave=()=>{stopRequested.current=true;};window.addEventListener('pagehide',leave);return ()=>{mounted.current=false;stopRequested.current=true;window.removeEventListener('pagehide',leave);};},[]);
 function loadOffice(recoverInterrupted=false){try{const raw=localStorage.getItem(OFFICE_STORAGE_KEY),saved=parseWorkspace(raw,{recoverInterrupted});expectedWorkspace.current=raw;workspaceRef.current=saved;setWorkspace(saved);setSelected(old=>saved.tasks.some(t=>t.id===old)?old:saved.tasks[0]?.id??'');writeFailed.current=false;setBlocked(false);setStorageError('');return true;}catch{setBlocked(true);setStorageError('업무 기록을 복원하지 못했습니다. 원본 저장 내용을 덮어쓰지 않았습니다. 브라우저 저장 설정과 저장 데이터를 확인해 주세요.');return false;}finally{setReady(true);}}
 function storageConflict(message:string){writeFailed.current=true;stopRequested.current=true;setBlocked(true);setStorageError(message);}
 function assertWriter(){if(writeFailed.current)throw Error('업무 저장 문제로 추가 실행을 중단했습니다. 현재 화면을 보관한 뒤 최신 업무를 불러오세요.');if(!writer.current)throw Error('이 탭은 업무 조회 전용입니다. 관리 탭을 닫은 뒤 관리 시작을 눌러 주세요.');if(localStorage.getItem(OFFICE_STORAGE_KEY)!==expectedWorkspace.current){const message='다른 화면에서 업무 저장본이 바뀌었습니다. 추가 실행을 중단하고 현재 화면을 보관한 뒤 최신 업무를 불러오세요.';storageConflict(message);throw Error(message);}}
 function commitWorkspace(value:Workspace){try{assertWriter();expectedWorkspace.current=saveWorkspace(localStorage,expectedWorkspace.current,value);workspaceRef.current=value;}catch(e){workspaceRef.current=value;if(mounted.current)setWorkspace(value);storageConflict(e instanceof Error?e.message:'업무 저장 실패로 추가 실행을 중단했습니다.');throw e;}}
 function claimWriter(){if(writer.current||claiming.current)return;if(!navigator.locks){setAccess('unsupported');return;}claiming.current=true;setAccess('checking');void navigator.locks.request(OFFICE_WRITER_LOCK,{ifAvailable:true},async lock=>{claiming.current=false;if(!mounted.current)return;if(!lock){setAccess('viewer');return;}writer.current=true;loadOffice(true);setAccess('writer');await new Promise<void>(resolve=>{releaseWriter.current=resolve;});writer.current=false;releaseWriter.current=null;}).catch(()=>{claiming.current=false;if(mounted.current)setAccess('unsupported');});}
 useEffect(()=>{loadOffice(false);claimWriter();return ()=>{writer.current=false;releaseWriter.current?.();};},[]);
 useEffect(()=>{if(!ready||blocked)return;try{commitWorkspace(workspace);setStorageError('');}catch{}},[workspace,ready,blocked]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{if(event.key!==OFFICE_STORAGE_KEY&&event.key!==null)return;if(!writer.current){loadOffice(false);return;}try{if(localStorage.getItem(OFFICE_STORAGE_KEY)!==expectedWorkspace.current)storageConflict('다른 화면에서 업무 저장본이 바뀌었습니다. 추가 실행을 중단하고 현재 화면을 보관한 뒤 최신 업무를 불러오세요.');}catch{storageConflict('업무 저장 상태를 읽지 못해 추가 실행을 중단했습니다.');}};window.addEventListener('storage',changed);return ()=>window.removeEventListener('storage',changed);},[]);
 function downloadAllInputs(){const parts=['이 탭의 등록 전 지시와 미전송 검토 의견'];for(const text of Object.values(briefDraft.snapshot))if(text)parts.push('등록 전 업무 지시',text);for(const [source,text]of Object.entries(reviewDraft.snapshot)){if(!text)continue;let label='이전 업무 검토 의견';for(const item of workspace.tasks)for(const round of item.runs)if(source==='ai-office:input:review:'+item.id+':'+round.id)label=item.brief+' · 회차 '+round.revision+' 검토 의견';parts.push(label,text);}const url=URL.createObjectURL(new Blob([parts.join('\n\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='office-unsubmitted-inputs.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function downloadOfficeScreen(){try{const url=URL.createObjectURL(new Blob([exportOffice(workspace)],{type:'application/json;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='ai-office-screen-workspace.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('현재 화면 업무를 보관하지 못했습니다. 화면을 유지해 주세요.');}}
 function reloadOffice(){if(running.current)return;if(window.confirm('현재 화면을 저장된 최신 업무로 바꿀까요? 저장하지 못한 결과는 먼저 현재 화면 업무 JSON으로 보관하세요.'))loadOffice(false);}
 const recommendation=recommend(brief);const assignee=manual||recommendation.agentId;
 const workflow=flow==='auto'?(manual?'individual':recommendation.workflow):flow;
 const project=projects.find(p=>p.id===projectId)!;const tasks=workspace.tasks.filter(t=>t.projectId===projectId);const task=tasks.find(t=>t.id===selected);const run=task?currentRun(task):null;
 const effectiveMode=run?.executionMode??mode;
 const [preferredResultRun,setPreferredResultRun]=useState<string|undefined>();const [resultNavigation,setResultNavigation]=useState(0);
 const paneJump=useRef<string|null>(null);const [paneNavigation,setPaneNavigation]=useState(0);
 function jumpToPane(next:'office'|'review',id:string){paneJump.current=id;setView(next);setPaneNavigation(n=>n+1);}
 useEffect(()=>{if(!paneJump.current)return;const target=document.getElementById(paneJump.current);paneJump.current=null;target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'});},[view,paneNavigation]);
 useEffect(()=>{function navigate(){const id=location.hash.slice(1);if(id==='office-approvals')jumpToPane('review',id);else if(id==='office-staff-chat'||id==='office-task-list')jumpToPane('office',id);}navigate();window.addEventListener('hashchange',navigate);return ()=>window.removeEventListener('hashchange',navigate);},[]);
 const taskJump=useRef<'details'|'results'|'approval'|null>(null);
 function focusTask(area:'details'|'results'|'approval'){const target=document.getElementById(area==='results'?'office-deliverables':area==='approval'?'office-owner-approval':'office-task-detail');target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'});}
 useEffect(()=>{if(taskJump.current){focusTask(taskJump.current);taskJump.current=null;}},[selected,view]);
 function selectFromList(id:string,results=false,forApproval=false){if(busy)return;setView('office');const chosen=tasks.find(t=>t.id===id);setResultNavigation(n=>n+1);setPreferredResultRun(chosen&&(results||forApproval)?(forApproval?currentRun(chosen).id:resultRun(chosen).id):undefined);const area=results?'results':forApproval?'approval':'details';if(id===selected&&view==='office')focusTask(area);else{taskJump.current=area;setSelected(id);}setError('');setAutomaticMessage('');}
 function update(next:Task){const saved={...workspaceRef.current,tasks:workspaceRef.current.tasks.map(t=>t.id===next.id?next:t)};commitWorkspace(saved);setWorkspace(saved);}
 function register(){try{if(blocked||!ready||running.current)return;const task=createTask(projectId,brief,assignee,workflow);const saved={...workspaceRef.current,tasks:[task,...workspaceRef.current.tasks]};commitWorkspace(saved);setWorkspace(saved);setSelected(task.id);setBrief('');setManual('');setFlow('auto');setError('');setAutomaticMessage('');}catch(e){setError(e instanceof Error?e.message:'등록하지 못했습니다.');}}
 async function startAutomatic(target:Task|undefined=task,executionMode=effectiveMode,initialWorkspace=workspace){
  if(!target||!ready||blocked||storageError||running.current)return;
  try{
   if(executionMode==='live')throw new Error('유료 API 자동 실행은 허용하지 않습니다.');
   if(executionMode==='subscription'){
    if(!subscriptionStatus?.authenticated)throw new Error('구독 실행 전 로컬 인증이 필요합니다.');
    if(!subscriptionStatus.firstRunApproved)throw new Error('최초 실제 Codex 실행은 별도 대표 승인 대기 중입니다.');
    const count=currentRun(target).steps.filter(s=>s.status!=='completed').length;
    if(!window.confirm('선택한 업무의 남은 '+count+'단계를 순서대로 자동 실행합니다. ChatGPT 구독 사용량을 소비할 수 있습니다. 오류·한도 차단 시 중단하며 자동 재시도하지 않습니다. 마지막에는 대표 승인을 기다립니다. 시작할까요?'))return;
   }
   running.current=true;stopRequested.current=false;setBusy(true);setAutomatic(true);setError('');setAutomaticMessage('직원들이 순서대로 처리합니다. 이 페이지를 열어 두세요.');
   let savedWorkspace=initialWorkspace;
   const result=await runAutomaticWorkflow(target,async latest=>{assertWriter();
    const next=currentRun(latest).steps.find(s=>s.status!=='completed')!;
    if(mounted.current)setAutomaticMessage(agentName(next.agentId)+' 처리 중 · '+currentRun(latest).steps.filter(s=>s.status==='completed').length+'/'+currentRun(latest).steps.length+'단계 완료');
    if(executionMode==='subscription')return (await subscriptionRequest({action:'run',task:latest})).task as Task;
    const started=beginStep(latest,'demo');const step=currentRun(started).steps.find(s=>s.status==='running')!;
    return finishStep(started,await demoExecutor.execute(step.agentId,step.input!));
   },{shouldStop:()=>stopRequested.current||!mounted.current,onProgress:next=>{
    savedWorkspace={...savedWorkspace,tasks:savedWorkspace.tasks.map(t=>t.id===next.id?next:t)};
    // Persist each completed step before submitting the next one. Storage errors stop the chain.
    try{commitWorkspace(savedWorkspace);}
    catch{if(mounted.current){setWorkspace(savedWorkspace);}throw new Error('결과를 저장하지 못해 다음 직원을 실행하지 않았습니다.');}
    if(mounted.current)setWorkspace(savedWorkspace);
   }});
   if(mounted.current){
    if(result.task.status==='failed'){setError('직원 실행이 중단되었습니다. 완료된 결과는 보존했고 자동 재시도하지 않았습니다.');setAutomaticMessage('자동 실행 중단 · 실패한 단계 확인 필요');}
    else setAutomaticMessage(result.task.status==='awaiting_approval'?'모든 직원 결과가 준비되었습니다. 아래 결과물을 확인하고 대표 승인 또는 반려를 선택하세요.':result.stopped?'현재 직원의 결과를 저장하고 일시정지했습니다. 자동 실행 시작으로 남은 단계를 이어갈 수 있습니다.':'자동 실행을 마쳤습니다.');
   }
  }catch(e){if(mounted.current){setError((e instanceof Error?e.message:'실행 상태를 확인하지 못했습니다.')+' 자동 재시도하지 않습니다.');setAutomaticMessage('자동 실행 중단 · 완료된 결과와 이력을 확인하세요.');}}
  finally{running.current=false;if(mounted.current){setBusy(false);setAutomatic(false);}}
 }
 async function registerAndStart(command=brief){
  if(!ready||blocked||storageError||running.current)return;
  try{
   if(!subscriptionStatus?.authenticated)throw new Error('먼저 위의 구독 연결 로컬 인증을 완료하세요. 데모로 대신 실행하지 않습니다.');
   if(!subscriptionStatus.firstRunApproved)throw new Error('최초 실제 Codex 실행 승인이 필요합니다.');
   const next=createTask(projectId,command,'research','team');
   // Persist registration before inference; use the new task directly, never stale selected state.
   const nextWorkspace={...workspace,tasks:[next,...workspace.tasks]};
   commitWorkspace(nextWorkspace);
   setWorkspace(nextWorkspace);setSelected(next.id);if(command===brief)setBrief('');setMode('subscription');setAutomaticMessage('');
   await startAutomatic(next,'subscription',nextWorkspace);
  }catch(e){setError(e instanceof Error?e.message:'등록하지 못했습니다.');}
 }
 async function restoreOffice(incoming:Workspace){
  if(!ready||blocked||storageError||running.current)throw Error('현재 실행과 저장 상태를 확인한 뒤 복원하세요.');
  if(!navigator.locks)throw Error('복원 잠금을 지원하는 브라우저를 이용하세요.');
  return navigator.locks.request('ai-office:workspace-restore',{ifAvailable:true},lock=>{if(!lock||running.current)throw Error('다른 복원이나 실행이 진행 중입니다. 자동 재시도하지 않습니다.');const latest=parseWorkspace(localStorage.getItem(OFFICE_STORAGE_KEY),{recoverInterrupted:false});const result=mergeOffice(latest,incoming);if(result.added){commitWorkspace(result.workspace);setWorkspace(result.workspace);if(!selected)setSelected(result.workspace.tasks[0]?.id||'');}return result;});
 }
 async function recoverChat(key:string){
  if(blocked||!ready||running.current)throw Error('현재 작업을 마친 뒤 연결 기록을 확인하세요.');
  if(!key.startsWith('ai-office:chat:'))throw Error('대화 저장 위치를 확인하세요.');
  if(!navigator.locks)throw Error('연결 기록 복구 잠금을 지원하는 브라우저를 이용하세요.');
  return navigator.locks.request('ai-office:chat-save',{ifAvailable:true},lock=>{
   if(!lock)throw Error('다른 탭에서 지시를 저장 중입니다. 잠시 후 다시 확인하세요.');
   const latest=parseWorkspace(localStorage.getItem(OFFICE_STORAGE_KEY));
   const result=reconcileChat(parseChat(localStorage.getItem(key)),key,latest.tasks);
   if(result.count)localStorage.setItem(key,serializeChat(result.messages));setWorkspace(latest);return result;
  });
 }
 async function dispatchChat(command:string,source:{key:string;ids:string[]},onRegistered:()=>void){
  if(running.current||blocked||storageError||!ready)throw Error('현재 실행을 마치고 지시를 연결하세요.');
  if(!subscriptionStatus?.authenticated||!subscriptionStatus.firstRunApproved)throw Error('구독 연결 로컬 인증과 최초 실행 승인이 필요합니다.');
  if(!navigator.locks)throw Error('중복 지시 방지를 지원하는 브라우저를 이용하세요.');
  let registered:{task:Task;workspace:Workspace}|undefined;
  await navigator.locks.request('ai-office:chat-save',{ifAvailable:true},lock=>{
   if(!lock)throw Error('다른 탭에서 지시를 업무에 연결 중입니다. 중복 실행하지 않았습니다.');
   const latest=parseWorkspace(localStorage.getItem(OFFICE_STORAGE_KEY));
   const linked=latest.tasks.find(t=>t.history.some(h=>{if(h.action!=='채팅 지시 연결')return false;try{const old=JSON.parse(h.detail);return old.key===source.key&&Array.isArray(old.ids)&&old.ids.some((id:string)=>source.ids.includes(id));}catch{return false;}}));
   if(linked){setWorkspace(latest);setSelected(linked.id);throw Error('이 지시는 이미 업무에 연결됐습니다. 기존 업무에서 진행 상황을 확인하세요.');}
   const messages=JSON.parse(localStorage.getItem(source.key)||'[]');if(!Array.isArray(messages)||!source.ids.length||source.ids.some(id=>!messages.some(m=>m.id===id&&!m.taskId)))throw Error('지시 상태가 변경됐습니다. 대화를 다시 확인하세요.');
   const next=createTask(projectId,command,'research','team');currentRun(next).executionMode='subscription';next.history.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:'owner',action:'채팅 지시 연결',detail:JSON.stringify(source),runId:currentRun(next).id});
   const saved={...latest,tasks:[next,...latest.tasks]};commitWorkspace(saved);
   // Workspace proof is durable first; it prevents duplicates if the chat write fails.
   const connected=messages.map(m=>source.ids.includes(m.id)?{...m,taskId:next.id}:m);
   localStorage.setItem(source.key,serializeChat(connected));localStorage.setItem('ai-office:chat:'+next.id,serializeChat(connected.filter(m=>source.ids.includes(m.id))));
   setWorkspace(saved);setSelected(next.id);setMode('subscription');registered={task:next,workspace:saved};
  });
  if(registered){onRegistered();await startAutomatic(registered.task,'subscription',registered.workspace);}
 }
 async function recover(){
  if(!task||!run||busy||blocked)return;
  setBusy(true);setError('');
  try{
   const result=await subscriptionRequest({action:'recover',taskId:task.id,runId:run.id});
   if(result.task){
    const restored=parseWorkspace(JSON.stringify({version:1,tasks:[result.task]})).tasks[0];
    if(restored.id!==task.id||currentRun(restored).id!==run.id)throw new Error('복구 결과의 업무와 회차가 다릅니다.');
    if(['approved','rejected'].includes(task.status))throw new Error('대표 검토가 끝난 기록은 덮어쓰지 않습니다.');
    const next={...workspace,tasks:workspace.tasks.map(t=>t.id===task.id?restored:t)};
    commitWorkspace(next);setWorkspace(next);
    setAutomaticMessage('서버에 저장된 결과를 복구했습니다. 새 GPT 호출은 하지 않았습니다.');
   }else setAutomaticMessage(result.state==='running'?'서버에 실행 중 또는 완료 여부가 불명확한 기록이 있습니다. 중복 실행하지 않습니다.':'이 회차의 실제 GPT 실행 기록이 없습니다. 등록만 했거나 데모로 실행했을 수 있습니다.');
  }catch(e){setError(e instanceof Error?e.message:'서버 기록을 확인하지 못했습니다.');}
  finally{setBusy(false);}
 }
 async function projectLoop(){
  if(running.current||blocked||storageError||!ready)return;
  if(!subscriptionStatus?.authenticated){setError('먼저 구독 연결 로컬 인증을 완료하세요.');return;}
  if(!window.confirm('현재 동화 플랫폼 목표로 기획→개발→마케팅→디자인 협업을 최대 3회차(12단계) 진행합니다. 구독 사용량을 사용하며 오류 시 중단합니다. 실제 프로젝트 소스 자동 적용·테스트 실행은 포함하지 않습니다. 시작할까요?'))return;
  running.current=true;stopRequested.current=false;setBusy(true);setAutomatic(true);setError('');let saved=workspace;
  try{
   let context=task?.brief||'질문 답변 → 실제 동화 생성 → 읽기·수정·책장 저장·다운로드까지 되는 로컬 동화 플랫폼을 완성한다. 모바일 사용성과 실제 버튼 연결을 검토한다.';
   for(let cycle=1;cycle<=3&&!stopRequested.current;cycle++){
    const next=createTask(projectId,('플랫폼 연속 협업 '+cycle+'/3\n'+context).slice(0,4000),'research','team');
    saved={...saved,tasks:[next,...saved.tasks]};commitWorkspace(saved);setWorkspace(saved);setSelected(next.id);
    const result=await runAutomaticWorkflow(next,async latest=>{assertWriter();setAutomaticMessage(cycle+'/3회차 · '+agentName(currentRun(latest).steps.find(s=>s.status==='pending')!.agentId)+' 처리 중');return (await subscriptionRequest({action:'run',task:latest})).task as Task;},{shouldStop:()=>stopRequested.current||!mounted.current,onProgress:updated=>{saved={...saved,tasks:saved.tasks.map(t=>t.id===updated.id?updated:t)};commitWorkspace(saved);setWorkspace(saved);}});
    if(result.task.status!=='awaiting_approval')break;
    context='원래 목표: '+(task?.brief||'동화 플랫폼의 생성·읽기·수정·저장·다운로드 완성')+'\n앞선 회차의 디자인·검토 결과를 근거로 미완성 부분을 개선하세요. 완료했다고 반복하지 말고 구체적인 수정 결과물을 만드세요.\n'+currentRun(result.task).steps.at(-1)!.output!.items.join('\n').slice(0,2400);
   }
   setAutomaticMessage(stopRequested.current?'현재 결과를 보존하고 연속 협업을 멈췄습니다.':'연속 협업을 마쳤습니다. 각 회차 결과와 미확인 사항을 검토하세요.');
  }catch(e){setError((e instanceof Error?e.message:'연속 협업 중단')+' 자동 재시도하지 않습니다.');}
  finally{running.current=false;setBusy(false);setAutomatic(false);}
 }
 function stopAutomatic(){stopRequested.current=true;setAutomaticMessage('일시정지를 요청했습니다. 현재 직원이 끝나면 결과를 저장하고 다음 직원을 실행하지 않습니다.');}
 async function advance(){if(!task||running.current||blocked)return;running.current=true;setBusy(true);let started:Task|undefined;
  try{
   assertWriter();if(effectiveMode==='subscription'){
    if(!subscriptionStatus?.authenticated)throw new Error('구독 실행 전 로컬 인증이 필요합니다.');
    if(!subscriptionStatus.firstRunApproved)throw new Error('최초 실제 Codex 실행은 별도 대표 승인 대기 중입니다.');
    if(!window.confirm('ChatGPT 구독 사용량을 소비할 수 있습니다. 선택 업무와 이전 산출물로 텍스트를 생성할까요?'))return;
    const result=await subscriptionRequest({action:'run',task});update(result.task);setError(result.task.status==='failed'?'Codex 실행이 중단되었습니다. 기존 데모 모드를 사용할 수 있습니다.':'');return;
   }
   if(effectiveMode==='live'){
    if(!liveStatus?.authenticated)throw new Error('실제 AI 실행 전 로컬 인증이 필요합니다.');
    const estimate=await officeRequest({action:'preview',task});
    if(!estimate.allowed)throw new Error('예산 또는 API 호출 상한으로 차단되었습니다.');
    if(!window.confirm('실제 AI 유료 실행: '+estimate.model+'\n최대 '+estimate.maxCalls+'회 시도 · 출력 최대 '+estimate.maxOutputTokens+'토큰/회\n이번 단계 최대 비용 추정 USD '+estimate.maxEstimatedUsd.toFixed(6)+'\n업무·피드백·이전 결과가 OpenAI로 전달됩니다. 계속할까요?'))return;
   }
   started=beginStep(task,effectiveMode);update(started);const step=currentRun(started).steps.find(s=>s.status==='running')!;
   const output=effectiveMode==='live'?(await officeRequest({action:'run',task})).artifact:await demoExecutor.execute(step.agentId,step.input!);
   update(finishStep(started,output));setError('');
  }
  catch(e){if(started&&!writeFailed.current){try{update(failStep(started,effectiveMode==='live'?'실제 AI 호출이 실패했습니다. 비용 원장 확인 후 재작업하세요.':'데모 실행 중 오류가 발생했습니다.'));}catch{}}setError(e instanceof Error?e.message:'처리하지 못했습니다.');}
  finally{running.current=false;setBusy(false);if(effectiveMode==='live')void refreshLive();}
 }
 function decision(approve:boolean){if(!task||busy||blocked)return;try{update(decideTask(task,approve,review));setReview('');setError('');}catch(e){setError(e instanceof Error?e.message:'검토 결과를 확인해 주세요.');}}
 function retry(){if(!task||busy||blocked)return;try{update(resubmitTask(task));setError('');}catch(e){setError(e instanceof Error?e.message:'재작업하지 못했습니다.');}}
 return <main className="office"><div className="skip-links"><a href="#office-approvals" onClick={event=>{event.preventDefault();jumpToPane('review','office-approvals');}}>결재대기함으로 바로 가기</a><a href="#office-staff-chat" onClick={event=>{event.preventDefault();jumpToPane('office','office-staff-chat');}}>직원 대화로 바로 가기</a><a href="#office-task-list" onClick={event=>{event.preventDefault();jumpToPane('office','office-task-list');}}>업무 목록으로 바로 가기</a></div><nav className="office-nav"><Link href="/office/demo">직원 배정 데모</Link><Link href="/storybook">동화 만들기·내 책장</Link></nav>
 <header><div><h1>공동 프로젝트 작업실</h1><p className="muted">대표와 네 AI 직원이 함께 만드는 개발·운영 사무실</p></div><span className="pill">{effectiveMode==='demo'?'데모 시뮬레이션':effectiveMode==='subscription'?'GPT 구독 업무':'과거 유료 모드 · 실행 차단'}</span></header><OfficeViewTabs view={view} onView={setView}/><section id="office-pane-office" role="tabpanel" aria-labelledby="office-tab-office" hidden={view!=='office'}><div className="office-collaboration-layout"><Office3DPanel subscriptionStatus={subscriptionStatus} sourceStatus={sourceStatus} tasks={tasks} activeTask={task} busy={busy} onSelectTask={id=>{if(!busy){setSelected(id);setAutomaticMessage('');}}}/><StaffChat progress={automaticMessage} onResult={(id,approval)=>selectFromList(id,!approval,approval)} sourceStatus={sourceStatus} onRecover={recoverChat} task={task} busy={busy} onOpen={id=>{if(!busy){setSelected(id);setAutomaticMessage('');}}} onCommand={dispatchChat}/></div>
 <section className="panel" aria-label="사무실 관리 탭"><p role="status">{access==='writer'?(storageBlocked?'관리 탭 · 업무 저장 문제로 등록·실행 중단':'이 탭에서 업무 관리·실행 가능'):access==='checking'?'업무 관리 탭 확인 중…':access==='viewer'?'다른 탭에서 업무 관리 중 · 이 탭은 조회 전용':'업무 관리 잠금을 사용할 수 없어 조회 전용입니다.'}</p><p>여러 탭의 업무가 서로 덮이지 않도록 한 탭만 등록·실행합니다. 조회 탭도 저장된 진행 결과를 확인할 수 있습니다.</p>{access==='viewer'&&<button disabled={busy} onClick={claimWriter}>다른 관리 탭을 닫은 뒤 이 탭에서 관리 시작</button>}</section>
 <p className="notice">데모는 규칙 기반 예시입니다. GPT 구독 모드는 기획·개발·마케팅·품질관리 모두 기획 문서·개발 화면·마케팅 콘텐츠·디자인 시안을 생성합니다. 결과물 보관함에서 미리보기와 다운로드가 가능합니다. 파일 수정·명령·외부 조사·게시를 하지 않습니다. 기존 유료 API 실행은 차단되어 있습니다.</p>
 <p className="muted">업무는 이 브라우저에 임시 저장됩니다. 동화 답변 저장소와 분리되어 있으며 고객 데이터를 읽거나 변경하지 않습니다.</p>
 {storageError&&<><p role="alert" className="error">{storageError}</p><StorageRescue keys={[OFFICE_STORAGE_KEY]} label="업무 저장 원문 내려받기"/><button onClick={downloadOfficeScreen}>현재 화면 업무 JSON 보관</button>{access==='writer'&&<button disabled={busy} onClick={reloadOffice}>저장된 최신 업무 불러오기</button>}</>}{!ready&&<p role="status">업무 기록을 불러오는 중입니다.</p>}
 <SubscriptionControls status={subscriptionStatus} refresh={refreshSubscription} mode={effectiveMode}/><p><Link href="/office/orders">주문·제작 키 관리 화면 열기 →</Link></p><ManualStoryCode authenticated={Boolean(subscriptionStatus?.authenticated)}/><LiveControls status={liveStatus} refresh={refreshLive} projectId={projectId}/><section className="panel"><label htmlFor="office-mode">실행 모드</label><select id="office-mode" value={effectiveMode} disabled={busy||Boolean(run?.executionMode)} onChange={e=>setMode(e.target.value as 'demo'|'live'|'subscription')}><option value="demo">데모 · 무료 시뮬레이션</option><option value="subscription" disabled={!subscriptionStatus?.authenticated}>{subscriptionStatus?.firstRunApproved?'GPT 구독 업무':'GPT 구독 · 최초 실행 승인 대기'}</option><option value="live" disabled>과거 유료 API · 실행 차단</option></select><p className="muted">한 회차의 모드는 고정됩니다. 새 업무나 재작업 회차에서 변경하세요.</p></section><section className="panel"><label htmlFor="office-project">프로젝트 선택</label><select id="office-project" value={projectId} disabled={busy} onChange={e=>{setProjectId(e.target.value);setSelected('');}}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><h2>{project.name}</h2><p>{project.goal}</p><Link href={project.url}>기존 /storybook 기능 열기 →</Link><p className="muted">전체 {tasks.length}건 · 협업 중 {tasks.filter(t=>t.status==='in_progress').length}건 · 승인 대기 {tasks.filter(t=>t.status==='awaiting_approval').length}건 · 승인 완료 {tasks.filter(t=>t.status==='approved').length}건</p></section>
 <section className="panel"><h2>네 AI 직원</h2><div className="grid">{agents.map(a=><article className="agent" key={a.id}><b>{a.icon} {a.role}</b><span>{a.summary}</span><p className="status">{tasks.filter(t=>['queued','in_progress'].includes(t.status)&&currentRun(t).steps.some(s=>s.agentId===a.id&&s.status!=='completed')).length}개 배정 작업</p></article>)}</div></section>
 {(briefDraft.error||reviewDraft.error||reviewDraft.unsaved)&&<p role="alert">{briefDraft.error||reviewDraft.error||'다른 업무에 보관하지 못한 검토 의견이 있습니다. 이 탭 작성 중 입력 전체 TXT로 보관하세요.'}</p>}<details className="panel"><summary style={{cursor:'pointer'}}>등록 전 지시·검토 의견 보관</summary><p>현재 탭에서 프로젝트별 지시와 업무 회차별 검토 의견을 임시 보관합니다. 새로고침·다른 화면 이동 뒤 이 탭에서 이어 쓸 수 있습니다. 탭을 닫거나 다른 기기로 옮기기 전에는 TXT로 보관하세요. 등록·직원 호출·승인은 자동으로 하지 않습니다.</p><button className="secondary" disabled={!Object.values(briefDraft.snapshot).some(Boolean)&&!Object.values(reviewDraft.snapshot).some(Boolean)} onClick={downloadAllInputs}>이 탭 작성 중 입력 전체 TXT 보관</button><button disabled={!brief} onClick={()=>briefDraft.download('등록 전 업무 지시','office-unsubmitted-brief.txt')}>등록 전 업무 지시 TXT 보관</button><button className="secondary" disabled={!review} onClick={()=>reviewDraft.download('선택 업무 검토 의견','office-unsubmitted-review.txt')}>검토 의견 TXT 보관</button>{briefDraft.error&&<button className="secondary" onClick={briefDraft.retry}>업무 지시 임시 보관 다시 시도</button>}{reviewDraft.error&&<button className="secondary" onClick={reviewDraft.retry}>검토 의견 임시 보관 다시 시도</button>}</details><section className="panel"><h2>플랫폼 연속 협업</h2><p>현재 업무 또는 동화 플랫폼 기본 목표를 이어받아 3회차 동안 앞선 검토를 다음 기획에 전달합니다. 결과물은 회차별로 보존됩니다. 소스 코드 자동 적용과 실제 테스트 실행은 별도 구현이 필요합니다.</p><button disabled={busy||blocked} onClick={projectLoop}>플랫폼 목표로 3회차 연속 협업</button>{automatic&&!task&&<button onClick={stopAutomatic}>현재 직원 완료 후 일시정지</button>}</section><section className="panel"><h2>업무 등록</h2><label htmlFor="task-brief">대표 업무 지시</label><textarea id="task-brief" maxLength={4000} placeholder="예: 동화 질문 서비스의 요구사항을 정리하고 개발 계획과 품질 검토를 진행해 줘." value={brief} onChange={e=>setBrief(e.target.value)} disabled={blocked||busy}/>
 <p className="muted">자동 추천: {agentName(recommendation.agentId)} · {recommendation.reason}</p><div className="office-options"><div><label htmlFor="assignee">담당 직원</label><select id="assignee" value={manual} onChange={e=>setManual(e.target.value as AgentId|'')} disabled={busy||blocked}><option value="">자동 추천 사용</option>{agents.map(a=><option key={a.id} value={a.id}>{a.role}</option>)}</select></div><div><label htmlFor="workflow">협업 방식</label><select id="workflow" value={flow} onChange={e=>setFlow(e.target.value as Workflow|'auto')} disabled={busy||blocked}><option value="auto">자동 · 네 직원 협업 / 담당 지정 시 단독</option>{Object.entries(workflowLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div></div>
 <p className="muted">등록 예정: {agentName(assignee)} · {workflowLabels[workflow]}. 전체 협업은 기획 → 개발 → 마케팅 → 디자인 순서로 앞선 결과를 인계합니다.</p><button disabled={!ready||blocked||busy||Boolean(storageError)||!brief.trim()} onClick={()=>void registerAndStart()}>등록하고 GPT 협업 시작</button>{' '}<button className="secondary" disabled={!ready||blocked||busy||!brief.trim()} onClick={register}>업무 등록</button><p className="muted">GPT 협업 시작은 기획 → 개발 → 마케팅 → 디자인 네 직원을 자동 배정합니다. 업무 등록만 누르면 대기 상태로 저장됩니다. GPT 실행에는 로컬 인증과 구독 사용량이 필요하며 데모로 대체하지 않습니다.</p></section>
 {error&&<p className="error" role="alert">{error}</p>}
 <OfficeBackup disabled={!ready||blocked||busy||Boolean(storageError)} onRestore={restoreOffice}/><TaskExplorer tasks={tasks} selected={selected} busy={busy} onSelect={selectFromList}/>
 {task&&run&&<section id="office-task-detail" tabIndex={-1} className="panel" aria-label="선택한 업무"><h2>업무 상세</h2>{(task.workflow!=='team'||run.executionMode==='demo'||run.steps.some(s=>s.output&&!readFiles(s.output.items.join('\n')).length))&&<div className="approval"><p>이전 협업 방식과 데모 기록은 보존됩니다. 이 지시로 네 직원 GPT 협업을 새 업무로 시작할 수 있습니다. 기존 업무의 실행을 이어가는 기능은 아닙니다.</p><button disabled={busy||blocked||Boolean(storageError)} onClick={()=>void registerAndStart(task.brief)}>이 지시로 네 직원 GPT 협업 새로 시작</button></div>}<p className="report">{task.brief}</p><p role="status">상태: {statusLabels[task.status]} · 담당: {agentName(task.assignee)}</p><p>흐름: 대표 → {run.steps.map(s=>agentName(s.agentId)).join(' → ')} → 대표</p>
 {['queued','in_progress'].includes(task.status)&&<div className="approval"><h3>업무 실행</h3><p>자동 실행은 선택한 업무의 남은 직원만 순서대로 처리하고 대표 승인 대기에서 멈춥니다. 페이지를 닫으면 다음 단계는 자동으로 이어지지 않습니다.</p><button disabled={busy||blocked||Boolean(storageError)||effectiveMode==='live'} onClick={()=>void startAutomatic()}>{effectiveMode==='demo'?'자동 실행 시작 · 데모':'자동 실행 시작 · GPT'}</button>{' '}<button className="secondary" disabled={busy||blocked||effectiveMode==='live'} onClick={()=>void advance()}>{effectiveMode==='demo'?'다음 직원 데모 실행':effectiveMode==='subscription'?'다음 직원 구독 흐름 실행':'유료 API 실행 차단'}</button>{automatic&&<><br/><button className="secondary" onClick={stopAutomatic}>현재 직원 완료 후 일시정지</button></>}</div>}
 {automaticMessage&&<p role="status" aria-live="polite">{automaticMessage}</p>}
 {['rejected','failed'].includes(task.status)&&<><p className="error">검토 의견: {task.feedback||'중단된 단계의 이력을 확인하세요.'}</p><button onClick={retry} disabled={busy||blocked}>피드백 반영 재작업 등록</button></>}
 {task.status==='awaiting_approval'&&<div id="office-owner-approval" tabIndex={-1} role="region" aria-label="대표 승인 결정" className="approval"><h3>대표 승인 대기</h3><ApprovalResults key={task.id+run.id} task={task}/><ApprovalChecklist task={task}/><label htmlFor="owner-review">검토 의견 · 반려 시 필수</label><textarea id="owner-review" maxLength={2000} value={review} onChange={e=>setReview(e.target.value)}/><button onClick={()=>decision(true)} disabled={busy||blocked||!approvalDetails(task).complete}>대표 승인</button>{' '}<button className="secondary" onClick={()=>decision(false)} disabled={busy||blocked}>대표 반려</button></div>}
 {task.status==='approved'&&<p className="pill">대표 승인 완료 · 외부 실행이나 배포는 하지 않았습니다.</p>}
 <p>완료 {run.steps.filter(s=>s.status==='completed').length}/{run.steps.length}단계 · {run.executionMode==='subscription'?'실제 GPT 구독 실행':run.executionMode==='demo'?'데모 결과 — 실제 GPT 작업 아님':'아직 실행되지 않음'}</p>{subscriptionStatus?.authenticated&&! ['approved','rejected'].includes(task.status)&&<button className="secondary" disabled={busy||blocked} onClick={recover}>서버 결과 확인·복구 · 새 호출 없음</button>}<Deliverables key={task.id+run.id} task={task} preferredRunId={preferredResultRun} navigationId={resultNavigation}/><h3>직원별 입력·출력·상태</h3>{task.runs.map(r=><div key={r.id} className="office-run"><h3>회차 {r.revision}{r.id!==run.id?' · 이전 기록':''}</h3>{r.steps.map(s=><article className="office-step" key={s.id}><h4>{agentName(s.agentId)} · {s.output&&!s.output.simulation?'실제 AI 결과 완료':stepLabels[s.status]}</h4>{s.output&&<><b>{s.output.summary}</b><p className="pill">{s.output.simulation?'데모 결과':'실제 AI 결과'}</p>{s.output.service&&<p>사용 서비스: {s.output.service.product} · {s.output.service.billingMode==='subscription'?'ChatGPT 구독 사용량 (추가 API 호출 없음)':'데모·사용량 없음'} · 모델 {s.output.service.model??'없음'}</p>}{s.output.usage&&<p>모델 {s.output.usage.model} · 입력 {s.output.usage.inputTokens??'미확인'} / 출력 {s.output.usage.outputTokens??'미확인'} 토큰 · 추정 USD {s.output.usage.estimatedUsd.toFixed(6)}</p>}<details><summary>생성 원문 보기</summary><pre style={{whiteSpace:'pre-wrap'}}>{s.output.items.join('\n\n')}</pre></details><p className="muted">{s.output.assumptions.join(' ')}</p></>}{s.error&&<p className="error">{s.error}</p>}<details><summary>구조화된 입력·출력 보기</summary><pre>{JSON.stringify({status:s.status,input:s.input,output:s.output,startedAt:s.startedAt,finishedAt:s.finishedAt},null,2)}</pre></details></article>)}</div>)}
 <h3>협업·승인 이력</h3><ol className="history">{task.history.map(h=><li key={h.id}><b>{h.action}</b> · {h.actor==='owner'?'대표':h.actor==='system'?'시스템':agentName(h.actor)}<p>{h.action==='채팅 지시 연결'?'저장한 세부 지시가 이 업무에 연결되었습니다.':h.detail}</p><time dateTime={h.at}>{new Date(h.at).toLocaleString('ko-KR')}</time></li>)}</ol></section>}
 </section><section id="office-pane-review" role="tabpanel" aria-labelledby="office-tab-review" hidden={view!=='review'}><AutonomousWork onStatus={setSourceStatus}/><StaffDashboard sourceStatus={sourceStatus} actionCount={actionCount} tasks={tasks} activeId={selected} busy={busy} ready={ready} error={storageError} onOpen={id=>selectFromList(id)}/><ApprovalCenter onPendingChange={setActionCount} tasks={workspace.tasks} busy={busy} onReview={id=>selectFromList(id,false,true)} onResults={id=>selectFromList(id,true,true)}/><DevelopmentBoard/><ChatCleanup busy={busy}/></section></main>;
}



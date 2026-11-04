'use client';
import {statusFresh,type AutonomousStatus} from '../../lib/office/autonomous-status';
import {readinessLabel,type SubscriptionReadiness} from '../../lib/office/readiness';
import dynamic from 'next/dynamic';
import {Component,useState,type ReactNode} from 'react';
import {currentRun,type Task} from '../../lib/office/model';
import type {AgentId} from '../../lib/agents';
import {initialAgents,statuses,type OfficeAgent} from './design';
import MascotPortrait from './MascotPortrait';
import styles from './office3d.module.css';

const Scene=dynamic(()=>import('./OfficeScene'),{ssr:false,loading:()=> <div className={styles.fallback}>사계절 사무실을 여는 중…</div>});
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className={styles.fallback}><strong>3D 공간을 표시할 수 없습니다.</strong><p>아래 직원 카드와 기존 업무 기능은 계속 사용할 수 있습니다.</p></div>:this.props.children;}
}
const roleIds:Record<string,AgentId>={dev:'developer',planner:'research',design:'quality',marketing:'marketing'};

export default function Office3DPanel({tasks,activeTask,busy,onSelectTask,sourceStatus,subscriptionStatus}:{tasks:Task[];subscriptionStatus?:SubscriptionReadiness|null;sourceStatus?:AutonomousStatus|null;activeTask:Task|undefined;busy:boolean;onSelectTask:(id:string)=>void}){
 const [motionEnabled,setMotionEnabled]=useState(true);
 const [selected,setSelected]=useState<AgentId>('developer');const [resetKey,setResetKey]=useState(0);const [expanded,setExpanded]=useState(true);
 const sources=new Map<string,Task>(),sourceActors=new Set<string>();const sourceActive=sourceStatus&&statusFresh(sourceStatus)&&['working','checking'].includes(sourceStatus.state);
 const sceneAgents:OfficeAgent[]=initialAgents.map(template=>{
  const id=roleIds[template.id];
  const matching=tasks.filter(t=>currentRun(t).steps.some(s=>s.agentId===id));
  const task=matching.find(t=>currentRun(t).steps.some(s=>s.agentId===id&&s.status==='running'))||(activeTask&&matching.find(t=>t.id===activeTask.id))||matching.find(t=>['queued','in_progress','failed'].includes(t.status))||matching[0];
  const localActive=task&&(currentRun(task).steps.some(step=>step.agentId===id&&step.status==='running')||(busy&&task.id===activeTask?.id&&currentRun(task).steps.find(step=>step.status!=='completed')?.agentId===id));
  if(sourceActive&&sourceStatus.role===id&&!localActive){sourceActors.add(id);return {...template,id,task:'자동 고도화 · '+sourceStatus.title,status:'working',progress:0};}
  if(!task)return {...template,id,task:'아직 배정된 업무가 없습니다.',status:'idle',progress:0};
  sources.set(id,task);const run=currentRun(task);const step=run.steps.find(s=>s.agentId===id)!;
  const next=run.steps.find(s=>s.status!=='completed');
  const active=step.status==='running'||Boolean(busy&&task.id===activeTask?.id&&next?.id===step.id);
  const status=active?'working':step.status==='failed'?'error':step.status==='completed'?'done':'idle';
  return {...template,id,task:task.brief,status,progress:Math.round(run.steps.filter(s=>s.status==='completed').length/run.steps.length*100)};
 });
 const current=sceneAgents.find(a=>a.id===selected)!;
 const source=sources.get(selected);
 const step=source&&currentRun(source).steps.find(s=>s.agentId===selected);
 function select(id:string){setSelected(id as AgentId);const task=sources.get(id);if(task)onSelectTask(task.id);}
 return <section className={styles.shell} aria-label="사계절 3D 사무실">
  <div className={styles.heading}><div><span className={styles.eyebrow}>OUR SEASONAL OFFICE</span><h2>사계절이 함께 일하는 사무실</h2><p>네 직원은 GPT 구독으로 협업할 수 있어요. 실행 전 연결과 한도를 확인해요.</p><p role="status" aria-label="구독 실행 준비">{readinessLabel(subscriptionStatus)}</p></div><div className={styles.actions}><button type="button" aria-pressed={motionEnabled} onClick={()=>setMotionEnabled(value=>!value)}>{motionEnabled?'캐릭터 움직임 끄기':'캐릭터 움직임 켜기'}</button><button type="button" onClick={()=>setResetKey(k=>k+1)} disabled={!expanded}>시점 초기화</button><button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'3D 접기':'3D 펼치기'}</button></div></div>
  {expanded&&<div className={styles.canvas} data-testid="office-3d-scene"><SceneBoundary><Scene agents={sceneAgents} selected={selected} onSelect={select} resetKey={resetKey} motionEnabled={motionEnabled}/></SceneBoundary></div>}
  <div className={styles.cards}>{sceneAgents.map(a=><button key={a.id} type="button" aria-pressed={selected===a.id} className={styles.card} data-working={a.status==='working'&&motionEnabled} onClick={()=>select(a.id)} style={{borderColor:selected===a.id?a.color:undefined}}><MascotPortrait season={a.season}/><span><strong>{a.name} · {a.role}</strong><small><i style={{background:statuses[a.status].color}}/>{statuses[a.status].label} · GPT 역할</small></span></button>)}</div>
  <div className={styles.detail} aria-live="polite"><div><strong>{current.name}의 업무</strong><p>{current.task}</p></div><div className={styles.result}><span>{sourceActors.has(selected)?'자동 고도화 중':step?.output?(step.output.simulation?'기존 데모 결과':step.output.service?.provider==='codex'?'GPT 결과':'기존 AI 결과'):'업무 상태'}</span><p>{sourceActors.has(selected)?sourceStatus?.detail:step?.output?.summary||statuses[current.status].label}</p>{source&&<small>전체 회차: {currentRun(source).steps.filter(s=>s.status==='completed').length}/{currentRun(source).steps.length}단계 완료 · 결과 전문과 승인 이력은 업무 상세에서 확인</small>}</div></div>
  <p className={styles.caption}>드래그하여 회전 · 휠로 확대 · 캐릭터 또는 카드를 눌러 선택. 작업 중인 직원은 손을 움직이며 일합니다. 움직임 끄기와 기기의 동작 줄이기 설정을 지원합니다. 상태는 실제 업무 기록에 따라 바뀌며 자동으로 작업을 시작하지 않습니다.</p>
 </section>;
}

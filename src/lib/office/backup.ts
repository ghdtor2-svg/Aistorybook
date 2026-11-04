import {parseWorkspace} from './storage';import {currentRun,failStep,type Workspace} from './model';
export function exportOffice(workspace:Workspace){const checked=parseWorkspace(JSON.stringify({version:1,tasks:workspace.tasks}),{recoverInterrupted:false});return JSON.stringify({format:'ai-office-workspace',version:1,exportedAt:new Date().toISOString(),workspace:checked},null,2);}
export function importOffice(raw:string){if(raw.length>16000000)throw Error('백업 파일이 너무 큽니다.');const value=JSON.parse(raw);if(value?.format!=='ai-office-workspace'||value.version!==1||!value.workspace||typeof value.workspace!=='object')throw Error('사무실 업무 기록 백업 파일을 선택하세요.');return parseWorkspace(JSON.stringify(value.workspace),{recoverInterrupted:false});}
export function mergeOffice(existing:Workspace,incoming:Workspace){
 const current=parseWorkspace(JSON.stringify(existing),{recoverInterrupted:false}),source=parseWorkspace(JSON.stringify(incoming),{recoverInterrupted:false});const ids=new Map(current.tasks.map(t=>[t.id,t]));let added=0,duplicates=0,conflicts=0,interrupted=0;const fresh=[];
 for(const task of source.tasks){const old=ids.get(task.id);if(old){if(JSON.stringify(old)===JSON.stringify(task))duplicates++;else conflicts++;continue;}
  const running=currentRun(task).steps.some(s=>s.status==='running');fresh.push(running?failStep(task,'백업에서 복원한 실행 중 기록입니다. 실제 완료 여부는 서버 결과 확인·복구로 확인하세요. 자동 실행하지 않았습니다.'):task);if(running)interrupted++;added++;
 }
 const workspace=parseWorkspace(JSON.stringify({version:1,tasks:[...current.tasks,...fresh]}),{recoverInterrupted:false});return {workspace,added,duplicates,conflicts,interrupted};
}

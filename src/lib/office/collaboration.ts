import {agentName,type Task} from './model';

export type CollaborationEntry = {
  id:string;
  at:string;
  who:string;
  text:string;
  revision:number;
  detail:string;
  mode:string;
  kind:'instruction'|'handoff'|'update'|'report';
};

// Display the material recorded during the workflow.
export function collaborationEntries(task:Task,runId=task.runs.at(-1)?.id):CollaborationEntry[]{
  const run=task.runs.find(run=>run.id===runId);
  if(!run)return [];

  const entries:CollaborationEntry[]=[];
  const firstStep=run.steps[0];
  const lastStep=run.steps.at(-1);
  const handedOff=new Set(run.steps.flatMap(step=>step.input?.upstream.map(artifact=>artifact.id)??[]));
  for(const step of run.steps){
    const id=run.id+':'+step.id;
    const at=step.startedAt||run.createdAt;
    const recipient=agentName(step.agentId);
    const input=step.input;
    if(input){
      if(step===firstStep){
        entries.push({
          id:id+':brief',at,who:'대표 → '+recipient,text:input.brief,
          revision:run.revision,detail:input.feedback?'대표 검토 의견:\n'+input.feedback:'',
          mode:run.executionMode==='demo'?'데모 협업':'업무 지시',kind:'instruction',
        });
      }
      for(const artifact of input.upstream){
        entries.push({
          id:id+':handoff:'+artifact.id,at,who:agentName(artifact.agentId)+' → '+recipient,
          text:artifact.summary,revision:run.revision,detail:artifact.items.join('\n\n'),
          mode:artifact.simulation?'데모 인계 자료':'직원 의견 전달',kind:'handoff',
        });
      }
    }

    const output=step.output;
    if(output&&(step===lastStep||!handedOff.has(output.id))){
      const isReport=step===lastStep&&run.steps.every(item=>item.status==='completed');
      entries.push({
        id:id+':result',at:step.finishedAt||output.createdAt,
        who:recipient+(isReport?' → 대표':' → 협업팀'),text:output.summary,
        revision:run.revision,detail:output.items.join('\n\n'),
        mode:output.simulation?'데모 결과':output.service?.provider==='codex'?'GPT 결과':'저장된 결과',
        kind:isReport?'report':'update',
      });
    }
  }
  return entries;
}

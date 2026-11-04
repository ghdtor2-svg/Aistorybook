import {currentRun,type Task,type TaskStatus} from './model';import {readFiles} from './deliverables';
export function taskResults(task:Task){const outputs=task.runs.flatMap(run=>run.steps.flatMap(step=>step.output?[step.output]:[]));return {hasOutput:outputs.length>0,files:outputs.reduce((n,a)=>n+readFiles(a.items.join('\n')).length,0)};}
export function filterTasks(tasks:Task[],options:{query:string;status:'all'|TaskStatus;agent:string;result:'all'|'files'|'text'|'empty'}){
 const terms=options.query.normalize('NFKC').toLocaleLowerCase('ko').trim().split(/\s+/).filter(Boolean);
 return tasks.filter(task=>{if(options.status!=='all'&&task.status!==options.status)return false;if(options.agent!=='all'&&!currentRun(task).steps.some(s=>s.agentId===options.agent))return false;const text=(task.brief+' '+task.feedback).normalize('NFKC').toLocaleLowerCase('ko');if(!terms.every(term=>text.includes(term)))return false;const results=taskResults(task);return options.result==='all'||(options.result==='files'?results.files>0:options.result==='text'?results.hasOutput&&results.files===0:!results.hasOutput);});
}

export function resultRun(task:Task){const reversed=[...task.runs].reverse();return reversed.find(run=>run.steps.some(step=>step.output&&readFiles(step.output.items.join('\n')).length>0))??reversed.find(run=>run.steps.some(step=>step.output))??currentRun(task);}

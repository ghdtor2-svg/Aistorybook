'use client';
import {useState} from 'react';
import {agentName,currentRun,type Task} from '../../lib/office/model';
import {readFiles} from '../../lib/office/deliverables';
import {outputLabel} from '../../lib/office/result-navigation';
import {FileView} from './Deliverables';

export default function ApprovalResults({task}:{task:Task}){
 const run=currentRun(task);
 const [selectedId,setSelectedId]=useState('');
 const results=run.steps.flatMap(step=>{
  const artifact=step.output;
  if(!artifact)return [];
  const files=readFiles(artifact.items.join('\n\n'));
  const author=agentName(artifact.agentId);
  return files.length?files.map(file=>({
   id:step.id+':'+file.name,author,file,label:outputLabel(file.name),demo:artifact.simulation,
  })):[{
   id:step.id,author,label:'텍스트 결과',demo:artifact.simulation,
   file:{name:'result.txt',content:[artifact.summary,...artifact.items].join('\n\n')},
  }];
 });
 const selected=results.find(result=>result.id===selectedId)??results.find(result=>result.file.name==='app.html')??results[0];
 const hasApp=results.some(result=>result.file.name==='app.html');
 return <section aria-label="승인할 결과물">
  <h4>이번 회차 결과 직접 보기</h4>
  <p>회차 {run.revision} · 아래에서 결과를 골라 확인한 뒤 승인하거나 수정 요청을 보낼 수 있어요.</p>
  <p><strong>업무 지시</strong> · {task.brief}</p>
  {hasApp?<p>개발 화면에서 버튼과 입력을 시험할 수 있어요. 이 화면은 오피스에서 만든 독립 실행용 결과물입니다.</p>:<p>이번 회차에 제출된 개발 화면은 없습니다. 아래에서 남아 있는 문서와 의견을 확인할 수 있어요.</p>}
  {selected&&<>
   <label>검토할 결과물 <select value={selected.id} onChange={event=>setSelectedId(event.target.value)}>
    {results.map(result=><option key={result.id} value={result.id}>{result.label} · {result.author}{result.demo?' (데모)':''}</option>)}
   </select></label>
   {selected.demo&&<p className="notice">이 결과는 데모 예시입니다.</p>}
   <FileView key={selected.id} file={selected.file}/>
  </>}
 </section>;
}

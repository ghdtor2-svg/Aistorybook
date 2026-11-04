'use client';
import {useEffect,useState} from 'react';
import type {Artifact,Task} from '../../lib/office/model';
import {agentName,currentRun} from '../../lib/office/model';
import {resultNavigation,outputLabel} from '../../lib/office/result-navigation';
import {resultRun} from '../../lib/office/task-search';
import {readFiles,interactiveHtml,documentHtml,readSocial,type OutputFile} from '../../lib/office/deliverables';

function download(name:string,content:BlobPart,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function Social({file}:{file:OutputFile}){
 const social=readSocial(file.content);const [error,setError]=useState('');
 if(!social)return <p role="alert">게시 이미지 데이터 형식이 올바르지 않습니다. 원문을 확인하세요.</p>;
 function png(){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle=social!.background;ctx.fillRect(0,0,1080,1080);ctx.fillStyle=social!.color;
  const wrap=(text:string,size:number,y:number,maxLines:number)=>{ctx.font=`${size===64?'bold ':''}${size}px sans-serif`;let line='',row=0;for(const ch of text){if(ch==='\n'||ctx.measureText(line+ch).width>920){ctx.fillText(line,80,y+row*(size*1.45));line=ch==='\n'?'':ch;row++;if(row>=maxLines)return;}else line+=ch;}ctx.fillText(line,80,y+row*(size*1.45));};
  wrap(social!.title,64,150,4);wrap(social!.body,36,560,6);wrap(social!.footer,26,990,1);
  canvas.toBlob(blob=>{if(!blob){setError('이미지 저장에 실패했습니다.');return;}download('marketing-post.png',blob,'image/png');},'image/png');
 }
 return <><div className="social-art" style={{background:social.background,color:social.color}}><h4>{social.title}</h4><p>{social.body}</p><small>{social.footer}</small></div><button onClick={png}>게시 이미지 PNG 다운로드 · 1080×1080</button>{error&&<p role="alert">{error}</p>}</>;
}
function FileView({file}:{file:OutputFile}){
 const [width,setWidth]=useState<'100%'|'390px'>('100%');

 const html=file.name.endsWith('.html');const doc=file.name.endsWith('.md');
 const [content,setContent]=useState('');
 useEffect(()=>{setContent(html?interactiveHtml(file.content):doc?documentHtml(file.content):file.content);},[html,doc,file.content]);
 if(file.name.endsWith('.json'))return <Social file={file}/>;
 return <div className="output-file"><div className="output-toolbar"><strong>{outputLabel(file.name)}</strong><b>{file.name}</b><button className="secondary" onClick={()=>download(file.name,html?content:file.content,html?'text/html':doc?'text/markdown;charset=utf-8':'text/plain;charset=utf-8')}>파일 다운로드</button>{doc&&<button className="secondary" onClick={()=>download(file.name.replace(/\.md$/,'.html'),content,'text/html')}>문서 HTML 다운로드</button>}{html&&<button className="secondary" onClick={()=>setWidth(width==='100%'?'390px':'100%')}>{width==='100%'?'모바일 화면':'넓은 화면'}</button>}</div>{html||doc?<iframe key={content} title={file.name+' 미리보기'} sandbox={html?'allow-scripts allow-forms':''} referrerPolicy="no-referrer" srcDoc={content} style={{width,maxWidth:'100%',height:html?640:600,background:'white',border:'1px solid #ddd',borderRadius:12}}/>:<pre style={{whiteSpace:'pre-wrap'}}>{file.content}</pre>}</div>;
}
function moveToResult(id:string){const target=document.getElementById(id);target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'});}
function ArtifactView({artifact,index}:{artifact:Artifact;index:number}){
 const files=readFiles(artifact.items.join('\n\n'));
 return <article id={'office-artifact-'+index} tabIndex={-1} aria-label={resultNavigation(artifact).name+' 결과물'} className="output-card"><button type="button" className="secondary" onClick={()=>moveToResult('office-result-index')}>결과 목록으로 돌아가기</button><h4>{agentName(artifact.agentId)}</h4><p>{artifact.simulation?'데모 예시':files.length?'생성된 결과물 · 검토 필요':'기존 텍스트 결과'}</p>{!files.length?<><p>이전 결과는 문서로 볼 수 있습니다. 개발 화면·디자인 시안·게시 이미지는 새 결과물 생성이 필요합니다.</p><FileView file={{name:'previous-result.md',content:artifact.items.join('\n\n')}}/></>:files.map(file=><FileView key={file.name} file={file}/>)}</article>;
}
export default function Deliverables({task,preferredRunId,navigationId=0}:{task:Task;preferredRunId?:string;navigationId?:number}){
 const [revision,setRevision]=useState(task.runs.some(r=>r.id===preferredRunId)?preferredRunId!:currentRun(task).id);
 useEffect(()=>{setRevision(task.runs.some(r=>r.id===preferredRunId)?preferredRunId!:currentRun(task).id);},[preferredRunId,task.id,navigationId]);
 const current=currentRun(task),recent=resultRun(task),hasAny=task.runs.some(r=>r.steps.some(s=>s.output)),hasFiles=task.runs.some(r=>r.steps.some(s=>s.output&&readFiles(s.output.items.join('\n')).length>0));const run=task.runs.find(r=>r.id===revision)??task.runs.at(-1)!;const outputs=run.steps.filter(step=>step.output);
 return <section id="office-deliverables" tabIndex={-1} className="deliverables" aria-label="결과물 보관함"><h3>결과물 보관함</h3><p><a href="/storybook" style={{display:'inline-block',padding:16,borderRadius:12,background:'#315ae8',color:'white'}}>실제 동화 만들기·내 책장 열기 →</a></p><p>기획 문서 · 개발 화면 · 마케팅 기획서/게시 이미지/문구 · 디자인 시안</p><p className="muted">개발 화면은 독립 실행되는 프런트엔드 결과물입니다. 실제 DB·결제·서비스 배포 연결 여부는 별도 확인이 필요합니다. 화면 안에서 입력한 내용은 임시이며 업무 저장소와 분리됩니다.</p><p role="status">현재 업무는 회차 {current.revision} · 표시한 결과는 회차 {run.revision}{run.id!==current.id?' · 이전 기록':' · 현재 회차'}</p>{run.id!==current.id&&<p className="notice">이전 회차의 결과를 보고 있습니다. 현재 회차의 진행·완료 상태는 별도로 유지됩니다.</p>}<div><button className="secondary" disabled={run.id===current.id} onClick={()=>setRevision(current.id)}>현재 회차 보기</button>{hasAny&&<button className="secondary" disabled={run.id===recent.id} onClick={()=>setRevision(recent.id)}>{hasFiles?'최근 파일 결과 보기':'최근 텍스트 결과 보기'}</button>}</div><label>결과물 회차 <select value={run.id} onChange={e=>setRevision(e.target.value)}>{task.runs.map(r=><option key={r.id} value={r.id}>회차 {r.revision} · {r.id===current.id?'현재':'이전'} · 완료 {r.steps.filter(s=>s.status==='completed').length}/{r.steps.length}단계</option>)}</select></label>{outputs.length>0&&<nav id="office-result-index" tabIndex={-1} aria-label="직원별 결과 바로가기" className="result-index"><h4>어떤 결과를 볼까요?</h4><p>지금 표시한 회차에 실제로 남아 있는 결과만 모았어요.</p><div className="result-index-grid">{outputs.map((step,index)=>{const card=resultNavigation(step.output!);return <button type="button" className="secondary" key={step.id} aria-label={card.name+' 결과로 이동'} onClick={()=>moveToResult('office-artifact-'+index)}><span aria-hidden="true">{card.icon}</span><strong>{card.name}</strong><span>{card.description}</span><small>{card.demo?'연습 예시 · 실제 AI 작업 아님':card.fileCount?'파일 '+card.fileCount+'개 · 검토 필요':'기존 텍스트 결과'}</small></button>;})}</div></nav>}{outputs.length===0?<p>아직 생성된 결과물이 없습니다. 직원이 완료하면 여기에 표시됩니다.</p>:outputs.map((s,index)=><ArtifactView key={s.id} index={index} artifact={s.output!}/>)}<style>{`.result-index{margin:24px 0;scroll-margin-top:24px}.result-index-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px}.result-index-grid button{display:flex;flex-direction:column;gap:10px;align-items:flex-start;text-align:left;padding:18px!important;margin:0!important;white-space:normal;overflow-wrap:anywhere}.result-index-grid button>span:first-child{font-size:24px}.result-index-grid small{font-size:12px;font-weight:400}.output-card{scroll-margin-top:24px;overflow-wrap:anywhere}.deliverables{margin:24px 0;padding:24px;background:#f2f5fb;border-radius:18px;color:#182238}.output-card{margin:24px 0;padding:20px;background:white;border:1px solid #dbe2ee;border-radius:16px}.output-file{margin:20px 0}.output-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px}.output-toolbar b{overflow-wrap:anywhere}.social-art{aspect-ratio:1;max-width:540px;padding:7.4%;display:flex;flex-direction:column;justify-content:space-between;margin:16px 0;white-space:pre-wrap}.social-art h4{font-size:clamp(24px,4vw,32px);margin:0}.social-art p{font-size:18px}.social-art small{font-size:13px}`}</style></section>;
}



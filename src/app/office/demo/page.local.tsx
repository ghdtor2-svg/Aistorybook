'use client';
import {useState} from 'react';
import {agents,assignTask,type Assignment,type Result} from '../../../lib/agents';
export default function OfficeDemo(){
 const [prompt,setPrompt]=useState('');const [busy,setBusy]=useState(false);
 const [results,setResults]=useState<Result[]>([]);const [error,setError]=useState('');
 const [assignment,setAssignment]=useState<Assignment|null>(null);
 const preview=prompt.trim()?assignTask(prompt):null;
 const shown=assignment??preview;
 async function run(){
  if(busy||!prompt.trim())return;
  setBusy(true);setError('');setResults([]);setAssignment(assignTask(prompt));
  try{
   const res=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,mode:'demo'})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||'요청 실패');
   setAssignment(data.assignment);setResults(data.results);
  }catch(e){setError(e instanceof Error?e.message:'알 수 없는 오류');}finally{setBusy(false);}
 }
 function editPrompt(value:string){setPrompt(value);setAssignment(null);setResults([]);setError('');}
 return <main>
  <nav aria-label="오피스 이동"><a href="/office">직원 사무실로 돌아가기</a></nav>
  <header><div><h1>AI OFFICE 직원 배정 데모</h1></div></header>
  <details><summary style={{cursor:'pointer',padding:16}}>직원 배정 데모 살펴보기</summary><section className="panel"><h2>AI 직원 조직</h2><p className="muted">시스템이 업무에 맞는 담당자를 자동 배정하고 필요한 직원에게 협업을 요청합니다.</p>
   <div className="grid">{agents.map(a=>{
    const selected=shown?.participants.includes(a.id);
    const result=results.find(r=>r.agentId===a.id);
    const status=selected?(busy?'결과 대기':error?'실패':result?'완료':'배정 예정'):'대기';
    return <article className={'agent'+(selected?' selected':'')} key={a.id}><div style={{fontSize:28,marginBottom:10}}>{a.icon}</div><b>{a.role}</b><span>{a.summary}</span><p className="status">{status}{selected?' · '+(shown?.lead===a.id?'주 담당':'협업'):''}</p>{result&&<a href={'#result-'+a.id}>결과물 보기</a>}</article>;
   })}</div>
  </section>
  <section className="panel"><h2>대표 업무 지시</h2>
   <p className="muted">이 아래는 직원 배정을 체험하는 규칙 기반 데모입니다. 실제 GPT 협업과 결과물은 위의 직원 사무실에서 확인하세요.</p>
   <textarea aria-label="업무 지시" placeholder="예: 동화 플랫폼 로그인 API를 개발하고 UI 디자인을 검토해 줘." value={prompt} onChange={e=>editPrompt(e.target.value)} maxLength={4000} disabled={busy}/>
   <div className="examples">{[['개발','동화 플랫폼의 로그인 API와 데이터베이스 연동을 개발해 줘.'],['기획·리서치','개인화 동화 서비스의 핵심 질문과 후속 질문을 기획하고 경쟁 시장을 조사해 줘.'],['마케팅','동화 서비스의 인스타그램과 블로그 콘텐츠 초안을 제작해 줘.'],['품질·디자인','동화 내용의 사실 검수와 UI 디자인 시안을 검토해 줘.']].map(([label,value])=><button className="secondary" key={label} disabled={busy} onClick={()=>editPrompt(value)}>{label} 예시</button>)}</div>
   {shown&&<div className="assignment"><b>자동 배정{assignment?'':' 미리보기'}: {agents.find(a=>a.id===shown.lead)?.role}</b><p>{shown.participants.map(id=>agents.find(a=>a.id===id)?.role).join(' → ')}</p><p className="muted">{shown.reason}</p></div>}
   <button onClick={run} disabled={busy||!prompt.trim()}>{busy?'업무 처리 중…':'업무 시작 · 데모'}</button>
   <p className="muted" role="status">{busy?'배정된 직원의 결과를 기다리고 있습니다.':results.length?`${results.length}명 결과 보고 완료`:'직원 배정을 체험하려면 데모 지시를 입력하세요.'}</p>
   {error&&<p className="error" role="alert">{error}</p>}
  </section>
  {results.length>0&&<section className="panel" aria-live="polite"><h2>직원별 업무 결과</h2><p className="pill">데모 결과 · API 호출 없음</p>{results.map((r,i)=><article id={'result-'+r.agentId} key={r.agentId}><h3>{i+1}. {r.role} · {assignment?.lead===r.agentId?'주 담당':'협업'}</h3><div className="report">{r.content}</div></article>)}</section>}
 </details></main>;
}



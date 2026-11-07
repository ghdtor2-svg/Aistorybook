'use client';

import {useRef,useState} from 'react';
import {STORY_PRICE} from '../../lib/storybook/product';

export default function ManualStoryCode({authenticated}:{authenticated:boolean}){
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [code,setCode]=useState('');
  const [message,setMessage]=useState('');
  const requestId=useRef('');
  const issuing=useRef(false);
  const price=STORY_PRICE.toLocaleString('ko-KR')+'원';
  async function issue(){
    if(!authenticated||!confirmed||issuing.current||code)return;
    issuing.current=true;
    setBusy(true);
    setMessage('');
    try{
      const pendingKey='nangman:manual-issue-pending:v1';
      if(!requestId.current){
        try{requestId.current=sessionStorage.getItem(pendingKey)||'';}catch{}
        requestId.current||=crypto.randomUUID();
        try{sessionStorage.setItem(pendingKey,requestId.current);}catch{}
      }
      const response=await fetch('/api/office/story-codes',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:requestId.current,transferConfirmed:true}),
      });
      const data=await response.json();
      if(!response.ok||typeof data.code!=='string')throw Error(data.error||'코드를 발급하지 못했어요.');
      setCode(data.code);
    }catch(error){setMessage(error instanceof Error?error.message:'코드를 발급하지 못했어요.');}
    finally{issuing.current=false;setBusy(false);}
  }
  async function copy(){
    try{await navigator.clipboard.writeText(code);setMessage('제작 코드를 복사했어요.');}
    catch{setMessage('아래 코드를 선택해 복사해 주세요.');}
  }
  function reset(){
    try{sessionStorage.removeItem('nangman:manual-issue-pending:v1');}catch{}
    requestId.current='';
    setCode('');
    setConfirmed(false);
    setMessage('');
  }
  return <section className="panel" aria-label="계좌이체 제작 코드 발급">
    <h2>계좌이체 제작 코드 발급</h2>
    <p>동화 한 편 {price}. 입금 내역을 확인한 뒤 고객에게 전달할 코드를 발급하세요.</p>
    {!authenticated?<p>오피스 관리자 인증을 먼저 해 주세요.</p>:code?<>
      <label htmlFor="issued-story-code">발급한 제작 코드</label>
      <input id="issued-story-code" value={code} readOnly onFocus={event=>event.target.select()}/>
      <button type="button" onClick={()=>void copy()}>코드 복사</button>
      <button type="button" className="secondary" onClick={reset}>다음 고객 발급 준비</button>
    </>:<>
      <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/> {price} 입금을 확인했습니다.</label>
      <button type="button" disabled={!confirmed||busy} onClick={()=>void issue()}>{busy?'발급 중…':'제작 코드 발급'}</button>
    </>}
    {message&&<p role="status">{message}</p>}
  </section>;
}

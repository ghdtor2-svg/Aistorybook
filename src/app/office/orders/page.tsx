'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {AdminOrder} from '../../../lib/storybook/order-admin';
import {STORY_PRICE} from '../../../lib/storybook/product';
import styles from './page.module.css';

const endpoint='/api/office/orders';
const pendingKey='nangman:backoffice-issue-pending:v1';
// 서버가 본문에 설명을 담지 못한 응답(502 등)에서도 무슨 일인지 보이게 한다. 빈 메시지로 삼키지 않는다.
// 본문 모양은 서버가 정한다. 기존 response.json() 과 같은 느슨함을 유지한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readBody=async(response:Response):Promise<any>=>{try{return await response.json();}catch{return {};}};
const failed=(response:Response,data:{error?:unknown},fallback:string)=>Error(typeof data?.error==='string'&&data.error?data.error:fallback+' (서버 응답 '+response.status+')');
export default function OrderBackoffice(){
 const [orders,setOrders]=useState<AdminOrder[]>([]),[authenticated,setAuthenticated]=useState(false),[checking,setChecking]=useState(true);
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[query,setQuery]=useState('');
 const [source,setSource]=useState('');const [selected,setSelected]=useState(''),[revealed,setRevealed]=useState('');
 const [newLabel,setNewLabel]=useState(''),[newNote,setNewNote]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [label,setLabel]=useState(''),[note,setNote]=useState('');
 const locked=useRef(false),issueId=useRef('');
 const order=orders.find(item=>item.id===selected);
 async function run(work:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(true);setMessage('');try{await work();}catch(error){setMessage(error instanceof Error?error.message:'작업을 완료하지 못했어요.');}finally{locked.current=false;setBusy(false);}}
 function choose(item:AdminOrder){setSelected(item.id);setLabel(item.customerLabel);setNote(item.operatorNote);setRevealed('');}
 async function load(){
  const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});const data=await readBody(response);
  if(response.status===403){setAuthenticated(false);setOrders([]);setSelected('');setRevealed('');return;}
  if(!response.ok){setOrders([]);setSelected('');setRevealed('');throw failed(response,data,'주문을 불러오지 못했어요.');}setAuthenticated(true);setSource(data.source==='cloud'?'고객 사이트와 공유 중':'이 컴퓨터에만 저장 중');setOrders(data.orders);
  if(data.unreadable||data.limited)setMessage(data.unreadable?'일부 주문을 읽지 못했어요. 원본 기록을 확인해 주세요.':'최근 500건을 표시합니다.');
 }
 useEffect(()=>{void load().catch(()=>setMessage('서버에 연결하지 못했어요. 로컬 제작 서버가 켜져 있는지 확인해 주세요.')).finally(()=>setChecking(false));},[]);
 async function login(event:FormEvent){event.preventDefault();await run(async()=>{const response=await fetch('/api/office',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password})});setPassword('');const data=await readBody(response);if(!response.ok)throw Error(data.error||'로그인하지 못했어요.');await load();});}
 async function logout(){await run(async()=>{const response=await fetch('/api/office',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!response.ok)throw Error('로그아웃 상태를 확인하지 못했어요.');setAuthenticated(false);setOrders([]);setSelected('');setRevealed('');});}
 async function issue(event:FormEvent){event.preventDefault();if(!confirmed)return;await run(async()=>{
  issueId.current||=sessionStorage.getItem(pendingKey)||crypto.randomUUID();sessionStorage.setItem(pendingKey,issueId.current);
  const response=await fetch('/api/office/story-codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:issueId.current,transferConfirmed:true,customerLabel:newLabel,operatorNote:newNote})});
  const data=await readBody(response);if(!response.ok)throw failed(response,data,'제작 키를 발급하지 못했어요.');
  const id=issueId.current;issueId.current='';sessionStorage.removeItem(pendingKey);setConfirmed(false);setNewLabel('');setNewNote('');
  await load();setSelected(id);setLabel(newLabel);setNote(newNote);setRevealed(data.code);setMessage('입금 확인과 키 발급을 기록했어요. 고객에게 키를 전달해 주세요.');
 });}
 async function action(kind:'metadata'|'reveal'|'rotate'|'revoke'){
  if(!order)return;
  if(kind==='rotate'&&!window.confirm('이 주문의 키를 재발급할까요? 이전 키는 사용할 수 없게 됩니다. 기존 작품과 사용 횟수는 그대로 유지합니다.'))return;
  if(kind==='revoke'&&!window.confirm('이 키의 사용을 중지할까요? 저장된 작품은 삭제하지 않습니다. 나중에 같은 주문에서 키를 재발급할 수 있습니다.'))return;
  await run(async()=>{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:order.id,action:kind,customerLabel:label,operatorNote:note,confirm:true})});const data=await readBody(response);
   if(!response.ok)throw failed(response,data,'작업을 저장하지 못했어요.');setOrders(previous=>previous.map(item=>item.id===data.order.id?data.order:item));setRevealed(data.code||'');setMessage(kind==='metadata'?'메모를 저장했어요.':kind==='rotate'?'새 키를 발급했어요. 이전 키는 중지되었습니다.':kind==='revoke'?'키 사용을 중지했어요.':'키를 확인했어요. 고객에게만 전달해 주세요.');
  });
 }
 const visible=orders.filter(item=>[item.id,item.customerLabel,item.bookTitle,item.status,item.keyStatus].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return <main className={styles.root}>
  <header className={styles.header}><div><p className={styles.eyebrow}>낭만한줄 · 대표 전용</p><h1>주문과 제작 키 관리</h1><p>입금 확인부터 동화 완성까지 한곳에서 확인하세요.</p></div><nav><Link href="/storybook">동화 화면</Link>{authenticated&&<button type="button" className={styles.secondary} disabled={busy} onClick={()=>void logout()}>로그아웃</button>}</nav></header>
  <p className={styles.notice}>대표 전용 관리 화면입니다. 관리자 비밀번호로만 열리고, 검색에는 올라가지 않습니다. 공용 기기에서는 보신 뒤 로그아웃해 주세요. 고객 정보와 발급 키는 깃허브에 저장하지 않습니다.</p>{source&&<p role="status">저장 위치: {source}</p>}
  {message&&<p role="status" className={styles.message}>{message}</p>}
  {checking?<p>관리자 인증을 확인하고 있어요…</p>:!authenticated?<form className={styles.login} onSubmit={login}><h2>관리자 로그인</h2><label>관리자 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/></label><button disabled={busy} type="submit">로그인</button><p>기존 사무실 관리자 비밀번호를 사용합니다.</p></form>:<>
   <section className={styles.stats} aria-label="주문 현황">{[['전체 주문',orders.length],['키 미사용',orders.filter(item=>item.status==='키 미사용').length],['제작 중',orders.filter(item=>item.busy).length],['확인 필요',orders.filter(item=>['제작 중단','요청 확인 필요'].includes(item.status)).length]].map(([name,count])=><div key={name}><span>{name}</span><strong>{count}</strong></div>)}</section>
   <details className={styles.issue}><summary>입금 확인 후 새 키 발급</summary><form onSubmit={issue}><div className={styles.fields}><label>고객 별칭<input value={newLabel} maxLength={80} onChange={event=>setNewLabel(event.target.value)} placeholder="예: 별님 가족"/></label><label>주문 메모<textarea aria-label="주문 메모" value={newNote} maxLength={500} onChange={event=>setNewNote(event.target.value)} placeholder="전달 여부 등 운영 메모만 적어주세요."/></label></div><label className={styles.check}><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/> {STORY_PRICE.toLocaleString('ko-KR')}원 입금을 확인했습니다.</label><button type="submit" disabled={busy||!confirmed}>입금 확인 · 제작 키 발급</button>{message&&<p role="status" className={styles.message}>{message}</p>}</form></details>
   <div className={styles.layout}><section className={styles.list} aria-label="주문 목록"><div className={styles.listHead}><h2>주문 목록</h2><button type="button" disabled={busy} className={styles.secondary} onClick={()=>void run(load)}>새로고침</button></div><label>주문 검색<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="별칭, 주문번호, 제작 상태"/></label><p className={styles.muted}>{visible.length}건 · 최근 기록 기준</p>{visible.length===0&&<p>표시할 주문이 없어요.</p>}{visible.map(item=><button type="button" disabled={busy} key={item.id} aria-label={'주문 보기 '+(item.customerLabel||item.id.slice(0,8))} aria-pressed={selected===item.id} className={styles.order} onClick={()=>choose(item)}><strong>{item.customerLabel||'별칭 없는 주문'}</strong><span>{item.status} · {item.keyStatus}</span><small>{new Date(item.createdAt).toLocaleString('ko-KR')} · {item.id.slice(0,8)}</small></button>)}</section>
    <section className={styles.detail} aria-label="주문 상세">{!order?<p>왼쪽에서 주문을 선택해 주세요.</p>:<><h2>{order.customerLabel||'주문 상세'}</h2><p className={styles.orderId}>주문번호 {order.id}</p><dl className={styles.summary}><div><dt>입금 확인</dt><dd>{order.paid?'확인됨':'미확인'} · {order.amount.toLocaleString('ko-KR')}원</dd></div><div><dt>제작 상태</dt><dd>{order.status}</dd></div><div><dt>그림 진행</dt><dd>{order.images}/{order.total}장</dd></div><div><dt>포함 그림 수정</dt><dd>{order.revisionUsed?'사용함':'미사용'}</dd></div><div><dt>키 상태</dt><dd>{order.keyStatus} {order.codeHint}</dd></div><div><dt>작품</dt><dd>{order.bookTitle||'아직 생성 전'}</dd></div></dl>
      <div className={styles.actions}><button type="button" disabled={busy||order.keyStatus!=='사용 가능'} onClick={()=>void action('reveal')}>발급 키 확인</button><button type="button" className={styles.secondary} disabled={busy||order.busy||!order.paid} onClick={()=>void action('rotate')}>같은 주문에서 키 재발급</button><button type="button" className={styles.secondary} disabled={busy||order.busy||order.keyStatus!=='사용 가능'} onClick={()=>void action('revoke')}>키 사용 중지</button></div>{order.busy&&<p className={styles.muted}>제작이 진행되는 동안 키 변경은 잠시 제한합니다.</p>}
      {revealed&&<div className={styles.keyBox}><label>고객에게 전달할 제작 키<textarea aria-label="고객에게 전달할 제작 키" value={revealed} readOnly onFocus={event=>event.target.select()}/></label><button type="button" onClick={()=>void navigator.clipboard.writeText(revealed).then(()=>setMessage('키를 복사했어요.')).catch(()=>setMessage('키를 직접 선택해 복사해 주세요.'))}>키 복사</button><button type="button" className={styles.secondary} onClick={()=>setRevealed('')}>키 가리기</button></div>}
      <form onSubmit={event=>{event.preventDefault();void action('metadata');}}><h3>고객·주문 메모</h3><label>고객 별칭<input value={label} maxLength={80} onChange={event=>setLabel(event.target.value)}/></label><label>주문 메모<textarea aria-label="주문 메모" value={note} maxLength={500} onChange={event=>setNote(event.target.value)}/></label><button type="submit" disabled={busy}>메모 저장</button></form>
      <h3>최근 관리 이력</h3>{order.events.length?<ol className={styles.history}>{order.events.slice().reverse().map((event,index)=><li key={event.at+'-'+index}>{event.action}<time>{new Date(event.at).toLocaleString('ko-KR')}</time></li>)}</ol>:<p className={styles.muted}>이전 주문에는 관리 이력이 없을 수 있어요.</p>}<p className={styles.muted}>고객 브라우저의 책장과 서버 보관본은 별개입니다. 이 화면은 고객의 내려받은 파일을 지우지 않습니다.</p>
    </>}</section></div>
  </>}
 </main>;
}

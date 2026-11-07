'use client';
import {requestJson} from './request-json';
import {useState} from 'react';
import {officeRequest} from './live-controls';
export type SubscriptionStatus={localAuthAvailable:boolean;restartRequired?:boolean;authenticated:boolean;firstRunApproved:boolean;paidApiEnabled:false;research:'codex'};
export function subscriptionRequest(body: {action: string; [key: string]: unknown}) {
 const executing = body.action === 'run';
 const message = executing
  ? '서버 응답 대기가 끝났습니다. 서버 작업은 계속 진행 중일 수 있습니다. 실행을 다시 누르기 전에 결과 확인·복구를 이용하세요.'
  : '서버 응답 대기가 끝났습니다. 연결 상태를 확인해 주세요.';
 return requestJson('/api/office/subscription', body, executing ? 300_000 : 60_000, message, '구독 연결 요청 실패');
}
export function SubscriptionControls({status,refresh,mode='demo'}:{status:SubscriptionStatus|null;refresh:()=>Promise<void>;mode?:'demo'|'live'|'subscription'}){
 const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function act(action:'login'|'probe'|'logout'){if(action==='login'&&status?.restartRequired){setMessage('설정이 바뀌었어요. 서버를 다시 켠 뒤 새 비밀번호로 로그인해 주세요.');return;}setBusy(true);try{if(action==='probe'){const result=await subscriptionRequest({action});setMessage(result.connected&&result.authMode==='chatgpt'?'Codex ChatGPT 로그인 확인 · '+result.planType+' (로그인만 확인 · 설정/한도는 실행 전 검사)':'Codex 확인 실패 · 단계: '+result.stage+' · 분류: '+result.reason+' (설정·한도 조회 미실행). 새 GPT 실행 전 연결 상태를 확인하세요.');}else{await officeRequest({action,password});setPassword('');setMessage('');await refresh();}}catch(error){setMessage(error instanceof Error?error.message:'연결을 확인하세요.');}finally{setBusy(false);}}
 return <section className="panel"><h2>Codex 구독 실행 연결</h2><p role="status">연결 상태: {!status?'미확인':status.restartRequired?'설정 변경 · 서버 다시 켜기 필요':!status.localAuthAvailable?'로컬 인증 설정 필요':!status.authenticated?'로컬 인증 필요':!status.firstRunApproved?'로컬 인증 완료 · 최초 실행 승인 대기':'로컬 인증 완료 · 실행 전 구독 검사 필요'}</p><p>선택 업무 실행: {mode==='demo'?'데모 · 모델 호출 없음':mode==='subscription'?'GPT 구독 · 사용량 검사 후 실행':'과거 유료 모드 · 실행 차단'}</p><button className="secondary" disabled={busy} onClick={()=>void refresh()}>연결 상태 새로고침 · 추론 없음</button><p>네 직원 모두 ChatGPT / Codex · 역할별 지침 · 동일 구독 한도 공유</p><p>최초 실제 실행: {status?.firstRunApproved?'서버 승인 설정됨 · 인증/한도 검증 필요':'별도 대표 승인 대기 · 잠김'}</p><p className="muted">로그인 상태 확인만으로 실행 가능 여부나 잔여 한도가 보장되지는 않습니다. 각 실제 실행 전 설정·구독 한도·추가 크레딧 차단을 검사합니다.</p><p className="muted">전달된 자료만 읽고 텍스트를 생성합니다. 파일 수정·터미널 명령·검색·배포·유료 API는 허용하지 않습니다. 구독 실행은 ChatGPT 사용량을 소비할 수 있습니다.</p>
 {status?.restartRequired&&<p role="status" className="notice">관리자 설정이 바뀌었어요. 새 비밀번호를 쓰려면 서버를 다시 켜야 해요. 이 대화에 ‘서버 다시 켜 줘’라고 알려주세요. 비밀번호는 대화에 적지 마세요.</p>}
 {!status?.localAuthAvailable&&<p>서버의 OFFICE_ADMIN_PASSWORD(16자 이상)를 먼저 설정해야 합니다. API 키는 필요하지 않습니다.</p>}
 {status?.localAuthAvailable&&!status.authenticated&&<><label htmlFor="subscription-password">구독 연결용 로컬 관리자 비밀번호</label><input id="subscription-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy||!password||status?.restartRequired} onClick={()=>act('login')}>구독 연결 로컬 인증</button></>}
 {status?.authenticated&&<><button disabled={busy} onClick={()=>act('probe')}>Codex 로그인 상태 확인 · 추론 없음</button>{' '}<button disabled={busy} className="secondary" onClick={()=>act('logout')}>구독 연결 로컬 인증 해제</button></>}
 {message&&<p role="status">{message}</p>}</section>;
}


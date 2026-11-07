'use client';
import {requestJson} from './request-json';
export type LiveStatus={receipts?:{id:string;projectId:string;model:string;month:string;attempts:{status:string;inputTokens?:number;outputTokens?:number;estimatedUsd:number}[];error?:string}[];available:boolean;authenticated:boolean;config?:{model:string;maxInputTokens:number;maxOutputTokens:number;maxAttempts:number;maxRunCalls:number};totals?:{month:string;monthlyBudgetUsd:number;estimatedUsd:number;projects:Record<string,number>;calls:number}};
export function officeRequest(body: unknown) {
 return requestJson('/api/office', body, 15_000, '서버 응답 대기가 끝났습니다. 연결 상태를 확인해 주세요.', '서버 실행 요청 실패');
}
export function LiveControls({status,refresh,projectId}:{status:LiveStatus|null;refresh:()=>Promise<void>;projectId:string}){
 const receipts=status?.receipts?.filter(r=>r.projectId===projectId).slice(-20)??[];
 const usd=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(6):'미확인';
 return <details className="panel" aria-label="과거 유료 API 기록"><summary style={{cursor:'pointer'}}>과거 유료 API 기록 · 실행 차단</summary><p>유료 API 실행은 차단되어 있습니다. 이 영역은 기존 비용 기록 조회용이며 현재 GPT 구독 연결 상태와 별개입니다.</p><p className="muted">ChatGPT 구독 실행은 위의 구독 연결에서 확인하세요. 여기서 예산이나 인증을 변경하지 않습니다.</p>{status?.authenticated?<><p>기존 월간 기록: {status.totals?.month||'미확인'} · 비용/예약 추정 USD {usd(status.totals?.estimatedUsd)} · 프로젝트 추정 USD {usd(status.totals?.projects[projectId])}</p>{receipts.length?receipts.map(r=><article key={r.id}><b>{r.model} · {r.month}</b>{r.attempts.map((a,i)=><p key={i}>시도 {i+1} · {a.status} · 입력 {a.inputTokens??'미확인'} / 출력 {a.outputTokens??'미확인'} · USD {usd(a.estimatedUsd)}</p>)}{r.error&&<p>{r.error}</p>}</article>):<p>조회된 과거 API 실행 기록이 없습니다.</p>}</>:<p>로컬 인증 후 공개되는 과거 기록을 조회할 수 있습니다.</p>}<button className="secondary" onClick={()=>void refresh()}>과거 기록 새로고침 · 추론 없음</button><p className="muted">내부 비용 추정치는 실제 청구 금액이나 ChatGPT 구독 잔여량이 아닙니다.</p></details>;
}

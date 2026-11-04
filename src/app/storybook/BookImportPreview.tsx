'use client';
import {useState} from 'react';
import type {BookImportRow} from '../../lib/storybook/book-backup';
const labels={new:'새로 추가',same:'같은 동화 유지',conflict:'현재 수정본 유지'};
export default function BookImportPreview({rows}:{rows:BookImportRow[]}){
 const [filter,setFilter]=useState<'all'|BookImportRow['state']>('all'),[limit,setLimit]=useState(20);
 const shown=rows.filter(row=>filter==='all'||row.state===filter);
 return <section aria-label="복원할 동화 목록" style={{margin:'20px 0',overflowWrap:'anywhere'}}><h3>어떤 동화가 들어오나요?</h3><p>현재 책장에 같은 동화가 있으면 덮어쓰지 않아요. 실제 추가는 최신 책장을 기준으로 확인합니다.</p><label>목록에서 보기 <select aria-label="복원 미리보기 필터" value={filter} onChange={event=>{setFilter(event.target.value as typeof filter);setLimit(20);}} style={{maxWidth:'100%',minHeight:44,font:'inherit'}}><option value="all">전체 {rows.length}권</option>{(['new','same','conflict'] as const).map(kind=><option key={kind} value={kind}>{labels[kind]} {rows.filter(row=>row.state===kind).length}권</option>)}</select></label><ul style={{listStyle:'none',padding:0}}>{shown.slice(0,limit).map(row=><li key={row.id} style={{padding:14,margin:'10px 0',border:'1px solid #d4dce8',borderRadius:12,background:row.state==='new'?'#edf6f2':'#f5f4fa'}}><strong>{row.title.slice(0,180)||'제목 없는 동화'}</strong>{row.state==='conflict'&&<p>현재 책장의 제목: {row.currentTitle?.slice(0,180)||'제목 없는 동화'}</p>}<span style={{display:'block',marginTop:8}}>{row.state==='new'?'＋':'✓'} {labels[row.state]}</span></li>)}</ul>{shown.length===0&&<p>이 항목에 해당하는 동화는 없어요.</p>}{shown.length>limit&&<button className="secondary" onClick={()=>setLimit(value=>value+20)}>다음 동화 {Math.min(20,shown.length-limit)}권 더 보기</button>}<small>표시 {Math.min(shown.length,limit)} / {shown.length}권 · 목록 확인만으로 저장되지 않습니다.</small></section>;
}

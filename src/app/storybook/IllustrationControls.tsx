'use client';
import {useEffect,useRef,useState} from 'react';
import {storyResponse} from '../../lib/storybook/story-response';
import {shrinkImage} from './image-shrink';
import {IMAGE_PER_BOOK} from '../../lib/storybook/book-images';
import type {Book} from '../../lib/storybook/books';
/** 그림 한 장을 기다리는 시간. 서버가 55초에서 끊으므로 그보다 넉넉히 둡니다. */
const WAIT_MS=70_000;
/**
 * 동화에 삽화를 그립니다.
 *
 * ── 돈이 나가는 기능이라 정한 것들 ─────────────────────────────────
 *  - 자동으로 그리지 않습니다. 동화를 만들 때 딸려 오지 않고, 사용자가
 *    이 버튼을 눌러야 그립니다. 몇 장을 그릴지 미리 알려 줍니다.
 *  - 한 장씩 따로 요청합니다. 한 번에 몰아 보내면 서버 시간 제한에 걸려
 *    다 그려 놓고도 결과를 못 받습니다(돈은 이미 나간 뒤입니다).
 *  - 한도 소진(503)이나 출처 거부(403)가 오면 그 자리에서 멈춥니다.
 *    남은 장을 계속 시도해 봐야 똑같이 실패하고 횟수만 깎입니다.
 *  - 한 장이 안전 거부(422)로 실패하면 그 장만 건너뛰고 이어 갑니다.
 *  - 이미 그린 동화에는 '다시 그리기'라고 분명히 적습니다. 다시 그리면
 *    돈이 또 나갑니다.
 */
export default function IllustrationControls({book,drawn,onSave,disabled}:{book:Book;drawn:number;onSave:(images:{chapter:number;dataUrl:string}[])=>Promise<void>;disabled:boolean}){
 const [available,setAvailable]=useState<boolean|null>(null);
 const [consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState(0);
 const [error,setError]=useState('');
 const cancelled=useRef(false);

 useEffect(()=>{
  let live=true;
  // 꺼져 있으면 버튼을 아예 보여 주지 않습니다. 눌러도 503 만 받습니다.
  storyResponse('/api/office/story/illustrate',{cache:'no-store'})
   .then(({data})=>{if(live)setAvailable(Boolean(data?.available));})
   .catch(()=>{if(live)setAvailable(false);});
  return ()=>{live=false;};
 },[]);

 useEffect(()=>{setConsent(false);setError('');setDone(0);},[book.id]);
 useEffect(()=>()=>{cancelled.current=true;},[]);

 const count=Math.min(book.chapters.length,IMAGE_PER_BOOK);
 if(available!==true)return null;

 async function draw(){
  if(busy||disabled||!consent)return;
  cancelled.current=false;
  setBusy(true);setError('');setDone(0);
  const collected:{chapter:number;dataUrl:string}[]=[];
  const skipped:number[]=[];
  try{
   for(let index=0;index<count;index++){
    if(cancelled.current)break;
    const chapter=book.chapters[index];
    const {response,data}=await storyResponse('/api/office/story/illustrate',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({chapter:index,title:chapter.title,text:chapter.text}),
    },WAIT_MS);
    if(!response.ok){
     // 더 눌러도 소용없는 상태면 멈춥니다. 남은 장을 시도하면 횟수만 깎입니다.
     if(response.status===503||response.status===403||response.status===429){setError(data?.error||'지금은 그림을 그릴 수 없습니다.');break;}
     // 이 장만 못 그린 경우입니다. 다음 장으로 넘어갑니다.
     skipped.push(index+1);continue;
    }
    try{collected.push({chapter:index,dataUrl:await shrinkImage(String(data.image))});}
    catch{skipped.push(index+1);}
    setDone(collected.length);
   }
   if(collected.length>0)await onSave(collected);
   if(skipped.length>0)setError(prev=>prev||'제 '+skipped.join(', ')+'장은 그리지 못했습니다. 나머지 그림은 보관했습니다.');
  }catch(e){
   setError(e instanceof Error?e.message:'그림을 보관하지 못했습니다. 동화 글은 그대로입니다.');
  }finally{setBusy(false);}
 }

 return <section className="panel" aria-label="동화 삽화" style={{marginTop:16}}>
  <h3 style={{marginTop:0}}>이 동화에 그림 넣기</h3>
  <p className="muted">장마다 한 장씩, 모두 {count}장을 그립니다. 그림은 이 브라우저에만 보관되고 동화 글과 따로 저장됩니다. 기기를 바꾸면 그림은 함께 가지 않아요.</p>
  {drawn>0&&<p role="status">이미 {drawn}장을 그려 두었습니다. 다시 그리면 새로 만들며, 그만큼 사용량을 다시 씁니다.</p>}
  <label><input type="checkbox" checked={consent} disabled={busy||disabled} onChange={e=>setConsent(e.target.checked)}/> 각 장의 본문을 그림 생성에 전달합니다.</label>
  <p>
   <button type="button" disabled={busy||disabled||!consent} onClick={draw}>
    {busy?'그리는 중… '+done+'/'+count:drawn>0?'삽화 다시 그리기':'삽화 그리기'}
   </button>
   {busy&&<button type="button" className="secondary" onClick={()=>{cancelled.current=true;}}>그만두기</button>}
  </p>
  {busy&&<p role="status">그림 한 장에 10~20초쯤 걸립니다. 이 화면을 열어 두세요. 그만두면 이미 그린 그림까지만 보관합니다.</p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}

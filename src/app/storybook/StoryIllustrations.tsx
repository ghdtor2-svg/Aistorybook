'use client';

import {useEffect,useRef,useState} from 'react';
import type {Book} from '../../lib/storybook/books';
import StoryPages from './StoryPages';
import styles from './StoryPages.module.css';

const endpoint='/api/storybook/illustrations';
// Online customers have no local production server; only the owner's PC shows the local wording.
const onLocalPc=()=>typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname);
type Art={bookId:string;style?:string|null;labels?:string[]|null;base:string[];alternative:{index:number;image:string}|null;busy:boolean;total:number;job?:{status:'queued'|'running'|'paused'|'completed';reason?:'failed'|'uncertain'}|null};

async function request(code:string,body?:object):Promise<Art>{
  const response=await fetch(endpoint,{
    method:body?'POST':'GET',cache:'no-store',
    headers:{Authorization:'Bearer '+code,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'그림을 확인하지 못했어요.');
  return data;
}
function Drawing({code,asset,label,onRatio}:{code:string;asset:string;label:string;onRatio?:(ratio:number)=>void}){
  const [url,setUrl]=useState('');
  const [failed,setFailed]=useState(false);
  const [reload,setReload]=useState(0);
  const [zoomed,setZoomed]=useState(false);
  const [viewerOpen,setViewerOpen]=useState(false);
  const viewer=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const abort=new AbortController();
    let objectUrl='';
    setUrl('');
    setFailed(false);
    void fetch(endpoint+'?asset='+encodeURIComponent(asset),{headers:{Authorization:'Bearer '+code},signal:abort.signal})
      .then(response=>{if(!response.ok)throw Error('Image unavailable');return response.blob();})
      .then(blob=>{if(!abort.signal.aborted){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}})
      .catch(()=>{if(!abort.signal.aborted)setFailed(true);});
    return ()=>{abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[asset,code,reload]);
  // A private, short-lived object URL cannot use the public image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  if(failed)return <div className={styles.imageNotice} role="status"><p>{label}을 불러오지 못했어요.</p><button type="button" className="secondary" onClick={()=>setReload(value=>value+1)}>기존 그림 다시 불러오기</button><small>새 그림을 만들지 않으며 추가 생성 비용은 없어요.</small></div>;
  return url?<><button type="button" className={styles.enlarge} aria-label={label+' 크게 보기'} onClick={()=>{setZoomed(false);setViewerOpen(true);viewer.current?.showModal();}}><img src={url} alt={label} onError={()=>setFailed(true)} onLoad={({currentTarget:image})=>{
    if(image.naturalHeight)onRatio?.(image.naturalWidth/image.naturalHeight);
  }}/><span className={styles.zoomHint} aria-hidden="true">크게 보기 ↗</span></button>
    <dialog ref={viewer} className={styles.viewer} aria-label={label+' 확대 보기'} onClose={()=>setViewerOpen(false)}>
      <div className={styles.viewerHeader}><strong>{label}</strong><button type="button" className="secondary" onClick={()=>setZoomed(value=>!value)}>{zoomed?'전체 그림 보기':'더 크게 보기'}</button><button type="button" onClick={()=>viewer.current?.close()}>닫기</button></div>
      <p className={styles.viewerHelp}>{zoomed?'그림을 좌우·위아래로 움직여 자세히 보세요.':'그림 전체를 잘리지 않게 보여드려요.'}</p>
      <div className={styles.viewerScroll}>{viewerOpen&&<img src={url} alt={label} style={{width:zoomed?'1600px':'100%',minWidth:'100%',maxWidth:'none',height:'auto'}}/>}</div>
    </dialog></>:<p className={styles.imageNotice} role="status">{label} 불러오는 중…</p>;
}
export default function StoryIllustrations({book,code,onWorking}:{book:Book;code:string;onWorking?:(working:boolean)=>void}){
  const [art,setArt]=useState<Art|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [target,setTarget]=useState(0);
  const [direction,setDirection]=useState('');
  const [showAlternative,setShowAlternative]=useState(true);
  const working=busy||!!art?.busy||!!art?.job&&['queued','running'].includes(art.job.status);
  useEffect(()=>{onWorking?.(working);return ()=>onWorking?.(false);},[working,onWorking]);
  useEffect(()=>{
    let current=true;
    void request(code).then(result=>{
      if(current&&result.bookId===book.id&&(result.base.length||result.job))setArt(previous=>previous??result);
    }).catch(()=>{});
    return ()=>{current=false;};
  },[book.id,code]);
  useEffect(()=>{
    if(!art?.job||!['queued','running'].includes(art.job.status))return;
    let current=true,checking=false,failures=0;
    const timer=setInterval(()=>{
      if(checking)return;checking=true;
      void request(code).then(result=>{if(current&&result.bookId===book.id){setArt(result);failures=0;}}).catch(()=>{
        if(current&&++failures>=3){clearInterval(timer);setMessage('진행 상태를 확인하지 못했어요. '+(onLocalPc()?'컴퓨터에서 제작은':'제작은')+' 계속될 수 있어요. 잠시 뒤 그림 상태를 다시 확인해 주세요.');}
      }).finally(()=>{checking=false;});
    },2000);
    return ()=>{current=false;clearInterval(timer);};
  },[art?.job?.status,book.id,code]);
  function artAt(index:number,onRatio?:(ratio:number)=>void){
    const original=art?.base[index];
    const alternative=art?.alternative?.index===index?art.alternative.image:null;
    const asset=alternative&&showAlternative?alternative:original;
    return asset?<Drawing key={asset} code={code} asset={asset} label={index===0?'표지':book.qualityProfile?'장면 '+index+' 삽화':'제 '+index+'장 삽화'} onRatio={onRatio}/>:null;
  }
  async function refresh(){
    setMessage('');
    try{
      const result=await request(code);
      if(result.bookId!==book.id)throw Error('이 동화에 발급된 제작 코드를 입력해 주세요.');
      setArt(result);
    }catch(error){setMessage((error as Error).message);}
  }
  async function draw(revise:boolean){
    if(busy)return;
    setBusy(true);
    setMessage('');
    try{
      if(revise){
        const current=await request(code);const uncertain=current.job?.reason==='uncertain';
        if(uncertain&&!window.confirm('이전 수정의 완료 여부를 확인하지 못했어요. 다시 요청하면 AI 비용이 추가될 수 있습니다. 계속할까요?'))return;
        setArt(await request(code,{action:'revise',book,index:target,direction:direction.trim(),confirmUncertain:uncertain}));
        setDirection('');
        setShowAlternative(true);
      }else{
        const current=await request(code);
        if(current.bookId!==book.id)throw Error('이 동화에 발급된 제작 코드를 입력해 주세요.');
        if(current.busy)throw Error('다른 탭에서 그림을 그리고 있어요.');
        const uncertain=current.job?.reason==='uncertain';
        if(uncertain&&!window.confirm('이전 그림 요청의 완료 여부를 확인하지 못했어요. 저장되지 않은 그림을 다시 만들면 AI 사용량이 한 번 더 발생할 수 있어요. 완성된 그림은 유지하고 남은 제작을 다시 시작할까요?'))return;
        setArt(await request(code,{action:'start',book,confirmUncertain:uncertain}));
      }
    }catch(error){setMessage((error as Error).message);}
    finally{setBusy(false);}
  }
  return <><StoryPages book={book} artAt={artAt}/><section className={styles.controls} aria-label="동화 삽화">
    <h3>표지와 삽화</h3>
    {art?.style&&<p>이 동화의 화풍 · {art.style}</p>}
    {!art?<button type="button" onClick={()=>void refresh()}>삽화 제작 상태 확인</button>:<>
      <p role="status">완료 {art.base.length}/{art.total}장</p>
      {art.job&&['queued','running'].includes(art.job.status)&&<p role="status">{onLocalPc()?'컴퓨터에서 그림을 이어 만들고 있어요. 이 화면을 닫아도 제작은 계속됩니다. 컴퓨터와 로컬 제작 서버는 켜 두세요.':'그림을 이어 만들고 있어요. 이 화면을 닫아도 제작은 계속됩니다. 나중에 같은 제작 코드로 다시 열어 확인할 수 있어요.'}</p>}
      {art.job?.status==='paused'&&<p role="status">{art.job.reason==='uncertain'?'이전 요청의 완료 여부를 확인해야 해서 자동 제작을 멈췄어요. 중복 제작을 막기 위해 자동 재시도하지 않습니다.':'제작 중 문제가 생겨 멈췄어요. 완성된 그림은 보관되어 있고, 남은 그림만 다시 시작할 수 있어요.'}</p>}
      {art.base.length<art.total&&<button type="button" disabled={busy||art.busy||!!art.job&&['queued','running'].includes(art.job.status)} onClick={()=>void draw(false)}>{art.base.length?'남은 그림 이어서 만들기':'표지와 삽화 만들기'}</button>}
      <button type="button" className="secondary" disabled={busy} onClick={()=>void refresh()}>그림 상태 다시 확인</button>
      {art.alternative&&<p>
        {art.labels?.[art.alternative.index]||(art.alternative.index===0?'표지':'제 '+art.alternative.index+'장 삽화')}에 {showAlternative?'수정 그림':'기존 그림'}을 표시하고 있어요.
        {' '}<button type="button" onClick={()=>setShowAlternative(value=>!value)}>{showAlternative?'기존 그림 보기':'수정 그림 보기'}</button>
      </p>}
      {art.base.length===art.total&&!art.alternative&&<fieldset disabled={busy||art.busy}>
        <legend>포함된 그림 수정 1회</legend>
        <label>바꿀 그림 <select value={target} onChange={event=>setTarget(Number(event.target.value))}>
          {art.base.map((asset,index)=><option key={asset} value={index}>{art.labels?.[index]||(index===0?'표지':'제 '+index+'장 삽화')}</option>)}
        </select></label>
        <p>작품 전체에서 그림 1장만 1회 수정할 수 있어요. 두 페이지에 이어진 그림을 고르면 양쪽 페이지의 그림이 함께 바뀝니다. 글은 바뀌지 않아요.</p>
        <details key={target}><summary>선택한 그림 먼저 확인하기</summary><Drawing code={code} asset={art.base[target]} label={art.labels?.[target]||(target===0?'표지':'삽화 '+target)}/></details>
        <label>바꾸고 싶은 내용 <textarea value={direction} maxLength={400} onChange={event=>setDirection(event.target.value)}/></label>
        <button type="button" disabled={!direction.trim()} onClick={()=>void draw(true)}>이 그림 다시 만들기</button>
      </fieldset>}
    </>}
    {message&&<p role="alert">{message}</p>}
  </section></>;
}

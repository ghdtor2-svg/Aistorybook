'use client';
import {storyResponse,STORY_GENERATE_WAIT_MS} from '../../lib/storybook/story-response';
import {STORY_PENDING_KEY,archiveLegacyPending,pendingRequest,newPendingRequest,pendingMatches,finishStoryPending,storyStateMessage,productionOrderId} from '../../lib/storybook/pending-request';
import {storyBrief} from '../../lib/storybook/story-brief';
import {useLocalStoryWorkspace} from './useLocalStoryWorkspace';
import {preferredBookId,READING_KEY} from '../../lib/storybook/reading-preferences';
import StorageRescue from '../../components/StorageRescue';
import BookBackupControls from './BookBackupControls';
import {exportBooks,mergeBooks} from '../../lib/storybook/book-backup';
import ShelfBrowser from './ShelfBrowser';
import ReadingTools from './ReadingTools';
import StoryCheckout,{productionCodeKey,type DraftStorage} from './StoryCheckout';
import StoryIllustrations from './StoryIllustrations';
import StoryPages from './StoryPages';
import StoryStylePicker,{type StyleChoice} from './StoryStylePicker';
import {defaultStoryArtStyle,isOfferedStoryArtStyle} from '../../lib/storybook/art-styles';
import {useReadingPreferences} from './useReadingPreferences';
import {useUnsavedBookGuard} from './useUnsavedBookGuard';
import {bookDocument} from '../../lib/storybook/book-document';
import {useEffect,useRef,useState} from 'react';import {fields,labels,type StoryProfile} from '../../lib/storybook/engine';
import {BOOK_LIMIT,parseBooks,parseGeneratedBook,type Book} from '../../lib/storybook/books';
import {changeBook,addBook} from '../../lib/storybook/shelf';
const key='ai-office:books:v1';const pendingKey=STORY_PENDING_KEY; const generationLock='ai-office:story-generation:v1';
export default function StoryReader({profile,draftStorage}:{profile:StoryProfile|null;draftStorage:DraftStorage}){
 const connection=useLocalStoryWorkspace();const local=connection.available;
 const [artWorking,setArtWorking]=useState(false);
 const [artStyle,setArtStyle]=useState<StyleChoice>(defaultStoryArtStyle);
 useEffect(()=>{try{const saved=localStorage.getItem('nangman:art-style:v1');if(saved==='random'||isOfferedStoryArtStyle(saved))setArtStyle(saved);}catch{}},[]);
 function chooseArtStyle(value:StyleChoice){setArtStyle(value);try{localStorage.setItem('nangman:art-style:v1',value);}catch{}}
 const [productionCode,setProductionCode]=useState('');
 useEffect(()=>{try{setProductionCode(sessionStorage.getItem(productionCodeKey)||'');}catch{}},[]);
 function updateProductionCode(value:string){
  if(busy||artWorking)return;
  setRetryConfirmed('');setProductionCode(value);
  try{sessionStorage.setItem(productionCodeKey,value);}catch{}
 }
 const codeHeaders={Authorization:'Bearer '+productionCode.trim()};
 const reading=useReadingPreferences();const readingSize=reading.size,setReadingSize=reading.chooseSize;
 const [generatedDraft,setGeneratedDraft]=useState(false);const generatedDraftRef=useRef(false);function markGeneratedDraft(value:boolean){generatedDraftRef.current=value;setGeneratedDraft(value);}
 const [books,setBooks]=useState<Book[]>([]),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false),[consent,setConsent]=useState(false),[editing,setEditing]=useState(false);
 const booksRef=useRef<Book[]>([]),conflictRef=useRef(false),editingRef=useRef(false),saves=useRef(0);editingRef.current=editing;
 const [shelfBusy,setShelfBusy]=useState(false);
 // 기다리는 동안 무슨 일이 일어나는지 계속 알려 준다. 문구 없이 멈춘 것처럼 보이지 않게 한다.
 const [progress,setProgress]=useState('');const recoveryActive=useRef(false);
 useUnsavedBookGuard(()=>saves.current>0||conflictRef.current||generatedDraftRef.current);
 useEffect(()=>{try{const raw=parseBooks(localStorage.getItem(key));booksRef.current=raw;setBooks(raw);let selectedId=raw[0]?.id||'';try{selectedId=preferredBookId(raw.map(book=>book.id),localStorage.getItem(READING_KEY));}catch{}setSelected(selectedId);setReady(true);}catch{setError('보관함을 읽지 못했습니다. 원본은 보존합니다.');}},[]);
 const [retryConfirmed,setRetryConfirmed]=useState('');const [pending,setPending]=useState('');const [recovering,setRecovering]=useState(false);
 useEffect(()=>{
  function sync(){try{const id=localStorage.getItem(pendingKey)||'';if(id)pendingRequest(id);setPending(id);}catch{setPending('invalid');setError('미완료 생성 기록을 읽지 못했어요. 원본을 유지했으니 구매 문의 DM으로 도움을 요청해 주세요.');}}
  sync();const changed=(event:StorageEvent)=>{if(event.key===pendingKey||event.key===null)sync();};window.addEventListener('storage',changed);return ()=>window.removeEventListener('storage',changed);
 },[]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{
  if(event.key!==key&&event.key!==null)return;
  if(editingRef.current||saves.current||conflictRef.current||generatedDraftRef.current){setError('다른 탭에서 책장이 변경되었습니다. 수정본을 내려받거나 편집을 마친 뒤 최신 책장을 불러오세요.');return;}
  try{const latest=parseBooks(localStorage.getItem(key));booksRef.current=latest;setBooks(latest);setSelected(old=>latest.some(b=>b.id===old)?old:latest[0]?.id||'');}catch{setError('다른 탭의 책장 변경을 읽지 못했습니다. 현재 내용을 보존했습니다.');setReady(false);}
 };window.addEventListener('storage',changed);return ()=>window.removeEventListener('storage',changed);},[]);
 async function restoreBooks(incoming:Book[]){
  if(!ready||busy||editingRef.current||saves.current||conflictRef.current||generatedDraftRef.current)throw Error('편집과 현재 작업을 마친 뒤 복원해 주세요.');setShelfBusy(true);
  try{return await shelfLock(()=>{if(editingRef.current||saves.current||conflictRef.current||generatedDraftRef.current)throw Error('책장 편집 상태가 바뀌어 복원을 중단했습니다.');const result=mergeBooks(parseBooks(localStorage.getItem(key)),incoming);if(result.added)localStorage.setItem(key,JSON.stringify(result.books));booksRef.current=result.books;setBooks(result.books);setSelected(old=>result.books.some(b=>b.id===old)?old:result.books[0]?.id||'');return result;});}finally{setShelfBusy(false);}
 }
 function reloadShelf(){if(saves.current)return;try{const latest=parseBooks(localStorage.getItem(key));booksRef.current=latest;setBooks(latest);setSelected(old=>latest.some(b=>b.id===old)?old:latest[0]?.id||'');conflictRef.current=false;markGeneratedDraft(false);setEditing(false);setReady(true);setError('');}catch{setError('최신 책장을 읽지 못했습니다. 현재 내용을 보존했습니다.');}}
 async function shelfLock<T>(action:()=>T):Promise<T>{if(!navigator.locks)throw Error('책장 동시 저장을 보호할 수 없습니다. 최신 브라우저를 이용하세요.');return navigator.locks.request('ai-office:books:v1',action);}
 useEffect(()=>{if(ready&&window.location.hash==='#my-books'){const shelf=document.getElementById('my-books');shelf?.focus({preventScroll:true});shelf?.scrollIntoView({block:'start'});}},[ready]);
 const jumpToBook=useRef(false);
 useEffect(()=>{if(jumpToBook.current){jumpToBook.current=false;const heading=document.getElementById('current-book-title');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});}},[selected]);
 function selectBook(id:string){if(editingRef.current||saves.current||conflictRef.current||generatedDraftRef.current)return;reading.chooseBook(id);if(id===selected){const heading=document.getElementById('current-book-title');heading?.focus();return;}jumpToBook.current=true;setSelected(id);setEditing(false);}
 const book=books.find(b=>b.id===selected);
 function finishPending(expected=pending,serverRequestId?:string){finishStoryPending(localStorage,expected,productionCode,serverRequestId);setPending(localStorage.getItem(pendingKey)||'');}
 async function acceptBook(value:unknown,expectedId:string){
  const data=parseGeneratedBook(value,(value as {id?:string})?.id||expectedId);
  try{const next=await shelfLock(()=>addBook(localStorage,data));booksRef.current=next;setBooks(next);setSelected(data.id);reading.chooseBook(data.id);markGeneratedDraft(false);}
  catch(e){markGeneratedDraft(true);if(!booksRef.current.some(b=>b.id===data.id)){const next=[data,...booksRef.current];booksRef.current=next;setBooks(next);}setSelected(data.id);setError((e instanceof Error?e.message+' ':'')+'책장 저장에 실패했습니다. 현재 동화를 내려받아 보관하세요. 생성 기록은 유지했습니다.');return;}
  try{if(expectedId)finishPending(expectedId,data.id);}catch(e){setError((e as Error).message+' 동화는 책장에 보관했어요.');}
 }
 async function clearPending(){
  if(busy||artWorking||!productionCode.trim())return;
  if(!window.confirm('대기 기록만 해제합니다. 서버에서 이미 생성됐을 수 있으며 새 동화를 만들면 AI 생성 비용이 다시 발생할 수 있습니다. 계속할까요?'))return;
  if(!navigator.locks){setError('생성 중인지 확인할 수 없어 대기 기록을 유지했습니다. 최신 Edge 또는 Chrome에서 결과를 확인해 주세요.');return;}
  setBusy(true);setRecovering(true);setError('');
  try{
   await navigator.locks.request(generationLock,{ifAvailable:true},async lock=>{
    if(!lock){setError('다른 탭에서 동화를 생성하거나 결과를 확인 중입니다. 대기 기록을 유지했습니다.');return;}
    const {response,data}=await storyResponse('/api/office/story',{cache:'no-store',headers:codeHeaders});
    if(!response.ok)throw Error(data.error);
    if(data.state==='completed'){await acceptBook(data.book,pending);return;}
    if(!['ready','paused'].includes(data.state))throw Error(storyStateMessage(data));
    finishPending(pending,data.requestId);setRetryConfirmed(productionOrderId(productionCode)||'');setError('');
   });
  }catch(e){setError(e instanceof Error?e.message:'대기 기록을 해제하지 못했습니다.');}finally{setBusy(false);setRecovering(false);}
 }
 async function recover(){
  if(recoveryActive.current||busy||!productionCode.trim()||!pending||!ready||editingRef.current||saves.current||conflictRef.current)return;if(!navigator.locks){setError('생성 기록을 안전하게 복구하려면 최신 Edge 또는 Chrome을 이용하세요.');return;}
  recoveryActive.current=true;setBusy(true);setRecovering(true);setError('');
  try{await navigator.locks.request(generationLock,{ifAvailable:true},async lock=>{
   if(!lock){setError('다른 탭에서 생성 또는 결과 확인을 진행 중입니다. 잠시 후 다시 확인해 주세요.');return;}
   const current=localStorage.getItem(pendingKey)||'';
   if(current!==pending){setPending(current);return;}
   const request=pendingRequest(current);if(request.orderId&&!pendingMatches(current,productionCode))throw Error('대기 중인 주문의 제작 코드를 입력해 주세요. 기존 기록은 유지했어요.');
   const {response:res,data}=await storyResponse('/api/office/story',{cache:'no-store',headers:codeHeaders});if(!res.ok)throw Error(data.error);
   if(data.state==='completed'){await acceptBook(data.book,pending);}else if(data.state==='ready'){finishPending(pending,data.requestId);setError('아직 만들어진 동화가 없어요. 같은 코드로 다시 시작할 수 있습니다.');}
   else setError(storyStateMessage(data));
  });}catch(e){setError(e instanceof Error?e.message:'결과를 확인하지 못했습니다.');}finally{recoveryActive.current=false;setRecovering(false);setBusy(false);}
 }
 async function openByCode(){
  if(!local||!productionCode.trim()||busy||artWorking||!ready||editingRef.current||shelfBusy||conflictRef.current)return;
  setBusy(true);setError('');
  try{
   const {response,data}=await storyResponse('/api/office/story',{cache:'no-store',headers:codeHeaders});
   if(!response.ok)throw Error(data.error);
   if(data.state==='completed'){jumpToBook.current=true;await acceptBook(data.book,pending);return;}
   if(navigator.locks&&['running','paused'].includes(data.state)&&typeof data.requestId==='string'){
    await navigator.locks.request(generationLock,{ifAvailable:true},lock=>{
     if(!lock)return;
     const current=localStorage.getItem(pendingKey)||'';
     if(current){setPending(current);return;}
     const receipt=newPendingRequest(data.requestId,productionCode);localStorage.setItem(pendingKey,receipt);setPending(receipt);
    });
   }
   setError(storyStateMessage(data));
  }catch(error){setError(error instanceof Error?error.message:'동화를 확인하지 못했어요.');}
  finally{setBusy(false);}
 }
 async function generate(){
  if(generationBlock)return;
  if(!navigator.locks){setError('이 브라우저에서는 중복 생성 방지를 확인할 수 없습니다. 최신 Edge 또는 Chrome에서 이용해 주세요.');return;}
  setBusy(true);setError('');
  try{await navigator.locks.request(generationLock,{ifAvailable:true},async lock=>{
   if(!lock){setError('다른 탭에서 동화를 생성 중입니다. 새 생성은 실행하지 않았습니다.');return;}
   // Re-read under the browser-wide lock: UI state/storage events alone cannot prevent races.
   if(parseBooks(localStorage.getItem(key)).length>=BOOK_LIMIT)throw Error('책장이 1,000권 보관 한도에 도달했습니다. 기존 책을 백업하고 공간을 확보한 뒤 새 동화를 만들어 주세요. 생성은 실행하지 않았습니다.');
   const existing=localStorage.getItem(pendingKey);if(existing){setPending(existing);setError('다른 탭에 미확인 생성 기록이 있습니다. 결과 확인·복구를 이용하세요.');return;}
   const brief=storyBrief(profile!);
   const id=crypto.randomUUID();const receipt=newPendingRequest(id,productionCode);localStorage.setItem(pendingKey,receipt);setPending(receipt);
   const began=Date.now(),elapsed=()=>Math.round((Date.now()-began)/1000)+'초 지남';
   setProgress('동화 제작을 요청했어요. 글을 쓰는 데 보통 1~2분이 걸려요. 화면을 떠나도 제작 기록은 유지돼요. 돌아오면 같은 제작 코드로 결과를 확인해 주세요.');
   const {response:res,data}=await storyResponse('/api/office/story',{method:'POST',headers:{'Content-Type':'application/json',...codeHeaders},body:JSON.stringify({id,brief,styleId:artStyle,confirmUncertain:!!retryConfirmed&&retryConfirmed===productionOrderId(productionCode)})},STORY_GENERATE_WAIT_MS);if(!res.ok)throw Error(data.error);setRetryConfirmed('');
   if(res.status===202){
    const requestId=typeof data.requestId==='string'&&/^[a-f0-9-]{36}$/.test(data.requestId)?data.requestId:id;const activeReceipt=newPendingRequest(requestId,productionCode);if(localStorage.getItem(pendingKey)!==receipt)throw Error('대기 기록이 변경되어 기존 기록을 유지했어요. 결과 확인·복구를 이용해 주세요.');localStorage.setItem(pendingKey,activeReceipt);setPending(activeReceipt);
    for(let attempt=0;attempt<90;attempt++){
     await new Promise(resolve=>setTimeout(resolve,3000));
     const result=await storyResponse('/api/office/story',{cache:'no-store',headers:codeHeaders});if(!result.response.ok)throw Error(result.data.error);
     if(result.data.state==='completed'){await acceptBook(result.data.book,activeReceipt);return;}
     if(result.data.state==='paused')throw Error(result.data.error||'작업의 완료 여부를 확인해야 해요. 자동 재시도하지 않습니다.');
     if(result.data.state==='ready')throw Error('서버에 진행 중인 작업이 없어요. 글이 만들어지지 않았습니다.');
     setProgress((result.data.phase==='queued'?'온라인 작업이 시작되기를 기다리고 있어요':'AI가 동화를 쓰고 있어요')+' · '+elapsed()+'. 보통 1~2분이 걸려요.');
    }
    throw Error('온라인 작업의 결과를 아직 확인하지 못했어요. 잠시 뒤 결과 확인·복구를 눌러 주세요.');
   }
   await acceptBook(data,receipt);
  });}catch(e){setError((e instanceof Error?e.message:'동화 생성을 완료하지 못했습니다.')+' 생성 기록이 남아 있다면 결과 확인·복구를 이용하세요. 자동 재시도하지 않습니다.');}finally{setProgress('');setBusy(false);}
 }
 // Resume status checks after navigation, background suspension or a refresh.
 // Never POST or clear an uncertain request just because the page became visible.
 const resumeCheck=useRef<()=>void>(()=>{});
 resumeCheck.current=()=>{
  if(!ready||busy||artWorking||editingRef.current||saves.current||conflictRef.current||!productionOrderId(productionCode)||!pending)return;
  try{const receipt=pendingRequest(pending);if(receipt.orderId&&!pendingMatches(pending,productionCode))return;}catch{return;}
  void recover();
 };
 useEffect(()=>{const visible=()=>{if(document.visibilityState==='visible')resumeCheck.current();};window.addEventListener('pageshow',visible);document.addEventListener('visibilitychange',visible);return ()=>{window.removeEventListener('pageshow',visible);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{resumeCheck.current();},[ready,pending,productionCode]);
 function update(value:Book){
  if(conflictRef.current){setError('저장 충돌이 있습니다. 현재 수정본을 내려받은 뒤 최신 책장을 불러오세요.');return;}
  const expected=booksRef.current.find(b=>b.id===value.id);if(!expected)return;
  const optimistic=booksRef.current.map(b=>b.id===value.id?value:b);booksRef.current=optimistic;setBooks(optimistic);saves.current++;setShelfBusy(true);
  void shelfLock(()=>{if(conflictRef.current)throw Error('이전 수정의 저장 충돌로 후속 저장을 중단했습니다.');return changeBook(localStorage,expected,value);}).catch(e=>{conflictRef.current=true;setError(e instanceof Error?e.message:'수정 내용을 저장하지 못했습니다.');}).finally(()=>{saves.current--;setShelfBusy(saves.current>0);});
 }
 async function removeBook(value:Book){if(saves.current||conflictRef.current)return;setShelfBusy(true);try{const next=await shelfLock(()=>changeBook(localStorage,value,null));booksRef.current=next;setBooks(next);setSelected(next[0]?.id||'');setEditing(false);}catch(e){conflictRef.current=true;setError(e instanceof Error?e.message:'삭제하지 못했습니다.');}finally{setShelfBusy(false);}}
 function downloadBookBackup(){
  if(!book)return;
  try{
   const url=URL.createObjectURL(new Blob([exportBooks([book])],{type:'application/json;charset=utf-8'}));
   const anchor=document.createElement('a');
   anchor.href=url;
   anchor.download='storybook-current-book.json';
   anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{setError('책장 복원용 파일을 만들지 못했습니다. 읽을 수 있는 동화 파일을 받아 보관해 주세요.');}
 }
 let legacyPending=false;try{legacyPending=!!pending&&!pendingRequest(pending).orderId;}catch{}
 async function archiveLegacy(){
  if(busy||!legacyPending||!navigator.locks)return;
  if(!window.confirm('이전 형식 기록은 주문을 구분할 수 없어요. 기록을 이 브라우저에 따로 보관한 뒤 대기 목록에서 제외할까요? 서버 작업을 취소하거나 유료 재생성에 동의하는 것은 아닙니다. 이전 제작 코드로 결과를 먼저 확인해 주세요.'))return;
  setBusy(true);
  try{await navigator.locks.request(generationLock,{ifAvailable:true},lock=>{
   if(!lock)throw Error('다른 탭에서 작업 중이에요. 기록을 유지했어요.');
   archiveLegacyPending(localStorage,pending);setPending('');setRetryConfirmed('');setError('이전 대기 기록을 이 브라우저에 따로 보관했어요. 서버 작업은 취소되지 않았으니 이전 제작 코드로 결과를 확인해 주세요.');
  });}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const generationBlock=busy?'제작 결과를 확인하고 있어요. 잠시 기다려 주세요.':artWorking?'그림 제작을 마친 뒤 이용해 주세요.':!ready?'책장 상태를 먼저 확인해 주세요.':connection.checking?'제작 연결을 확인하고 있어요.':!local?'제작 연결을 다시 확인해 주세요.':!productionOrderId(productionCode)?'담당자에게 받은 제작 코드 전체를 입력해 주세요.':pending?'미확인 제작 기록이 있어요. 결과 확인·복구를 먼저 이용해 주세요.':editing?'동화 수정을 마친 뒤 이용해 주세요.':shelfBusy?'책장 저장이 끝날 때까지 기다려 주세요.':conflictRef.current||generatedDraft?'보관하지 못한 동화를 먼저 파일로 보관하고 책장 상태를 확인해 주세요.':books.length>=BOOK_LIMIT?'책장이 가득 찼어요. 백업 후 공간을 확보해 주세요.':profile?.completionStatus!=='confirmed'?'위쪽에서 질문을 마치고 내용 최종 확인을 눌러 주세요.':!consent?'요약과 각색 내용을 AI에 전달하는 데 동의해 주세요.':'';
 function downloadHTML(){if(!book)return;const url=URL.createObjectURL(new Blob([bookDocument(book)],{type:'text/html;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='my-story-draft.html';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

 return <section id="my-books" tabIndex={-1} className="panel" aria-label="동화 만들기와 내 책장"><h2>나의 동화와 책장</h2><p className="report">화면을 떠나도 저장된 질문과 제작 기록은 유지돼요. 서버가 접수한 온라인 제작은 별도로 진행돼요. 돌아왔을 때 제작 코드를 다시 입력하면 진행 상태와 결과를 확인할 수 있어요. 완료 여부가 불확실한 작업은 자동으로 다시 만들지 않아요.</p><StoryCheckout code={productionCode} onCode={updateProductionCode} draftStorage={draftStorage} connection={connection} codeLocked={busy||artWorking}/><StoryStylePicker value={artStyle} onChange={chooseArtStyle} disabled={busy||!!pending||editing||shelfBusy}/><button type="button" className="secondary" disabled={!local||!productionCode.trim()||busy||artWorking||!ready||editing||shelfBusy} onClick={()=>void openByCode()}>제작 코드로 내 동화 다시 불러오기</button><p><small>브라우저 기록을 지웠거나 다른 기기에서 보더라도, 받은 제작 코드만 있으면 서버에 보관된 동화와 그림을 다시 불러와 PDF로 받을 수 있어요. 새로 만들지 않아 추가 비용이 없어요. 제작 코드는 잘 보관해 주세요.</small></p>{books.length>=BOOK_LIMIT&&<p role="status" className="report">책장이 1,000권 보관 한도에 도달해 새 동화 생성을 제한합니다. 기존 동화를 백업한 뒤 공간을 확보해 주세요. 읽기·편집과 이미 생성된 결과의 복구는 계속할 수 있습니다.</p>}{!profile&&<p>저장된 동화는 질문 작성 내용과 별도로 보관됩니다. 새 동화를 만들려면 위에서 질문 작성을 시작해 주세요.</p>}<p>확인한 내용을 바탕으로 실제 동화를 만들고, 읽고 수정해서 보관하세요.</p><label><input type="checkbox" disabled={!profile} checked={consent} onChange={e=>setConsent(e.target.checked)}/> 선택한 요약과 각색 내용을 AI에 전달하여 동화를 생성합니다.</label><p><button aria-describedby="generation-help" disabled={!!generationBlock} onClick={generate}>{busy?(recovering?'생성 결과를 확인하고 있어요…':'동화를 쓰고 있어요…'):'확인한 내용으로 동화 만들기'}</button></p><p id="generation-help" role="status">{generationBlock||'준비됐어요. 버튼을 누르면 확인한 내용으로 동화를 만들어요.'}</p>{progress&&<p role="status" className="report">{progress}</p>}{pending&&!progress&&<div role="status"><p>완료를 확인하지 못한 동화 생성 기록이 있습니다. 페이지를 새로고침해도 새로 생성하지 않습니다.</p><button disabled={busy||!productionCode.trim()||!ready||editing||shelfBusy||conflictRef.current} onClick={recover}>생성 결과 확인·복구 · 새 생성 없음</button><button className="secondary" disabled={busy||!productionCode.trim()} onClick={clearPending}>대기 기록 해제</button>{legacyPending&&<><p>이전 형식의 기록이에요. 당시 제작 코드로 먼저 결과를 확인해 주세요. 주문을 확인할 수 없다면 기록을 따로 보관할 수 있어요.</p><button className="secondary" disabled={busy} onClick={()=>void archiveLegacy()}>이전 대기 기록 보관 후 목록에서 제외</button></>}</div>}{error&&<p role="alert">{error}</p>}{!ready&&error&&<StorageRescue keys={[key,pendingKey]} label="책장 저장 원문 내려받기"/>}<button className="secondary" disabled={shelfBusy} onClick={()=>{if(!(editing||conflictRef.current||generatedDraft)||window.confirm('현재 화면의 수정본을 최신 저장본으로 바꿀까요? 저장 충돌이나 저장 실패가 있으면 먼저 내려받아 보관하세요.'))reloadShelf();}}>최신 책장 불러오기</button>{shelfBusy&&<p role="status">책장 변경 저장 중…</p>}<BookBackupControls disabled={!ready||busy||editing||shelfBusy||conflictRef.current||generatedDraft} onImport={restoreBooks}/>{ready&&books.length===0&&<p>아직 책장에 저장된 동화가 없습니다. 질문 답변을 확인한 뒤 동화를 만들면 여기에 보관됩니다.</p>}{books.length>0&&<><ShelfBrowser books={books} selected={selected} disabled={editing||shelfBusy||conflictRef.current||generatedDraft} onSelect={selectBook}/>{book&&<article style={{maxWidth:book.qualityProfile?1100:760,margin:'24px auto',padding:'clamp(12px,4vw,28px)',background:'#fff9ee',borderRadius:24,color:'#29233e',lineHeight:1.9,fontSize:(readingSize/16)+'rem',overflowWrap:'anywhere'}}><aside aria-label="현재 동화 보관 상태"><p role="status">{conflictRef.current||generatedDraft?'현재 화면에만 남은 내용이 있습니다. 내려받기는 화면의 내용을 보관하며, 책장에 저장되었다는 뜻은 아닙니다. 최신 책장을 불러오기 전에 먼저 내려받으세요.':shelfBusy?'수정 내용을 책장에 저장 중입니다.':'동화는 웹에서 무료로 읽을 수 있어요. 편집 내용은 이 브라우저의 책장에 자동 저장됩니다.'}</p>{(editing||generatedDraft||conflictRef.current)&&<><button onClick={downloadHTML}>읽을 수 있는 동화 파일 받기</button><p>받은 파일을 브라우저에서 열어 읽거나 인쇄할 수 있어요.</p></>}{(generatedDraft||conflictRef.current)&&<details><summary>나중에 책장에 다시 넣기</summary><p>아래 파일을 보관했다가 책장 백업·복원에서 불러오세요. 같은 동화가 이미 있으면 책장에 있는 내용을 유지합니다.</p><button className="secondary" onClick={downloadBookBackup}>책장 복원용 파일 받기</button></details>}</aside>{!editing&&<ReadingTools key={book.id} book={book} size={readingSize} onSize={setReadingSize} chapter={reading.chapter(book.id,book.chapters.length)} onChapter={index=>reading.chooseChapter(book.id,index)} preferenceNotice={reading.notice}/>} {editing?<><input aria-label="동화 제목 수정" value={book.title} onChange={e=>update({...book,title:e.target.value})}/>
 <p role="note">글을 고치면 페이지 배치가 달라질 수 있어요. 이미 만든 그림은 자동으로 바뀌지 않으니, 수정을 마친 뒤 글과 그림이 어울리는지 확인해 주세요.</p>
 {book.chapters.map((chapter,index)=><section key={index}>
  <input aria-label={'장 제목 '+(index+1)} value={chapter.title} onChange={e=>update({...book,chapters:book.chapters.map((item,i)=>i===index?{...item,title:e.target.value}:item)})}/>
  <textarea aria-label={'동화 본문 '+(index+1)} value={chapter.text} onChange={e=>update({...book,chapters:book.chapters.map((item,i)=>i===index?{...item,text:e.target.value}:item)})}/>
 </section>)}<small>{book.note}</small></>:!generatedDraft&&!conflictRef.current&&productionCode.trim()
 ?<StoryIllustrations key={book.id+productionCode} book={book} code={productionCode.trim()} onWorking={setArtWorking}/>
 :<StoryPages book={book}/>}<p><button disabled={busy||artWorking} onClick={()=>setEditing(!editing)}>{editing?(shelfBusy?'수정 저장 중…':conflictRef.current?'수정 마치기 · 저장 충돌':generatedDraft?'수정 마치기 · 화면 보관본':'수정 마치기 · 자동 저장됨'):'동화 수정'}</button> <button className="secondary" disabled={artWorking||shelfBusy||conflictRef.current||generatedDraft} onClick={()=>{if(window.confirm('이 동화를 책장에서 삭제할까요?')){void removeBook(book);}}}>이 동화 삭제</button></p> {!editing&&!generatedDraft&&!conflictRef.current&&<details style={{margin:'24px 0',padding:16,border:'1px solid #d9cdb7',borderRadius:14}}><summary style={{cursor:'pointer',fontWeight:700}}>PDF로 받기 안내</summary><p>동화는 회원가입 없이 웹에서 끝까지 읽을 수 있어요. 표지와 삽화가 모두 완성되면 ‘표지와 삽화’ 아래의 ‘PDF로 내려받기’ 버튼으로 표지와 펼침면이 담긴 PDF를 바로 받을 수 있어요. 추가 비용은 없어요.</p><p><a href="/nangman-story-spread-preview.pdf?v=9" target="_blank" rel="noopener">예시 동화 펼침면 보기 (새 창)</a></p></details>}<small>내가 고친 글은 이 브라우저에만 저장돼요. AI가 만든 원본 글과 그림은 서버에 보관되어 제작 코드로 다시 불러올 수 있어요. 고친 글까지 보관하려면 책장 백업 파일을 받아 두세요.</small></article>}</>}</section>;
}

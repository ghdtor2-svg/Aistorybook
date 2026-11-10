'use client';
import Link from 'next/link';
import styles from './QuestionWorkshop.module.css';
import StorageRescue from '../../components/StorageRescue';
import StoryReader from './StoryReader';
import QuestionImport from './QuestionImport';
import StoryDesignWorkshop from './StoryDesignWorkshop';
import {coreQuestionHint} from '../../lib/storybook/story-design';
import {useUnsavedBookGuard} from './useUnsavedBookGuard';
import {questionDraftJSON,questionDraftText} from '../../lib/storybook/question-draft';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {coreQuestions,demoEngine,editSummary,fields,labels,newProfile,submitAnswer,type Field} from '../../lib/storybook/engine';
import {restoreStory,type SavedStory} from '../../lib/storybook/storage';
import {changeQuestion,QuestionConflictError,QUESTION_LOCK} from '../../lib/storybook/question-store';
export default function Storybook(){
 const [story,setStory]=useState<SavedStory|null>(null);const [ready,setReady]=useState(false);
 const [error,setError]=useState('');const [storageError,setStorageError]=useState('');const saveFailed=useRef(false);const storyRef=useRef(story);storyRef.current=story;const importedSave=useRef('');const expected=useRef<string|null>(null),frozen=useRef(false),conflict=useRef(false),epoch=useRef(0),pendingWrites=useRef(0);const [saving,setSaving]=useState(false);
 useUnsavedBookGuard(()=>!!story&&(saveFailed.current||pendingWrites.current>0));
 async function questionLock<T>(action:()=>T):Promise<T>{if(!navigator.locks)throw Error('동시 저장을 보호할 수 없습니다. 최신 브라우저에서 이용하세요.');return navigator.locks.request(QUESTION_LOCK,action);}
 function failed(e:unknown){frozen.current=true;saveFailed.current=true;if(e instanceof QuestionConflictError){conflict.current=true;setStorageError(e.message);}else setStorageError('브라우저에 저장할 수 없습니다. 현재 작성본을 내려받아 보관하세요.');}
 async function persist(manual=false){const value=storyRef.current;if(!value||(!manual&&frozen.current))return;if(conflict.current){failed(new QuestionConflictError());return;}const version=epoch.current;pendingWrites.current++;setSaving(true);try{await questionLock(()=>{if(version!==epoch.current||(!manual&&frozen.current))return;expected.current=changeQuestion(localStorage,expected.current,value);frozen.current=false;saveFailed.current=false;setStorageError('');});}catch(e){if(version===epoch.current)failed(e);}finally{pendingWrites.current--;setSaving(pendingWrites.current>0);}}
 async function reloadQuestions(){if(!window.confirm('현재 화면 작성본을 최신 질문 저장본으로 바꿀까요? 저장하지 못한 내용은 먼저 내려받아 보관하세요.'))return;epoch.current++;frozen.current=true;try{await questionLock(()=>{const raw=localStorage.getItem('ai-office:storybook:v1'),latest=restoreStory(localStorage);expected.current=raw;conflict.current=false;frozen.current=false;saveFailed.current=false;importedSave.current=JSON.stringify(latest);setStory(latest);setStorageError('');setError('');});}catch{saveFailed.current=true;setStorageError('최신 질문 저장본을 읽지 못했습니다. 화면과 저장 원문은 유지했습니다.');}}

 function downloadDraft(format:'json'|'text'){if(!story)return;const json=format==='json';const url=URL.createObjectURL(new Blob([json?questionDraftJSON(story):questionDraftText(story)],{type:json?'application/json;charset=utf-8':'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=json?'storybook-question-draft.json':'storybook-question-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 useEffect(()=>{try{expected.current=localStorage.getItem('ai-office:storybook:v1');setStory(restoreStory(localStorage)??{profile:newProfile(),draft:'',editingId:null});}catch{setStorageError('저장 내용을 복원하지 못했습니다. 새로 작성하거나 저장 내용을 삭제해 주세요.');}finally{setReady(true);}},[]);
 useEffect(()=>{if(!ready||!story)return;const saved=JSON.stringify(story);if(importedSave.current===saved){importedSave.current='';return;}importedSave.current='';void persist();},[story,ready]);
 useEffect(()=>{const changed=(event:StorageEvent)=>{if(event.key!=='ai-office:storybook:v1'&&event.key!==null)return;try{if(localStorage.getItem('ai-office:storybook:v1')!==expected.current)failed(new QuestionConflictError());}catch(e){failed(e);}};window.addEventListener('storage',changed);return ()=>window.removeEventListener('storage',changed);},[]);
 async function importDraft(preview:{story:SavedStory;stored:string|null;memory:string}){await questionLock(()=>{if(pendingWrites.current||localStorage.getItem('ai-office:storybook:v1')!==preview.stored||JSON.stringify(storyRef.current)!==preview.memory)throw Error('미리보기 후 질문이 변경되었거나 저장 중입니다. 파일을 다시 선택해 확인하세요.');try{expected.current=changeQuestion(localStorage,preview.stored,preview.story);}catch{throw Error('복원 내용을 저장하지 못했습니다. 기존 질문과 화면을 유지했습니다.');}epoch.current++;conflict.current=false;frozen.current=false;importedSave.current=JSON.stringify(preview.story);saveFailed.current=false;setStory(preview.story);setStorageError('');setError('');});}
 const profile=story?.profile;
 const question=story?.editingId?profile?.answers.find(a=>a.question.id===story.editingId)?.question:profile?.currentQuestion;
 function begin(){setError('');setStory({profile:newProfile(),draft:'',editingId:null});}
 async function remove(reset:boolean){if(!window.confirm(reset?'현재 내용을 지우고 처음부터 시작할까요?':'질문 답변과 작성 중인 내용만 삭제할까요? 책장에 저장된 동화와 서버 생성 기록은 유지됩니다.'))return;if(conflict.current){failed(new QuestionConflictError());return;}epoch.current++;frozen.current=true;try{await questionLock(()=>{expected.current=changeQuestion(localStorage,expected.current,null);frozen.current=false;saveFailed.current=false;setStorageError('');setError('');setStory(reset?{profile:newProfile(),draft:'',editingId:null}:null);});}catch(e){failed(e);}}
 function submit(event:FormEvent|undefined,skip=false){event?.preventDefault();if(!story||!question)return;try{setStory({profile:submitAnswer(story.profile,question,story.draft,skip),draft:'',editingId:null});setError('');}catch(e){setError(e instanceof Error?e.message:'답변을 확인해 주세요.');}}
 function editAt(index:number){if(!story)return;const answer=story.profile.answers[index];if(!answer)return;setError('');setStory({...story,editingId:answer.question.id,draft:answer.text});}
 function previous(){if(!story)return;const index=story.editingId?story.profile.answers.findIndex(a=>a.question.id===story.editingId):story.profile.answers.length;editAt(index-1);}
 function summary(field:Field,value:string){if(story)setStory({...story,profile:editSummary(story.profile,field,value)});}
 const progress=profile?Math.round(demoEngine.evaluate(profile.answers).resolvedGroups/5*100):0;
 const editingIndex=story?.editingId?profile?.answers.findIndex(a=>a.question.id===story.editingId):-1;
 const currentStage=question?'write':profile?.completionStatus==='confirmed'?'create':'review';
 const groupNumber=question?coreQuestions.findIndex(item=>item.group===question.group)+1:5;
 return <main className={`storybook ${styles.workshop}`}>
  <header className={styles.banner}>
   <div>
    <p className={styles.kicker}>낭만한줄 · 나의 추억으로 만드는 동화</p>
    <h1>이야기의 씨앗</h1>
    <p className={styles.bannerText}>기억에 남는 순간을 하나씩 들려주세요. 작은 기억도 이야기의 시작이 돼요.</p>
   </div>
   <nav aria-label="서비스 이동"><a className={styles.homeLink} href="#purchase-guide">구매 문의 · 입금 안내</a>{' '}<Link className={styles.homeLink} href="/">동화 홈</Link></nav>
  </header>

  {storageError&&<>
   <p className="error" role="alert">{storageError}</p>
   <StorageRescue keys={['ai-office:storybook:v1']} label="질문 저장 원문 내려받기"/>
   {story&&<section className="panel" aria-label="질문 화면 작성본 보관">
    <h2>저장하지 못한 작성 내용 보관</h2>
    <p>아래 파일에는 현재 화면의 답변·작성 중인 내용·요약 수정이 들어갑니다. 저장 원문 파일과 다르며, 내려받아도 브라우저에 저장되는 것은 아닙니다.</p>
    <button onClick={()=>downloadDraft('text')}>질문 화면 작성본 TXT 내려받기</button>
    <button className="secondary" onClick={()=>downloadDraft('json')}>질문 화면 작성본 JSON 내려받기</button>
    <p>JSON은 아래 질문 작성본 파일 불러오기에서 복원할 수 있습니다. 책장 백업 파일과는 다릅니다.</p>
    <button className="secondary" disabled={saving||conflict.current} onClick={()=>void persist(true)}>현재 작성 내용 저장 다시 시도</button>
    <button className="secondary" disabled={saving} onClick={()=>void reloadQuestions()}>최신 질문 저장본 불러오기</button>
   </section>}
  </>}

  {!ready?<p role="status">저장된 내용을 확인하고 있어요…</p>:!story?<section className={`panel ${styles.card}`}>
   <p>작성 내용이 없습니다.</p>
   <button onClick={begin}>새로 시작하기</button>
   <button className="secondary" onClick={()=>remove(false)}>저장 내용 삭제</button>
  </section>:<>
   <div className={styles.flow}>
    <aside className={styles.rail} aria-label="진행 상황">
     <span className={styles.railLabel}>✦ 나의 동화 여정</span>
     <label className={styles.progressLine} htmlFor="story-progress"><span>핵심 정보 수집 진행률</span>{' '}<strong>{progress}%</strong></label>
     <progress id="story-progress" max={100} value={progress}/>
     <ol className={styles.steps}>
      <li aria-current={currentStage==='write'?'step':undefined}><span>01</span> 이야기 들려주기</li>
      <li aria-current={currentStage==='review'?'step':undefined}><span>02</span> 내용 확인하기</li>
      <li aria-current={currentStage==='create'?'step':undefined}><span>03</span> 동화 만들기</li>
     </ol>
     <p className={styles.railNote}>핵심 질문 5가지 · 필요할 때 후속 질문이 이어져요.</p>
    </aside>

    {question?<section className={`panel ${styles.card}`} aria-labelledby="current-question">
     <p className={styles.questionTag}>{groupNumber}/5 · {question.kind==='core'?'핵심 질문':'맞춤 후속 질문 '+question.number+'/2'}</p>
     <h2 id="current-question">{question.text}</h2>
     <p className={styles.promptNote}>{story.editingId?'이전 답변을 수정 중입니다. 저장하거나 건너뛰면 이후 답변과 요약 수정 내용이 삭제되고 질문을 다시 평가합니다.':coreQuestionHint(question.group)}</p>
     <form onSubmit={event=>submit(event)}>
      <label htmlFor="story-answer">답변</label>
      <textarea id="story-answer" value={story.draft} maxLength={4000} onChange={e=>setStory({...story,draft:e.target.value})} placeholder="기억나는 장면이나 마음을 적어 보세요. 이름 대신 별칭을 써도 좋아요."/>
      <p className={styles.answerMeta}>
       <span role="status">{saving?'질문 작성본 저장 중…':storageError?'저장 상태를 확인해 주세요.':'이 브라우저에 자동 저장돼요.'}</span>
       <span>{story.draft.length}/4000자</span>
      </p>
      <div className={`story-actions ${styles.controls}`}>
       <button type="submit" disabled={!story.draft.trim()}>{story.editingId?'수정 저장하고 계속':'답변 저장하고 계속'}</button>
       <button type="button" className="secondary" onClick={()=>submit(undefined,true)}>이 질문 건너뛰기</button>
       <button type="button" className="secondary" disabled={story.editingId?editingIndex===0:profile!.answers.length===0} onClick={previous}>이전 질문</button>
       {story.editingId&&<button type="button" className="secondary" onClick={()=>setStory({...story,editingId:null,draft:''})}>수정 취소</button>}
      </div>
     </form>
     {error&&<p role="alert" className="error">{error}</p>}
    </section>:<section className={`panel ${styles.card}`}>
     <p className={styles.questionTag}>동화에 담길 내용</p>
     <h2>이야기의 씨앗을 모았어요</h2>
     <p className={styles.promptNote}>동화에 담고 싶은 내용이 맞는지 살펴보세요. 더하고 싶은 기억이 있으면 아래에서 고칠 수 있어요.</p>
     <div className={`summary-fields ${styles.reviewGrid}`}>
      {fields.map(field=><div key={field}>
       <label htmlFor={'summary-'+field}>{labels[field]}</label>
       <textarea id={'summary-'+field} value={profile![field]} maxLength={4000} placeholder="원하면 추가해 주세요" onChange={e=>summary(field,e.target.value)}/>
      </div>)}
     </div>
     <StoryDesignWorkshop profile={profile!} onChange={design=>setStory({...story,profile:{...profile!,storyDesign:design,completionStatus:'review',updatedAt:new Date().toISOString()}})}/>
     <label htmlFor="fictional-elements">동화적으로 각색해도 좋은 요소 (선택)</label>
     <textarea id="fictional-elements" maxLength={4000} placeholder="예: 숲속 배경이나 말하는 동물. 실제 추억과 구분해 저장합니다." value={profile!.fictionalElements} onChange={e=>setStory({...story,profile:{...profile!,fictionalElements:e.target.value,completionStatus:'review',updatedAt:new Date().toISOString()}})}/>
     <button disabled={profile!.completionStatus==='confirmed'} onClick={()=>setStory({...story,profile:{...profile!,completionStatus:'confirmed',updatedAt:new Date().toISOString()}})}>내용 최종 확인</button>
     <p role="status">{profile!.completionStatus==='confirmed'?'최종 확인되었습니다. 내용을 수정하면 다시 확인할 수 있어요.':'건너뛴 항목이 있어도 확인할 수 있어요.'}</p>
    </section>}
   </div>

   {profile!.answers.length>0&&<section className={styles.tools} aria-label="이전 답변 수정">
    <h2>이전 답변 수정</h2>
    <div className="story-actions">{profile!.answers.map((answer,index)=><button className="secondary" key={answer.question.id} onClick={()=>editAt(index)}>답변 {index+1} 수정{answer.skipped?' · 건너뜀':''}</button>)}</div>
   </section>}
  </>}

  <details className={styles.tools}>
   <summary>답변 저장과 개인정보 안내</summary>
   <p>답변과 작성 중인 내용은 현재 브라우저에 저장돼요. 동화 생성을 선택하면 확인한 요약을 AI에 전달합니다. 공용 기기에서 작성했다면 이용을 마친 뒤 답변을 삭제해 주세요.</p>
   <p>삭제하거나 다시 작성하는 작업은 질문 답변에만 적용돼요.</p>
  </details>
  {story&&<div className={styles.tools}>
    <footer className="story-actions">
     <button className="secondary" onClick={()=>remove(true)}>처음부터 다시 작성</button>
     <button className="secondary" onClick={()=>remove(false)}>저장 내용 삭제</button>
    </footer>
  </div>}
  <QuestionImport story={story} disabled={!ready||(!story&&!!storageError)} onBackup={()=>downloadDraft('json')} onApply={importDraft}/>
  {ready&&<StoryReader profile={profile??null}/>}
 </main>;
}

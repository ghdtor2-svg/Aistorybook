'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {bookSpeechPlan,pickKoreanVoice,SPEECH_RATES,SPEECH_RATE_LABELS,type SpeechPart} from '../../lib/storybook/speech';
import type {Book} from '../../lib/storybook/books';
/**
 * 동화를 소리로 읽어 줍니다. 기기에 있는 목소리만 씁니다.
 *
 * 바깥으로 나가는 요청이 없습니다. 동화 글이 서버로 전송되지 않고 비용도 들지
 * 않습니다. 인터넷이 끊겨도 읽어 줍니다.
 *
 * 조심한 것들:
 *  - 목소리 목록은 늦게 옵니다. 처음 부르면 비어 있고 voiceschanged 뒤에 찹니다.
 *    그래서 목록이 빌 때 '없음'이라고 단정하지 않고 한 번 더 기다립니다.
 *  - 긴 글을 통째로 넘기면 중간에 멈춥니다. speech.ts 가 문장으로 쪼갭니다.
 *  - 화면을 떠나거나 다른 동화를 고르면 반드시 멈춥니다. 안 멈추면 페이지를
 *    닫아도 계속 읽습니다(브라우저 전역 기능이라 컴포넌트와 생명주기가 다릅니다).
 *  - 일시정지는 기기에 따라 동작하지 않습니다. 그래서 멈춤 버튼을 늘 함께 둡니다.
 */
export default function SpeechControls({book,rate,onRate,onChapter}:{book:Book;rate:number;onRate:(rate:number)=>void;onChapter:(index:number)=>void}){
 const [supported,setSupported]=useState<boolean|null>(null);
 const [state,setState]=useState<'idle'|'speaking'|'paused'>('idle');
 const [at,setAt]=useState(0);
 const [notice,setNotice]=useState('');
 const parts=useRef<SpeechPart[]>([]);
 const index=useRef(0);
 const voice=useRef<SpeechSynthesisVoice|null>(null);
 const stopped=useRef(false);
 const lastChapter=useRef<number|null>(null);
 // 읽는 도중 속도를 바꾸면 다음 문장부터 적용됩니다. 지금 읽는 문장을 끊고
 // 다시 시작하면 같은 문장을 두 번 듣게 되므로 그렇게 하지 않습니다.
 const rateRef=useRef(rate);rateRef.current=rate;

 // 목소리 목록은 늦게 옵니다. 바로 없다고 단정하면 쓸 수 있는 기기에서도 기능이 사라집니다.
 useEffect(()=>{
  if(typeof window==='undefined'||!('speechSynthesis' in window)){setSupported(false);return;}
  function look(){
   const found=pickKoreanVoice(window.speechSynthesis.getVoices());
   if(found){voice.current=found;setSupported(true);return true;}
   return false;
  }
  if(look())return;
  const changed=()=>{if(look())window.speechSynthesis.removeEventListener('voiceschanged',changed);};
  window.speechSynthesis.addEventListener('voiceschanged',changed);
  // 목록이 끝내 비면 한국어 목소리가 없는 기기입니다. 영어 목소리로 한국어를 읽히지 않습니다.
  const giveUp=setTimeout(()=>{if(!voice.current)setSupported(false);},3000);
  return ()=>{window.speechSynthesis.removeEventListener('voiceschanged',changed);clearTimeout(giveUp);};
 },[]);

 const halt=useCallback(()=>{
  stopped.current=true;
  if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  index.current=0;setAt(0);setState('idle');lastChapter.current=null;
 },[]);

 // 다른 동화를 고르거나 화면을 떠나면 멈춥니다. 안 멈추면 엉뚱한 책을 계속 읽습니다.
 useEffect(()=>halt,[halt]);
 useEffect(()=>{halt();setNotice('');},[book.id,halt]);

 function speakFrom(start:number){
  const list=parts.current;
  if(start>=list.length){halt();return;}
  const part=list[start];
  index.current=start;setAt(start);
  if(part.chapter>=0&&part.chapter!==lastChapter.current){lastChapter.current=part.chapter;onChapter(part.chapter);}
  const utterance=new SpeechSynthesisUtterance(part.text);
  if(voice.current){utterance.voice=voice.current;utterance.lang=voice.current.lang;}else utterance.lang='ko-KR';
  utterance.rate=rateRef.current;
  utterance.onend=()=>{if(stopped.current)return;speakFrom(start+1);};
  utterance.onerror=event=>{
   if(stopped.current||event.error==='interrupted'||event.error==='canceled')return;
   setNotice('낭독을 이어 가지 못했습니다. 다시 눌러 주세요. 동화 내용은 그대로입니다.');
   halt();
  };
  window.speechSynthesis.speak(utterance);
 }

 function play(){
  if(supported!==true)return;
  setNotice('');
  stopped.current=false;
  window.speechSynthesis.cancel(); // 앞선 낭독이 남아 있으면 두 목소리가 겹칩니다.
  parts.current=bookSpeechPlan(book);
  lastChapter.current=null;
  if(parts.current.length===0){setNotice('읽어 줄 내용이 없습니다.');return;}
  setState('speaking');
  speakFrom(0);
 }

 function pause(){
  if(state!=='speaking')return;
  window.speechSynthesis.pause();
  setState('paused');
  // 일부 기기는 pause 를 무시합니다. 멈추지 않았으면 사용자에게 알려 멈춤을 쓰게 합니다.
  setTimeout(()=>{if(!window.speechSynthesis.paused&&window.speechSynthesis.speaking)setNotice('이 기기는 잠시 멈춤을 지원하지 않습니다. 멈춤을 눌러 주세요.');},300);
 }

 function resume(){
  if(state!=='paused')return;
  setNotice('');
  window.speechSynthesis.resume();
  setState('speaking');
 }

 if(supported===false)return <p className="muted" style={{margin:'8px 0'}}>이 기기에는 한국어 음성이 없어 읽어 주기를 사용할 수 없습니다. 글로 읽는 기능은 그대로 쓸 수 있어요.</p>;

 const total=parts.current.length;
 return <div className="speech-tools" aria-label="동화 읽어 주기" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12,marginBottom:16}}>
  {state==='idle'
   ?<button type="button" disabled={supported!==true} onClick={play}>{supported===null?'음성을 준비하고 있어요…':'소리로 읽어 주기'}</button>
   :<>
    {state==='speaking'
     ?<button type="button" onClick={pause}>잠시 멈춤</button>
     :<button type="button" onClick={resume}>이어 읽기</button>}
    <button type="button" className="secondary" onClick={halt}>멈춤</button>
   </>}
  <label>읽는 속도 <select aria-label="낭독 속도" value={rate} onChange={e=>onRate(Number(e.target.value))}>
   {SPEECH_RATES.map(value=><option key={value} value={value}>{SPEECH_RATE_LABELS[String(value)]}</option>)}
  </select></label>
  <small aria-live="polite">{notice||(state==='idle'?'기기에 있는 음성으로 읽어 줍니다. 동화 내용은 바깥으로 보내지 않아요.':state==='paused'?'잠시 멈췄어요.':'읽는 중 · '+(at+1)+'/'+total+' 문장')}</small>
  <style>{'.speech-tools button{font:inherit;min-height:44px;white-space:normal;word-break:keep-all}.speech-tools select{font:inherit;min-height:44px;padding:8px}'}</style>
 </div>;
}

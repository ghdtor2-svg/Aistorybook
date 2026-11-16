'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import styles from './AnswerEditor.module.css';
/** 입력칸과 예시를 한곳에 두고, 키보드로 화면이 줄어도 함께 볼 수 있게 합니다. */
export default function AnswerEditor({id,usage,example,children,mobileOnly=false}:{id:string;usage:string;example:string;children:ReactNode;mobileOnly?:boolean}){
 const editor=useRef<HTMLDivElement>(null);
 const [expanded,setExpanded]=useState(false);
 const frame=useRef(0);
 function alignInput(){
  cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   const node=editor.current;
   if(!node||!matchMedia('(max-width: 700px)').matches||!node.contains(document.activeElement))return;
   const active=document.activeElement;
   if(!(active instanceof HTMLTextAreaElement||active instanceof HTMLInputElement))return;
   const top=node.getBoundingClientRect().top-(window.visualViewport?.offsetTop||0)-8;
   if(Math.abs(top)>2)window.scrollBy({top,behavior:'instant'});
  });
 }
 useEffect(()=>{
  const viewport=window.visualViewport;
  viewport?.addEventListener('resize',alignInput);
  return ()=>{cancelAnimationFrame(frame.current);viewport?.removeEventListener('resize',alignInput);};
 },[]);
 return <div ref={editor} className={styles.editor} data-mobile-guide={mobileOnly?'true':undefined} onFocusCapture={event=>{if(event.target.matches('textarea,input'))alignInput();}}>
  <div id={id} className={styles.guide} data-expanded={expanded?'true':'false'}>
   <div className={styles.heading}><strong>동화에는 이렇게 담겨요</strong><button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={id+'-detail'} onPointerDown={event=>{if(editor.current?.contains(document.activeElement))event.preventDefault();}} onClick={()=>setExpanded(value=>!value)}>{expanded?'설명 접기':'설명 더 보기'}</button></div>
   <div className={styles.content}><p id={id+'-detail'} className={styles.usage}>{usage}</p><p className={styles.example}>{example}</p></div>
  </div>
  {children}
 </div>;
}

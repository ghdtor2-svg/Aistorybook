'use client';
import {useState} from 'react';
import styles from './ChoiceChips.module.css';
import {isChosen,toggleChoice,addChoice,MAX_DIRECT_CHOICE_LENGTH,type ChoiceGroup} from '../../lib/storybook/story-choices';
// 선택지는 답변 문장에 고른 문구를 넣고 다시 누르면 지운다. 화면 선택을 답변 원문과 따로 저장하지 않는다.
export default function ChoiceChips({groups,value,limit=4000,onChange,idPrefix}:{groups:ChoiceGroup[];value:string;limit?:number;onChange:(next:string)=>void;idPrefix:string}){
 const [openGroup,setOpenGroup]=useState(-1);const [typed,setTyped]=useState('');
 if(!groups.length)return null;
 function keep(index:number){
  const text=typed.trim();if(!text)return;
  onChange(addChoice(value,text,limit));setTyped('');setOpenGroup(index===openGroup?-1:openGroup);
 }
 return <div className={styles.wrap}>
  {groups.map((group,index)=>{
   const labelId=idPrefix+'-choice-'+index,inputId=labelId+'-direct';
   return <div key={group.label} className={styles.group}>
    <p className={styles.label} id={labelId}>{group.label}<span className={styles.hint}>여러 개 골라도 되고, 안 골라도 돼요</span></p>
    <div className={styles.chips} role="group" aria-labelledby={labelId}>
     {group.options.map(option=>{
      const picked=isChosen(value,option);
      return <button key={option} type="button" aria-label={option} aria-pressed={picked} className={picked?styles.picked:styles.chip} onClick={()=>onChange(toggleChoice(value,option,limit))}>{option}</button>;
     })}
     <button type="button" className={styles.direct} aria-expanded={openGroup===index} aria-controls={inputId} onClick={()=>{setOpenGroup(openGroup===index?-1:index);setTyped('');}}>✏️ 직접 입력</button>
    </div>
    {openGroup===index&&<div className={styles.directBox} id={inputId}>
     <label htmlFor={inputId+'-field'}>{group.label} · 직접 입력</label>
     <div className={styles.directRow}>
      <input id={inputId+'-field'} value={typed} maxLength={MAX_DIRECT_CHOICE_LENGTH} autoComplete="off" placeholder="원하는 내용을 적어 주세요" onChange={event=>setTyped(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();keep(index);}}}/>
      <button type="button" disabled={!typed.trim()} onClick={()=>keep(index)}>추가</button>
      <button type="button" className={styles.close} onClick={()=>{setOpenGroup(-1);setTyped('');}}>닫기</button>
     </div>
    </div>}
   </div>;
  })}
 </div>;
}

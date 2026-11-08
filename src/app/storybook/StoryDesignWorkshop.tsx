'use client';
import {useState} from 'react';
import {designFields,designLabels,designProgress,storyDesignQuestions,type DesignField,type StoryDesign} from '../../lib/storybook/story-design';
import type {StoryProfile} from '../../lib/storybook/engine';
export default function StoryDesignWorkshop({profile,onChange}:{profile:StoryProfile;onChange:(design:StoryDesign)=>void}){
 const design=profile.storyDesign||{};
 const [index,setIndex]=useState(()=>{const next=designFields.findIndex(field=>!Object.hasOwn(design,field));return next<0?0:next;});
 const questions=storyDesignQuestions(profile),question=questions[index],progress=designProgress(design);
 function update(field:DesignField,text:string){onChange({...design,[field]:text.slice(0,4000)});}
 return <section aria-labelledby="story-design-heading" style={{margin:'28px 0',padding:20,border:'1px solid #ded1e9',borderRadius:18,background:'#f7f1fa'}}>
  <p style={{fontSize:13,color:'#6d5083'}}>이야기를 더 깊게 · 선택 단계</p><h3 id="story-design-heading">장면이 살아 있는 동화로 다듬어요</h3>
  <p>짧은 답도 괜찮아요. 아는 항목만 골라 적어 주세요. 새로 쓰거나 고치면 내용 최종 확인을 다시 받습니다.</p>
  <p role="status">작성한 설계 항목 {progress.answered}/{progress.total} · 빈 항목은 제공하지 않은 정보로 남겨요.</p>
  <nav aria-label="이야기 설계 질문 선택" style={{display:'flex',flexWrap:'wrap',gap:6}}>{questions.map((item,i)=><button key={item.id} type="button" className="secondary" aria-current={i===index?'step':undefined} onClick={()=>setIndex(i)} style={{fontSize:13,padding:'7px 10px',maxWidth:'100%',whiteSpace:'normal'}}>{i+1}. {designLabels[item.id]}{design[item.id]?.trim()?' ✓':''}</button>)}</nav>
  <h4 style={{fontSize:19,lineHeight:1.6}}>{index+1}/{questions.length} · {question.question}</h4><p>{question.why}</p>
  <ul>{question.prompts.map(prompt=><li key={prompt}>{prompt}</li>)}</ul>
  <label htmlFor={'design-'+question.id}>{designLabels[question.id]}</label>
  <textarea id={'design-'+question.id} maxLength={4000} value={design[question.id]||''} placeholder={question.example} onChange={event=>update(question.id,event.target.value)} style={{minHeight:155}}/>
  <p style={{fontSize:12,color:'#665a71'}}>예시는 답변에 자동으로 들어가지 않아요. {(design[question.id]||'').length}/4000자</p>
  <div className="story-actions"><button type="button" className="secondary" disabled={index===0} onClick={()=>setIndex(index-1)}>설계 이전 질문</button><button type="button" onClick={()=>setIndex(Math.min(index+1,questions.length-1))} disabled={index===questions.length-1}>설계 다음 질문</button><button type="button" className="secondary" onClick={()=>{if(!Object.hasOwn(design,question.id))update(question.id,'');setIndex(Math.min(index+1,questions.length-1));}}>이 설계 질문은 넘어가기</button></div>
  <p style={{fontSize:13}}>질문은 이야기의 재료와 장면을 구체화해요. 실제 글과 그림의 품질은 생성 후 별도로 확인합니다.</p>
 </section>;
}

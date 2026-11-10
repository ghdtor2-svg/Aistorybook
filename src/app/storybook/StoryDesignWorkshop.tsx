'use client';
import styles from './StoryDesignWorkshop.module.css';
import ChoiceChips from './ChoiceChips';
import {designFields,designLabels,storyDesignQuestions,type DesignField,type StoryDesign} from '../../lib/storybook/story-design';
import {designQuestionChoices} from '../../lib/storybook/story-choices';
import type {StoryProfile} from '../../lib/storybook/engine';
// 선택 단계다. 9개 제목을 한눈에 보여 주고 열고 싶은 것만 펼친다. 비어 있어도 생성과 최종 확인을 막지 않는다.
const preview=(value:string)=>value.length>30?value.slice(0,30)+'…':value;
export default function StoryDesignWorkshop({profile,onChange}:{profile:StoryProfile;onChange:(design:StoryDesign)=>void}){
 const design=profile.storyDesign||{};
 const questions=storyDesignQuestions(profile);
 const picked=designFields.filter(field=>design[field]?.trim());
 function update(field:DesignField,text:string){onChange({...design,[field]:text.slice(0,4000)});}
 return <section className={styles.panel} aria-labelledby="story-design-heading">
  <p className={styles.tag}>여기부터는 선택이에요 · 안 해도 괜찮아요</p>
  <h3 id="story-design-heading">더 들려주고 싶은 게 있나요?</h3>
  <p className={styles.lead}>아래 목록에서 <strong>마음이 가는 것만</strong> 눌러서 펼쳐 보세요. 하나도 고르지 않아도 동화는 그대로 만들어지고, 바로 ‘내용 최종 확인’을 눌러도 괜찮아요.</p>
  <p className={styles.count} role="status">{picked.length>0?`지금 ${picked.length}가지 들려줬어요 · 더 안 해도 괜찮아요`:'아직 아무것도 안 골랐어요 · 그대로 넘어가도 괜찮아요'}</p>
  <ul className={styles.list}>
   {questions.map(item=>{
    const value=design[item.id]||'',groups=designQuestionChoices(item.id),filled=!!value.trim();
    const writing=<>
     <ul className={styles.prompts}>{item.prompts.map(prompt=><li key={prompt}>{prompt}</li>)}</ul>
     <label htmlFor={'design-'+item.id}>{designLabels[item.id]}</label>
     <textarea id={'design-'+item.id} maxLength={4000} value={value} placeholder={item.example} onChange={event=>update(item.id,event.target.value)}/>
     <p className={styles.meta}>예시는 답변에 자동으로 들어가지 않아요. {value.length}/4000자</p>
    </>;
    return <li key={item.id}>
     <details className={filled?styles.rowDone:styles.row}>
      <summary>
       <span className={styles.rowTitle}>{designLabels[item.id]}</span>
       <span className={filled?styles.rowPicked:styles.rowHint}>{filled?preview(value.trim()):groups.length>0?'보기에서 고르기':'직접 적기'}</span>
      </summary>
      <div className={styles.body}>
       <p className={styles.question}>{item.question}</p>
       <p className={styles.why}>{item.why}</p>
       {groups.length>0?<>
        <ChoiceChips groups={groups} value={value} onChange={text=>update(item.id,text)} idPrefix={'design-'+item.id}/>
        <details className={styles.writeBox}><summary>보기에 없으면 직접 적어도 돼요 (선택)</summary>{writing}</details>
       </>:<div className={styles.writeOpen}>{writing}</div>}
      </div>
     </details>
    </li>;
   })}
  </ul>
  <p className={styles.note}>들려주신 내용은 이야기의 재료로 전달돼요. 비워 둔 항목은 제공하지 않은 정보로 남기고 추측하지 않아요. 글과 그림의 품질은 생성 후 따로 확인합니다.</p>
 </section>;
}

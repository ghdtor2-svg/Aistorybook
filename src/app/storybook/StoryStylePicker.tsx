'use client';

import {useId,useRef,useState} from 'react';
import {offeredStoryArtStyles as storyArtStyles,type StoryArtStyleId} from '../../lib/storybook/art-styles';
import {artStyleDescriptions} from '../../lib/storybook/art-style-examples';
import styles from './StoryStylePicker.module.css';

export type StyleChoice=StoryArtStyleId|'random';

export default function StoryStylePicker({value,onChange,disabled}:{value:StyleChoice;onChange:(value:StyleChoice)=>void;disabled:boolean}){
  const group=useId();
  const viewer=useRef<HTMLDialogElement>(null);
  const [preview,setPreview]=useState<StoryArtStyleId|null>(null);
  const previewStyle=storyArtStyles.find(style=>style.id===preview);
  return <fieldset className={styles.picker} disabled={disabled}>
    <legend>새 동화의 화풍을 골라주세요</legend>
    <p>아래 그림은 화풍을 고를 때 참고하는 표현 예시입니다. 실제 동화의 장면과 완성 결과는 달라질 수 있어요. <a href="#art-quality-proof">실제 제작 예시 확인</a> · <a href="/storybook/styles/index.html?v=5" target="_blank" rel="noopener">여섯 가지 화풍 한눈에 보기</a></p>
    <div className={styles.grid}>
      {storyArtStyles.map(style=><div key={style.id} className={styles.option}>
        <label className={styles.card} data-selected={value===style.id}>
        {/* 고정된 예시 그림이다. 격자에는 줄인 미리보기를 쓰고 원본은 크게 보기에서만 받는다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={'/storybook/styles/thumb/'+style.id+'.webp?v=3'} alt={style.name+' 화풍 예시 · '+artStyleDescriptions[style.id]} loading="lazy" decoding="async" fetchPriority="low" width={520} height={347}/>
        <span><input type="radio" name={group} value={style.id} checked={value===style.id} onChange={()=>onChange(style.id)} aria-label={style.name}/><strong>{style.name}</strong>{value===style.id&&<small>선택됨</small>}</span>
        </label>
        <p className={styles.description}>{artStyleDescriptions[style.id]}</p>
        <button className={styles.previewButton} type="button" aria-label={style.name+' 예시 크게 보기'} onClick={()=>{setPreview(style.id);viewer.current?.showModal();}}>크게 보기 ↗</button>
      </div>)}
    </div>
    <label className={styles.random}><input type="radio" name={group} value="random" checked={value==='random'} onChange={()=>onChange('random')}/> 화풍을 랜덤으로 골라주세요</label>
    <small>예시 속 캐릭터는 비교를 위한 샘플이에요. 실제 동화는 들려주신 이야기에 맞춰 그려요.</small>
    <p className={styles.selection} role="status">{value==='random'?'제작할 때 여섯 가지 중 한 화풍을 골라요.':(storyArtStyles.find(style=>style.id===value)?.name+' 화풍으로 만들어요.')} 선택한 화풍은 작품 전체에 유지됩니다.</p>
    <section id="art-quality-proof" className={styles.proof} aria-label="실제 제작 품질 확인">
      <h3>실제 제작 예시도 확인해 보세요</h3>
      <p>플랫폼의 실제 제작 경로로 만든 입체 인형·수채화 예시입니다. 각 화풍의 표지와 이어지는 그림을 확인했습니다. 다른 네 화풍은 표지와 장면 1장씩만 시험했고, 한 편 전체의 품질 검증은 진행 중입니다.</p>
      <details><summary>실제로 만든 두 화풍 펼쳐 보기</summary>{(['soft-clay','watercolor'] as const).map(id=><figure key={id}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={'/storybook/quality-proof/'+id+'-panorama.webp'} alt={(id==='soft-clay'?'입체 인형':'수채화')+' 실제 제작 결과 · 하루와 할머니의 별빛 정원'} loading="lazy"/><figcaption>{id==='soft-clay'?'입체 인형':'수채화'} · 실제 제작한 펼침면 <a href={'/storybook/quality-proof/'+id+'-cover.webp'} target="_blank" rel="noopener">표지도 보기 ↗</a></figcaption></figure>)}</details>
    </section>
    <dialog ref={viewer} className={styles.viewer} aria-label="화풍 예시 확대 보기" onClose={()=>setPreview(null)}>
      <div className={styles.viewerHead}><h3>{previewStyle?.name}</h3><button type="button" onClick={()=>viewer.current?.close()}>닫기</button></div>
      {previewStyle&&<><p>{artStyleDescriptions[previewStyle.id]}</p>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={'/storybook/styles/'+previewStyle.id+'.webp?v=2'} alt={previewStyle.name+' 큰 화풍 예시'}/></>}
      <p>크게 보기는 화풍 선택을 바꾸지 않아요.</p>
    </dialog>
  </fieldset>;
}

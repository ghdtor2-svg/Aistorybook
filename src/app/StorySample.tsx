'use client';

import {useState} from 'react';
import Link from 'next/link';
import styles from './StorySample.module.css';

const spreads=[
  {image:'spread-01',title:'사계절 친구들을 만나다',excerpt:'안녕, 난 꽃잎이야. 사계절 중 봄을 맡고 있지.'},
  {image:'spread-02',title:'봄을 깨우는 작은 인사',excerpt:'이 탑은 매일 쉬지도 않고 째깍째깍 돌아가. 바늘이 봄을 가리키면 내가 나가지. 시계가 봄을 가리킬 때 나는 너무 신이나.'},
];

export default function StorySample(){
  const [index,setIndex]=useState(0);
  const sample=spreads[index];
  return <section id="sample-story" className={styles.sample} aria-labelledby="sample-title">
    <div className={styles.intro}><div><p className={styles.eyebrow}>먼저 펼쳐 보는 이야기</p><h2 id="sample-title">사계의 탑</h2><p>서로 다른 색을 가진 네 친구의 이야기.<br/>글과 그림이 함께 흐르는 동화의 모습을 만나보세요.</p></div><span className={styles.badge}>샘플 작품 · 32쪽</span></div>
    <div className={styles.preview}>
      <a href="/nangman-story-spread-preview.pdf?v=9" target="_blank" rel="noopener" aria-label="사계의 탑 전체 샘플 새 창으로 보기">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={'/storybook/sample/'+sample.image+'.webp'} width={1800} height={900} alt={sample.title+' · 사계의 탑 실제 샘플 펼침면'} loading="lazy"/>
      </a>
    </div>
    <div className={styles.caption}><div aria-live="polite"><strong>{sample.title}</strong><p>“{sample.excerpt}”</p></div><nav className={styles.pages} aria-label="샘플 장면 선택">{spreads.map((spread,i)=><button type="button" key={spread.image} aria-label={'샘플 장면 '+(i+1)} aria-pressed={index===i} onClick={()=>setIndex(i)}>{String(i+1).padStart(2,'0')}</button>)}</nav></div>
    <div className={styles.actions}><a href="/nangman-story-spread-preview.pdf?v=9" target="_blank" rel="noopener">전체 샘플 읽기 ↗</a><Link href="/storybook#my-books">여섯 가지 화풍 살펴보기 →</Link></div>
    <p className={styles.note}>별도로 편집·검수한 기준 샘플입니다. 실제 작품은 입력한 이야기와 선택한 화풍에 따라 달라집니다. <Link href="/storybook#art-quality-proof">실제 자동 제작 예시도 확인해 보세요.</Link></p>
  </section>;
}

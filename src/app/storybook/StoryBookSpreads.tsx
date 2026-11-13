'use client';

import {useCallback,useMemo,useState,type ReactNode} from 'react';
import type {Book} from '../../lib/storybook/books';
import {planStorybook} from '../../lib/storybook/book-layout';
import {emphasizePages,type EmphasisPiece} from '../../lib/storybook/emphasis';
import styles from './StoryBookSpreads.module.css';

// 그림책 펼침면처럼 그림이 펼침면 전체를 채웁니다. 삽화(3:1)는 아래에 두고, 그 위는 같은 그림을
// 흐리게 번지게 이어 하늘처럼 채운 뒤 그곳에 글을 얹습니다. 그래서 글이 인물이나 얼굴을 가리지 않습니다.
// 그림이 아직 없거나 화면이 좁으면 글은 그림 아래에 따로 놓입니다(StoryBookSpreads.module.css).
function Sheet({shared,artIndices,images,children}:{shared:boolean;artIndices:number[];images:ReactNode[];children:ReactNode}){
  const [backdrops,setBackdrops]=useState<Record<number,string>>({});
  // 그림은 StoryIllustrations가 비공개 주소로 불러옵니다. 다 불러온 그림의 주소를 받아 배경에 다시 씁니다.
  const watch=useCallback((node:HTMLDivElement|null)=>{
    if(!node)return;
    const take=(image:HTMLImageElement)=>{
      const index=Number(image.closest('[data-art-index]')?.getAttribute('data-art-index'));
      if(Number.isInteger(index)&&image.currentSrc)setBackdrops(previous=>previous[index]===image.currentSrc?previous:{...previous,[index]:image.currentSrc});
    };
    node.querySelectorAll('img').forEach(image=>{if(image.complete)take(image);});
    node.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement)take(event.target);},true);
  },[]);
  const hasArt=images.some(Boolean);
  return <div ref={watch} className={styles.sheet}>
    {hasArt&&<div className={styles.backdrop} aria-hidden="true">
      {artIndices.map(art=><div key={art} style={backdrops[art]?{backgroundImage:'url("'+backdrops[art]+'")'}:undefined}/>)}
    </div>}
    {hasArt&&<div className={shared?styles.panorama:styles.individual}>
      {images.map((image,position)=><div key={artIndices[position]} data-art-index={artIndices[position]}>{image}</div>)}
    </div>}
    {children}
  </div>;
}

function Piece({piece}:{piece:EmphasisPiece}){
  return piece.kind==='plain'?<>{piece.text}</>:<span className={piece.kind==='speech'?styles.speech:styles.sound}>{piece.text}</span>;
}

export default function StoryBookSpreads({book,artAt}:{book:Book;artAt?:(index:number,onRatio?:(ratio:number)=>void)=>ReactNode}){
  const layout=useMemo(()=>planStorybook(book),[book]);
  // 대사와 반복말은 크게, 이야기 글은 조금 작게 보여 줍니다. 대사가 쪽을 넘어가도 같은 문단이면 이어서 강조합니다.
  const emphasis=useMemo(()=>emphasizePages(layout.pages),[layout]);
  const firstPageByChapter=new Map<number,number>();
  layout.pages.forEach((page,index)=>page.parts.forEach(part=>{
    if(!firstPageByChapter.has(part.chapterIndex))firstPageByChapter.set(part.chapterIndex,index);
  }));
  return <div data-storybook-pages="32" className={styles.book}>
    <p className={styles.edition}>32쪽 동화 · 표지와 삽화 총 18장</p>
    {layout.spreads.map((spread,index)=>{
      const images=spread.artIndices.map(art=>artAt?.(art));
      const hasArt=images.some(Boolean);
      return <section key={index} data-spread-index={index} data-overlay={hasArt?'':undefined} data-pages={spread.pageIndices.length} className={styles.spread}>
        <Sheet shared={spread.shared} artIndices={spread.artIndices} images={images}>
          <div className={styles.texts}>
            {spread.pageIndices.map(pageIndex=><div key={pageIndex} data-story-page={pageIndex+1} className={styles.copy}>
              {layout.pages[pageIndex].parts.map((part,partIndex)=>{
                const first=firstPageByChapter.get(part.chapterIndex)===pageIndex&&layout.pages[pageIndex].parts.findIndex(piece=>piece.chapterIndex===part.chapterIndex)===partIndex;
                return <p key={partIndex} id={first?'book-chapter-'+part.chapterIndex:undefined} tabIndex={first?-1:undefined}>{emphasis[pageIndex][partIndex].map((piece,pieceIndex)=><Piece key={pieceIndex} piece={piece}/>)}</p>;
              })}
            </div>)}
          </div>
        </Sheet>
        <small className={styles.folios}>{spread.pageIndices.map(page=>page+1).join(' · ')}</small>
      </section>;
    })}
  </div>;
}

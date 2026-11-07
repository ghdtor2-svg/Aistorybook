'use client';

import {useMemo,type ReactNode} from 'react';
import type {Book} from '../../lib/storybook/books';
import {planStorybook} from '../../lib/storybook/book-layout';
import styles from './StoryBookSpreads.module.css';

export default function StoryBookSpreads({book,artAt}:{book:Book;artAt?:(index:number,onRatio?:(ratio:number)=>void)=>ReactNode}){
  const layout=useMemo(()=>planStorybook(book),[book]);
  const firstPageByChapter=new Map<number,number>();
  layout.pages.forEach((page,index)=>page.parts.forEach(part=>{
    if(!firstPageByChapter.has(part.chapterIndex))firstPageByChapter.set(part.chapterIndex,index);
  }));
  return <div data-storybook-pages="32" className={styles.book}>
    <p className={styles.edition}>32쪽 동화 · 표지와 삽화 총 18장</p>
    {layout.spreads.map((spread,index)=>{
      const images=spread.artIndices.map(art=>artAt?.(art));
      const hasArt=images.some(Boolean);
      const artFirst=spread.shared&&index%2===1;
      const artwork=hasArt&&<div className={spread.shared?styles.panorama:styles.individual}>
        {images.map((image,position)=><div key={spread.artIndices[position]} data-art-index={spread.artIndices[position]}>{image}</div>)}
      </div>;
      return <section key={index} data-spread-index={index} data-art-position={artFirst?'above':'below'} className={styles.spread}>
        {artFirst&&artwork}
        <div className={styles.texts}>
          {spread.pageIndices.map(pageIndex=><div key={pageIndex} data-story-page={pageIndex+1} className={styles.copy}>
            {layout.pages[pageIndex].parts.map((part,partIndex)=>{
              const first=firstPageByChapter.get(part.chapterIndex)===pageIndex&&layout.pages[pageIndex].parts.findIndex(piece=>piece.chapterIndex===part.chapterIndex)===partIndex;
              return <p key={partIndex} id={first?'book-chapter-'+part.chapterIndex:undefined} tabIndex={first?-1:undefined}>{part.text}</p>;
            })}
          </div>)}
        </div>
        {!artFirst&&artwork}
        <small className={styles.folios}>{spread.pageIndices.map(page=>page+1).join(' · ')}</small>
      </section>;
    })}
  </div>;
}

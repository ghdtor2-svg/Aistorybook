'use client';

import {useMemo,useState,type ReactNode} from 'react';
import type {Book} from '../../lib/storybook/books';
import styles from './StoryPages.module.css';
import {storyQualityProfile} from '../../lib/storybook/quality';
import StoryBookSpreads from './StoryBookSpreads';

const placements=['left','right','above','below','upperLeft','upperRight','lowerLeft','lowerRight'] as const;
type Placement=typeof placements[number];

function fitPlacement(placement:Placement,ratio:number|undefined):Placement{
  if(ratio===undefined)return placement;
  if(ratio<0.9)return ['right','below','upperRight','lowerRight'].includes(placement)?'right':'left';
  if(ratio>=1.8)return ['right','below','lowerLeft','lowerRight'].includes(placement)?'below':'above';
  return placement;
}

function scenePlacements(bookId:string,count:number){
  // The book's ID keeps the shuffled order stable when the reader reopens it.
  let seed=2166136261;
  for(const character of bookId)seed=Math.imul(seed^character.charCodeAt(0),16777619);
  const order=[...placements];
  for(let index=order.length-1;index>0;index--){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const swap=Math.floor(seed/4294967296*(index+1));
    [order[index],order[swap]]=[order[swap],order[index]];
  }
  return Array.from({length:count},(_,index)=>order[index%order.length]);
}

export default function StoryPages({book,artAt}:{book:Book;artAt?:(index:number,onRatio?:(ratio:number)=>void)=>ReactNode}){
  const [ratios,setRatios]=useState<Record<number,number>>({});
  const cover=artAt?.(0);
  const layout=useMemo(()=>scenePlacements(book.id,book.chapters.length),[book.id,book.chapters.length]);
  return <div>
    {cover?<div className={`${styles.page} ${styles.cover}`}>
      <div className={styles.coverArt}>{cover}</div>
      <div><p>낭만한줄 · 나만의 동화</p><h2 id="current-book-title" tabIndex={-1} style={{fontSize:'1.5em'}}>{book.title}</h2></div>
    </div>:<h2 id="current-book-title" tabIndex={-1} style={{fontSize:'1.5em'}}>{book.title}</h2>}

    {book.qualityProfile===storyQualityProfile?<StoryBookSpreads book={book} artAt={artAt}/>:book.chapters.map((chapter,index)=>{
      const scene=artAt?.(index+1,ratio=>setRatios(previous=>previous[index]===ratio?previous:{...previous,[index]:ratio}));
      const placement=fitPlacement(layout[index],ratios[index]);
      return <section key={index} data-placement={scene?placement:undefined} className={scene?styles.spread:styles.plain}>
        <div className={styles.copy} id={'book-chapter-'+index} tabIndex={-1}>
          <p>{chapter.text}</p>
        </div>
        {scene&&<div className={styles.scene}>{scene}</div>}
      </section>;
    })}
    <small>{book.note}</small>
  </div>;
}

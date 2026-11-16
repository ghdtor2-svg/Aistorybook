import type {Book} from './books';
import {storyBodyPageCount} from './quality';

export type StoryPagePart={text:string;chapterIndex:number;paragraphIndex:number};
export type StoryPage={parts:StoryPagePart[]};
export type StoryArtScene={text:string;label:string;pageIndices:number[]};
export type StorySpread={pageIndices:number[];artIndices:number[];shared:boolean};

/** 문장을 쪼개지 않고 쪽별 분량을 맞춥니다. 짧은 원고는 빈 쪽을 허용합니다. */
export function planStoryPages(chapters:Pick<Book,'chapters'>['chapters'],pageCount=storyBodyPageCount):StoryPage[]{
  if(!Number.isInteger(pageCount)||pageCount<1)throw Error('Invalid page count');
  const segmenter=new Intl.Segmenter('ko',{granularity:'sentence'});
  const units:StoryPagePart[]=[];
  chapters.forEach((chapter,chapterIndex)=>{
    chapter.text.split(/\n\s*\n/).forEach((paragraph,paragraphIndex)=>{
      for(const sentence of segmenter.segment(paragraph)){
        if(sentence.segment.trim())units.push({text:sentence.segment,chapterIndex,paragraphIndex});
      }
    });
  });
  // 줄바꿈/빈 줄만으로 미완성 문장이 새 쪽으로 넘어가지 않게 묶습니다.
  const sentences:StoryPagePart[][]=[];
  for(const unit of units){
    const previous=sentences[sentences.length-1];
    const last=previous?.[previous.length-1];
    if(last&&last.chapterIndex===unit.chapterIndex&&!/[.!?…。！？][”’"'）)\]]*\s*$/.test(last.text))previous.push(unit);
    else sentences.push([unit]);
  }
  const lengthOf=(sentence:StoryPagePart[])=>sentence.reduce((sum,part)=>sum+part.text.length,0);
  const pages:StoryPage[]=[];
  const populated=Math.min(pageCount,sentences.length);
  let start=0;
  let remaining=sentences.reduce((sum,sentence)=>sum+lengthOf(sentence),0);
  for(let index=0;index<pageCount;index++){
    const parts:StoryPagePart[]=[];
    if(index<populated){
      const pagesLeft=populated-index,target=remaining/pagesLeft;
      const limit=sentences.length-pagesLeft+1;
      let end=start,length=0;
      while(end<limit){
        const next=lengthOf(sentences[end]);
        if(end>start&&Math.abs(length-target)<=Math.abs(length+next-target))break;
        length+=next;end++;
      }
      if(pagesLeft===1){end=sentences.length;length=remaining;}
      for(const unit of sentences.slice(start,end).flat()){
        const last=parts[parts.length-1];
        if(last&&last.chapterIndex===unit.chapterIndex&&last.paragraphIndex===unit.paragraphIndex)last.text+=unit.text;
        else parts.push({...unit});
      }
      start=end;remaining-=length;
    }
    pages.push({parts});
  }
  return pages;
}

export function planStorybook(book:Book){
  const pages=planStoryPages(book.chapters);
  // Prefer separate illustrations where the narrative crosses a chapter boundary.
  let transition=7;
  let distance=Infinity;
  for(let index=0;index<15;index++){
    const left=pages[index*2].parts,right=pages[index*2+1].parts;
    if(left.length&&right.length&&left[left.length-1].chapterIndex!==right[0].chapterIndex&&Math.abs(index-7)<distance){
      transition=index;
      distance=Math.abs(index-7);
    }
  }
  const scenes:StoryArtScene[]=[];
  const spreads:StorySpread[]=[];
  function addScene(pageIndices:number[]){
    const text=pageIndices.map(index=>pages[index].parts.map(part=>part.text).join('\n')).join('\n');
    const label=pageIndices.length===2?(pageIndices[0]+1)+'~'+(pageIndices[1]+1)+'쪽 장면':(pageIndices[0]+1)+'쪽 장면';
    scenes.push({text,label,pageIndices});
    return scenes.length;
  }
  for(let index=0;index<16;index++){
    const pageIndices=[index*2,index*2+1];
    const shared=pageIndices.length===2&&index!==transition;
    const artIndices=shared?[addScene(pageIndices)]:pageIndices.map(page=>addScene([page]));
    spreads.push({pageIndices,artIndices,shared});
  }
  return {pages,spreads,scenes};
}

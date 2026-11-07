import type {Book} from './books';
import {storyPageCount} from './quality';

export type StoryPagePart={text:string;chapterIndex:number;paragraphIndex:number};
export type StoryPage={parts:StoryPagePart[]};
export type StoryArtScene={text:string;label:string;pageIndices:number[]};
export type StorySpread={pageIndices:number[];artIndices:number[];shared:boolean};

function textBoundary(text:string,position:number){
  const code=text.charCodeAt(position);
  return code>=0xDC00&&code<=0xDFFF?position-1:position;
}

export function planStorybook(book:Book){
  const pageCount=storyPageCount-1;
  const segmenter=new Intl.Segmenter('ko',{granularity:'sentence'});
  const units:StoryPagePart[]=[];
  book.chapters.forEach((chapter,chapterIndex)=>{
    chapter.text.split(/\n\s*\n/).forEach((paragraph,paragraphIndex)=>{
      for(const sentence of segmenter.segment(paragraph)){
        let text=sentence.segment;
        while(text.length>190){
          const space=text.lastIndexOf(' ',160);
          const split=textBoundary(text,space>60?space+1:160);
          units.push({text:text.slice(0,split),chapterIndex,paragraphIndex});
          text=text.slice(split);
        }
        if(text.trim())units.push({text,chapterIndex,paragraphIndex});
      }
    });
  });
  while(units.length<pageCount){
    const longest=units.reduce((chosen,unit,index)=>unit.text.length>(units[chosen]?.text.length||0)?index:chosen,0);
    const unit=units[longest];
    if(!unit||unit.text.length<2)break;
    const middle=Math.floor(unit.text.length/2);
    const space=unit.text.lastIndexOf(' ',middle);
    const split=textBoundary(unit.text,space>middle/2?space+1:middle);
    if(split===0)break;
    units.splice(longest,1,{...unit,text:unit.text.slice(0,split)},{...unit,text:unit.text.slice(split)});
  }
  const pages:StoryPage[]=[];
  let start=0;
  let remaining=units.reduce((sum,unit)=>sum+unit.text.length,0);
  for(let index=0;index<pageCount;index++){
    const pagesLeft=pageCount-index;
    const target=remaining/pagesLeft;
    const limit=Math.max(start+1,units.length-pagesLeft+1);
    let end=start,length=0;
    while(end<units.length&&end<limit){
      const next=units[end].text.length;
      if(end>start&&Math.abs(length-target)<=Math.abs(length+next-target))break;
      length+=next;
      end++;
    }
    if(index===pageCount-1){end=units.length;length=units.slice(start).reduce((sum,unit)=>sum+unit.text.length,0);}
    const parts:StoryPagePart[]=[];
    for(const unit of units.slice(start,end)){
      const last=parts[parts.length-1];
      if(last&&last.chapterIndex===unit.chapterIndex&&last.paragraphIndex===unit.paragraphIndex)last.text+=unit.text;
      else parts.push({...unit});
    }
    pages.push({parts});
    start=end;
    remaining-=length;
  }
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
    const pageIndices=index===15?[30]:[index*2,index*2+1];
    const shared=pageIndices.length===2&&index!==transition;
    const artIndices=shared?[addScene(pageIndices)]:pageIndices.map(page=>addScene([page]));
    spreads.push({pageIndices,artIndices,shared});
  }
  return {pages,spreads,scenes};
}

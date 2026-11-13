/**
 * 동화 본문에서 크게 보여 줄 부분을 규칙으로 찾습니다. AI 호출이 없고 글은 바꾸지 않습니다.
 * - speech: 인물이 하는 말("…", “…”)
 * - sound: 소리·모양을 흉내 내는 반복말(두근두근, 살랑살랑, 째깍째깍처럼 두 글자가 두 번 이어지는 말)
 * - plain: 그 밖의 이야기 글
 * 조각들을 이어 붙이면 언제나 원래 글과 똑같습니다.
 * 한 문단이 여러 쪽으로 나뉘어 대사가 쪽을 넘어가면, 앞 조각의 endsInSpeech를 다음 조각의 inSpeech로 넘깁니다.
 */
export type EmphasisKind='plain'|'speech'|'sound';
export type EmphasisPiece={text:string;kind:EmphasisKind};

const sound=/([가-힣]{2})\1/g;

function sounds(text:string,pieces:EmphasisPiece[]){
  let at=0;
  for(const match of text.matchAll(sound)){
    const index=match.index??0;
    if(index>at)pieces.push({text:text.slice(at,index),kind:'plain'});
    pieces.push({text:match[0],kind:'sound'});
    at=index+match[0].length;
  }
  if(at<text.length)pieces.push({text:text.slice(at),kind:'plain'});
}

export function emphasize(text:string,inSpeech=false):{pieces:EmphasisPiece[];endsInSpeech:boolean}{
  const pieces:EmphasisPiece[]=[];
  let start=0,speaking=inSpeech;
  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(!speaking&&(character==='"'||character==='“')){
      sounds(text.slice(start,index),pieces);
      start=index;speaking=true;
    }else if(speaking&&(character==='"'||character==='”')){
      pieces.push({text:text.slice(start,index+1),kind:'speech'});
      start=index+1;speaking=false;
    }
  }
  if(start<text.length){
    if(speaking)pieces.push({text:text.slice(start),kind:'speech'});
    else sounds(text.slice(start),pieces);
  }
  return {pieces,endsInSpeech:speaking};
}

/** 쪽마다 나뉜 본문 조각에 강조를 매깁니다. 같은 문단 안에서는 쪽을 넘어간 대사도 이어서 강조합니다. */
export function emphasizePages(pages:{parts:{text:string;chapterIndex:number;paragraphIndex:number}[]}[]):EmphasisPiece[][][]{
  let paragraph='',speaking=false;
  return pages.map(page=>page.parts.map(part=>{
    const key=part.chapterIndex+':'+part.paragraphIndex;
    if(key!==paragraph){paragraph=key;speaking=false;}
    const result=emphasize(part.text,speaking);
    speaking=result.endsInSpeech;
    return result.pieces;
  }));
}

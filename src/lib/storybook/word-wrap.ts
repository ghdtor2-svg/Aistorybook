/** 줄은 공백에서만 바꾸며, 긴 어절도 음절로 나누지 않습니다. */
export function wrapText(measure:(text:string)=>number,text:string,width:number){
  const lines:string[]=[];
  for(const raw of text.split('\n')){
    let line='';
    for(const token of raw.match(/\S+\s*/g)||['']){
      if(line.trim()&&measure((line+token).trimEnd())>width){
        lines.push(line.trimEnd());line='';
      }
      line+=token;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** 강조 경계가 어절 중간에 있어도 같은 어절을 한 줄에 둡니다. */
export function wordGroups<T extends {text:string}>(pieces:T[]):T[][]{
  const groups:T[][]=[];
  let group:T[]=[];
  for(const piece of pieces){
    for(const text of piece.text.match(/\S+\s*|\s+/g)||[]){
      group.push({...piece,text});
      if(/\s$/.test(text)){groups.push(group);group=[];}
    }
  }
  if(group.length)groups.push(group);
  return groups;
}

// 선택지는 사용자가 직접 고른 문구만 답변에 넣는다. 고르지 않은 항목을 추측해 채우지 않으며 선택은 다시 눌러 해제할 수 있다.
export type ChoiceGroup={label:string;options:string[]};
export const CHOICE_SEPARATOR=', ';
export const MAX_DIRECT_CHOICE_LENGTH=200;
const SEPARATORS=[',','\n'];
const trimHead=(value:string)=>value.replace(/[ \t]+$/,'');
const trimTail=(value:string)=>value.replace(/^[ \t]+/,'');
// 구분자는 쉼표와 줄바꿈만 쓴다. 가운뎃점은 '이모·고모'처럼 선택지 문구에 들어가므로 구분자로 보지 않는다.
// 구분자나 문장 끝으로 둘러싸인 조각만 같은 선택으로 본다. '분홍'이 '분홍 리본' 안에서 선택으로 잡히지 않게 한다.
function locate(text:string,target:string){
 if(!target)return -1;
 for(let at=text.indexOf(target);at>=0;at=text.indexOf(target,at+1)){
  const head=trimHead(text.slice(0,at)),tail=trimTail(text.slice(at+target.length));
  if((!head||SEPARATORS.includes(head[head.length-1]))&&(!tail||SEPARATORS.includes(tail[0])))return at;
 }
 return -1;
}
export function isChosen(text:string,phrase:string){return locate((text||'').trim(),phrase.trim())>=0;}
export function addChoice(text:string,phrase:string,limit=4000){
 const value=(text||'').trim(),target=phrase.trim();
 if(!target||locate(value,target)>=0)return value;
 const merged=value?value+CHOICE_SEPARATOR+target:target;
 return merged.length>limit?value:merged;
}
export function toggleChoice(text:string,phrase:string,limit=4000){
 const value=(text||'').trim(),target=phrase.trim();
 const at=locate(value,target);
 if(at<0)return addChoice(value,target,limit);
 let start=at,end=at+target.length;
 const tail=value.slice(end).match(/^[ \t]*,[ \t]*/);
 if(tail)end+=tail[0].length;
 else{const head=value.slice(0,start).match(/[ \t]*,[ \t]*$/);if(head)start-=head[0].length;}
 return (value.slice(0,start)+value.slice(end)).trim();
}
export function chosenCount(text:string){return (text||'').split(/\s*,\s*|\n+/).filter(part=>part.trim()).length;}
// 고를 수 있는 답이 있는 질문에만 보기를 둔다. 실제 기억과 구체적인 줄거리를 묻는 질문은 보기 없이 직접 쓰게 한다.
// 보기를 두지 않는 핵심 항목: memorableEvent(실제 기억). 보기를 두지 않는 선택 질문: goalAndObstacle, heroChoice, motifAndEnding(구체적인 줄거리).
const coreChoices:Record<string,ChoiceGroup[]>={
 recipient:[{label:'누구에게 주는 동화인가요?',options:['딸','아들','조카','손주','동생','친구','배우자','제자','나 자신']}],
 protagonist:[{label:'주인공으로 세우고 싶은 사람',options:['선물 받는 아이','아이와 가족','아이와 동물 친구','아이와 단짝 친구','나와 아이 둘']}],
 relationship:[{label:'나와 어떤 사이인가요?',options:['엄마','아빠','할머니','할아버지','이모·고모','삼촌·외삼촌','언니·오빠','누나·형','선생님','친구']}],
 emotions:[{label:'그때 들었던 마음',options:['기뻤어요','뭉클했어요','자랑스러웠어요','고마웠어요','설렜어요','안심했어요','웃음이 났어요','미안했어요','아쉬웠어요','걱정됐어요','서운했어요']}],
 specialDetails:[
  {label:'좋아하는 것',options:['공룡','자동차','공주와 요정','그림 그리기','춤과 노래','블록 놀이','책 읽기','물놀이','축구','고양이','강아지','딸기']},
  {label:'성격이나 모습',options:['씩씩해요','수줍어요','호기심이 많아요','다정해요','장난꾸러기예요','꼼꼼해요','잘 웃어요','고집이 있어요','마음이 약해요']}],
 message:[{label:'전하고 싶은 마음',options:['사랑한다고','자랑스럽다고','고맙다고','늘 네 곁에 있다고','너답게 자라도 괜찮다고','실수해도 괜찮다고','용기를 내도 괜찮다고','건강하게 자라길 바란다고','함께한 시간이 소중하다고']}]};
export function coreQuestionChoices(question:{target:string}):ChoiceGroup[]{return coreChoices[question.target]??[];}
const designChoices:Record<string,ChoiceGroup[]>={
 readingExperience:[
  {label:'읽을 아이의 나이',options:['3~4세','5~6세','7~8세','9세 이상']},
  {label:'읽는 방법',options:['어른이 읽어 주기','함께 읽기','혼자 읽기']},
  {label:'원하는 분위기',options:['포근한','즐겁고 웃긴','씩씩한 모험','잔잔하고 따뜻한','신비로운','용기를 주는']}],
 characters:[
  {label:'주인공 구성',options:['사람 아이 혼자','사람 아이와 동물 친구','아기 동물 친구','아이와 가족','친구 둘']},
  {label:'그림이 바뀌어도 같아야 할 고유색',options:['분홍','노랑','하늘색','초록','보라','빨강','주황','하양']},
  {label:'늘 지니는 물건',options:['작은 가방','인형','모자','망토','목도리','우산','손전등','없어요']}],
 worldRules:[
  {label:'이야기의 배경',options:['우리 동네','숲속','바닷가','하늘 위','눈 내리는 마을','꿈속','시골 할머니 집','도서관']},
  {label:'어디까지 상상해도 될까요?',options:['현실 그대로','조금 신비로운','마법이 있는 세계','동물이 말하는 세계']},
  {label:'계절과 시간',options:['봄','여름','가을','겨울','아침','낮','저녁','밤']}],
 emotionalJourney:[
  {label:'처음의 마음',options:['걱정돼요','쑥스러워요','서운해요','궁금해요','신나요','답답해요']},
  {label:'마지막의 마음',options:['뿌듯해요','든든해요','고마워요','홀가분해요','설레요','편안해요']}],
 visualScenes:[
  {label:'그림으로 보고 싶은 순간',options:['출발하는 장면','처음 만나는 장면','길을 잃는 장면','함께 힘을 모으는 장면','가장 긴장되는 순간','환하게 웃는 마지막 장면']},
  {label:'그림의 느낌',options:['넓은 풍경','가까운 표정','밤하늘','비 오는 날','환한 햇살','노을','눈 내리는 날']}],
 boundaries:[
  {label:'그대로 지킬 것',options:['실제 가족 관계','아이의 이름','실제로 있었던 장소','실제 반려동물']},
  {label:'피하고 싶은 것',options:['무서운 장면','슬픈 이별','다치는 장면','다투는 장면','어둡고 깜깜한 장면','혼자 남는 장면','없어요']}]};
export function designQuestionChoices(field:string):ChoiceGroup[]{return designChoices[field]??[];}

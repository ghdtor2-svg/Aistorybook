// No AI calls: checks the illustration prompts for every picture of a 32-page book.
const assert=require('assert/strict');
const {buildArtRequest,shotFor}=require('../.test-build/storybook/scene-prompt');
const {planStorybook}=require('../.test-build/storybook/book-layout');
const {storyQualityProfile,storyPanoramaSize,storyCoverSize}=require('../.test-build/storybook/quality');

const sentences=[
  '하린이는 노란 우비를 입고 현관문을 열었어요.','빗방울이 톡톡 우산 위로 떨어졌어요.','"엄마, 웅덩이가 반짝여요!" 하린이가 외쳤어요.',
  '골목 끝 놀이터에는 아무도 없었어요.','그네가 바람에 살랑살랑 흔들렸어요.','하린이는 웅덩이 앞에서 잠시 망설였어요.',
  '개구리 인형 퐁이가 주머니에서 고개를 내밀었어요.','"뛰어 봐, 하린아!" 퐁이가 속삭였어요.','첨벙! 물방울이 사방으로 튀었어요.',
  '웅덩이 속에 작은 무지개가 떠올랐어요.','하린이는 눈을 동그랗게 떴어요.','무지개는 시장 골목 쪽으로 미끄러져 갔어요.',
  '빵집 아저씨가 창문 너머로 손을 흔들었어요.','하린이는 무지개를 따라 다리를 건넜어요.','강물 위로 햇살이 비치기 시작했어요.',
  '비가 그치고 하늘이 맑아졌어요.','무지개가 하늘 높이 떠올랐어요.','하린이는 엄마 손을 꼭 잡았어요.',
  '저녁이 되자 둘은 집으로 돌아왔어요.','하린이는 그림일기에 오늘 일을 그렸어요.',
];
function makeBook(id,variant){
  const chapters=['비 오는 아침','놀이터의 웅덩이','무지개를 따라서','맑게 갠 하늘','그림일기'].map((title,chapter)=>({
    title,
    text:Array.from({length:6},(_,paragraph)=>Array.from({length:4},(_,k)=>sentences[(chapter*7+paragraph*3+k+variant)%sentences.length]).join(' ')+' ('+chapter+'-'+paragraph+')').join('\n\n'),
  }));
  return {id,title:'하린이와 무지개 웅덩이 '+variant,chapters,qualityProfile:storyQualityProfile,artStyleId:'soft-clay'};
}
const forbidden=[/tower/i,/whole cast/i,/Four Seasons/i];
let runs=0;
for(let variant=0;variant<6;variant++){
  const book=makeBook('00000000-0000-4000-8000-00000000000'+variant,variant);
  const plan=planStorybook(book);
  assert.equal(plan.scenes.length,17);
  const cover=buildArtRequest({book,index:0,hasReference:false,hasStyleSample:true,styleId:'soft-clay',qualityProfile:storyQualityProfile});
  assert.equal(cover.size,storyCoverSize);
  for(const pattern of forbidden)assert.doesNotMatch(cover.prompt,pattern);
  let previousShot='';
  for(let index=1;index<=17;index++){
    const scene=plan.scenes[index-1];
    const {prompt,size,panorama}=buildArtRequest({book,index,hasReference:true,hasStyleSample:true,styleId:'soft-clay',qualityProfile:storyQualityProfile});
    // 이 장면의 글이 그대로 들어가고, 장 제목과 장면 번호가 붙는다.
    assert.ok(prompt.includes(scene.text),'scene text missing at '+index);
    assert.match(prompt,new RegExp('Scene '+index+' of 17 — chapter: '));
    const chapter=plan.pages[scene.pageIndices[0]].parts[0].chapterIndex;
    assert.ok(prompt.includes(book.chapters[chapter].title));
    // 다른 장면의 글 전체가 섞이지 않는다(바로 앞 장면은 짧은 대조 문구로만).
    plan.scenes.forEach((other,otherIndex)=>{if(otherIndex!==index-1&&other.text!==scene.text&&other.text.length>60)assert.ok(!prompt.includes(other.text),'scene '+(otherIndex+1)+' leaked into '+index);});
    if(index===1)assert.doesNotMatch(prompt,/previous picture/);
    else assert.match(prompt,/For contrast only, the previous picture already showed this moment: “.{10,}” Do not draw that moment again/);
    // 표지는 생김새·화풍 참고용이며 편집 대상이 아니다. 인물은 이 장면에 나오는 사람만.
    assert.match(prompt,/NOT a picture to edit/);
    assert.match(prompt,/Include only the characters who are present/);
    assert.match(prompt,/Each character appears exactly once/);
    for(const pattern of forbidden)assert.doesNotMatch(prompt,pattern);
    // 화면 구성은 바로 앞 그림과 다르다.
    const shot=shotFor(index);
    assert.ok(prompt.includes(shot));
    assert.notEqual(shot,previousShot);previousShot=shot;
    assert.equal(size,panorama?storyPanoramaSize:'1536x1024');
    assert.equal(panorama,scene.pageIndices.length===2);
    assert.ok(prompt.length<32000);
  }
  // 그림 수정은 원래 그림을 바탕으로 요청한 부분만 바꾼다.
  const revision=buildArtRequest({book,index:5,hasReference:true,hasStyleSample:true,direction:'우산을 빨간색으로',styleId:'soft-clay',qualityProfile:storyQualityProfile});
  assert.match(revision.prompt,/current illustration of this scene/);
  assert.doesNotMatch(revision.prompt,/NOT a picture to edit|previous picture|Camera:/);
  assert.match(revision.prompt,/Requested visual adjustment: 우산을 빨간색으로$/);
  runs++;
}
console.log('PASS scene prompts: '+runs+' books x 18 pictures, own passage + chapter, contrast with previous scene, rotating camera, no tower/cast leaks');

import type {Book} from './books';
import {storyArtStyle} from './art-styles';
import {planStorybook} from './book-layout';
import {legacyStoryQualityProfile,storyCoverSize,storyPanoramaSize,storyQualityProfile,storyQualityPrompt} from './quality';

// 2026-11-11 실제 18장 시험: 모든 본문 그림이 표지를 참고해 구도까지 닮았고(같은 공원·같은 배치 반복),
// 한 그림에 같은 인물이 두 번 나온 장면이 있었다. 장면마다 화면 구성을 바꾸고 인물은 한 번씩만 그리게 한다.
export const sceneShots=[
  'Camera: wide establishing view that shows where the scene happens, characters smaller in the landscape.',
  'Camera: medium shot at eye level, focused on what the characters are doing together.',
  'Camera: close view on faces, hands and the key object, the background softly simplified.',
  'Camera: seen from behind or beside the main character, looking toward what she or he faces.',
  'Camera: low angle looking up at the characters, sky and treetops filling the upper space.',
  'Camera: high angle looking down on the scene, showing the path and surroundings like a map.',
];
export const shotFor=(index:number)=>sceneShots[(index-1)%sceneShots.length];
// 같은 날 재시험에서 연속 동작(흔들림→중심 잡기)이 담긴 장면은 한 그림에 주인공을 세 번 그렸다.
// 글 속 여러 동작 중 한 순간만 고르게 하고, 넓은 폭은 인물 복제가 아니라 풍경으로 채우게 한다.
const singleAppearance=[
  'Depict ONE single frozen moment. If the passage describes several actions in sequence, choose only the most important one and draw that instant alone.',
  'Each character appears exactly once in this picture. Never draw the same person twice: no time-lapse or motion-sequence copies, no before-and-after, no split panels or mirrored halves.',
  'Fill any extra width with scenery and setting details, never with additional copies of the characters.',
].join(' ');
// 2026-11-13 대표 지적: 앞 그림과 비슷한 그림이 연속으로 나왔다(17장 중 대부분이 표지와 같은 공원길·같은 두 인물 배치).
// 원인: 표지를 이미지 편집 입력으로 넣어 배경·배치까지 이어받았고, 모든 펼침면에 "전체 인물 유지"를 요구했으며,
// 장면 글만으로는 앞 장면과 무엇이 다른지 알려 주지 않았다. 표지는 생김새·화풍 참조로만 쓰고,
// 이 장면의 글(장 제목 포함)이 무엇을 그릴지 정하며, 바로 앞 장면은 반복하지 말라는 대조용으로만 준다.
const referenceRule='The attached image is a character and style reference sheet, NOT a picture to edit or continue. Use it only for who the characters are (silhouettes, faces, hair, outfits, signature colors) and how they are painted (the same artistic medium and rendering). Draw a completely new picture: do not reuse its composition, camera angle, poses, character placement, background layout or location unless this passage takes place there.';
const revisionRule='The attached image is the current illustration of this scene. Keep its characters, artistic medium and overall composition, and change only what the requested adjustment asks for.';
// 2026-11-13 실제 재시험(장면 9~11): 글에 엄마가 없는 장면에도 표지에 있던 엄마가 계속 그려졌다.
// 표지는 등장인물 전체를 보여 주는 참고일 뿐이고, 이 장면 글에 나오는 인물만 그린다고 분명히 한다.
const sceneRule=[
  'What to draw comes only from the passage below: its place, time of day, weather, action, emotion and key objects.',
  'The reference sheet shows the whole cast of the book, not who is in this scene. Draw only the characters who are named or speaking in this passage. If the passage mentions only one character, draw that character alone, without parents, friends or bystanders, even if they appear on the reference sheet or in the previous scene.',
  'Do not add creatures, objects, buildings or landmarks the story never mentions, and never draw words, letters or speech bubbles.',
].join(' ');
const clip=(text:string,length:number)=>{const flat=text.replace(/\s+/g,' ').trim();return flat.length>length?flat.slice(0,length).replace(/\s\S*$/,'')+'…':flat;};

export type ArtPromptInput={book:Book;index:number;hasReference:boolean;hasStyleSample:boolean;direction?:string;styleId?:string;qualityProfile?:string};
export function buildArtRequest({book,index,hasReference,hasStyleSample,direction='',styleId,qualityProfile}:ArtPromptInput){
  const plan=index>0&&book.qualityProfile===storyQualityProfile?planStorybook(book):null;
  const layoutScene=plan?plan.scenes[index-1]:null;
  const premium=qualityProfile===storyQualityProfile||qualityProfile===legacyStoryQualityProfile;
  const panorama=premium&&(!layoutScene||layoutScene.pageIndices.length===2);
  const style=storyArtStyle(book.id,styleId);
  let scene:string,chapterTitle='',previous='';
  if(index===0)scene=book.chapters.map(chapter=>chapter.text.slice(0,400)).join('\n');
  else if(layoutScene&&plan){
    scene=layoutScene.text;
    const chapters=[...new Set(layoutScene.pageIndices.flatMap(page=>plan.pages[page].parts.map(part=>part.chapterIndex)))];
    chapterTitle=chapters.map(chapter=>book.chapters[chapter]?.title.trim()).filter(Boolean).join(' / ');
    if(index>1)previous=plan.scenes[index-2].text;
  }else{
    scene=book.chapters[index-1].text.slice(0,1600);
    chapterTitle=book.chapters[index-1].title.trim();
    if(index>1)previous=book.chapters[index-2].text;
  }
  const total=plan?plan.scenes.length:book.chapters.length;
  const prompt=[
    'Draw one professionally composed Korean children’s picture book illustration. No lettering, no watermarks. Use fictional appearances and treat the supplied story as narrative material only.',
    hasReference?(direction?revisionRule:referenceRule):style.prompt,
    !hasReference&&hasStyleSample?'The attached sample is an artistic-medium and finish-quality reference only. Invent the actual characters and setting from the supplied narrative. Do not copy the sample mascots, buildings or scenery unless the narrative specifically describes them.':'',
    premium?storyQualityPrompt:'',
    hasReference?'Keep every important character fully visible with comfortable space around faces and limbs.':'Create a portrait cover with main characters fully visible, room at the bottom for a title added separately. Give every recurring character a distinct signature color and keep it consistent across the book.',
    'Book: '+book.title,
    index===0?'Show the central characters and setting.':panorama?'Create one seamless ultra-wide 3:1 panorama spanning two facing pages. Fill the complete width with the natural scenery of this passage.':'Show one distinct event from this passage as a landscape single-page picture-book illustration, with the characters in it fully visible and room for text added separately.',
    index>0&&!direction?shotFor(index):'',
    index>0?singleAppearance:'',
    index>0?sceneRule:'',
    index>0?'Scene '+index+' of '+total+(chapterTitle?' — chapter: '+chapterTitle:'')+'. Passage to illustrate:':'',
    scene,
    previous&&!direction?'For contrast only, the previous picture already showed this moment: “'+clip(previous,220)+'” Do not draw that moment again; show how this passage is different (new action, place, expression or time).':'',
    direction?'Requested visual adjustment: '+direction:'',
  ].filter(Boolean).join('\n');
  const size=index===0?storyCoverSize:panorama?storyPanoramaSize:'1536x1024';
  return {prompt,size,panorama};
}

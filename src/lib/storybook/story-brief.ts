import {fields,labels,type StoryProfile} from './engine';

// Includes all confirmed summary fields and permitted fictional additions.
export const MAX_STORY_BRIEF_LENGTH=100_000;
export const MAX_STORY_REQUEST_LENGTH=MAX_STORY_BRIEF_LENGTH*6+1000;

export function storyBrief(profile:StoryProfile){
  const brief=fields.map(field=>labels[field]+': '+profile[field]).join('\n')
    +'\n허용된 각색: '+profile.fictionalElements;
  if(brief.length>MAX_STORY_BRIEF_LENGTH)throw Error('확인한 이야기 소재가 너무 길어요. 요약을 줄인 뒤 다시 시도해 주세요. 내용은 잘라 보내지 않았습니다.');
  return brief;
}

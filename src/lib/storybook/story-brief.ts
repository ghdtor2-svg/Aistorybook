import {fields,labels,type StoryProfile} from './engine';
import {designFields,designLabels,parseStoryDesign,storyCraftInstructions} from './story-design';

// Includes all confirmed summary fields and permitted fictional additions.
export const MAX_STORY_BRIEF_LENGTH=100_000;
export const MAX_STORY_REQUEST_LENGTH=MAX_STORY_BRIEF_LENGTH*6+1000;

export function storyBrief(profile:StoryProfile){
  const design=parseStoryDesign(profile.storyDesign);
  const brief='【제작 기준】\n'+storyCraftInstructions+'\n\n【사용자가 확인한 소재】\n'
    +fields.map(field=>labels[field]+': '+profile[field]).join('\n')
    +'\n허용된 각색: '+profile.fictionalElements
    +'\n\n【사용자가 선택한 이야기 설계】\n'
    +designFields.map(field=>designLabels[field]+': '+(design[field]?.trim()||'(제공하지 않음 - 실제 정보로 추측하지 않기)')).join('\n');
  if(brief.length>MAX_STORY_BRIEF_LENGTH)throw Error('확인한 이야기 소재가 너무 길어요. 요약을 줄인 뒤 다시 시도해 주세요. 내용은 잘라 보내지 않았습니다.');
  return brief;
}

import {fields,newProfile,rebuild,submitAnswer,type StoryProfile} from './engine';
export const STORAGE_KEY='ai-office:storybook:v1';
export type SavedStory={profile:StoryProfile;draft:string;editingId:string|null};
export interface StoryStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export function saveStory(storage:StoryStorage,story:SavedStory){storage.setItem(STORAGE_KEY,JSON.stringify({version:1,...story}));}
export function deleteStory(storage:StoryStorage){storage.removeItem(STORAGE_KEY);}
export function restoreStory(storage:StoryStorage):SavedStory|null {
 const raw=storage.getItem(STORAGE_KEY);if(!raw)return null;
 if(raw.length>200000)throw new Error('저장 용량 초과');
 const saved=JSON.parse(raw);const p=saved?.profile;
 if(saved.version!==1||!p||typeof p.storyId!=='string'||!Array.isArray(p.answers)||p.answers.length>15||!Number.isFinite(Date.parse(p.createdAt)))throw new Error('Invalid saved story');
 let profile={...newProfile(),storyId:p.storyId,createdAt:p.createdAt};
 // 저장된 질문 객체를 신뢰하지 않고 엔진으로 질문과 정보를 재구축합니다.
 for(const answer of p.answers){
  if(!profile.currentQuestion||answer?.question?.id!==profile.currentQuestion.id||typeof answer.text!=='string'||answer.text.length>4000||typeof answer.skipped!=='boolean')throw new Error('Invalid answer');
  profile=submitAnswer(profile,profile.currentQuestion,answer.text,answer.skipped);
 }
 if(p.summaryEdits&&typeof p.summaryEdits==='object'&&!profile.currentQuestion){
  for(const field of fields)if(typeof p.summaryEdits[field]==='string'&&p.summaryEdits[field].length<=4000)profile.summaryEdits[field]=p.summaryEdits[field];
 }
 profile.fictionalElements=typeof p.fictionalElements==='string'?p.fictionalElements.slice(0,4000):'';
 profile.updatedAt=typeof p.updatedAt==='string'&&Number.isFinite(Date.parse(p.updatedAt))?p.updatedAt:profile.updatedAt;
 if(p.completionStatus==='confirmed'&&!profile.currentQuestion)profile.completionStatus='confirmed';
 profile=rebuild(profile);
 const editingId=typeof saved.editingId==='string'&&profile.answers.some(a=>a.question.id===saved.editingId)?saved.editingId:null;
 return {profile,draft:typeof saved.draft==='string'?saved.draft.slice(0,4000):'',editingId};
}


import {STORAGE_KEY,type SavedStory,type StoryStorage} from './storage';
export const QUESTION_LOCK='ai-office:questions:v1';
export class QuestionConflictError extends Error{constructor(){super('다른 탭에서 질문을 변경하거나 삭제했습니다. 현재 작성본은 화면에 보존했습니다. 먼저 내려받은 뒤 최신 질문 저장본을 불러오세요.');}}
// All app question writers share QUESTION_LOCK; this comparison runs inside it.
export function questionJSON(value:SavedStory){return JSON.stringify({version:1,...value});}
export function changeQuestion(store:StoryStorage,expected:string|null,value:SavedStory|null):string|null{const current=store.getItem(STORAGE_KEY),next=value===null?null:questionJSON(value);if(current!==expected){if(value!==null&&current===next)return current;throw new QuestionConflictError();}if(next!==expected){if(next===null)store.removeItem(STORAGE_KEY);else store.setItem(STORAGE_KEY,next);}return next;}

import {isStoryArtStyleId,type StoryArtStyleId} from './art-styles';
import {legacyStoryQualityProfile,storyQualityProfile} from './quality';
export const BOOK_LIMIT=1000;
export type Book={id:string;title:string;chapters:{title:string;text:string}[];note:string;model:string;createdAt:string;artStyleId?:StoryArtStyleId;qualityProfile?:string;theme?:string;talkingPoints?:string[]};
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function text(value:unknown,limit:number):value is string{return typeof value==='string'&&value.length<=limit;}
// Editable books may have intentionally blank titles/text. Older metadata is optional.
export function parseBook(value:unknown):Book{
 if(!record(value)||!text(value.id,200)||!value.id||!text(value.title,10000)||!Array.isArray(value.chapters)||value.chapters.length<1||value.chapters.length>100)throw Error('동화 결과 형식이 올바르지 않습니다. 기존 책장은 보존했습니다.');
 const chapters=value.chapters.map(chapter=>{if(!record(chapter)||!text(chapter.title,10000)||!text(chapter.text,100000))throw Error('동화 장 내용이 올바르지 않습니다. 기존 책장은 보존했습니다.');return {title:chapter.title,text:chapter.text};});
 for(const name of ['note','model','createdAt'])if(value[name]!==undefined&&!text(value[name],10000))throw Error('동화 부가 정보가 올바르지 않습니다.');
 if(value.artStyleId!==undefined&&!isStoryArtStyleId(value.artStyleId))throw Error('동화의 그림 화풍을 확인해 주세요.');
 if(value.qualityProfile!==undefined&&value.qualityProfile!==storyQualityProfile&&value.qualityProfile!==legacyStoryQualityProfile)throw Error('동화의 제작 구성을 확인해 주세요.');
 return {id:value.id,title:value.title,chapters,note:(value.note as string|undefined)??'',model:(value.model as string|undefined)??'미확인',createdAt:(value.createdAt as string|undefined)??'',...(value.artStyleId?{artStyleId:value.artStyleId}:{}),...(value.qualityProfile?{qualityProfile:value.qualityProfile as string}:{}),...(typeof value.theme==='string'&&value.theme.length<=100?{theme:value.theme}:{}),...(Array.isArray(value.talkingPoints)?{talkingPoints:value.talkingPoints.filter((point):point is string=>typeof point==='string'&&point.length<=300).slice(0,5)}:{})};
}
export function parseBooks(raw:string|null):Book[]{
 if(raw===null)return [];if(raw.length>5000000)throw Error('책장 용량을 확인해 주세요. 원본은 보존했습니다.');
 const value:unknown=JSON.parse(raw);if(!Array.isArray(value))throw Error('책장 형식이 올바르지 않습니다.');if(value.length>BOOK_LIMIT)throw Error('책장은 최대 1,000권까지 보관할 수 있습니다. 현재 동화를 내려받고 기존 책장은 백업해 주세요.');const books=value.map(parseBook);if(new Set(books.map(b=>b.id)).size!==books.length)throw Error('중복된 동화 기록이 있습니다.');return books;
}
export function parseGeneratedBook(value:unknown,expectedId:string):Book{
 const book=parseBook(value);if(book.id!==expectedId||!book.title.trim()||book.title.length>160||book.chapters.length>8||book.chapters.some(c=>!c.text.trim()||c.text.length>10000))throw Error('생성 결과가 요청과 일치하지 않거나 완전하지 않습니다. 다시 생성하지 않고 기록을 보존했습니다.');return book;
}

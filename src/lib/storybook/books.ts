import {DEFAULT_THEME,isTheme} from './themes';
export const BOOK_LIMIT=1000;
/** 읽은 뒤 나눌 대화 질문의 개수와 길이 한도. 화면·내려받기·검사가 같은 숫자를 본다. */
export const TALKING_POINT_LIMIT=5,TALKING_POINT_LENGTH=300;
/**
 * theme 과 talkingPoints 는 나중에 추가한 항목이라 없을 수 있습니다.
 * 이미 책장에 있는 동화에는 둘 다 없습니다. 없으면 기본값으로 읽어
 * 기존 책장이 그대로 열리게 합니다(없다고 버리면 책장을 통째로 잃습니다).
 */
export type Book={id:string;title:string;chapters:{title:string;text:string}[];note:string;model:string;createdAt:string;theme:string;talkingPoints:string[]};
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function text(value:unknown,limit:number):value is string{return typeof value==='string'&&value.length<=limit;}
/**
 * 읽은 뒤 나눌 대화 질문. 없거나 형식이 어긋나면 빈 목록으로 읽습니다.
 *
 * 여기서 던지지 않는 이유: 대화 질문은 동화를 읽는 데 필요한 내용이 아닙니다.
 * 이것 때문에 책장 전체가 안 열리면 손해가 훨씬 큽니다. 빈칸이 되면
 * 화면에서 그 영역만 사라지고 동화는 그대로 읽힙니다.
 */
function parseTalkingPoints(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 return value.filter(item=>typeof item==='string'&&item.trim()&&item.length<=TALKING_POINT_LENGTH).slice(0,TALKING_POINT_LIMIT).map(item=>String(item));
}
// Editable books may have intentionally blank titles/text. Older metadata is optional.
export function parseBook(value:unknown):Book{
 if(!record(value)||!text(value.id,200)||!value.id||!text(value.title,10000)||!Array.isArray(value.chapters)||value.chapters.length<1||value.chapters.length>100)throw Error('동화 결과 형식이 올바르지 않습니다. 기존 책장은 보존했습니다.');
 const chapters=value.chapters.map(chapter=>{if(!record(chapter)||!text(chapter.title,10000)||!text(chapter.text,100000))throw Error('동화 장 내용이 올바르지 않습니다. 기존 책장은 보존했습니다.');return {title:chapter.title,text:chapter.text};});
 for(const name of ['note','model','createdAt'])if(value[name]!==undefined&&!text(value[name],10000))throw Error('동화 부가 정보가 올바르지 않습니다.');
 // 모르는 결이 저장돼 있어도 책을 버리지 않습니다. 기본값으로 읽습니다.
 const theme=isTheme(value.theme)?value.theme:DEFAULT_THEME;
 const talkingPoints=parseTalkingPoints(value.talkingPoints);
 return {id:value.id,title:value.title,chapters,note:(value.note as string|undefined)??'',model:(value.model as string|undefined)??'미확인',createdAt:(value.createdAt as string|undefined)??'',theme,talkingPoints};
}
export function parseBooks(raw:string|null):Book[]{
 if(raw===null)return [];if(raw.length>5000000)throw Error('책장 용량을 확인해 주세요. 원본은 보존했습니다.');
 const value:unknown=JSON.parse(raw);if(!Array.isArray(value))throw Error('책장 형식이 올바르지 않습니다.');if(value.length>BOOK_LIMIT)throw Error('책장은 최대 1,000권까지 보관할 수 있습니다. 현재 동화를 내려받고 기존 책장은 백업해 주세요.');const books=value.map(parseBook);if(new Set(books.map(b=>b.id)).size!==books.length)throw Error('중복된 동화 기록이 있습니다.');return books;
}
export function parseGeneratedBook(value:unknown,expectedId:string):Book{
 const book=parseBook(value);if(book.id!==expectedId||!book.title.trim()||book.title.length>160||book.chapters.length>8||book.chapters.some(c=>!c.text.trim()||c.text.length>10000))throw Error('생성 결과가 요청과 일치하지 않거나 완전하지 않습니다. 다시 생성하지 않고 기록을 보존했습니다.');return book;
}

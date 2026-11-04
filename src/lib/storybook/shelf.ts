import {parseBooks,parseBook,type Book} from './books';
export const BOOKS_KEY='ai-office:books:v1';
type Store={getItem(key:string):string|null;setItem(key:string,value:string):void};
// Validate the complete candidate before writing: individual valid books can exceed shelf bounds.
function writeShelf(store:Store,books:Book[]){const serialized=JSON.stringify(books);parseBooks(serialized);store.setItem(BOOKS_KEY,serialized);return books;}
export function changeBook(store:Store,expected:Book,value:Book|null):Book[]{
 const latest=parseBooks(store.getItem(BOOKS_KEY)),current=latest.find(b=>b.id===expected.id);
 if(!current||JSON.stringify(current)!==JSON.stringify(expected))throw Error('다른 탭에서 이 동화를 변경하거나 삭제했습니다. 현재 수정본은 화면에 보존했습니다. 내려받은 뒤 최신 책장을 불러오세요.');
 const next=value?latest.map(b=>b.id===expected.id?parseBook(value):b):latest.filter(b=>b.id!==expected.id);return writeShelf(store,next);
}
export function addBook(store:Store,value:Book):Book[]{const latest=parseBooks(store.getItem(BOOKS_KEY));if(latest.some(b=>b.id===value.id))return latest;const next=[parseBook(value),...latest];return writeShelf(store,next);}

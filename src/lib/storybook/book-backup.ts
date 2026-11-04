import {parseBooks,type Book} from './books';
export function exportBooks(books:Book[]){const checked=parseBooks(JSON.stringify(books));return JSON.stringify({format:'ai-office-books',version:1,exportedAt:new Date().toISOString(),books:checked},null,2);}
export function importBooks(raw:string):Book[]{if(raw.length>16000000)throw Error('백업 파일이 너무 큽니다.');const value=JSON.parse(raw);if(!value||value.format!=='ai-office-books'||value.version!==1||!Array.isArray(value.books))throw Error('이 앱의 책장 백업 파일을 선택해 주세요.');return parseBooks(JSON.stringify(value.books));}
export function mergeBooks(existing:Book[],incoming:Book[]){
 const current=parseBooks(JSON.stringify(existing)),source=parseBooks(JSON.stringify(incoming));const ids=new Map(current.map(b=>[b.id,b]));let duplicates=0,conflicts=0;const added:Book[]=[];
 for(const book of source){const old=ids.get(book.id);if(!old){added.push(book);continue;}if(JSON.stringify(old)===JSON.stringify(book))duplicates++;else conflicts++;}
 const books=parseBooks(JSON.stringify([...current,...added]));return {books,added:added.length,duplicates,conflicts};
}

export type BookImportRow={id:string;title:string;currentTitle?:string;state:'new'|'same'|'conflict'};
export function bookImportRows(existing:Book[],incoming:Book[]):BookImportRow[]{const current=parseBooks(JSON.stringify(existing)),source=parseBooks(JSON.stringify(incoming)),ids=new Map(current.map(book=>[book.id,book]));return source.map(book=>{const old=ids.get(book.id);return {id:book.id,title:book.title,currentTitle:old?.title,state:!old?'new':JSON.stringify(old)===JSON.stringify(book)?'same':'conflict'};});}

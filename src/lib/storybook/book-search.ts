import type {Book} from './books';
const normalized=(text:string)=>text.normalize('NFKC').toLocaleLowerCase('ko').trim();
export function searchBooks(books:Book[],query:string,sort:'stored'|'title'='stored'){
 const terms=normalized(query).split(/\s+/).filter(Boolean);const filtered=books.filter(book=>{const text=normalized([book.title,...book.chapters.flatMap(c=>[c.title,c.text])].join(' '));return terms.every(term=>text.includes(term));});
 return sort==='title'?filtered.sort((a,b)=>a.title.localeCompare(b.title,'ko')):filtered;
}

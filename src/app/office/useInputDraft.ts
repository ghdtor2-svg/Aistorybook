'use client';
import {useEffect,useRef,useState} from 'react';import {readInputDraft} from '../../lib/office/input-draft';
export function useInputDraft(key:string,limit:number){
 const values=useRef<Record<string,string>>({}),loaded=useRef(new Set<string>()),failed=useRef(new Set<string>());const [cache,setCache]=useState<Record<string,string>>({}),[errors,setErrors]=useState<Record<string,string>>({});
 function error(source:string){failed.current.add(source);setErrors(old=>({...old,[source]:'입력 내용을 이 탭에 보관하지 못했습니다. 현재 작성본을 TXT로 내려받아 보관하세요. 기존 저장 원문은 바꾸지 않았습니다.'}));}
 function load(){if(loaded.current.has(key))return;loaded.current.add(key);try{values.current={...values.current,[key]:readInputDraft(sessionStorage,key,limit)};setCache(values.current);}catch{error(key);}}
 useEffect(()=>{load();},[key]);
 function write(text:string,manual=false){if(text.length>limit)return;load();values.current={...values.current,[key]:text};setCache(values.current);if(failed.current.has(key)&&!manual)return;try{readInputDraft(sessionStorage,key,limit);sessionStorage.setItem(key,JSON.stringify({version:1,text}));failed.current.delete(key);setErrors(old=>{const next={...old};delete next[key];return next;});}catch{error(key);}}
 function consume(source:string,expected:string){if(values.current[source]!==expected)return 'changed';if(failed.current.has(source))return 'failed';try{if(readInputDraft(sessionStorage,source,limit)!==expected)return 'changed';sessionStorage.setItem(source,JSON.stringify({version:1,text:''}));values.current={...values.current,[source]:''};setCache(values.current);return 'consumed';}catch{error(source);return 'failed';}}
 function download(label:string,filename:string){const text=label+'\n\n'+(values.current[key]||'');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return {consume,snapshot:cache,value:cache[key]||'',set:(text:string)=>write(text),retry:()=>write(values.current[key]||'',true),download,error:errors[key]||'',unsaved:[...failed.current].some(source=>!!values.current[source])};
}

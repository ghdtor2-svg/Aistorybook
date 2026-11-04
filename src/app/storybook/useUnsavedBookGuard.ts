'use client';
import {useEffect,useRef} from 'react';
const leaveMessage="저장하지 못한 작성 내용이 있습니다. 먼저 현재 화면 내용을 내려받아 보관하세요. 그래도 이 화면을 떠날까요?";
const guards=new Set<()=>boolean>();
const unsaved=()=>[...guards].some(check=>check());
function unload(event:BeforeUnloadEvent){if(!unsaved())return;event.preventDefault();event.returnValue='';}
function click(event:MouseEvent){
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!unsaved())return;
 const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;
 if(!(anchor instanceof HTMLAnchorElement)||anchor.hasAttribute('download')||(anchor.target&&anchor.target.toLowerCase()!=='_self'))return;
 const next=new URL(anchor.href,location.href),here=new URL(location.href);
 if(!['http:','https:'].includes(next.protocol)||(next.origin===here.origin&&next.pathname===here.pathname&&next.search===here.search))return;
 if(!window.confirm(leaveMessage)){event.preventDefault();event.stopPropagation();}
}
type HistoryNavigation=Event&{navigationType?:string;destination?:{url:string;sameDocument:boolean};hashChange?:boolean;downloadRequest?:string|null};
const navigationTarget=()=>(window as Window&{navigation?:EventTarget}).navigation;
function traverse(event:Event){
 const navigation=event as HistoryNavigation;
 // Respect browser escape routes: never emulate cancellation with history mutations.
 if(event.defaultPrevented||!event.cancelable||navigation.navigationType!=='traverse'||!navigation.destination?.sameDocument||navigation.hashChange||navigation.downloadRequest!=null||!unsaved())return;
 const next=new URL(navigation.destination.url,location.href),here=new URL(location.href);
 if(next.origin!==here.origin||(next.pathname===here.pathname&&next.search===here.search))return;
 if(!window.confirm(leaveMessage))event.preventDefault();
}
// One shared confirmation even when both question and book drafts are unsaved.
export function useUnsavedBookGuard(isUnsaved:()=>boolean){const current=useRef(isUnsaved);current.current=isUnsaved;
 useEffect(()=>{const check=()=>current.current();guards.add(check);if(guards.size===1){window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);navigationTarget()?.addEventListener('navigate',traverse);}return ()=>{guards.delete(check);if(!guards.size){window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);navigationTarget()?.removeEventListener('navigate',traverse);}};},[]);
}

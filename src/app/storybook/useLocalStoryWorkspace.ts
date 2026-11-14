'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export type StoryConnection={available:boolean;checking:boolean;retry:()=>void};
// One shared check for the reader and checkout; failed checks can be retried.
export function useLocalStoryWorkspace():StoryConnection{
 const [available,setAvailable]=useState(false),[checking,setChecking]=useState(true);
 const active=useRef<AbortController|null>(null);
 const retry=useCallback(()=>{
  active.current?.abort();const controller=new AbortController();active.current=controller;
  if(['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname)){setAvailable(true);setChecking(false);return;}
  setChecking(true);setAvailable(false);
  const timer=setTimeout(()=>controller.abort(),8000);
  void fetch('/api/storybook/availability',{cache:'no-store',signal:controller.signal})
   .then(r=>r.ok?r.json():null).then(data=>{if(active.current===controller&&!controller.signal.aborted)setAvailable(data?.ready===true);})
   .catch(()=>{if(active.current===controller)setAvailable(false);})
   .finally(()=>{clearTimeout(timer);if(active.current===controller)setChecking(false);});
 },[]);
 useEffect(()=>{retry();return ()=>{active.current?.abort();active.current=null;};},[retry]);
 return {available,checking,retry};
}

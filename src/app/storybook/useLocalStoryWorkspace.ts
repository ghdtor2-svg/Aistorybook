'use client';
import {useEffect,useState} from 'react';

export function useLocalStoryWorkspace(){
  const [local,setLocal]=useState(false);
  useEffect(()=>{setLocal(['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname));},[]);
  return local;
}

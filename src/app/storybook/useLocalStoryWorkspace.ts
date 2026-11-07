'use client';
import {useEffect,useState} from 'react';
// Local preview or a server-verified production connection.
export function useLocalStoryWorkspace(){
 const [available,setAvailable]=useState(false);
 useEffect(()=>{let active=true;const local=['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname);
 if(local){setAvailable(true);return;}
 void fetch('/api/storybook/availability',{cache:'no-store',signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():null).then(data=>{if(active)setAvailable(data?.ready===true);}).catch(()=>{});
 return ()=>{active=false;};},[]);return available;
}

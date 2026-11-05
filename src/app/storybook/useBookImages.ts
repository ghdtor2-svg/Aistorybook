'use client';
import {useCallback,useEffect,useState} from 'react';
import {bookImages,emptyImageStore,IMAGE_STORE_KEY,IMAGE_STORE_LOCK,parseImageStore,putBookImages,removeBookImages,serializeImageStore,type ImageStore} from '../../lib/storybook/book-images';
/**
 * 삽화 서랍을 화면에 이어 줍니다.
 *
 * 책장(useState 로 들고 있는 books)과는 완전히 분리돼 있습니다. 이쪽이
 * 실패해도 동화 글은 아무 영향을 받지 않습니다 — 그게 서랍을 나눈 이유입니다.
 * 그래서 이 훅은 던지는 대신 안내 문구를 남깁니다.
 */
export function useBookImages(){
 const [store,setStore]=useState<ImageStore>(emptyImageStore);
 const [notice,setNotice]=useState('');
 const [ready,setReady]=useState(false);

 useEffect(()=>{
  try{setStore(parseImageStore(localStorage.getItem(IMAGE_STORE_KEY)));}
  catch{setNotice('보관된 삽화를 읽지 못했습니다. 동화 글은 그대로 읽을 수 있어요.');}
  finally{setReady(true);}
 },[]);

 // 다른 탭에서 그림을 그렸거나 지웠으면 따라갑니다. 글 책장과 같은 방식입니다.
 useEffect(()=>{
  const changed=(event:StorageEvent)=>{
   if(event.key!==IMAGE_STORE_KEY&&event.key!==null)return;
   try{setStore(parseImageStore(localStorage.getItem(IMAGE_STORE_KEY)));}catch{}
  };
  window.addEventListener('storage',changed);
  return ()=>window.removeEventListener('storage',changed);
 },[]);

 /** 서랍을 잠그고 최신 상태 위에 바꿔 씁니다. 다른 탭이 같은 순간에 쓰는 일을 막습니다. */
 const write=useCallback(async(change:(latest:ImageStore)=>ImageStore,after?:(latest:ImageStore)=>void)=>{
  const run=()=>{
   const latest=parseImageStore(localStorage.getItem(IMAGE_STORE_KEY));
   const next=change(latest);
   const serialized=serializeImageStore(next);
   try{localStorage.setItem(IMAGE_STORE_KEY,serialized);}
   catch{throw Error('브라우저 저장 공간이 부족해 삽화를 보관하지 못했습니다. 동화 글은 그대로 보관되어 있습니다.');}
   setStore(next);
   after?.(next);
  };
  if(!navigator.locks)return run();
  return navigator.locks.request(IMAGE_STORE_LOCK,run);
 },[]);

 /** 한 권의 그림을 보관합니다. 자리가 모자라 버린 책이 있으면 알려 줍니다. */
 const save=useCallback(async(bookId:string,images:{chapter:number;dataUrl:string}[])=>{
  let evicted:string[]=[];
  await write(latest=>{const result=putBookImages(latest,bookId,images);evicted=result.evicted;return result.store;});
  if(evicted.length>0)setNotice('보관 공간을 비우려고 오래된 동화 '+evicted.length+'권의 삽화를 지웠습니다. 그 동화의 글은 그대로 남아 있어요.');
  else setNotice('');
 },[write]);

 const forget=useCallback(async(bookId:string)=>{
  try{await write(latest=>removeBookImages(latest,bookId));}
  catch{setNotice('삽화를 지우지 못했습니다.');}
 },[write]);

 const imagesFor=useCallback((bookId:string,chapters:number)=>bookImages(store,bookId,chapters),[store]);

 return {ready,imagesFor,save,forget,notice,setNotice};
}

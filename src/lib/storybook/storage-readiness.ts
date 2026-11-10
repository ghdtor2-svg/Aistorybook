import {orderStore,storageFetch} from './netlify-storage';

// A health check must finish before the synchronous function's 30-second limit.
// Never log URLs, authorization headers, object contents, or raw SDK errors.
export async function storageReadiness(timeoutMs=7000):Promise<string|null>{
 const controller=new AbortController();
 let lastStatus:number|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const probeFetch:typeof fetch=async(input,init)=>{
  console.info('[storybook-storage-check] request');
  const response=await storageFetch(input,{...init,signal:controller.signal});
  lastStatus=response.status;
  console.info('[storybook-storage-check] response',response.status);
  return response;
 };
 const timeout=new Promise<string>(resolve=>{
  timer=setTimeout(()=>{
   controller.abort();
   console.warn('[storybook-storage-check] timeout',lastStatus??'no_response');
   resolve(lastStatus&&lastStatus>=400&&lastStatus!==404?'storage_http_'+lastStatus:'storage_timeout');
  },timeoutMs);
 });
 try{
  const probe=Promise.resolve().then(()=>orderStore(probeFetch).get('connection-check',{type:'json'})).then(()=>null);
  return await Promise.race([probe,timeout]);
 }catch(error){
  const name=error instanceof Error?error.name:'';
  const reason=name==='MissingBlobsEnvironmentError'?'storage_context_missing':name==='BlobsConsistencyError'?'storage_consistency_configuration':'storage_unavailable';
  console.warn('[storybook-storage-check]',reason,lastStatus??'no_response');
  return reason;
 }finally{
  if(timer)clearTimeout(timer);
  controller.abort();
 }
}

// 읽기만 되는 상태와 쓰기까지 되는 상태를 구분한다. 운영에서 쓰기는 검증된 적이 없었다.
// 실패 이유는 안전한 코드로만 돌려준다. 주소·인증 헤더·내용은 남기지 않는다.
export async function storageWriteCheck(timeoutMs=8000):Promise<string|null>{
 const controller=new AbortController();
 let lastStatus:number|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const probeFetch:typeof fetch=async(input,init)=>{
  const response=await storageFetch(input,{...init,signal:controller.signal});
  lastStatus=response.status;
  return response;
 };
 const key='write-check/probe';
 const timeout=new Promise<string>(resolve=>{
  timer=setTimeout(()=>{
   controller.abort();
   console.warn('[storybook-write-check] timeout',lastStatus??'no_response');
   resolve(lastStatus&&lastStatus>=400&&lastStatus!==404?'write_http_'+lastStatus:'write_timeout');
  },timeoutMs);
 });
 try{
  const probe=Promise.resolve().then(async()=>{
   const store=orderStore(probeFetch);
   await store.setJSON(key,{at:new Date().toISOString()});
   await store.delete(key);
   return null;
  });
  return await Promise.race([probe,timeout]);
 }catch(error){
  const name=error instanceof Error?error.name:'';
  const reason=name==='MissingBlobsEnvironmentError'?'write_context_missing':name==='BlobsConsistencyError'?'write_consistency_configuration':'write_failed_'+(lastStatus??'no_response');
  console.warn('[storybook-write-check]',reason);
  return reason;
 }finally{clearTimeout(timer);}
}

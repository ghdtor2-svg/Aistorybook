// A browser deadline only ends waiting. Server receipts and pending IDs remain intact.
export const STORY_READ_WAIT_MS=15000,STORY_GENERATE_WAIT_MS=300000;
export async function storyResponse(url:string,init:RequestInit={},waitMs=STORY_READ_WAIT_MS){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([
  (async()=>{const response=await fetch(url,{...init,signal:controller.signal});const data=await response.json();return {response,data};})(),
  new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new Error('연결 응답이 늦어 기다리기를 마쳤습니다. 서버 작업이 취소되었다는 뜻은 아닙니다. 생성 기록은 유지하며 결과 확인·복구로 확인해 주세요.'));controller.abort();},waitMs);})
 ]);}finally{if(timer!==undefined)clearTimeout(timer);}
}

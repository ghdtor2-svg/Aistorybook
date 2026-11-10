// 로그인 시도 제한. 서버리스에서는 요청마다 메모리가 사라지므로 공유 저장소에 기록한다.
// 저장소를 읽지 못하면 시도를 막지 않는다. 잠금 장치의 고장이 대표의 로그인을 막으면 안 된다.
import {getStore} from '@netlify/blobs';
import {cloudStorageEnabled} from './cloud-config';
import {storageFetch} from './netlify-storage';
export const MAX_HOST_FAILURES=5;
export const MAX_TOTAL_FAILURES=30;
export const BLOCK_MS=15*60*1000;
// 실패를 세는 구간. 이만큼 조용하면 세던 횟수를 잊는다.
export const WINDOW_MS=15*60*1000;
const KEY='login-attempts';
type Counter={n:number;until:number;at:number};
export type Guard={hosts:Record<string,Counter>;total:Counter};
const blank=():Counter=>({n:0,until:0,at:0});
const empty=():Guard=>({hosts:{},total:blank()});
let memory:Guard=empty();
// 저장소가 늦으면 함수가 통째로 멈춘다. 요청에 시간 제한을 걸어 로그인이 기다리지 않게 한다.
export const GUARD_TIMEOUT_MS=2500;
const guardFetch:typeof fetch=(input,init)=>storageFetch(input,{...init,signal:AbortSignal.timeout(GUARD_TIMEOUT_MS)});
const store=()=>getStore({name:'nangman-admin-guard-v1',consistency:'strong',fetch:guardFetch});
export function clientKey(request:Request){
 const direct=request.headers.get('x-nf-client-connection-ip');
 if(direct)return direct.trim();
 const forwarded=request.headers.get('x-forwarded-for');
 return forwarded?forwarded.split(',')[0].trim():'local';
}
// 차단이 풀렸고 센 지도 오래된 기록만 버린다. 아직 세는 중인 기록은 남긴다.
const stale=(counter:Counter,now:number)=>counter.until<=now&&counter.at+WINDOW_MS<=now;
function prune(guard:Guard,now:number){
 for(const [key,counter] of Object.entries(guard.hosts))if(stale(counter,now))delete guard.hosts[key];
 if(stale(guard.total,now))guard.total=blank();
 return guard;
}
async function read():Promise<Guard|null>{
 if(!cloudStorageEnabled())return memory;
 try{return (await store().get(KEY,{type:'json'}) as Guard|null)??empty();}catch{return null;}
}
async function write(guard:Guard){
 if(!cloudStorageEnabled()){memory=guard;return;}
 try{await store().setJSON(KEY,guard);}catch{/* 기록 실패가 로그인 자체를 막지는 않는다 */}
}
// 남은 차단 시간(ms). 0 이면 시도할 수 있다.
export async function blockedFor(request:Request,now=Date.now()){
 const guard=await read();
 if(!guard)return 0;
 prune(guard,now);
 const mine=guard.hosts[clientKey(request)];
 return Math.max(mine?mine.until-now:0,guard.total.until-now,0);
}
function count(counter:Counter,limit:number,now:number){
 if(counter.until>now)return counter;
 if(counter.at+WINDOW_MS<=now)counter.n=0;
 counter.n++;counter.at=now;
 if(counter.n>=limit){counter.until=now+BLOCK_MS;counter.n=0;}
 return counter;
}
export async function recordFailure(request:Request,now=Date.now()){
 const guard=await read();
 if(!guard)return;
 prune(guard,now);
 const key=clientKey(request);
 guard.hosts[key]=count(guard.hosts[key]??blank(),MAX_HOST_FAILURES,now);
 guard.total=count(guard.total,MAX_TOTAL_FAILURES,now);
 await write(guard);
}
export async function clearFailures(request:Request){
 const guard=await read();
 if(!guard)return;
 delete guard.hosts[clientKey(request)];
 guard.total=blank();
 await write(guard);
}

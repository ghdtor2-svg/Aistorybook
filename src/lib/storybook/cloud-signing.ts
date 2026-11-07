import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {orderStore} from './netlify-storage';

type Role='admin'|'worker';
const secret=(role:Role)=>process.env[role==='admin'?'NANGMAN_ADMIN_BRIDGE_SECRET':'NANGMAN_WORKER_SECRET']||'';
const digest=(role:Role,body:string,time:string,nonce:string)=>createHmac('sha256',secret(role)).update(role+'\n'+time+'\n'+nonce+'\n'+createHash('sha256').update(body).digest('hex')).digest('hex');
export function signedHeaders(role:Role,body:string){
 if(secret(role).length<32)throw Error('Connection secret not configured');
 const time=String(Date.now()),nonce=randomUUID();
 return {'Content-Type':'application/json','X-Nangman-Time':time,'X-Nangman-Nonce':nonce,'X-Nangman-Signature':digest(role,body,time,nonce)};
}
export async function verifySigned(request:Request,body:string,role:Role){
 if(secret(role).length<32)return false;
 const time=request.headers.get('x-nangman-time')||'',nonce=request.headers.get('x-nangman-nonce')||'',sig=request.headers.get('x-nangman-signature')||'';
 if(!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>60000||!/^[a-f0-9-]{36}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(sig))return false;
 const expected=digest(role,body,time,nonce);if(!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
 return (await orderStore().setJSON('nonces/'+role+'/'+nonce,{at:Date.now()},{onlyIfNew:true})).modified;
}
export function trustedCloudWorker(request:Request){
 const expected=secret('worker'),value=request.headers.get('x-nangman-internal-worker')||'';
 if(expected.length<32||value.length!==expected.length)return false;
 return timingSafeEqual(Buffer.from(value),Buffer.from(expected));
}

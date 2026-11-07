import {createHash, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {Book} from './books';

export type Order = {
  id: string;
  amount: number;
  checkoutProof: string;
  createdAt: number;
  paymentKey?: string;
  transferConfirmedAt?: number;
  code?: string;
  codeDisabled?:boolean;
  customerLabel?:string;
  operatorNote?:string;
  adminEvents?:{action:string;at:number}[];
  book?: Book;
  request?: {id:string; startedAt:number; styleId?:string};
  art?: {base:string[]; book?:Book; styleId?:string; qualityProfile?:string; alternative?:{index:number; image:string}; active?:{kind:'base'|'revision'; startedAt:number}; job?:{status:'queued'|'running'|'paused'|'completed';updatedAt:number;origin?:string;inFlightIndex?:number;reason?:'failed'|'uncertain'}};
};

export const checkoutDir = () => path.join(process.cwd(), '.office-data', 'storybook-orders');
export const loopback = (request:Request) => {
  const url = new URL(request.url);
  const host = request.headers.get('host')||url.host;
  const origin = request.headers.get('origin');
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)
    && (!origin || origin === url.protocol+'//'+host)
    && !request.headers.has('x-nf-request-id')
    && !process.env.NETLIFY;
};
const orderIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const orderFile = (id:string) => path.join(checkoutDir(), id+'.json');
export function sameSecret(a:string,b:string){
  const hash=(value:string)=>createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(a),hash(b));
}
export async function getOrder(id:unknown):Promise<Order|null>{
  if(typeof id!=='string'||!orderIdPattern.test(id))return null;
  try{return JSON.parse(await readFile(orderFile(id),'utf8')) as Order;}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
export async function saveOrder(order:Order){
  const dest=orderFile(order.id), temporary=dest+'.'+randomUUID()+'.tmp';
  await writeFile(temporary,JSON.stringify(order),{mode:0o600,flag:'wx'});
  try{await rename(temporary,dest);}
  finally{await unlink(temporary).catch(()=>{});}
}
export async function createOrder(amount:number){
  await mkdir(checkoutDir(),{recursive:true,mode:0o700});
  const order={id:randomUUID(),amount,checkoutProof:randomBytes(24).toString('base64url'),createdAt:Date.now()};
  await saveOrder(order);
  return order;
}
export class OrderBusy extends Error {}
export class OrderCodeChanged extends Error {}
export function matchesOrderCode(order:Order,value:unknown){return typeof value==='string'&&!!order.code&&!order.codeDisabled&&sameSecret(order.code,value.trim());}
// Checkout runs in one local Next server. In-memory locks release on process restart;
// request markers and results are persisted separately.
const lockScope=globalThis as typeof globalThis&{nangmanOrderLocks?:Set<string>};
const locks=lockScope.nangmanOrderLocks??=new Set<string>();
export async function withOrder<T>(id:string,work:(order:Order)=>Promise<T>):Promise<T>{
  if(locks.has(id))throw new OrderBusy();
  locks.add(id);
  try{
    const order=await getOrder(id);
    if(!order)throw new Error('Order missing');
    return await work(order);
  }finally{locks.delete(id);}
}
export async function orderForCode(value:unknown){
  if(typeof value!=='string'||!/^NG-[a-f0-9-]{36}\.[A-Za-z0-9_-]{32}$/.test(value.trim()))return null;
  const code=value.trim();
  const order=await getOrder(code.slice(3,39));
  return order&&matchesOrderCode(order,code)?order:null;
}
export function issueCode(id:string){return 'NG-'+id+'.'+randomBytes(24).toString('base64url');}

export async function createManualOrder(id:string,amount:number,customer?:{label:string;note:string}){
  if(!orderIdPattern.test(id))return null;
  await mkdir(checkoutDir(),{recursive:true,mode:0o700});
  if(locks.has(id))throw new OrderBusy();
  locks.add(id);
  try{
    const existing=await getOrder(id);
    if(existing)return existing.transferConfirmedAt&&existing.amount===amount?existing:null;
    const now=Date.now();
    const order:Order={id,amount,checkoutProof:'',createdAt:now,transferConfirmedAt:now,code:issueCode(id),...(customer?{customerLabel:customer.label,operatorNote:customer.note,adminEvents:[{action:'입금 확인 및 키 발급',at:now}]}:{})};
    await saveOrder(order);
    return order;
  }finally{locks.delete(id);}
}

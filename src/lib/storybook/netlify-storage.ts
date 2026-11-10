import {getStore} from '@netlify/blobs';
import {AsyncLocalStorage} from 'node:async_hooks';
import type {Order} from './story-orders';

export class StorageConflict extends Error {}
const transactions=new AsyncLocalStorage<{id:string;etag:string;written:boolean}>();
// Private Blobs requests must bypass Next.js's fetch/data cache. This also
// avoids routing the storage client's own requests through Netlify's cache store.
// 저장소가 응답하지 않으면 함수가 플랫폼 제한에 걸려 통째로 죽고 502 가 나간다.
// 요청마다 기한을 두어, 멈추는 대신 어떤 실패인지 알 수 있는 오류로 끝나게 한다.
// 호출자가 이미 중단 신호를 주면 그쪽을 따른다.
export const STORAGE_TIMEOUT_MS=15000;
export const ASSET_TIMEOUT_MS=60000;
const bounded=(ms:number):typeof fetch=>(input,init)=>fetch(input,{...init,cache:'no-store',signal:init?.signal??AbortSignal.timeout(ms)});
export const storageFetch:typeof fetch=bounded(STORAGE_TIMEOUT_MS);
const assetFetch:typeof fetch=bounded(ASSET_TIMEOUT_MS);
export const orderStore=(fetchClient:typeof fetch=storageFetch)=>getStore({name:'nangman-orders-v1',consistency:'strong',fetch:fetchClient});
const assets=()=>getStore({name:'nangman-art-v1',consistency:'strong',fetch:assetFetch});
const key=(id:string)=>'orders/'+id;
export async function cloudReadOrder(id:string):Promise<Order|null>{return await orderStore().get(key(id),{type:'json'}) as Order|null;}
export async function cloudCreateOrder(order:Order){return (await orderStore().setJSON(key(order.id),order,{onlyIfNew:true})).modified;}
export async function cloudSaveOrder(order:Order){
 const tx=transactions.getStore();if(!tx||tx.id!==order.id||tx.written)throw new StorageConflict('Order write requires its current version');
 const saved=await orderStore().setJSON(key(order.id),order,{onlyIfMatch:tx.etag});if(!saved.modified)throw new StorageConflict('Order changed');tx.written=true;
}
export async function cloudWithOrder<T>(id:string,work:(order:Order)=>Promise<T>){
 const entry=await orderStore().getWithMetadata(key(id),{type:'json',consistency:'strong'});
 if(!entry?.data||!entry.etag)throw Error('Order missing');
 return transactions.run({id,etag:entry.etag,written:false},()=>work(entry.data as Order));
}
export async function cloudOrderIds(){
 const ids:string[]=[];
 for await(const page of orderStore().list({prefix:'orders/',paginate:true}))for(const blob of page.blobs){const id=blob.key.slice(7);if(/^[a-f0-9-]{36}$/.test(id))ids.push(id);}
 return ids;
}
export async function cloudWriteAsset(orderId:string,name:string,data:Uint8Array){if(!(await assets().set(orderId+'/'+name,Uint8Array.from(data).buffer,{onlyIfNew:true})).modified)throw new StorageConflict('Asset already exists');}
export async function cloudReadAsset(orderId:string,name:string){const value=await assets().get(orderId+'/'+name,{type:'arrayBuffer'});if(!value)throw Error('Asset missing');return Buffer.from(value);}
export async function cloudAssetStream(orderId:string,name:string){const value=await assets().get(orderId+'/'+name,{type:'stream'});if(!value)throw Error('Asset missing');return value;}

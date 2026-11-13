import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {Book} from './books';
import {cloudStorageEnabled} from './cloud-config';
import {cloudReadAsset} from './netlify-storage';
import {checkoutDir,type Order} from './story-orders';

// 서버에 보관된 동화 원본. 그림을 그리기 시작했으면 그때 쓴 글(고객이 그림 전에 고친 글 포함)이 그림과 짝이 맞는다.
export const storedBook=(order:Order):Book|undefined=>order.art?.book||order.book;
export const orderAssetPath=(orderId:string,name:string)=>path.join(checkoutDir(),orderId+'-'+name+'.jpg');
export const isAssetName=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
/** 이 주문에 실제로 기록된 그림만 읽는다(공개 사이트는 Netlify 저장소, 내 PC는 .office-data). */
export async function readOrderAsset(order:Order,name:string){
  if(!isAssetName(name)||!(order.art?.base.includes(name)||order.art?.alternative?.image===name))throw Error('Asset not in order');
  return cloudStorageEnabled()?cloudReadAsset(order.id,name):readFile(orderAssetPath(order.id,name));
}

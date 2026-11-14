import type {StoryStorage} from './storage';
export const STORY_PENDING_KEY='ai-office:story-request:v1';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
export function productionOrderId(code:string):string|null{
 const match=/^NG-([0-9a-f-]{36})\.[A-Za-z0-9_-]{32}$/.exec(code.trim());
 return match&&uuid.test(match[1])?match[1]:null;
}
export function pendingRequest(raw:string){
 if(uuid.test(raw))return {id:raw,orderId:null}; // Existing browsers used a bare request UUID.
 try{const value=JSON.parse(raw);if(value?.version===2&&uuid.test(value.id)&&uuid.test(value.orderId))return {id:value.id as string,orderId:value.orderId as string};}catch{}
 throw Error('미완료 생성 기록이 올바르지 않습니다. 원본은 보존했습니다.');
}
export function newPendingRequest(id:string,code:string){
 const orderId=productionOrderId(code);if(!uuid.test(id)||!orderId)throw Error('받으신 제작 코드 전체를 다시 입력해 주세요.');
 // Store the public order ID, never the bearer secret.
 return JSON.stringify({version:2,id,orderId});
}
export function pendingMatches(raw:string,code:string,serverRequestId?:string){
 const request=pendingRequest(raw),orderId=productionOrderId(code);
 return !!orderId&&(request.orderId?request.orderId===orderId:request.id===serverRequestId);
}
export function finishStoryPending(store:StoryStorage,expected:string,code:string,serverRequestId?:string){
 const current=store.getItem(STORY_PENDING_KEY)||'';
 if(!current)return;
 if(current!==expected)throw Error('다른 생성 요청의 대기 기록이 있어 해제하지 않았습니다.');
 if(!pendingMatches(current,code,serverRequestId))throw Error('입력한 코드와 대기 기록의 주문을 확인할 수 없어 기록을 유지했어요. 이전 제작 코드를 입력해 결과를 확인해 주세요.');
 store.removeItem(STORY_PENDING_KEY);
}
export function storyStateMessage(data:{state?:string;error?:string}){
 if(data.state==='paused')return data.error||'제작이 잠시 중단되었어요. 결과 확인·복구로 상태를 확인하고, 도움이 필요하면 구매 문의 DM으로 연락해 주세요. 자동으로 다시 생성하지 않습니다.';
 if(data.state==='running')return '동화를 만드는 중이에요. 잠시 뒤 결과를 다시 확인해 주세요. 새 생성은 실행하지 않습니다.';
 if(data.state==='ready')return '아직 만든 동화가 없어요. 질문을 마친 후 동화를 만들어 주세요.';
 if(data.state==='missing')return '서버에서 제작 기록을 찾지 못했어요. 제작 코드를 확인하거나 구매 문의 DM으로 연락해 주세요. 대기 기록은 유지했어요.';
 return '제작 상태를 확인하지 못했어요. 잠시 뒤 다시 확인해 주세요. 대기 기록은 유지했어요.';
}
// Legacy records have no order identity. Only an explicit archive action may retire them
// without server evidence. This does not authorize an uncertain paid retry.
export function archiveLegacyPending(store:StoryStorage,expected:string){
 const request=pendingRequest(expected);
 if(request.orderId||store.getItem(STORY_PENDING_KEY)!==expected)throw Error('대기 기록이 변경되었어요. 기록을 유지했으니 다시 확인해 주세요.');
 store.setItem('ai-office:story-request:legacy:'+request.id,expected);
 store.removeItem(STORY_PENDING_KEY);
}

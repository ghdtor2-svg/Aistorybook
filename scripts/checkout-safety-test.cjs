const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {STORY_PENDING_KEY,pendingRequest,newPendingRequest,pendingMatches,finishStoryPending,archiveLegacyPending,storyStateMessage}=require('../.test-build/pending-request');
const orderA=randomUUID(),orderB=randomUUID(),requestA=randomUUID(),requestB=randomUUID();
// Synthetic fixture values, never real production credentials.
const codeA='NG-'+orderA+'.'+'a'.repeat(32),codeB='NG-'+orderB+'.'+'b'.repeat(32);
const receiptA=newPendingRequest(requestA,codeA),receiptB=newPendingRequest(requestB,codeB);
const rows=new Map(),store={getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};
rows.set(STORY_PENDING_KEY,receiptA);
assert.equal(receiptA.includes(codeA),false);assert.equal(receiptA.includes('a'.repeat(32)),false);
assert.deepEqual(pendingRequest(receiptA),{id:requestA,orderId:orderA});
// Return after tab closure: the durable receipt survives, and another order cannot clear it.
assert.equal(pendingMatches(store.getItem(STORY_PENDING_KEY),codeA),true);
assert.equal(pendingMatches(receiptA,codeB),false);
assert.throws(()=>finishStoryPending(store,receiptA,codeB),/기록을 유지/);
assert.equal(store.getItem(STORY_PENDING_KEY),receiptA);
// A later tab replaced the receipt while a GET was in flight; preserve that later request.
rows.set(STORY_PENDING_KEY,receiptB);
assert.throws(()=>finishStoryPending(store,receiptA,codeA),/다른 생성 요청/);
assert.equal(store.getItem(STORY_PENDING_KEY),receiptB);
finishStoryPending(store,receiptB,codeB);assert.equal(store.getItem(STORY_PENDING_KEY),null);
// Legacy records require matching server evidence, never an arbitrary 'ready' response.
rows.set(STORY_PENDING_KEY,requestA);
assert.throws(()=>finishStoryPending(store,requestA,codeB),/기록을 유지/);
assert.throws(()=>finishStoryPending(store,requestA,codeA,requestB),/기록을 유지/);
assert.equal(store.getItem(STORY_PENDING_KEY),requestA);
finishStoryPending(store,requestA,codeA,requestA);assert.equal(store.getItem(STORY_PENDING_KEY),null);
rows.set(STORY_PENDING_KEY,requestA);archiveLegacyPending(store,requestA);
assert.equal(store.getItem(STORY_PENDING_KEY),null);assert.equal(store.getItem('ai-office:story-request:legacy:'+requestA),requestA);
rows.set(STORY_PENDING_KEY,requestA);
assert.throws(()=>archiveLegacyPending({...store,setItem(){throw Error('quota');}},requestA),/quota/);
assert.equal(store.getItem(STORY_PENDING_KEY),requestA);
rows.set(STORY_PENDING_KEY,receiptA);assert.throws(()=>archiveLegacyPending(store,receiptA));
assert.throws(()=>newPendingRequest(requestA,'incomplete'));assert.throws(()=>pendingRequest('invalid'));
assert.equal(storyStateMessage({state:'paused',error:'제작을 중단했어요.'}),'제작을 중단했어요.');
assert.match(storyStateMessage({state:'paused'}),/중단/);assert.doesNotMatch(storyStateMessage({state:'paused'}),/아직 만든 동화가 없/);
assert.match(storyStateMessage({state:'running'}),/새 생성은 실행하지/);
assert.match(storyStateMessage({state:'unexpected'}),/유지/);
console.log('PASS checkout safety: durable order-bound receipts, code switches, stale tabs, legacy evidence/archive, storage failure and paused state messages');

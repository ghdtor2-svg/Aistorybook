const assert=require('node:assert/strict');
const {newProfile,submitAnswer,demoEngine,editSummary}=require('../.test-build/engine.js');
const {saveStory,restoreStory,deleteStory,STORAGE_KEY}=require('../.test-build/storage.js');
const answer=(p,text,skip=false)=>submitAnswer(p,p.currentQuestion,text,skip);
let p=newProfile();const seen=[];
while(p.currentQuestion){seen.push(p.currentQuestion);p=answer(p,'가');assert.ok(seen.length<=15);}
assert.equal(seen.length,15);assert.equal(new Set(seen.map(q=>q.id)).size,15);
for(const group of ['recipient','event','emotion','details','message']){const questions=seen.filter(q=>q.group===group);assert.equal(questions.filter(q=>q.kind==='followup').length,2);assert.equal(new Set(questions.map(q=>q.text)).size,questions.length);}
assert.equal(p.completionStatus,'review');console.log('PASS all core targets, 2 followups each, max 15, no repeated question text');
p=newProfile();p=answer(p,'선물 대상: 지민; 주인공: 나; 관계: 부모와 딸; 사건: 작년 여름 바다에서 함께 모래성을 만들며 웃었던 날; 감정: 정말 행복하고 뿌듯했어요; 특징: 늘 노란 장화를 신고 콧노래를 부르는 모습; 메시지: 언제나 네 편이고 사랑한다는 마음');
// 주인공 한 글자는 구체화 기준에 못 미치므로 충분한 별칭으로 재입력합니다.
p=submitAnswer(p,p.answers[0].question,'선물 대상: 지민; 주인공: 지민이; 관계: 부모와 딸; 사건: 작년 여름 바다에서 함께 모래성을 만들며 웃었던 날; 감정: 정말 행복하고 뿌듯했어요; 특징: 늘 노란 장화를 신고 콧노래를 부르는 모습; 메시지: 언제나 네 편이고 사랑한다는 마음');
assert.equal(p.currentQuestion,null);assert.equal(p.answers.length,1);assert.equal(p.recipient,'지민');assert.ok(p.facts.emotions.sourceAnswerIds.includes('recipient:core'));
console.log('PASS labeled cross-question facts suppress already collected questions');
p=newProfile();let skipped=0;while(p.currentQuestion){p=answer(p,'',true);skipped++;}assert.equal(skipped,5);assert.equal(p.recipient,'');assert.equal(demoEngine.evaluate(p.answers).resolvedGroups,5);
p=editSummary(p,'recipient','엄마');p.completionStatus='confirmed';
const revised=submitAnswer(p,p.answers[0].question,'친구');assert.equal(revised.answers.length,1);assert.equal(revised.recipient,'친구');assert.equal(revised.message,'');assert.equal(revised.completionStatus,'in_progress');assert.deepEqual(revised.summaryEdits,{});
console.log('PASS skip without pressure, earlier edit invalidates descendants, facts and confirmation');
const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
saveStory(storage,{profile:p,draft:'작성 중',editingId:p.answers[0].question.id});
let restored=restoreStory(storage);assert.equal(restored.profile.recipient,'엄마');assert.equal(restored.profile.completionStatus,'confirmed');assert.equal(restored.draft,'작성 중');assert.equal(restored.editingId,p.answers[0].question.id);assert.equal(restored.profile.storyId,p.storyId);assert.equal(restored.profile.createdAt,p.createdAt);
deleteStory(storage);assert.equal(restoreStory(storage),null);
map.set(STORAGE_KEY,'{bad');assert.throws(()=>restoreStory(storage));
map.set(STORAGE_KEY,JSON.stringify({version:1,profile:{...p,answers:[{question:{id:'fake'},text:'x',skipped:false}]}}));assert.throws(()=>restoreStory(storage));
console.log('PASS persistent save/restore, draft, edits, timestamps, deletion and invalid data rejection');
let noRepeat=newProfile();noRepeat=answer(noRepeat,'주인공: 지민이');
assert.equal(noRepeat.currentQuestion.target,'recipient');
noRepeat=answer(noRepeat,'관계: 친구');
assert.equal(noRepeat.currentQuestion.group,'event');
console.log('PASS identity clarification is not repeated when the same detail remains unknown');

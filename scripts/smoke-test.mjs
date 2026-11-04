import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const names=['AI 개발자','AI 기획·리서치','AI 마케팅','AI 품질관리·디자인'];
async function post(body){const r=await fetch(`${base}/api/run`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const page=await fetch(base);assert.equal(page.status,200);const html=await page.text();
for(const name of names)assert.ok(html.includes(name));
assert.ok(!html.includes('AI 총괄실장'));console.log('PASS dashboard: exactly the requested organization, no director');
for(const [prompt,lead,participants] of [
 ['Next.js 로그인 API 개발과 데이터베이스 연동','developer',['developer','quality']],
 ['핵심 질문과 후속 질문 기획 및 경쟁 시장 조사','research',['research']],
 ['인스타그램 블로그 SNS 광고 콘텐츠 초안','marketing',['marketing','quality']],
 ['동화 사실 검수와 UI 디자인 시안','quality',['quality']],
 ['도와주세요','research',['research']],
 ['API 개발 및 시장 조사와 SNS 광고 및 디자인 검수','developer',['developer','research','marketing','quality']]
]){
 const {status,data}=await post({prompt,mode:'demo'});assert.equal(status,200);assert.equal(data.mode,'demo');assert.equal(data.assignment.lead,lead);assert.deepEqual(data.assignment.participants,participants);
 assert.deepEqual(data.results.map(r=>r.agentId),participants);assert.equal(new Set(data.results.map(r=>r.agentId)).size,participants.length);
 for(const [i,result] of data.results.entries()){assert.ok(result.content.includes(prompt));assert.ok(result.content.includes('[데모'));for(const earlier of data.results.slice(0,i))assert.ok(result.content.includes(earlier.content));}
}
console.log('PASS four lead roles, fallback, multi-role collaboration, prior result handoff');
assert.equal((await post({prompt:'업무',mode:'auto'})).data.mode,'demo');
assert.equal((await post({prompt:'업무'})).data.mode,'demo');
assert.equal((await post({prompt:'업무',mode:'live'})).status,503);
console.log('PASS auto/default demo and live API disabled');
for(const body of [null,{}, {prompt:''},{prompt:'   '},{prompt:123},{prompt:'a'.repeat(4001)},{prompt:'업무',mode:'invalid'},{prompt:'업무',mode:{}}])assert.equal((await post(body)).status,400);
const malformed=await fetch(`${base}/api/run`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
assert.equal((await post({prompt:'가'.repeat(4000)})).status,200);
console.log('PASS malformed JSON, input validation, 4000-character boundary');
console.log('All stage 2 HTTP smoke tests passed. No live API calls.');

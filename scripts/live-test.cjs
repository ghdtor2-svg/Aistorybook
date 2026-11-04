const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createTask,beginStep,finishStep,currentRun}=require('../.live-test-build/lib/office/model.js');
const {parseWorkspace}=require('../.live-test-build/lib/office/storage.js');
const {liveConfig,liveEnabled,tokenCost}=require('../.live-test-build/lib/office/server/config.js');
const {execute,preview,createOpenAIProvider}=require('../.live-test-build/lib/office/server/executor.js');
const {LedgerStore,totals}=require('../.live-test-build/lib/office/server/ledger.js');
const {sessionCookie,authenticated,localOrigin,validPassword}=require('../.live-test-build/lib/office/server/auth.js');
const {redact}=require('../.live-test-build/lib/office/server/prompts.js');
const config=liveConfig({});const newStore=()=>new LedgerStore(fs.mkdtempSync(path.join(__dirname,'../.live-test-build/ledger-')));
const task=()=>createTask('storybook-platform','동화 질문 UI 개발 계획. 연락처 test@example.com','developer','product');
(async()=>{
 assert.equal(liveEnabled({}),false);assert.equal(liveEnabled({NODE_ENV:'production',OFFICE_ALLOW_LOCAL_LIVE:'true',OFFICE_PAID_CALLS_APPROVED:'true',OPENAI_API_KEY:'fake',OFFICE_ADMIN_PASSWORD:'fake-password-long'}),false);
 assert.throws(()=>liveConfig({OPENAI_MODEL:'unknown'}));assert.throws(()=>liveConfig({OFFICE_MAX_ATTEMPTS:'3'}));
 const secret='fake-password-for-tests-only';const cookie=sessionCookie(secret).split(';')[0];const origin='http://127.0.0.1:3000';const req=(headers={})=>new Request(origin+'/api/office',{method:'POST',headers:{origin,cookie,...headers}});
 assert.ok(authenticated(req(),secret));assert.ok(!authenticated(req({cookie:'bad'}),secret));assert.ok(!localOrigin(req({origin:'https://evil.example'})));assert.ok(!localOrigin(req({'x-forwarded-for':'203.0.113.1'})));assert.ok(!validPassword('wrong',secret));
 console.log('PASS default off, production forbidden, auth, origin checks, model pricing and hard limits');
 let store=newStore(),t=task(),requests=[];const provider=async r=>{requests.push(r);return {output_text:'업무별 모의 AI 결과',usage:{input_tokens:100,output_tokens:50},status:'completed'};};
 for(const name of ['AI 기획·리서치','AI 개발자','AI 품질관리·디자인']){
  const result=await execute(t,config,store,provider);assert.ok(requests.at(-1).instructions.includes(name));assert.ok(!requests.at(-1).input.includes('test@example.com'));assert.equal(requests.at(-1).store,false);assert.equal(result.simulation,false);
  const count=requests.length;assert.deepEqual(await execute(t,config,store,provider),result);assert.equal(requests.length,count);
  t=finishStep(beginStep(t,'live'),result);
 }
 assert.equal(t.status,'awaiting_approval');assert.equal(JSON.parse(requests[2].input).upstream.length,2);assert.ok(JSON.parse(requests[1].input).upstream[0].items.includes('업무별 모의 AI 결과'));
 assert.equal(store.read().receipts.length,3);assert.equal(totals(store.read()).estimatedUsd,3*tokenCost(config,100,50));assert.ok(parseWorkspace(JSON.stringify({version:1,tasks:[t]})).tasks[0].runs[0].steps[0].output.usage);
 assert.throws(()=>beginStep(t,'demo'));
 let marketing=createTask('storybook-platform','SNS','marketing','marketing');await execute(marketing,config,newStore(),provider);assert.ok(requests.at(-1).instructions.includes('AI 마케팅'));
 console.log('PASS real-mode mock results, 4 role prompts, structured handoff, no PII, usage/cost, idempotency, compatible persistence');
 store=newStore();await store.locked(l=>{l.monthlyBudgetUsd=0;store.write(l);});let calls=0;await assert.rejects(execute(task(),config,store,async()=>{calls++;throw new Error();}),/예산/);assert.equal(calls,0);
 await assert.rejects(execute(task(),{...config,maxRunCalls:1},newStore(),provider),/상한/);
 await assert.rejects(execute(createTask('storybook-platform','가'.repeat(4000),'developer','product'),{...config,maxInputTokens:1000},newStore(),provider),/입력 크기/);
 console.log('PASS budget, token and call ceilings block before provider invocation');
 store=newStore();let attempts=0;await execute(task(),config,store,async()=>{if(++attempts===1)throw {status:429};return {output_text:'재시도 성공',usage:{input_tokens:10,output_tokens:5}};});assert.equal(attempts,2);assert.equal(store.read().receipts[0].attempts[0].status,'uncertain');
 store=newStore();attempts=0;await assert.rejects(execute(task(),config,store,async()=>{attempts++;throw {status:500};}),/API 오류/);assert.equal(attempts,2);
 store=newStore();attempts=0;await assert.rejects(execute(task(),config,store,async()=>{attempts++;throw new Error('Timeout secret must not leak');}),/API 오류/);assert.equal(attempts,1);assert.ok(totals(store.read()).estimatedUsd>0);assert.equal(store.read().receipts[0].attempts[1].status,'skipped');
 console.log('PASS bounded 429/500 retry, timeout without automatic retry, conservative unknown cost');
 const fakeFetch=async(url,init)=>{assert.ok(String(url).startsWith('https://api.openai.com/'));const body=JSON.parse(init.body);assert.equal(body.store,false);return new Response(JSON.stringify({id:'resp_mock',object:'response',created_at:1,status:'completed',model:config.model,output:[{id:'msg_mock',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'SDK 모의 응답',annotations:[]}]}],usage:{input_tokens:20,output_tokens:10,total_tokens:30}}),{headers:{'Content-Type':'application/json'}});};
 const sdk=createOpenAIProvider('mock-not-a-real-key',fakeFetch);const result=await execute(task(),config,newStore(),sdk);assert.ok(result.items[0].includes('SDK 모의 응답'));assert.equal(result.usage.inputTokens,20);
 const api=require('../.live-test-build/app/api/office/route.js');const oldEnv={...process.env};process.env.OFFICE_PAID_CALLS_APPROVED='false';const unavailable=await api.GET(new Request(origin+'/api/office'));assert.equal((await unavailable.json()).mode,'demo');assert.equal((await api.POST(req())).status,403);
 Object.assign(process.env,{NODE_ENV:'development',OFFICE_ALLOW_LOCAL_LIVE:'true',OFFICE_PAID_CALLS_APPROVED:'true',OPENAI_API_KEY:'fake-test-key',OFFICE_ADMIN_PASSWORD:secret});
 assert.equal((await api.POST(new Request(origin+'/api/office',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action:'run',task:task()})}))).status,401);
 const login=await api.POST(new Request(origin+'/api/office',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:secret})}));assert.equal(login.status,200);assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
 const deniedPaid=await api.POST(new Request(origin+'/api/office',{method:'POST',headers:{origin,cookie:login.headers.get('set-cookie').split(';')[0],'Content-Type':'application/json'},body:JSON.stringify({action:'run',task:task()})}));assert.equal(deniedPaid.status,403);
 for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv);
 console.log('PASS official SDK mocked transport, no network or paid calls, HTTP no-key fallback and unauthenticated blocking');
})().catch(e=>{console.error(e);process.exitCode=1;});
// 서버가 내부 localhost URL을 사용하더라도 실제 로컬 Host/Origin 조합은 허용합니다.
const {localOrigin:checkOrigin}=require('../.live-test-build/lib/office/server/auth.js');
assert.ok(checkOrigin(new Request('http://localhost:3000/api/office',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}})));

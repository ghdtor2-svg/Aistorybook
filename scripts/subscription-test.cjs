const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {CodexExecutor,StdioRpc,codexPrompt,codexEnvironment,assertSubscriptionQuota,probeCodex,safeOverrides,assertSafeConfig,createTextRpc}=require('../.live-test-build/lib/office/server/codex.js');
const {SubscriptionStore,executeSubscription}=require('../.live-test-build/lib/office/server/subscription.js');
const {createTask,currentRun,decideTask,resubmitTask,beginStep}=require('../.live-test-build/lib/office/model.js');
const {parseWorkspace}=require('../.live-test-build/lib/office/storage.js');
const {liveEnabled}=require('../.live-test-build/lib/office/server/config.js');
const {createOpenAIProvider}=require('../.live-test-build/lib/office/server/executor.js');
const {geminiExecutor,geminiConnection}=require('../.live-test-build/lib/office/server/gemini.js');
const quota=()=>({rateLimits:{primary:{usedPercent:5,resetsAt:Math.floor(Date.now()/1000)+1000},secondary:null,credits:{hasCredits:false,unlimited:false}}});
class FakeRpc{
 constructor(options={}){this.options=options;this.calls=[];this.handlers=new Set();this.closed=false;}
 async call(method,params){this.calls.push({method,params});
  if(this.options.failAt===method)throw new Error('secret credential must never be returned');
  if(method==='initialize')return {};
  if(method==='account/read')return {account:{type:this.options.auth||'chatgpt',planType:'plus'}};
  if(method==='account/rateLimits/read')return this.options.quota||quota();
  if(method==='config/read')return {config:{model_provider:'openai',forced_login_method:'chatgpt',sandbox_mode:'read-only',features:{shell_tool:false,unified_exec:false,hooks:false,apps:false,plugins:false,multi_agent:false,shell_snapshot:false,code_mode:{enabled:false}},web_search:'disabled',computer_use:{default_app_access:'deny'},browser_use:{default_origin_policy:{access:'deny'}},...this.options.config}};
  if(method==='turn/interrupt')return {};
  if(method==='thread/start')return {thread:{id:'thread-test'},model:'mock-codex',modelProvider:'openai',sandbox:{type:'readOnly'},approvalPolicy:this.options.threadApprovalPolicy||'on-request'};
  if(method==='turn/start'){setTimeout(()=>{if(this.options.tool)this.emit({method:'item/started',params:{threadId:'thread-test',item:{type:'commandExecution'}}});else if(this.options.disconnect)this.emit({method:'office/disconnected'});else if(this.options.rateUpdate)this.emit({method:'account/rateLimits/updated',params:{rateLimits:{}}});else{this.emit({method:'item/completed',params:{threadId:'thread-test',item:{id:'item-test',type:'agentMessage',text:'모의 직원 결과'}}});this.emit({method:'turn/completed',params:{threadId:'thread-test',turn:{id:'turn-test',status:this.options.failed?'failed':'completed'}}});}},0);return {turn:{id:'turn-test'}};}
  throw new Error('Unexpected RPC '+method);
 }
 emit(event){for(const h of this.handlers)h(event);}
 notify(){}onEvent(handler){this.handlers.add(handler);return ()=>this.handlers.delete(handler);}close(){this.closed=true;}
}
const input={taskId:'task',projectId:'storybook-platform',brief:'테스트 업무 test@example.com',revision:1,feedback:'',upstream:[]};
const store=()=>new SubscriptionStore(fs.mkdtempSync(path.join(__dirname,'../.live-test-build/subscription-')));
(async()=>{
 const {EventEmitter}=require('node:events'),{PassThrough,Writable}=require('node:stream');const writes=[];
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new Writable({write(chunk,encoding,done){writes.push(JSON.parse(chunk.toString()));done();}});child.kill=()=>{};
 const transport=new StdioRpc('unused','.',()=>child);let blocked=false;transport.onEvent(e=>{if(e.method==='office/blockedTool')blocked=true;});
 const response=transport.call('initialize',{});child.stdout.write('{"id":1,"res');child.stdout.write('ult":{"ok":true}}\n');assert.deepEqual(await response,{ok:true});
 child.stdout.write('{"id":90,"method":"item/commandExecution/requestApproval","params":{"command":"forbidden"}}\n');assert.ok(blocked);assert.equal(writes.at(-1).error.code,-32601);
 const disconnected=transport.call('account/read',{});child.emit('close');await assert.rejects(disconnected);assert.ok(!writes.some(w=>w.result?.decision==='accept'));
 console.log('PASS fragmented JSONL transport, tool approval denied, disconnect rejects pending requests');
 for(const [stderr,reason] of [
  ['Error loading configuration: invalid type: boolean; secret-token','configuration'],
  ['Error: approval_policy = \"untrusted\" is no longer supported; remove this setting','configuration'],
  ['failed to initialize sqlite state runtime: secret-path','sqlite_initialization'],
  ['Error: Access is denied. (os error 5)','access_denied'],
  ['WARNING: alias failed (os error 5)\nUnexpected shutdown secret-token','disconnected'],
 ]){
  const proc=new EventEmitter();proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.stdin=new PassThrough();proc.kill=()=>{};
  const rpc=new StdioRpc('unused','.',()=>proc);
  const resultPromise=probeCodex(()=>rpc);
  proc.stderr.write(stderr);proc.emit('exit');proc.emit('close');
  const result=await resultPromise;assert.equal(result.reason,reason);assert.equal(result.stage,'initialize');assert.equal(result.connected,false);
  assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!JSON.stringify(result).includes(stderr));
 }
 const malformed=new FakeRpc();malformed.call=async()=>({});assert.equal((await probeCodex(()=>malformed)).reason,'protocol');
 const factoryFailure=await probeCodex(()=>{throw new Error('secret executable path');});assert.equal(factoryFailure.stage,'startup');assert.equal(factoryFailure.connected,false);assert.ok(!JSON.stringify(factoryFailure).includes('secret'));
 console.log('PASS safe stage diagnostics, drained stderr classification, warning/fatal distinction, malformed account and startup failure');
 let spawned=0;await assert.rejects(new CodexExecutor(()=>{spawned++;return new FakeRpc();},{}).execute('developer',input),/승인/);assert.equal(spawned,0);
 const clean=codexEnvironment({NODE_ENV:'test',USERPROFILE:'user',OPENAI_API_KEY:'secret',GEMINI_API_KEY:'secret',CODEX_HOME:'override',ACCESS_TOKEN:'secret',HTTPS_PROXY:'proxy'});assert.equal(clean.OPENAI_API_KEY,undefined);assert.equal(clean.GEMINI_API_KEY,undefined);assert.equal(clean.CODEX_HOME,undefined);assert.equal(clean.ACCESS_TOKEN,undefined);assert.equal(clean.HTTPS_PROXY,undefined);
 const profileFixture=fs.mkdtempSync(path.join(__dirname,'../.live-test-build/profile-'));fs.mkdirSync(path.join(profileFixture,'.codex'));
 const selectedHome=codexEnvironment({NODE_ENV:'test',USERPROFILE:profileFixture,OPENAI_API_KEY:'secret'});assert.equal(selectedHome.CODEX_HOME,path.join(profileFixture,'.codex'));assert.equal(selectedHome.OPENAI_API_KEY,undefined);
 assert.equal(codexEnvironment({NODE_ENV:'test',USERPROFILE:path.join(profileFixture,'missing')}).CODEX_HOME,undefined);
 assert.throws(()=>codexEnvironment({NODE_ENV:'test',USERPROFILE:profileFixture,CODEX_HOME:path.join(profileFixture,'other')}),/기존 인증 경로/);
 assert.ok(safeOverrides.includes('approval_policy=\"on-request\"'));assert.ok(!safeOverrides.includes('approval_policy=\"untrusted\"'));assert.ok(safeOverrides.includes('features.shell_tool=false'));assert.ok(safeOverrides.includes('features.hooks=false'));
 const env={OFFICE_CODEX_FIRST_RUN_APPROVED:'true'};
 const valid=(await new FakeRpc().call('config/read',{})).config;
 assert.doesNotThrow(()=>assertSafeConfig({...valid,chatgpt_base_url:'https://chatgpt.com/backend-api/',mcp_servers:{registered:{enabled:false,command:'never-run'}},plugins:{registered:{enabled:false}}}));
 for(const patch of [{mcp_servers:{registered:{}}},{mcp_servers:{registered:{enabled:true}}},{plugins:{registered:{enabled:true}}},{plugins:[]},{chatgpt_base_url:'https://chatgpt.com.evil.example/backend-api/'},{chatgpt_base_url:'https://chatgpt.com/backend-api/?token=x'},{chatgpt_base_url:''},{openai_base_url:'https://api.openai.com/v1'},{features:{}}])assert.throws(()=>assertSafeConfig({...valid,...patch}));
 const discovery=new FakeRpc({config:{mcp_servers:{'test-server':{command:'never-run'}},plugins:{'test@local':{enabled:true}}}});
 const isolated=new FakeRpc({config:{mcp_servers:{'test-server':{enabled:false}},plugins:{'test@local':{enabled:false}},chatgpt_base_url:'https://chatgpt.com/backend-api/'}});
 const overrideCalls=[];let factories=0;
 const connection=await createTextRpc(overrides=>{overrideCalls.push([...overrides]);return factories++===0?discovery:isolated;});
 assert.ok(discovery.closed);assert.equal(connection,isolated);assert.ok(overrideCalls[1].includes('mcp_servers.test-server.enabled=false'));assert.ok(overrideCalls[1].includes('plugins={"test@local"={enabled=false}}'));
 const invalidId=new FakeRpc({config:{mcp_servers:{'name.with.dot':{}}}});await assert.rejects(createTextRpc(()=>invalidId));assert.ok(invalidId.closed);
 assert.ok(!discovery.calls.some(c=>['thread/start','turn/start'].includes(c.method)));
 await new CodexExecutor(()=>connection,env).execute('developer',input);assert.equal(isolated.calls.filter(c=>c.method==='initialize').length,1);
 let blockedFactories=0;const badDiscovery=new FakeRpc({config:{mcp_servers:{bad:{enabled:true}}}}),notDisabled=new FakeRpc({config:{mcp_servers:{bad:{enabled:true}}}});
 await assert.rejects(createTextRpc(()=>blockedFactories++===0?badDiscovery:notDisabled));assert.ok(badDiscovery.closed&&notDisabled.closed);assert.ok(!notDisabled.calls.some(c=>c.method==='thread/start'));
 console.log('PASS disabled registrations only, exact official URL, quoted override keys, discovery without inference, effective config recheck and one initialize');
 for(const agent of ['research','developer','quality','marketing']){
  const rpc=new FakeRpc();const result=await new CodexExecutor(()=>rpc,env).execute(agent,input);assert.equal(result.text,'모의 직원 결과');assert.ok(rpc.closed);
  const start=rpc.calls.find(c=>c.method==='thread/start');assert.equal(start.params.sandbox,'read-only');assert.equal(start.params.approvalPolicy,'on-request');assert.ok(start.params.developerInstructions.includes({research:'AI 기획·리서치',developer:'AI 개발자',quality:'AI 품질관리·디자인',marketing:'AI 마케팅'}[agent]));assert.ok(!JSON.stringify(rpc.calls).includes('test@example.com'));
 }
 assert.ok(codexPrompt('research',input).instructions.includes('AI 기획·리서치'));assert.throws(()=>codexPrompt('developer',{...input,brief:'x'.repeat(24001)}),/너무 큽/);
 for(const options of [{threadApprovalPolicy:'never'},{threadApprovalPolicy:'untrusted'},{auth:'apiKey'},{quota:{rateLimits:null}},{quota:{rateLimits:{...quota().rateLimits,credits:{hasCredits:true,unlimited:false}}}},{config:{mcp_servers:{external:{command:'bad'}}}},{config:{features:{}}}]){
  const rpc=new FakeRpc(options);await assert.rejects(new CodexExecutor(()=>rpc,env).execute('developer',input));assert.ok(!rpc.calls.some(c=>c.method==='turn/start'));assert.ok(rpc.closed);
 }
 for(const options of [{tool:true},{failed:true},{disconnect:true},{rateUpdate:true}])await assert.rejects(new CodexExecutor(()=>new FakeRpc(options),env).execute('developer',input));
 assert.throws(()=>assertSubscriptionQuota({rateLimits:{...quota().rateLimits,primary:{usedPercent:95,resetsAt:Date.now()/1000+100}}}));
 const probeRpc=new FakeRpc();assert.equal((await probeCodex(()=>probeRpc)).authMode,'chatgpt');assert.ok(!probeRpc.calls.some(c=>c.method==='thread/start'||c.method==='turn/start'));assert.ok(probeRpc.closed);
 for(const stage of ['initialize','account/read']){const rpc=new FakeRpc({failAt:stage});const result=await probeCodex(()=>rpc);assert.equal(result.stage,stage);assert.equal(result.connected,false);assert.ok(rpc.closed);assert.ok(!JSON.stringify(result).includes('secret'));assert.equal(result.checks.configRead,'not_requested');assert.equal(result.checks.rateLimitsRead,'not_requested');assert.ok(!rpc.calls.some(c=>['config/read','account/rateLimits/read','thread/start','turn/start'].includes(c.method)));}
 const keyProbe=await probeCodex(()=>new FakeRpc({auth:'apiKey'}));assert.equal(keyProbe.authMode,'unavailable');assert.equal(keyProbe.reason,'chatgpt_required');
 console.log('PASS approval gate before spawn, sanitized env, 4 roles, official RPC sequence, quota/credits/auth/config denial, tool/failure/disconnect, probe without inference');
 let t=createTask('storybook-platform','동화 UI 개발','developer','product');let calls=[];const executor={async execute(agent,stepInput){calls.push({agent,stepInput});return {text:'mock '+agent,model:'mock-model',threadId:'mock-thread',turnId:'mock-turn'};}};let journal=store();
 const original=t;t=await executeSubscription(t,journal,executor);assert.equal(calls.length,1);assert.equal(calls[0].agent,'research');assert.equal(currentRun(t).steps[0].output.simulation,false);assert.equal(currentRun(t).steps[0].output.service.provider,'codex');assert.deepEqual(await executeSubscription(original,journal,executor),t);
 t=await executeSubscription(t,journal,executor);assert.equal(calls[1].agent,'developer');assert.equal(calls[1].stepInput.upstream[0].simulation,false);
 const before=t;t=await executeSubscription(t,journal,executor);assert.equal(calls[2].agent,'quality');assert.equal(calls[2].stepInput.upstream.length,2);assert.equal(t.status,'awaiting_approval');assert.deepEqual(await executeSubscription(before,journal,executor),t);assert.equal(calls.length,3);
 const restored=parseWorkspace(JSON.stringify({version:1,tasks:[t]})).tasks[0];assert.deepEqual(restored,t);let rejected=decideTask(t,false,'디자인 보완');let revised=resubmitTask(rejected);assert.equal(revised.runs.length,2);revised=await executeSubscription(revised,journal,executor);assert.equal(currentRun(revised).steps[0].input.feedback,'디자인 보완');assert.equal(decideTask(t,true,'검토 완료').status,'approved');
 const legacy=JSON.parse(JSON.stringify(original));legacy.status='in_progress';const oldRun=currentRun(legacy);oldRun.executionMode='subscription';
 const oldOutput={...currentRun(t).steps[0].output,simulation:true,service:{provider:'demo',product:'기획·리서치 데모 (Gemini 미연결)',authMode:'none',billingMode:'none',model:null,receiptId:'historical'}};
 oldRun.steps[0]={...oldRun.steps[0],status:'completed',output:oldOutput};
 assert.deepEqual(parseWorkspace(JSON.stringify({version:1,tasks:[legacy]})).tasks[0],legacy);
 assert.equal(currentRun(beginStep(legacy,'subscription')).steps[1].input.upstream[0].simulation,true);
 const legacyStore=store();fs.mkdirSync(legacyStore.dir,{recursive:true});legacyStore.write({version:1,receipts:[{id:[legacy.id,oldRun.id,oldRun.steps[0].id].join(':'),fingerprint:'historical',status:'completed',task:legacy,startedAt:new Date().toISOString()}]});
 const continued=await executeSubscription(legacy,legacyStore,executor);assert.deepEqual(currentRun(continued).steps[0].output,oldOutput);assert.equal(currentRun(continued).steps[1].output.service.provider,'codex');
 await assert.rejects(executeSubscription(createTask('storybook-platform','기획','research','individual'),store(),new CodexExecutor(()=>new FakeRpc(),env)),/승인/);
 console.log('PASS legacy mixed research remains demo and resumable; new planning requires first-run approval');
 await assert.rejects(executeSubscription({...before,brief:'tampered'},journal,executor),/변경|다릅니다/);
 let m=createTask('storybook-platform','SNS 기획','research','planning-marketing');const marketingStore=store();m=await executeSubscription(m,marketingStore,executor);m=await executeSubscription(m,marketingStore,executor);assert.equal(calls.at(-1).agent,'marketing');assert.equal(calls.at(-1).stepInput.upstream[0].agentId,'research');
 const failedStore=store(),q=createTask('storybook-platform','검토','quality','individual');const failed=await executeSubscription(q,failedStore,{async execute(){throw new Error('secret error');}});assert.equal(failed.status,'failed');assert.ok(!JSON.stringify(failed).includes('secret error'));await assert.rejects(executeSubscription(q,failedStore,executor),/이미 시도/);
 const locked=store();fs.mkdirSync(locked.dir,{recursive:true});fs.writeFileSync(path.join(locked.dir,'subscription.lock'),'');await assert.rejects(executeSubscription(q,locked,executor),/잠금/);
 console.log('PASS all-GPT research + Codex handoff, service history/persistence, idempotency/tamper/locks, approval/rejection/revision, marketing uses planning, failure preservation');
 assert.equal(liveEnabled({NODE_ENV:'development',OPENAI_API_KEY:'fake',OFFICE_PAID_CALLS_APPROVED:'true',OFFICE_ALLOW_LOCAL_LIVE:'true',OFFICE_ADMIN_PASSWORD:'test-long-password'}),false);
 await assert.rejects(createOpenAIProvider('fake')({model:'fake',instructions:'',input:'',store:false,max_output_tokens:1},100),/유료 API/);
 assert.equal(geminiConnection.sharedQuota,false);await assert.rejects(geminiExecutor.execute('research',input),/인터페이스/);
 const api=require('../.live-test-build/app/api/office/subscription/route.js');const auth=require('../.live-test-build/lib/office/server/auth.js');const secret='subscription-test-password';const saved=process.env.OFFICE_ADMIN_PASSWORD;process.env.OFFICE_ADMIN_PASSWORD=secret;
 const origin='http://127.0.0.1:3000';const request=(body,headers={})=>new Request(origin+'/api/office/subscription',{method:'POST',headers:{origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await api.POST(request({action:'run',task:q}))).status,401);assert.equal((await api.POST(request({action:'run'},{origin:'https://evil.example'}))).status,403);
 assert.equal((await api.POST(request({action:'run',task:q},{cookie:auth.sessionCookie(secret).split(';')[0]}))).status,409);
 if(saved===undefined)delete process.env.OFFICE_ADMIN_PASSWORD;else process.env.OFFICE_ADMIN_PASSWORD=saved;
 console.log('PASS paid API blocked with legacy flags, Gemini disabled/separate quota, HTTP auth/origin and first-run gate; no real model calls');
})().catch(error=>{console.error(error);process.exitCode=1;});




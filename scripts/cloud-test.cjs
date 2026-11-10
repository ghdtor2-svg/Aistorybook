// In-memory implementation of the Blobs atomic-write contract. No network or paid API calls.
const assert=require('node:assert/strict'),Module=require('node:module'),{randomUUID}=require('node:crypto');
const stores=new Map();let sequence=0;
const clone=v=>JSON.parse(JSON.stringify(v));
const nativeLoad=Module._load;
Module._load=function(name,...args){if(name==='@netlify/blobs')return {getStore({name}){
 if(!stores.has(name))stores.set(name,new Map());const rows=stores.get(name);
 const set=async(k,data,options={})=>{const old=rows.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++sequence);rows.set(k,{data,etag});return {modified:true,etag};};
 return {get:async(k,{type}={})=>{const row=rows.get(k);if(!row)return null;if(type==='arrayBuffer')return row.data;if(type==='stream')return new Blob([row.data]).stream();return clone(row.data);},getWithMetadata:async(k)=>{const row=rows.get(k);return row?clone(row):null;},setJSON:(k,v,o)=>set(k,clone(v),o),set,list:async function*({prefix}){yield {blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}};}};return nativeLoad.call(this,name,...args);};
Object.assign(process.env,{NANGMAN_STORAGE:'netlify',NANGMAN_CLOUD_ENABLED:'1',NETLIFY:'true',CONTEXT:'production',NANGMAN_PUBLIC_URL:'https://example.test',NANGMAN_ADMIN_BRIDGE_SECRET:'fixture-admin-connection-secret-123456789',NANGMAN_WORKER_SECRET:'fixture-background-secret-123456789',OPENAI_API_KEY:'fixture-not-a-real-key'});
const root='../.cloud-test-build/',orders=require(root+'src/lib/storybook/story-orders'),sign=require(root+'src/lib/storybook/cloud-signing'),bridge=require(root+'src/app/api/storybook/admin-bridge/route'),story=require(root+'src/app/api/office/story/route'),art=require(root+'src/app/api/storybook/illustrations/route'),worker=require(root+'netlify/functions/storybook-task-background').default;
const jobs=[];let textCalls=0,imageCalls=0,failImage=false,shortTexts=0;
global.fetch=async(url,init)=>{
 if(String(url).includes('/.netlify/functions/')){jobs.push(new Request(url,init));return new Response(null,{status:202});}
 if(String(url).endsWith('/v1/responses')){textCalls++;await new Promise(r=>setTimeout(r,15));const size=shortTexts>0&&shortTexts--?200:500;const chapters=Array.from({length:5},(_,i)=>({title:'장면 '+i,text:'친구들과 함께 사계절 숲을 걸으며 서로의 마음을 나누었어요. '.repeat(50).slice(0,size)}));return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({title:'공유 저장소 시험',chapters,note:'가상 데이터'})}]}]});}
 if(String(url).includes('/v1/images/')){imageCalls++;if(failImage)throw Error('Simulated unknown upstream outcome');return Response.json({data:[{b64_json:Buffer.from([255,216,255,217]).toString('base64')}]});}
 throw Error('Unexpected network: '+url);
};
const signed=(body,role='admin')=>{const raw=JSON.stringify(body);return new Request('https://example.test/api/storybook/admin-bridge',{method:'POST',headers:sign.signedHeaders(role,raw),body:raw});};
const customer=(path,code,body)=>new Request('https://example.test'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+code,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
async function run(){
 const id=randomUUID(),issue={action:'issue',id,transferConfirmed:true,customerLabel:'시험 가족'};
 const replay=signed(issue);assert.equal((await bridge.POST(replay.clone())).status,200);assert.equal((await bridge.POST(replay)).status,403);
 const issued=await Promise.all([bridge.POST(signed(issue)),bridge.POST(signed(issue))]);const codes=await Promise.all(issued.map(r=>r.json()));assert.equal(codes[0].code,codes[1].code);const code=codes[0].code;
 const bad=signed({action:'list'});bad.headers.set('x-nangman-signature','0'.repeat(64));assert.equal((await bridge.POST(bad)).status,403);
 const expired=signed({action:'list'});expired.headers.set('x-nangman-time',String(Date.now()-120000));assert.equal((await bridge.POST(expired)).status,403);
 const list=await (await bridge.POST(signed({action:'list'}))).json();assert.equal(list.source,'cloud');assert.equal(JSON.stringify(list).includes(code),false);
 let release;const gate=new Promise(r=>release=r);const mutations=Array.from({length:2},()=>orders.withOrder(id,async order=>{await gate;await orders.saveOrder({...order,operatorNote:randomUUID()});}));release();const outcomes=await Promise.allSettled(mutations);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 const requestId=randomUUID(),body={id:requestId,brief:'가족과 계절 여행',styleId:'watercolor'};
 assert.equal((await story.POST(customer('/api/office/story',code,body))).status,202);
 const duplicate=await story.POST(customer('/api/office/story',code,{...body,id:randomUUID()}));assert.equal((await duplicate.json()).requestId,requestId);
 // The function runtime has no NETLIFY/CONTEXT variables: the invocation context must supply them, and a preview stays closed.
 delete process.env.NETLIFY;delete process.env.CONTEXT;const textTask=jobs.shift();
 await worker(textTask.clone(),{deploy:{context:'deploy-preview'}});assert.equal(textCalls,0);
 const production={deploy:{context:'production'}};await Promise.all([worker(textTask.clone(),production),worker(textTask.clone(),production)]);assert.equal(process.env.CONTEXT,'production');while(jobs.length)await worker(jobs.shift());assert.equal(textCalls,1);
 const restored=await (await story.GET(customer('/api/office/story',code))).json();assert.equal(restored.state,'completed');assert.equal(restored.book.id,requestId);
 const book=restored.book;assert.equal((await art.POST(customer('/api/storybook/illustrations',code,{action:'next',book}))).status,403);
 assert.equal((await art.POST(customer('/api/storybook/illustrations',code,{action:'start',book}))).status,200);
 const first=jobs.shift();await Promise.all([worker(first.clone()),worker(first.clone())]);while(jobs.length)await worker(jobs.shift());assert.equal(imageCalls,18);assert.equal((await orders.getOrder(id)).art.base.length,18);
 const asset=(await orders.getOrder(id)).art.base[0];assert.equal((await art.GET(customer('/api/storybook/illustrations?asset='+asset,code))).status,200);assert.equal((await art.GET(customer('/api/storybook/illustrations?asset='+asset,'NG-invalid'))).status,401);
 failImage=true;await art.POST(customer('/api/storybook/illustrations',code,{action:'revise',book,index:0,direction:'더 밝게'}));while(jobs.length)await worker(jobs.shift());assert.equal((await orders.getOrder(id)).art.job.reason,'uncertain');assert.equal((await art.POST(customer('/api/storybook/illustrations',code,{action:'revise',book,index:0,direction:'더 밝게'}))).status,409);
 failImage=false;await art.POST(customer('/api/storybook/illustrations',code,{action:'revise',book,index:0,direction:'더 밝게',confirmUncertain:true}));while(jobs.length)await worker(jobs.shift());assert.ok((await orders.getOrder(id)).art.alternative);assert.equal(imageCalls,20);
 const rotated=await (await bridge.POST(signed({action:'rotate',id,confirm:true}))).json();assert.notEqual(rotated.code,code);assert.equal((await story.GET(customer('/api/office/story',code))).status,401);assert.equal((await story.GET(customer('/api/office/story',rotated.code))).status,200);
 await bridge.POST(signed({action:'revoke',id,confirm:true}));assert.equal((await story.GET(customer('/api/office/story',rotated.code))).status,401);
 const remote=require(root+'src/lib/storybook/remote-admin');process.env.NANGMAN_REMOTE_URL='https://example.test';const earlierFetch=global.fetch;
 global.fetch=async(url,init)=>{assert.equal(url,'https://example.test/api/storybook/admin-bridge');assert.equal(new Headers(init.headers).has('x-nangman-signature'),true);assert.equal(JSON.stringify(init).includes('OFFICE_ADMIN_PASSWORD'),false);return new Response('Unavailable',{status:503});};
 await assert.rejects(()=>remote.remoteAdmin({action:'list'}));global.fetch=earlierFetch;
 // A queued request no worker claimed becomes recoverable instead of 'running' forever; only a confirmed retry replaces it.
 const lostId=randomUUID(),lost=await (await bridge.POST(signed({action:'issue',id:lostId,transferConfirmed:true}))).json(),lostBody={brief:'시작되지 않은 작업',styleId:'watercolor'};
 assert.equal((await story.POST(customer('/api/office/story',lost.code,{...lostBody,id:randomUUID()}))).status,202);jobs.length=0;
 await orders.withOrder(lostId,async order=>orders.saveOrder({...order,request:{...order.request,startedAt:Date.now()-300000}}));
 assert.equal((await (await story.GET(customer('/api/office/story',lost.code))).json()).state,'paused');assert.equal(jobs.length,0);
 assert.equal((await story.POST(customer('/api/office/story',lost.code,{...lostBody,id:randomUUID()}))).status,409);
 const retryId=randomUUID();assert.equal((await story.POST(customer('/api/office/story',lost.code,{...lostBody,id:retryId,confirmUncertain:true}))).status,202);
 const textBefore=textCalls;while(jobs.length)await worker(jobs.shift());assert.equal(textCalls,textBefore+1);assert.equal((await (await story.GET(customer('/api/office/story',lost.code))).json()).book.id,retryId);
 // A too-short first draft is expanded once in the same task. A draft still short after that is a definite
 // failure: it reports the measured length and can be restarted without the uncertain-retry confirmation.
 const shortId=randomUUID(),shortOrder=await (await bridge.POST(signed({action:'issue',id:shortId,transferConfirmed:true}))).json();
 shortTexts=1;let before=textCalls;assert.equal((await story.POST(customer('/api/office/story',shortOrder.code,{...lostBody,id:randomUUID()}))).status,202);
 while(jobs.length)await worker(jobs.shift());assert.equal(textCalls,before+2);assert.equal((await (await story.GET(customer('/api/office/story',shortOrder.code))).json()).state,'completed');
 const stuckId=randomUUID(),stuck=await (await bridge.POST(signed({action:'issue',id:stuckId,transferConfirmed:true}))).json();
 shortTexts=2;before=textCalls;assert.equal((await story.POST(customer('/api/office/story',stuck.code,{...lostBody,id:randomUUID()}))).status,202);
 while(jobs.length)await worker(jobs.shift());assert.equal(textCalls,before+2);
 const stuckState=await (await story.GET(customer('/api/office/story',stuck.code))).json();assert.equal(stuckState.state,'paused');assert.match(stuckState.error,/story_short, 1000자/);
 assert.equal((await story.POST(customer('/api/office/story',stuck.code,{...lostBody,id:randomUUID()}))).status,202);while(jobs.length)await worker(jobs.shift());
 assert.equal((await (await story.GET(customer('/api/office/story',stuck.code))).json()).state,'completed');
 process.env.CONTEXT='deploy-preview';assert.equal((await story.GET(customer('/api/office/story',rotated.code))).status,403);assert.equal((await bridge.POST(signed({action:'list'}))).status,503);
 console.log('PASS cloud: signed admin bridge, replay/expiry, atomic claims, one text + 18 images, private assets, uncertain retry, rotate/revoke, preview isolation (all APIs mocked)');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

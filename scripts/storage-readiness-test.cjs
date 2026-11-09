// No network, secrets, customer data, or paid AI requests.
const assert=require('node:assert/strict'),Module=require('node:module');
let read=async()=>null;
const load=Module._load;
Module._load=function(name,...args){
 if(name==='@netlify/blobs')return {getStore:({fetch})=>({get:()=>read(fetch)})};
 return load.call(this,name,...args);
};
const {storageReadiness}=require('../.cloud-test-build/src/lib/storybook/storage-readiness');
const {cloudConfigurationIssue,cloudCustomerRequest}=require('../.cloud-test-build/src/lib/storybook/cloud-config');
const logs=[],info=console.info,warn=console.warn;
console.info=(...args)=>logs.push(args.join(' '));console.warn=console.info;
async function run(){
 Object.assign(process.env,{NANGMAN_STORAGE:'netlify',NANGMAN_CLOUD_ENABLED:'1',NETLIFY:'true',CONTEXT:'production',NANGMAN_PUBLIC_URL:'https://example.test',NANGMAN_ADMIN_BRIDGE_SECRET:'a'.repeat(33),NANGMAN_WORKER_SECRET:'b'.repeat(37)});
 assert.equal(cloudConfigurationIssue(),null);
 const request=headers=>new Request('http://internal:3000/api/check',{headers});
 assert.equal(cloudCustomerRequest(request({host:'example.test',origin:'https://example.test'})),true);
 assert.equal(cloudCustomerRequest(request({host:'example.test',origin:'https://other.test'})),false);
 assert.equal(cloudCustomerRequest(request({host:'other.test','x-forwarded-host':'example.test'})),false);
 process.env.CONTEXT='deploy-preview';assert.equal(cloudCustomerRequest(request({host:'example.test'})),false);process.env.CONTEXT='production';
 assert.equal(await storageReadiness(30),null);
 read=async()=>{const error=new Error('private upstream details');error.name='MissingBlobsEnvironmentError';throw error;};
 assert.equal(await storageReadiness(30),'storage_context_missing');
 read=async()=>{const error=new Error('private upstream details');error.name='BlobsConsistencyError';throw error;};
 assert.equal(await storageReadiness(30),'storage_consistency_configuration');
 read=()=>new Promise(()=>{});
 assert.equal(await storageReadiness(15),'storage_timeout');
 global.fetch=async(_url,init)=>{assert.equal(init.cache,'no-store');assert.ok(init.signal);return new Response(null,{status:503});};
 read=async fetch=>{await fetch('https://storage.example.test/private-path',{headers:{authorization:'private-test-token'}});return new Promise(()=>{});};
 assert.equal(await storageReadiness(15),'storage_http_503');
 assert.equal(logs.some(line=>/private|authorization|storage\.example/.test(line)),false);
 info('Storage readiness: timeout, HTTP failure, missing context, consistency, safe logs, no-cache transport and request origin checks passed.');
}
run().catch(error=>{console.info=info;console.warn=warn;console.error(error);process.exitCode=1;});

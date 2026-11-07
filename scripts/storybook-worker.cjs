// Local-only durable queue. It reads order files but updates them only through
// the authenticated application route, preserving its locking and validation.
const fs=require('node:fs/promises');
const path=require('node:path');
const origin=new URL(process.argv[2]||'http://127.0.0.1:3000');
if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1')throw Error('Local worker origin required');
const directory=path.join(process.cwd(),'.office-data','storybook-orders');
const lockPath=path.join(directory,'worker-'+origin.port+'.lock');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function send(order,action){
 const response=await fetch(origin.origin+'/api/storybook/illustrations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+order.code},body:JSON.stringify({action,book:order.art.book||order.book}),signal:AbortSignal.timeout(245000)});
 return response.status;
}
(async()=>{
 await fs.mkdir(directory,{recursive:true});
 try{const handle=await fs.open(lockPath,'wx');await handle.writeFile(String(process.pid));await handle.close();}
 catch(error){
  if(error.code!=='EEXIST')throw error;
  const pid=Number(await fs.readFile(lockPath,'utf8'));
  if(!Number.isInteger(pid)||pid<=0)return;
  try{process.kill(pid,0);return;}catch(error){if(error.code!=='ESRCH')return;}
  await fs.unlink(lockPath).catch(()=>{});
  return; // A subsequent explicit start may acquire the cleared stale lock.
 }
 let idleSince=Date.now();
 try{
  while(Date.now()-idleSince<60000){
   let found=false;
   for(const name of await fs.readdir(directory)){
    if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;
    let order;try{order=JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));}catch{continue;}
    const job=order.art?.job;
 if(!order.code||!order.book||!job||job.origin!==origin.origin||!['queued','running'].includes(job.status))continue;
    found=true;idleSince=Date.now();
    const active=order.art.active;
    if(active&&Date.now()-active.startedAt<250000)continue;
    // Never spend again automatically if the prior paid request has an unknown outcome.
    if(job.status==='running'||job.inFlightIndex!==undefined){await send(order,'pause').catch(()=>{});continue;}
    try{const status=await send(order,'next');if(status!==200&&status!==409)await send(order,'pause');}catch{await send(order,'pause').catch(()=>{});await sleep(5000);}
   }
   await sleep(found?300:1500);
  }
 }finally{
  if(await fs.readFile(lockPath,'utf8').catch(()=>'')===String(process.pid))await fs.unlink(lockPath).catch(()=>{});
 }
})().catch(()=>{process.exitCode=1;});

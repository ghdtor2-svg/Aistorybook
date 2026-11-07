// Run on the owner's local server. Secret files stay in the ignored .office-data directory.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const directory=path.join(process.cwd(),'.office-data','cloud-connection');
async function readEnv(file){try{return Object.fromEntries((await fs.readFile(file,'utf8')).split(/\r?\n/).filter(line=>/^[A-Z_][A-Z0-9_]*=/.test(line)).map(line=>{const at=line.indexOf('=');let value=line.slice(at+1).trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);return [line.slice(0,at),value];}));}catch(error){if(error.code==='ENOENT')return {};throw error;}}
async function main(){
 const mode=process.argv[2];if(!['prepare','activate'].includes(mode))throw Error('Usage: node scripts/cloud-connection.cjs prepare|activate');
 if(mode==='prepare'){
  const env=await readEnv('.env.local');if(!env.OPENAI_API_KEY)throw Error('Local AI API connection is missing. No files changed.');
  await fs.mkdir(directory,{recursive:true,mode:0o700});
  const file=path.join(directory,'netlify.env'),existing=await readEnv(file);
  if(Object.keys(existing).length){console.log('Existing private setup preserved: '+file);return;}
  const admin=crypto.randomBytes(48).toString('hex'),worker=crypto.randomBytes(48).toString('hex');
  const content={NANGMAN_STORAGE:'netlify',NANGMAN_CLOUD_ENABLED:'1',NANGMAN_PUBLIC_URL:'https://nangman-hanjul.netlify.app',NANGMAN_ADMIN_BRIDGE_SECRET:admin,NANGMAN_WORKER_SECRET:worker,OPENAI_API_KEY:env.OPENAI_API_KEY,...(env.OPENAI_MODEL?{OPENAI_MODEL:env.OPENAI_MODEL}:{})};
  await fs.writeFile(file,Object.entries(content).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx',mode:0o600});
  console.log('Private Netlify settings prepared: '+file+'\nDo not send this file in chat or commit it. Local issuing remains unchanged.');return;
 }
 const settings=await readEnv(path.join(directory,'netlify.env'));
 if(!settings.NANGMAN_ADMIN_BRIDGE_SECRET||settings.NANGMAN_PUBLIC_URL!=='https://nangman-hanjul.netlify.app')throw Error('Private settings are missing or the destination is invalid.');
 const raw=JSON.stringify({action:'list'}),time=String(Date.now()),nonce=crypto.randomUUID();
 const signature=crypto.createHmac('sha256',settings.NANGMAN_ADMIN_BRIDGE_SECRET).update('admin\n'+time+'\n'+nonce+'\n'+crypto.createHash('sha256').update(raw).digest('hex')).digest('hex');
 const response=await fetch(settings.NANGMAN_PUBLIC_URL+'/api/storybook/admin-bridge',{method:'POST',headers:{'Content-Type':'application/json','X-Nangman-Time':time,'X-Nangman-Nonce':nonce,'X-Nangman-Signature':signature},body:raw,redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Online verification failed (HTTP '+response.status+'). Local configuration was not changed.');
 const data=await response.json();if(data.source!=='cloud'||!Array.isArray(data.orders))throw Error('Shared storage was not verified. Local configuration was not changed.');
 const ready=await fetch(settings.NANGMAN_PUBLIC_URL+'/api/storybook/availability',{redirect:'error',signal:AbortSignal.timeout(10000)});if(!ready.ok||(await ready.json()).ready!==true)throw Error('Customer creation is not ready. Local configuration was not changed.');
 const file=path.join(process.cwd(),'.env.local'),before=await fs.readFile(file,'utf8');
 await fs.copyFile(file,path.join(directory,'local-before-cloud.env'),fs.constants.COPYFILE_EXCL).catch(error=>{if(error.code!=='EEXIST')throw error;});
 const kept=before.split(/\r?\n/).filter(line=>!/^NANGMAN_(REMOTE_URL|ADMIN_BRIDGE_SECRET)=/.test(line)).join('\n');
 await fs.writeFile(file,kept.trimEnd()+'\nNANGMAN_REMOTE_URL='+settings.NANGMAN_PUBLIC_URL+'\nNANGMAN_ADMIN_BRIDGE_SECRET='+settings.NANGMAN_ADMIN_BRIDGE_SECRET+'\n',{mode:0o600});
 console.log('Verified cloud connection activated. Restart the local server. Existing local orders are preserved separately; they were not uploaded.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

import fs from 'node:fs';
import path from 'node:path';
import type {Artifact} from '../model';
export type Attempt={status:'reserved'|'success'|'uncertain'|'skipped';estimatedUsd:number;inputTokens?:number;outputTokens?:number};
export type Receipt={id:string;fingerprint:string;taskId:string;runId:string;projectId:string;month:string;model:string;createdAt:string;attempts:Attempt[];result?:Artifact;error?:string};
export type Ledger={version:1;monthlyBudgetUsd:number;receipts:Receipt[]};
export class LedgerStore{
 constructor(readonly dir=path.join(process.cwd(),'.office-data')){}
 read():Ledger{const file=path.join(this.dir,'ledger.json');if(!fs.existsSync(file))return {version:1,monthlyBudgetUsd:5,receipts:[]};const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!==1||!Array.isArray(data.receipts)||!Number.isFinite(data.monthlyBudgetUsd)||data.monthlyBudgetUsd<0)throw new Error('비용 원장을 읽을 수 없습니다.');return data;}
 write(data:Ledger){fs.mkdirSync(this.dir,{recursive:true});const temp=path.join(this.dir,'ledger.tmp');fs.writeFileSync(temp,JSON.stringify(data,null,2),{mode:0o600});for(let attempt=0;;attempt++){try{fs.renameSync(temp,path.join(this.dir,'ledger.json'));break;}catch(error){if(attempt>=4)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,75);}}}
 async locked<T>(work:(ledger:Ledger)=>Promise<T>|T):Promise<T>{fs.mkdirSync(this.dir,{recursive:true});let fd:number;try{fd=fs.openSync(path.join(this.dir,'ledger.lock'),'wx');}catch{throw new Error('다른 유료 작업이 처리 중이거나 원장이 잠겨 있습니다.');}try{return await work(this.read());}finally{fs.closeSync(fd);fs.unlinkSync(path.join(this.dir,'ledger.lock'));}}
}
export const month=()=>new Date().toISOString().slice(0,7);
export function totals(ledger:Ledger){const receipts=ledger.receipts.filter(r=>r.month===month());const sum=(rs:Receipt[])=>rs.reduce((a,r)=>a+r.attempts.reduce((n,t)=>n+t.estimatedUsd,0),0);return {month:month(),monthlyBudgetUsd:ledger.monthlyBudgetUsd,estimatedUsd:sum(receipts),projects:Object.fromEntries([...new Set(receipts.map(r=>r.projectId))].map(id=>[id,sum(receipts.filter(r=>r.projectId===id))])),calls:receipts.flatMap(r=>r.attempts).filter(a=>a.status!=='skipped').length};}


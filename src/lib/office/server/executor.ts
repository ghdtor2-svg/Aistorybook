import OpenAI from 'openai';
import {createHash} from 'node:crypto';
import {assertPaidApiDisabled} from './policy';
import {agentName,beginStep,currentRun,type Artifact,type Task} from '../model';
import {commonInstructions,redact,roleInstructions} from './prompts';
import {tokenCost,type LiveConfig} from './config';
import {LedgerStore,month,totals,type Ledger,type Receipt} from './ledger';
export type ProviderRequest={model:string;instructions:string;input:string;max_output_tokens:number;store:false};
export type ProviderResult={output_text:string;usage?:{input_tokens:number;output_tokens:number};status?:string};
export type Provider=(request:ProviderRequest,timeoutMs:number)=>Promise<ProviderResult>;
export function createOpenAIProvider(apiKey:string,fetcher?:typeof fetch):Provider{return async(request,timeoutMs)=>{
 if(!fetcher)assertPaidApiDisabled();
 const client=new OpenAI({apiKey,fetch:fetcher,baseURL:'https://api.openai.com/v1',maxRetries:0,timeout:timeoutMs});
 return await client.responses.create(request,{signal:AbortSignal.timeout(timeoutMs)});
};}
export const openAIProvider:Provider=(request,timeoutMs)=>createOpenAIProvider(process.env.OPENAI_API_KEY||'')(request,timeoutMs);
export function prepare(task:Task,config:LiveConfig){
 const started=beginStep(task,'live');const step=currentRun(started).steps.find(s=>s.status==='running')!;const input=step.input!;
 const instructions=commonInstructions+'\n'+roleInstructions[step.agentId];
 const sanitized={brief:redact(input.brief),feedback:redact(input.feedback),upstream:input.upstream.map(a=>({agentId:a.agentId,kind:a.kind,summary:redact(a.summary),items:a.items.map(redact),assumptions:a.assumptions.map(redact)}))};
 const serialized=JSON.stringify(sanitized);
 const inputCeiling=Buffer.byteLength(instructions+serialized,'utf8')+1024;
 if(inputCeiling>config.maxInputTokens)throw new Error('입력 크기가 토큰 상한을 넘습니다. 지시나 이전 산출물을 줄여 주세요.');
 const perAttempt=tokenCost(config,inputCeiling,config.maxOutputTokens);
 return {started,step,request:{model:config.model,instructions,input:serialized,max_output_tokens:config.maxOutputTokens,store:false} as ProviderRequest,inputCeiling,perAttempt,maxEstimatedUsd:perAttempt*config.maxAttempts,maxCalls:config.maxAttempts,id:task.id+':'+currentRun(task).id+':'+step.id,fingerprint:createHash('sha256').update(JSON.stringify({sanitized,model:config.model,max:config.maxOutputTokens})).digest('hex')};
}
export function preview(task:Task,config:LiveConfig,ledger:Ledger){const plan=prepare(task,config),total=totals(ledger);const usedCalls=ledger.receipts.filter(r=>r.taskId===task.id&&r.runId===currentRun(task).id).flatMap(r=>r.attempts).filter(a=>a.status!=='skipped').length;return {model:config.model,inputCeiling:plan.inputCeiling,maxOutputTokens:config.maxOutputTokens,maxCalls:plan.maxCalls,maxRunCalls:config.maxRunCalls,usedCalls,maxEstimatedUsd:plan.maxEstimatedUsd,allowed:total.estimatedUsd+plan.maxEstimatedUsd<=total.monthlyBudgetUsd&&usedCalls+plan.maxCalls<=config.maxRunCalls,totals:total};}
export async function execute(task:Task,config:LiveConfig,store:LedgerStore,provider:Provider=openAIProvider):Promise<Artifact>{
 const plan=prepare(task,config);
 return store.locked(async ledger=>{
  const old=ledger.receipts.find(r=>r.id===plan.id);
  if(old){if(old.fingerprint!==plan.fingerprint)throw new Error('같은 단계의 요청 내용이 변경되었습니다. 새 회차로 등록하세요.');if(old.result)return old.result;throw new Error('이 단계는 이미 시도되었습니다. 원장 확인 후 새 회차로 재작업하세요.');}
  const estimate=preview(task,config,ledger);if(!estimate.allowed)throw new Error('월간 예산 또는 회차별 API 호출 상한을 초과할 수 있어 차단했습니다.');
  const receipt:Receipt={id:plan.id,fingerprint:plan.fingerprint,taskId:task.id,runId:currentRun(task).id,projectId:task.projectId,month:month(),model:config.model,createdAt:new Date().toISOString(),attempts:Array.from({length:config.maxAttempts},()=>({status:'reserved',estimatedUsd:plan.perAttempt}))};
  ledger.receipts.push(receipt);store.write(ledger);
  for(let i=0;i<config.maxAttempts;i++){
   try{
    const response=await provider(plan.request,config.timeoutMs);
    const usage=response.usage;
    if(usage&&Number.isInteger(usage.input_tokens)&&usage.input_tokens>=0&&Number.isInteger(usage.output_tokens)&&usage.output_tokens>=0){receipt.attempts[i]={status:'success',inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,estimatedUsd:tokenCost(config,usage.input_tokens,usage.output_tokens)};}
    else receipt.attempts[i].status='uncertain';
    const text=redact(response.output_text?.trim()??'');
    if(!text)throw new Error('EMPTY_RESPONSE');
    const kinds={research:'requirements',developer:'implementation_plan',marketing:'marketing_draft',quality:'review'} as const;
    const artifact:Artifact={id:crypto.randomUUID(),agentId:plan.step.agentId,kind:kinds[plan.step.agentId],summary:agentName(plan.step.agentId)+' 실제 AI 결과',items:[text],assumptions:['모델 생성 내용이며 사실 검증·파일 수정·외부 실행 결과가 아닙니다.',...(response.status==='incomplete'?['출력 토큰 상한에 도달해 내용이 일부 잘렸을 수 있습니다.']:[])],simulation:false,createdAt:new Date().toISOString(),usage:{model:config.model,inputTokens:usage?.input_tokens??null,outputTokens:usage?.output_tokens??null,estimatedUsd:receipt.attempts[i].estimatedUsd,receiptId:receipt.id}};
    receipt.result=artifact;for(let n=i+1;n<receipt.attempts.length;n++)receipt.attempts[n]={status:'skipped',estimatedUsd:0};store.write(ledger);return artifact;
   }catch(error){
    if(receipt.attempts[i].status==='reserved')receipt.attempts[i].status='uncertain';
    const status=typeof error==='object'&&error!==null&&'status'in error?Number(error.status):0;
    const retry=i+1<config.maxAttempts&&(status===429||status>=500);
    receipt.error=retry?'일시적 API 오류로 제한된 재시도를 수행했습니다.':'API 오류·시간 초과 또는 응답 오류입니다. 불확실한 호출 비용은 상한 추정치로 유지됩니다.';
    if(!retry)for(let n=i+1;n<receipt.attempts.length;n++)receipt.attempts[n]={status:'skipped',estimatedUsd:0};
    store.write(ledger);if(!retry)throw new Error(receipt.error);
    await new Promise(resolve=>setTimeout(resolve,250));
   }
  }
  throw new Error('API 실행이 완료되지 않았습니다.');
 });
}


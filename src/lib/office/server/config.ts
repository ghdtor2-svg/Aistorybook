export type LiveConfig={model:string;inputRate:number;outputRate:number;maxInputTokens:number;maxOutputTokens:number;maxAttempts:number;maxRunCalls:number;timeoutMs:number};
export function liveConfig(env:NodeJS.ProcessEnv=process.env):LiveConfig{
 const model=env.OPENAI_MODEL||'gpt-4.1-mini';
 const inputRate=Number(env.OFFICE_INPUT_USD_PER_MILLION??(model==='gpt-4.1-mini'?'0.40':'NaN'));
 const outputRate=Number(env.OFFICE_OUTPUT_USD_PER_MILLION??(model==='gpt-4.1-mini'?'1.60':'NaN'));
 if(!Number.isFinite(inputRate)||!Number.isFinite(outputRate)||inputRate<=0||outputRate<=0)throw new Error('모델의 입력·출력 단가 설정이 필요합니다.');
 function limit(name:string,defaultValue:number,min:number,max:number){const n=Number(env[name]??defaultValue);if(!Number.isInteger(n)||n<min||n>max)throw new Error('실행 제한 설정을 확인하세요.');return n;}
 return {model,inputRate,outputRate,maxInputTokens:limit('OFFICE_MAX_INPUT_TOKENS',8000,1000,16000),maxOutputTokens:limit('OFFICE_MAX_OUTPUT_TOKENS',600,128,2000),maxAttempts:limit('OFFICE_MAX_ATTEMPTS',2,1,2),maxRunCalls:limit('OFFICE_MAX_RUN_CALLS',8,1,8),timeoutMs:limit('OFFICE_TIMEOUT_MS',20000,1000,30000)};
}
export function tokenCost(config:Pick<LiveConfig,'inputRate'|'outputRate'>,input:number,output:number){return (input*config.inputRate+output*config.outputRate)/1000000;}
export function liveEnabled(_env:NodeJS.ProcessEnv=process.env){return false;}
export function localAuthEnabled(env:NodeJS.ProcessEnv=process.env){return Boolean(env.OFFICE_ADMIN_PASSWORD&&env.OFFICE_ADMIN_PASSWORD.length>=16);}

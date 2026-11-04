export type DevelopmentEntry={id:string;recordedAt:string;title:string;summary:string;validation:string};
export type DevelopmentProgress={version:1;updatedAt:string;entries:DevelopmentEntry[]};
export function parseProgress(value:unknown):DevelopmentProgress{
 const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);const text=(v:unknown,n:number):v is string=>typeof v==='string'&&v.length<=n;const date=(v:unknown):v is string=>text(v,100)&&Number.isFinite(Date.parse(v));
 if(!record(value)||value.version!==1||!date(value.updatedAt)||!Array.isArray(value.entries)||value.entries.length>100)throw Error('개발 기록 형식을 확인하지 못했습니다.');
 const entries=value.entries.map(entry=>{if(!record(entry)||!text(entry.id,100)||!entry.id||!date(entry.recordedAt)||!text(entry.title,200)||!text(entry.summary,1000)||!text(entry.validation,1000))throw Error('개발 기록 항목을 확인하지 못했습니다.');return {id:entry.id,recordedAt:entry.recordedAt,title:entry.title,summary:entry.summary,validation:entry.validation};});if(new Set(entries.map(e=>e.id)).size!==entries.length)throw Error('중복된 개발 기록입니다.');return {version:1,updatedAt:value.updatedAt,entries};
}

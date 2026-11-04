export type OwnerAction={id:string;title:string;status:'pending'|'resolved';requestedAt:string;scope:string;destination:string;data:string;effect:string;reason:string;decisionWhere:string};
const keys=['id','title','requestedAt','scope','destination','data','effect','reason','decisionWhere'] as const;
export function parseOwnerActions(value:unknown):{version:1;actions:OwnerAction[]}{
 if(!value||typeof value!=='object'||Array.isArray(value)||(value as any).version!==1||!Array.isArray((value as any).actions)||(value as any).actions.length>100)throw Error('승인 요청 기록 형식이 올바르지 않습니다.');
 const actions=(value as any).actions.map((item:any)=>{if(!item||typeof item!=='object'||Array.isArray(item)||!['pending','resolved'].includes(item.status)||keys.some(key=>typeof item[key]!=='string'||!item[key].trim()||item[key].length>3000)||!/^[a-z0-9-]{1,100}$/.test(item.id)||!Number.isFinite(Date.parse(item.requestedAt)))throw Error('승인 요청 항목을 확인해 주세요.');const destination=new URL(item.destination);if(destination.protocol!=='https:'||destination.username||destination.password)throw Error('승인 요청 주소를 확인해 주세요.');return Object.fromEntries([...keys.map(key=>[key,item[key]]),['status',item.status]]) as OwnerAction;});
 if(new Set(actions.map((item:OwnerAction)=>item.id)).size!==actions.length)throw Error('승인 요청 번호가 중복되었습니다.');return {version:1,actions};
}

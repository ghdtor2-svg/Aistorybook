import type {Task} from './model';
export type ChatMessage={id:string;text:string;at:string;taskId?:string};
export function parseChat(raw:string|null):ChatMessage[]{
 if(raw===null)return [];if(raw.length>2000000)throw Error('대화 저장 용량을 확인하세요.');const data:unknown=JSON.parse(raw);
 if(!Array.isArray(data)||data.length>2000||!data.every(m=>m&&typeof m==='object'&&typeof m.id==='string'&&m.id&&typeof m.text==='string'&&typeof m.at==='string'&&(m.taskId===undefined||typeof m.taskId==='string')))throw Error('대화 기록 형식이 올바르지 않습니다. 원본은 보존했습니다.');
 if(new Set(data.map(m=>m.id)).size!==data.length)throw Error('중복된 지시 ID가 있습니다. 원본은 보존했습니다.');return data;
}
export function reconcileChat(messages:ChatMessage[],key:string,tasks:Task[]){
 const links=new Map<string,Set<string>>();
 for(const task of tasks)for(const history of task.history){if(history.action!=='채팅 지시 연결')continue;try{const proof=JSON.parse(history.detail);if(proof.key!==key||!Array.isArray(proof.ids)||!proof.ids.every((id:unknown)=>typeof id==='string'))continue;for(const id of proof.ids){const ids=links.get(id)??new Set<string>();ids.add(task.id);links.set(id,ids);}}catch{/* Invalid historical details are not proof. */}}
 let count=0;const next=messages.map(message=>{const candidates=links.get(message.id);if(!candidates?.size)return message;if(candidates.size!==1)throw Error('한 지시에 여러 업무 연결 기록이 있습니다. 자동으로 덮어쓰지 않았습니다.');const target=[...candidates][0];if(message.taskId&&message.taskId!==target)throw Error('대화와 업무의 연결 기록이 다릅니다. 원본을 보존했습니다.');if(message.taskId)return message;count++;return {...message,taskId:target};});
 return {messages:next,count};
}

// A valid read must remain valid after append/link; reject before replacing saved messages.
export function serializeChat(messages:ChatMessage[]){if(messages.length>2000)throw Error('대화는 최대 2,000건까지 보관할 수 있습니다. 기존 대화와 현재 입력은 유지했습니다.');const raw=JSON.stringify(messages);parseChat(raw);return raw;}

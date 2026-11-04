import {assignTask} from '../../../lib/agents';
import {createDemoResults} from '../../../lib/demo';
export const runtime='nodejs';
export async function POST(request:Request){
 let body;
 try {body=await request.json();}catch{return Response.json({error:'올바른 JSON 요청이 필요합니다.'},{status:400});}
 const prompt=body?.prompt;
 const mode=body?.mode??'auto';
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000)return Response.json({error:'업무 지시는 1~4000자여야 합니다.'},{status:400});
 if(!['auto','demo','live'].includes(mode))return Response.json({error:'지원하지 않는 실행 모드입니다.'},{status:400});
 // API 키 및 환경 설정과 관계없이 실제 호출을 차단합니다.
 if(mode==='live')return Response.json({error:'2단계에서는 실제 OpenAI 연결이 비활성화되어 있습니다. 데모 모드를 사용하세요.'},{status:503});
 const assignment=assignTask(prompt.trim());
 return Response.json({mode:'demo',assignment,results:createDemoResults(prompt.trim(),assignment)});
}

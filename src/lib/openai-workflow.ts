import OpenAI from 'openai';
import {agents,type Result} from './agents';
import {assertPaidApiDisabled} from './office/server/policy';
// 2단계에서는 라우트에서 호출하지 않는 기존 연동 코드입니다.
export async function runOpenAIWorkflow(prompt:string,apiKey:string){
 assertPaidApiDisabled();
 try{
  const client=new OpenAI({apiKey,timeout:60000,maxRetries:1});
  const results:Result[]=[];
  for(const agent of agents){
   const context=results.map(r=>`[${r.role}]\n${r.content}`).join('\n\n').slice(-16000);
   const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:`당신은 ${agent.role}입니다. ${agent.instructions} 한국어로 명료하게 답하라. 제공되지 않은 사실을 단정하지 마라.`,input:`[대표 업무 지시]\n${prompt.trim()}\n\n[앞선 직원의 작업 결과]\n${context||'없음'}`,max_output_tokens:1200});
   if(!response.output_text?.trim())throw new Error('Empty response');
   results.push({agentId:agent.id,role:agent.role,content:response.output_text});
  }
  return Response.json({mode:'live',results});
 }catch{console.error('AI workflow failed');return Response.json({error:'AI 작업 처리 중 오류가 발생했습니다. API 설정을 확인하거나 데모 모드로 재시도하세요.'},{status:500});}
}


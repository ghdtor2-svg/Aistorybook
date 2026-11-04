export const agents = [
 {id:'developer',icon:'💻',role:'AI 개발자',summary:'Next.js 개발 · API·DB 연동 · 구현·테스트·오류 수정',instructions:'Next.js 플랫폼, OpenAI API 및 데이터베이스 연동의 구현과 테스트 계획을 작성하라.',keywords:['개발','구현','코드','오류','버그','api','데이터베이스','db','next.js','연동','배포','로그인']},
 {id:'research',icon:'🔎',role:'AI 기획·리서치',summary:'서비스 기획 · 핵심·후속 질문 설계 · 시장 조사 · UX 개선',instructions:'동화 서비스 기획과 핵심·맞춤 후속 질문, 시장 조사, 사용자 경험 개선을 설계하라. 출처를 지어내지 마라.',keywords:['기획','리서치','질문','시장','경쟁','조사','고객','요구사항','맞춤','개인화']},
 {id:'marketing',icon:'📣',role:'AI 마케팅',summary:'인스타그램·블로그 · SNS 운영 · 광고·유입 · 콘텐츠 초안',instructions:'인스타그램과 블로그 콘텐츠 초안, SNS 운영, 광고 및 고객 유입 전략을 제안하라.',keywords:['마케팅','인스타','블로그','sns','광고','유입','홍보','콘텐츠','캠페인']},
 {id:'quality',icon:'🎨',role:'AI 품질관리·디자인',summary:'동화·사실 검수 · UI/UX 평가 · 디자인 시안 · 기능 테스트',instructions:'동화 내용과 사실관계, UI/UX, 디자인 가이드, 기능 테스트와 개선점을 검토하라.',keywords:['품질','디자인','검수','사실','ui','ux','테스트','검토','시안','접근성']}
] as const;
export type AgentId = typeof agents[number]['id'];
export type Assignment = {lead:AgentId; participants:AgentId[]; reason:string};
export type Result = {agentId:AgentId;role:string;content:string};

// 시스템 규칙으로 배정하며 별도의 총괄 직원이나 AI 호출을 사용하지 않습니다.
export function assignTask(prompt:string):Assignment {
 const text=prompt.toLowerCase();
 const scored=agents.map(agent=>({id:agent.id,score:agent.keywords.filter(word=>text.includes(word)).length}));
 const ranked=[...scored].sort((a,b)=>b.score-a.score);
 const lead=ranked[0].score>0?ranked[0].id:'research';
 const collaborators=scored.filter(a=>a.id!==lead&&a.score>0).map(a=>a.id);
 // 구현·콘텐츠 산출물은 품질 검토를 함께 배정합니다.
 if((lead==='developer'||lead==='marketing')&&!collaborators.includes('quality'))collaborators.push('quality');
 const participants:AgentId[]=[lead,...collaborators.filter(id=>id!=='quality'),...(collaborators.includes('quality')?['quality' as const]:[])];
 return {lead,participants,reason:ranked[0].score>0?'업무의 역할별 키워드 일치도를 기준으로 담당자를 정했습니다. 동점은 직원 목록 순서로 결정합니다.':'분야가 명확하지 않아 기획·리서치에 업무 구체화를 배정했습니다.'};
}

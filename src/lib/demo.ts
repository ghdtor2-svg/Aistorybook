import {agents,assignTask,type Result,type Assignment,type AgentId} from './agents';
const reports:Record<AgentId,string>={
 developer:'개발 산출물 초안\n1. Next.js 화면과 서버 API의 책임을 분리합니다.\n2. 데이터베이스 스키마·접근 권한·오류 응답을 설계합니다.\n3. 변경 범위를 구현하고 타입 검사·빌드·HTTP 회귀 검증을 수행하는 계획을 세웁니다.\n완료 기준: 요구사항별 테스트 통과. 이 보고서는 실제 코드 수정이나 테스트 실행 결과가 아닙니다.',
 research:'서비스 기획·리서치 초안\n핵심 질문 후보: 아이 연령, 관심사, 이야기의 목적.\n후속 질문 설계: 선택한 관심사와 목적에 맞는 상황·등장인물 선호를 추가 확인합니다.\n시장 조사 계획: 경쟁 서비스의 가격·맞춤 범위·개인정보 정책을 공식 자료에서 비교합니다.\nUX 개선: 질문 수를 줄이고 입력 이유와 예상 결과를 설명합니다.\n고객용 질문형 동화 생성 기능은 다음 단계의 범위이며 이번에는 설계 예시만 제공합니다. 외부 검색은 수행하지 않았습니다.',
 marketing:'마케팅 산출물 초안\n인스타그램: 맞춤 동화 제작 과정을 소개하는 카드 콘텐츠를 기획합니다.\n블로그: 아이의 관심사를 이야기로 연결하는 활용 예시를 소개합니다.\n콘텐츠 문안 예시: “우리 아이가 주인공인 이야기, 어떤 모험을 만나게 될까요?”\nSNS 운영: 채널별 반응을 비교하며 게시 주기와 소재를 조정합니다.\n광고·유입: 소규모 실험 후 클릭률·문의 수·전환 비용을 비교합니다. 예산·목표 수치는 대표와 합의합니다. 실제 게시나 광고 집행은 하지 않습니다.',
 quality:'품질관리·디자인 검토 초안\n동화: 연령 적합성, 이야기 일관성, 사실과 창작 표현의 구분을 확인합니다.\nUI/UX: 질문 이해도, 모바일 가독성, 키보드 접근성, 오류 복구 흐름을 평가합니다.\n디자인 가이드: 일관된 색상·글자 크기·버튼 상태와 동화 미리보기 시안을 계획합니다.\n기능 검증 계획: 정상·빈 입력·초과 길이·실패 응답을 확인합니다.\n개선 의견: 담당자·완료 기준·근거 자료를 확정하세요. 실제 사실 검증이나 기능 테스트를 수행한 결과는 아닙니다.'
};
export function createDemoResults(prompt:string,assignment:Assignment=assignTask(prompt)):Result[]{
 const results:Result[]=[];
 for(const id of assignment.participants){
  const agent=agents.find(a=>a.id===id)!;
  const context=results.map(r=>`[${r.role}] ${r.content}`).join('\n\n');
  results.push({agentId:id,role:agent.role,content:`[데모 · 규칙 기반 예시]\n대표 요청: ${prompt}\n담당: ${id===assignment.lead?'주 담당':'협업'}\n\n${reports[id]}${context?'\n\n[앞선 직원 결과 인계]\n'+context:''}`});
 }
 return results;
}

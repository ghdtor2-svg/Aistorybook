# AI OFFICE 6-2 — 네 직원 GPT 연결 및 사계절 3D 화면 통합

기준일: 2026-11-02, Asia/Seoul. 상태: 구현·빌드·회귀 검증 완료, 로컬 적용.

## 변경된 진행 방향

사용자가 Gemini 연결 대신 GPT만으로 네 직원을 연결하도록 요청했다. 개발자·기획/리서치·마케팅·품질관리/디자인이 동일한 Codex/ChatGPT 구독 연결을 사용하며 역할별 지침으로 구분된다. 구독 한도는 공유된다. Gemini 연결은 진행하지 않았다.

## GPT 역할 연결

- CodexExecutor의 기획/리서치 역할 거부를 제거하고 기존 기획 지침을 사용한다.
- 구독 실행의 기획 데모 분기를 실제 Codex 실행으로 교체했다. 새 기획 결과의 kind는 requirements, simulation=false, provider=codex로 기록한다.
- 기획 역할에도 최초 실행 승인·로컬 인증·설정·개인 구독·한도·크레딧 검사를 동일하게 적용한다. 유료 API, 자동 유료 전환, 자동 재시도 및 외부 도구는 계속 차단한다.
- 새 구독 회차는 모든 역할의 실제 텍스트 결과를 사용한다. 데모 모드는 계속 규칙 기반이다.
- 예전에 저장된 기획 데모+Codex 혼합 회차는 원문과 simulation/service 표시를 보존한 채 다음 단계를 이어갈 수 있다. 데모 결과를 실제 GPT 결과로 재분류하지 않는다.
- 업무 순서·원장·중복 방지·반려/재작업·대표 승인 절차를 유지한다. 상시 자동 실행, 무인 반복 실행, 파일 적용·배포 자동화는 추가하지 않았다.
- 기획자는 전달된 자료를 바탕으로 기획 텍스트를 작성하며 외부 검색·실제 시장조사는 수행하지 않는다.

## 가져온 3D 사무실의 적용 범위

사용자가 내려받아 프로젝트 안에 넣어둔 원본 경로:

`aioffice-ed-main/aioffice-ed-main`

이 원본은 Next.js 16, React Three Fiber/Drei 기반 독립 데모다. 기존 운영 앱은 Next.js 15이므로 앱 전체나 package.json을 덮어쓰지 않고 아래 시각 구성요소를 통합했다.

- OfficeScene.tsx, scene/Primitives.tsx, scene/Mascot.tsx, scene/SeasonalDecor.tsx
- 카드용 MascotPortrait.tsx와 계절·배치 디자인 데이터

원본의 사계절 캐릭터, 책상, 나무, 회의 정원, 조명, 카메라를 재사용한다. 가져온 파일은 src/components/office3d에 보관하며 경로 별칭을 상대 경로로 바꿨다. 원본 폴더는 그대로 보존하고 루트 TypeScript 검사에서 제외했다.

원본 ID를 안정적인 업무 ID에 매핑한다.

| 캐릭터 | 원본 ID | 기존 업무 ID |
| --- | --- | --- |
| 겨울 눈송이 · 개발자 | dev | developer |
| 봄 꽃잎이 · 기획자 | planner | research |
| 여름 햇님이 · 품질관리/디자인 | design | quality |
| 가을 낙엽이 · 마케팅 | marketing | marketing |

Office3DPanel은 기존 Task/Run/Step에서 대기·진행·완료·오류 상태를 읽는다. GPT 호출 중인 다음 직원은 작업 중으로 표시한다. 캐릭터/카드 선택은 해당 업무 선택에 연결한다. 시점 초기화와 3D 접기/펼치기를 제공한다. 화면 표시만으로 AI를 호출하지 않는다.

원본의 임의 진행률, 모의 진행 타이머, 고정 협업 대화는 가져오지 않았다. 진행률을 시간으로 꾸미지 않고 실제 단계 완료 수를 표시한다. 기존 업무 등록·결과·대표 승인 UI와 localStorage 키를 유지했다. 스타일은 CSS module로 분리해 원본 전역 CSS/Tailwind로 기존 동화 화면이 덮이지 않게 했다. WebGL 실패 시 직원 카드와 기존 업무 UI는 계속 사용할 수 있다.

추가 패키지: three 0.181.0, @react-three/fiber 9.4.0, @react-three/drei 10.7.0, @types/three 0.181.0. 기존 Next/React 버전은 올리지 않았다. npm 설치 시 --ignore-scripts를 사용했다. 외부 모델·폰트·이미지 다운로드에 의존하지 않는다.

## 검증 결과

- TypeScript: live/office 테스트 컴파일 및 전체 noEmit 검사 통과.
- subscription 모의 테스트: 네 역할, GPT 기획→개발→품질 인계, 기획→마케팅, 과거 혼합 데모 회차 복원/이어가기, 기획 최초 승인 잠금, 원장·중복·보안/크레딧 차단 통과.
- live/office 기존 모의 테스트 통과. 실제 유료 API 호출 없음.
- npm run build: 종료 코드 0, Next.js 15.5.28 컴파일·타입·페이지 생성 통과.
- npm run test:browser: 8개 통과. 독립 테스트 브라우저에서 동화 저장/수정·복원, 업무 승인/반려·재작업, 구독 잠금·데모 전환, 질문 상한과 외부 호출 차단 검증.
- 실제 사용자 화면: 기존 localhost:3000/office 탭을 최신 빌드로 새로고침해 3D 사무실 렌더링과 기획자 카드 선택을 확인했다.

## 실제 기획 GPT 검증

비민감한 기획 업무를 1회 실행했다. exclusive 영수증과 별도 원장으로 반복 실행을 막았다.

- role: research
- status: completed
- model: gpt-6.1-sol
- kind: requirements
- turn/start: 1회
- 자동 재시도: 0회

응답:

> 목표: 아이가 쉽게 동화를 시작하는 첫 화면.
> 제안 요구사항: ① ‘동화 시작’ 버튼 강조 ② 연령별 추천 제공.
> 완료 기준: ① 한 번 눌러 동화 선택 화면 진입 ② 추천에 연령 표시.
> 다음 직원 인계: 디자이너에게 화면 구성 전달.
> 제약: 외부 조사·파일 작업 없음. 기존 /office·/storybook·저장·수정 기능 보존. 위 내용은 창작 제안.

구독 사용량이 소비될 수 있다. 추가 유료 API·크레딧 구매는 없었다. 마케팅·품질관리 역할은 모의 검증을 통과했지만 이번 작업에서 별도 실제 호출은 하지 않았다. 네 직원이 한 업무를 연속 실행하는 실제 종단 검증은 아직 수행하지 않았다.

## 보존·기록과 화면 확인

인증 파일·.env.local·기존 .office-data·브라우저 업무/동화 저장 데이터를 직접 변경하거나 초기화하지 않았다. 원본 3D 프로젝트도 보존했다. 변경 전 소스·설정·패키지 파일은 다음 경로에 백업했다.

`C:\Users\samsung-user\Documents\ChatGPT\Ai동화\stage6-2-work\backup-2026-11-02`

실제 검증 영수증: 같은 작업 폴더의 planning-verification-2026-11-02.json.

검증용 구독 원장: 같은 작업 폴더의 planning-proof-ledger/subscription.json. 기존 사무실 업무 원장과 분리했으며 검증 업무를 사용자 브라우저 업무 목록에 자동 등록하지 않았다.

화면 캡처: 같은 작업 폴더의 office-gpt-3d-2026-11-02.png.

미리보기: http://localhost:3000/office (127.0.0.1:3000에만 바인딩). 확인용 서버 PID: 35288. 로컬 관리자 로그인 후 GPT 구독 모드를 선택하고 업무를 등록해 다음 직원을 단계별로 실행할 수 있다. 기본 모드는 데모이며 자동 추론을 시작하지 않는다.

외부 게시·배포는 하지 않았다. 이전 문서에 쓰인 '다음 단계 Gemini 연결'은 이번 사용자의 GPT 전용 요청으로 대체되었다.

## 공식 참고

- OpenAI Docs: https://learn.chatgpt.com/docs/app-server
- React Three Fiber 설치/React 호환성: https://r3f.docs.pmnd.rs/getting-started/installation

문서 열람 및 로컬 검증 기준일: 2026-11-02.

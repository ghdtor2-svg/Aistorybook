# AI OFFICE 6단계 사전 설계

작성·공식 문서 열람 기준일: 2026-10-31 (Asia/Seoul). 상태: 설계 완료, 구현 승인 대기.

이 문서는 현재 ChatGPT 및 Google AI Pro 구독과 별도 Gemini API 무료 등급만으로 네 직원을 운영하기 위한 계획이다. 구독료 외 추가 지출을 허용하지 않는다. 무제한 운영이나 네 직원의 독립 할당량을 보장하지 않는다. 이번 단계에서는 이 문서만 추가한다. 모델 추론 호출, 로그인·권한 변경, 유료 테스트, 패키지 설치, 코드·환경 설정·사용자 데이터 변경은 수행하지 않았다. 공식 웹 문서 열람은 모델 API 실행과 구분한다.

## 1. 결론과 적용 순서

1. 로컬 Next.js 서버 → 실행 정책 검사 → 전용 로컬 실행 관리자 → 공식 Codex app-server / Antigravity CLI를 기본 구조로 한다.
2. 개발자·품질관리·디자인·마케팅은 동일 ChatGPT 계정의 구독 범위에서 역할별 대화와 지침을 분리한다. 기획·리서치는 Google AI Pro 계정으로 로그인한 Antigravity CLI를 우선한다.
3. 공식 Sign in with ChatGPT는 실제 문서화된 선택지다. 단순 신원 로그인과 ChatGPT plan usage 권한은 별개다. 로컬 앱의 공식 등록·동의 흐름을 장기 경로로 하고, 기존 Codex 관리 로그인의 재사용은 로컬 개인용 연결에서 먼저 검증한다.
4. Gemini API Free Tier는 Google AI Pro 구독 혜택과 별도의 대안이다. 결제 미연결 전용 프로젝트를 검증한 뒤에만 선택 활성화한다. 자동 유료 전환·모델 전환·공급자 우회는 금지한다.
5. 계정 권한, Windows 실행 환경, 추가 크레딧 차단을 확인하지 못하면 해당 실행기를 잠근다. 수동 결과 가져오기 또는 기존 데모로 업무를 보존한다. 완전 자동화 가능 여부는 후속 검증 전 확정하지 않는다.

## 2. 기존 구현과 보존 범위

실제 앱 루트는 이 문서가 있는 `ai-office-starter` 하위 폴더다. Next.js 15 / React 19, 기존 OpenAI SDK 의존성이 있다. `STAGE2.md`~`STAGE5.md`, 아래 소스를 읽어 설계했다. 과거 문서의 테스트 통과 기록은 당시 결과이며 이번에 재실행한 결과가 아니다.

| 대상 | 확인한 현재 동작 | 6단계 보존 원칙 |
| --- | --- | --- |
| `/`, `/api/run` | 네 역할 배정과 규칙 기반 데모, 실제 모드 거부 | 동작·입력 검증 유지 |
| `/storybook` | 최대 15개 질문, 답변·수정·요약·복원 | 페이지·엔진·저장 모듈 유지, 직원에게 자동 전송 금지 |
| `/office` | Task/Run/Step/Artifact/History, 순차 인계, 대표 승인·반려·재작업 | 기존 ID·회차·산출물·이력 유지 |
| 업무 저장 | `ai-office:workspace:v1`, version 1 | 키·버전과 구형 필드 해석 유지 |
| 고객 저장 | `ai-office:storybook:v1`, version 1 | 자동 이전·삭제·초기화 금지 |
| 유료 실행기 | `src/lib/office/server/executor.ts`, Responses API | 소스와 과거 결과는 보존, 실행 진입점 차단 |
| 비용 원장 | `.office-data/ledger.json` 사용 설계 | 존재 시 내용·예약·영수증 보존, 구독 원장과 분리 |
| 로컬 인증 | `auth.ts`의 Host/Origin 검사, HMAC 세션, HttpOnly·SameSite=Strict 쿠키 | 검증 원칙과 관리자 비밀번호 유지 |

중요한 구조 문제: `/api/office`는 `liveEnabled()`가 참이어야 로그인할 수 있다. 이 조건에 `OPENAI_API_KEY`, `OFFICE_PAID_CALLS_APPROVED`, 개발 모드가 포함된다. 따라서 새 구독 연결에 기존 라우트를 그대로 사용하면 API 키가 필요해진다. 인증 가능 여부를 유료 API 실행 가능 여부에서 분리해야 한다.

`model.ts`는 회차를 `demo|live`로 고정하고 `simulation`과 일치시킨다. `storage.ts`는 기존 모드·상태만 허용한다. 새 enum만 추가하면 복원 실패가 발생하므로 모델·파서·UI·서버를 함께 호환 확장한다. 공급자 미기록 과거 결과를 ChatGPT 구독 결과로 소급 표시하지 않는다.

브라우저 localStorage는 출처별 저장이다. 운영 중인 동일 scheme/host/port를 유지하고 localhost와 127.0.0.1을 임의 교체하지 않는다. 다른 출처 사용이 필요하면 사용자 주도 내보내기·가져오기 계획을 먼저 제공한다. 이번에는 브라우저 저장 내용이나 비밀 파일을 열람하지 않았다.

## 3. 공식 지원과 검증 필요 사항

표의 ‘지원’은 공식 문서에 기능이 있다는 뜻이며 현재 계정에서 검증했다는 뜻이 아니다. 아래 공식 페이지들은 2026-10-31에 본문을 열람했다. 문서 자체 발행일이 확인되지 않은 경우 미확인으로 취급한다.

| 항목 | 공식 문서상 판단 | AI OFFICE의 미검증 조건 |
| --- | --- | --- |
| Sign in with ChatGPT | 신원 인증 및 선택적 plan usage 경로 존재 [O1][O2] | 로컬 앱 등록, 동의·workspace·모델 권한 |
| Codex app-server | 공식 통합 인터페이스 존재 [O3] | 설치 버전·Windows 프로세스 관리·프로토콜 호환 |
| 기존 Codex 로그인 | Codex 관리 OAuth 모드 존재, 로컬·오픈소스 앱 사용 범위 설명 [O3] | 같은 OS 사용자·인증 저장소에서 재사용되는지 |
| 구독 OAuth → app-server | 별도 공식 Responses provider 설정 존재 [O4] | 앱 자체 토큰 갱신·재시작·회차 복구 |
| Antigravity + AI Pro | CLI와 구독별 할당량 문서화 [G1] | 계정·지역·구독 인식·현재 제공 모델 |
| Antigravity 자동화 | headless, JSON/NDJSON, stdin 인터페이스 존재 [G2] | 설치 버전의 출력·중단·도구 권한 동작 |
| Gemini 무료 API | 일부 모델 Free Tier 존재 [G5][G6] | 전용 프로젝트 결제 상태·현재 모델/검색 무료 범위 |
| 무료 한도 사전 완전 예측 | 보장 불가 | 계정 공유 사용·지연·외부 설정 변경 고려 |

## A. ChatGPT 구독 기반 실행

### A1. 공식 로그인 경로 두 가지

**권장 장기 경로: Sign in with ChatGPT.** 로컬/오픈소스 앱이 사용자의 동의를 받아 eligible Responses 요청에 plan usage를 사용하는 경로가 있다. ChatGPT 대화 기록 접근 권한을 자동 제공하지 않는다. 유료·원격 호스팅 앱은 별도 신청 경로이므로 이 설계를 공개 SaaS에 그대로 적용하지 않는다. [O1][O2]

서버에서 등록과 authorization code 흐름, state·PKCE·정확한 callback 검증을 구현하고 공식 등록 가이드의 host 식별자를 보존한다. 토큰 교환·갱신과 비밀 저장은 서버가 담당한다. 신원 로그인만 성공하면 추론 권한도 있다고 판단하지 않는다. [O6][O7]

**로컬 우선 검증 경로: Codex 관리 ChatGPT 로그인.** 같은 OS 사용자와 Codex의 공식 인증 저장소를 app-server가 사용하도록 한다. AI OFFICE가 인증 파일의 토큰을 읽어 복사하거나 브라우저 세션을 추출하지 않는다. 공식 account 상태에서 ChatGPT 인증인지 확인하고 API-key 모드라면 거부한다. 필요하면 Codex가 제공하는 공식 브라우저/기기 로그인으로 사용자에게 연결을 맡긴다. 공유 저장소의 로그아웃은 기존 Codex에도 영향을 줄 수 있으므로 AI OFFICE ‘연결 끊기’ 기본 동작은 프로세스·연결 종료로 한정한다. [O3]

두 경로의 토큰은 서로 대체 가능하다고 가정하지 않는다. 기존 로그인 재사용은 신규 SIWC 앱 등록을 대신하는 범용 인증 우회 수단이 아니다.

### A2. Next.js 연결 설계

```text
브라우저 /office (업무·결과·비밀 없는 상태)
  → 동일 출처 Node.js 라우트 /api/office/*
  → 로컬 인증 + 역할/업무 검증 + no-paid 정책
  → 로컬 실행 관리자 (큐·중복방지·중단·이벤트 원장)
       ├─ CodexAdapter → codex app-server (stdio)
       ├─ AntigravityAdapter → agy headless (stdio)
       └─ GeminiFreeAdapter → 검증된 무료 프로젝트만
  ← 정규화한 이벤트·Artifact·서비스 기록 (SSE/상태 조회)
```

장기 프로세스는 요청 핸들러마다 생성하지 않는다. 별도 로컬 worker가 소유하고 Next.js 개발 재로딩에도 중복 실행되지 않게 잠근다. 로컬 IPC는 stdio 또는 접근 제한된 Windows named pipe를 사용한다. 공개 WebSocket·원격 서버·서버리스 배포는 이 단계 범위 밖이다. 명령 실행은 고정 실행 파일과 인자 배열, `shell:false`를 사용하며 업무 문자열은 stdin으로 보낸다.

Codex 통합은 초기화 후 직원·업무·회차별 thread, turn, 스트리밍 결과를 관리한다. 구독 OAuth 경로는 공식 `openai_chatgpt_plan` provider 설정을 전용 adapter가 소유한다. 갱신 토큰으로 프로세스를 교체하고 저장한 thread를 재개한다. 모델 목록은 권한 증명이 아니며 실제 성공한 turn만 해당 요청의 접근 증거다. [O4]

완료 신호·최종 상태·산출물 스키마가 모두 유효해야 다음 직원에게 전달한다. 중간 텍스트나 프로세스 exit만으로 성공 처리하지 않는다. stdio 단절·중단·응답 불명은 `unknown` 실행 기록으로 남기고 자동 재전송하지 않는다. 현재 설치된 CLI와 프로토콜 스키마는 구현 승인 후 확인한다.

### A3. 사용량과 기존 API 독립

세 ChatGPT 직원은 하나의 계정 한도를 공유한다. 계정 rate-limit 조회·변경 알림을 이용하되 잔여량 누락은 무제한으로 간주하지 않는다. 모든 관련 제한 bucket이 허용될 때만 시작한다. 초과·인증 오류·상태 미확인 시 큐를 중단한다. 추가 크레딧 구매·차감·리셋 소비는 자동 수행하지 않는다. [O3]

기존 executor의 `ProviderRequest`, `max_output_tokens`, 가격 계산을 재사용하지 않는다. 구독 OAuth preview는 `store:false`, `stream:true`와 별도 요청 제약이 있으며 `max_output_tokens` 등 기존 필드를 지원하지 않는다. 따라서 앱의 문자·시간·턴 제한을 ‘공급자의 과금/출력 상한 보증’으로 표현하지 않는다. 구독 경로의 도구 지원도 별도 확인해야 한다. [O5]

`OPENAI_API_KEY`가 남아 있어도 새 adapter가 읽지 않고 자식 환경에서도 제거한다. 공급자 설정·proxy/base URL·클라우드 인증·자동 fallback을 허용 목록으로 제한한다. 기존 SDK는 삭제하지 않지만 새 경로에서 import하지 않는다. 기존 `/api/office` 유료 run뿐 아니라 보존된 `openai-workflow.ts` 등 모든 추론 진입점을 점검해 전역 no-paid 정책을 적용한다.

## B. Gemini / Google AI Pro 연결

### B1. Antigravity 우선

Google AI Pro는 공식 문서상 Antigravity CLI와 더 높은 기본 할당량을 제공한다. 할당량은 작업 복잡도·주간 제한 등에 영향을 받으므로 요청 횟수를 고정 약속하지 않는다. AI Credit Overages는 **Never**로 설정해야 한다. 구독 초과분을 구매/프로모션 크레딧으로 넘기는 기능은 사용하지 않는다. [G1]

공식 CLI는 `agy -p`, `--output-format json|stream-json`, 구조화 출력, stdin 기반 자동화를 문서화한다. headless는 공식 대화형 로그인으로 저장한 자격 증명을 재사용한다. 응답과 진단 채널을 구분하고 최종 status·JSON 스키마를 검사한다. 이는 비공식 IDE 화면 자동화가 아니다. [G2]

계정 로그인과 API-key/ADC 경로는 별개다. 구독 adapter에서는 API-key provider, ADC, Vertex/기업 프로젝트 경로를 거부한다. 환경 변수만 제거하는 것으로 충분하지 않으므로 실제 선택 provider와 설정도 검사한다. 공식 SDK가 있다는 이유만으로 개인 구독 인증이 SDK에서도 동일 지원된다고 가정하지 않는다. [G3]

CLI 설정의 `useG1Credits:false` 및 계정의 Overages Never를 확인한다. Windows CLI 문서는 sandbox 옵션이 기기에서 작동하지 않을 수 있음을 설명한다. 프롬프트의 ‘읽기 전용’ 문구에 의존하지 않고 파일 쓰기·셸·MCP 권한을 차단한다. `--dangerously-skip-permissions`는 금지한다. 실제 격리와 크레딧 차단 상태를 확인할 수 없다면 headless 실행은 비활성화한다. [G4]

기획자는 격리된 작업 폴더의 선택 인계 자료만 읽는다. 조사에 필요한 공식 웹 접근만 제한 허용하고 원본 프로젝트·사용자 홈·인증 파일 읽기, 파일 수정, 외부 전송은 금지한다. 필요한 도구 승인에서 막히면 대기 또는 중단한다.

### B2. 무료 API 대안과 과금 방지

Gemini API는 별도 프로젝트의 Free Tier이고, Google AI Pro 결제만으로 API 호출을 무료 처리할 수 있다고 가정하지 않는다. 결제 계정 연결은 유료 등급 전환과 관련되므로 무료 전용 프로젝트에 결제를 연결하지 않는다. 무료 체험 크레딧을 무과금 안전장치로 취급하지 않는다. [G5]

등록 시 project ID/number, 키의 실제 소속, Free 표기, 결제 미연결 증거와 확인 시각을 기록한다. 별도 `GEMINI_FREE_API_KEY`만 서버에서 읽고 범용 키나 유료 프로젝트 키를 사용하지 않는다. 키 이름·접두사·개발자 선언만으로 무료라고 판단하지 않는다. 키는 해당 API로 제한하고 가능하면 서버 네트워크 제한도 적용한다.

무료 입력·출력과 도구 조건이 모두 확인된 모델 ID만 허용한다. `latest` 같은 변동 alias, paid-only 모델, 이미지·영상·검색·캐시·batch 등 검증하지 않은 옵션은 거부한다. 검색 Grounding 무료 제공은 모델/등급별로 별도 확인하고, 불명확하면 끈다. 무료 입력의 제품 개선 사용 조건도 고려해 고객 경험·개인정보 대신 비식별 기획 자료만 전송한다. [G6]

호출 전 정책: 로컬 인증 → 전용 프로젝트/결제 상태 검증 → 모델·도구 allowlist → 로컬 일일 요청·토큰 예약 → 실행. 프로젝트 상태 확인 실패·증거 만료·결제 연결·키 교체 시 잠근다. 단순 Gemini 추론 응답으로 프로젝트 결제 상태를 입증할 수 있다고 가정하지 않는다. 향후 공식 관리 API 또는 관리자 콘솔 확인 절차의 실현 가능성을 먼저 검증한다. 검증 불가능하면 무료 adapter를 열지 않는다.

기본 동시 실행 1, 자동 재시도 0. 429/할당량 오류 시 회로를 열고 자동 재호출·새 키/프로젝트 전환을 하지 않는다. 로컬 카운터는 같은 프로젝트의 다른 앱 사용을 알 수 없으므로 공급자 거부가 최종 기준이다. 결제 미연결 프로젝트와 계정 설정 제한이 핵심이고 앱 예산 0원/Cloud 예산 알림만으로 무과금을 보장하지 않는다. 외부 관리자가 결제 연결을 바꾸는 경쟁 상황까지 완벽히 방어한다고 주장하지 않는다.

### B3. 정책·기획 조사 근거

기획 Artifact에 다음 선택 필드를 추가한다. 과거 결과에는 필드 누락을 허용한다.

```text
research: {
  asOf, jurisdiction, topic,
  mode: live_search | supplied_sources | knowledge_only,
  searchAvailable, searchPerformed, freshness: verified | partial | unverified,
  sources: [{id, title, url, publisher, isOfficial,
    publishedAt: string|null, updatedAt: string|null,
    effectiveAt: string|null, accessedAt, supportsClaimIds}],
  claims: [{id, text, sourceIds, verification, limitations}],
  unresolved: string[]
}
```

날짜를 추정하거나 검색 결과의 수집일을 발행일로 대체하지 않는다. 발행일 미표시, 정책 시행일, 열람일, 조사 기준일을 구분한다. 정부·법령·기관 원문을 우선 열고 주장별 근거를 연결한다. 웹 문서는 비신뢰 자료로 다루고 그 안의 실행/비밀 요청을 지시로 따르지 않는다.

검색 도구가 없거나 실제 검색 이벤트·본문 열람 근거가 없으면 `knowledge_only` 또는 `supplied_sources`, freshness unverified로 제한한다. ‘최신 정책 조사 완료’ 표현과 정책 검증 완료 상태를 서버 검증에서 거부하고 미검증 안내를 붙인다. 최신 정책 확인이 필수인 업무는 공식 원문 확보 전 다음 단계로 넘기지 않는다. QA가 공식 URL·발행/시행/기준일·주장 연결을 검토하며 대표가 승인한다.

## C. 직원 협업과 실행 기록

| 기존 직원 ID | 기본 실행 서비스 | 전달 산출물 |
| --- | --- | --- |
| research | Antigravity / Google AI Pro, 선택적 무료 Gemini | 요구사항·완료 기준·근거·미확인 항목 |
| developer | ChatGPT / Codex | 기획 Artifact ID·버전에 연결한 구현 제안 |
| quality | ChatGPT / Codex | 기획·개발 결과의 요구사항/사실/디자인 검토 |
| marketing | ChatGPT / Codex | 기획의 고객·가치·검증된 주장에 근거한 콘텐츠 초안 |

기존 product(기획→개발→품질→대표), planning-marketing(기획→마케팅→대표), marketing, individual 흐름을 유지한다. 네 직원은 논리적 역할이며 이번 설계 작업에서 실제 에이전트 네 개를 실행한 것은 아니다. 초기에는 전체 직렬 큐로 한도와 원장 경쟁을 줄인다.

각 인계는 taskId/runId/stepId, 원본 Artifact ID·revision·hash, 요약·항목·가정·공식 근거·대표 반려 사유를 포함한다. 긴 입력은 예산 내에서 요약하되 출처·불확실성·승인 조건은 유지한다. 실패/부분 결과는 자동 인계하지 않고, 기획이 바뀌면 개발·품질·마케팅의 이전 입력 버전을 표시한다.

서버는 신규 실행의 정본과 step 잠금을 소유한다. 브라우저가 보내는 completed 상태나 임의 Artifact를 신뢰하지 않는다. 기존 업무는 읽기·표시를 유지하고 실행 재개할 때 선택 업무만 버전 검사 후 서버에 등록한다. 기존 브라우저 자료 전체를 무단 이전하지 않는다.

기존 `executionMode:demo|live`, `simulation` 의미는 유지한다. live 회차에 `executionProfile:subscription_free`와 단계별 provider를 선택 필드로 더한다. 한 회차에서 Gemini와 Codex의 조합은 허용하되 demo 결과 혼합은 금지한다. 실행기 변경은 새 회차나 명시적 재개 기록으로 남긴다. 일시 중단 사유는 별도 실행 레코드에 기록하고 기존 Task 상태로의 매핑을 정의해 복원 호환성을 유지한다.

신규 별도 실행 원장 예시: `.office-data/stage6-executions.json` (구현 예정). 기존 유료 원장을 덮어쓰지 않는다. 기록 필드:

- task/run/step/agent ID, provider, product, authMode, billingMode(subscription/free), model, adapter/CLI 버전.
- request fingerprint, thread/conversation ID, 시작·종료 시각, 최종 상태, 중단 사유, 선택적 토큰 사용량과 quota snapshot.
- 입력/산출물 hash·참조, 검색 수행 여부·공식 출처, 승인/반려와 재작업 연결.
- `additionalApiCostUsd:0`은 안전 조건이 검증된 실행에만 기록한다. 토큰 사용량·공급자 청구 확인 여부는 별도이며 구독 전체 비용 0원으로 표시하지 않는다. 과거 비용·미확인 값은 유지한다.

동일 task/run/step/fingerprint는 한 번만 실행하며 새로고침·더블클릭·재접속은 기존 결과/상태를 조회한다. 프로세스 강제 종료 후 자동 재실행하지 않고 마지막 공급자 상태와 원장을 대조한다. 완성된 모든 직원 결과는 계속 대표 승인 대기로 이동한다. 반려는 이유를 보존한 새 회차를 만든다. 대표 결과 승인은 코드 적용·배포·SNS 게시·광고 집행 권한을 의미하지 않는다. 6단계 최초 구현도 제안/초안 생성만 허용한다.

## D. 비용·보안 정책

아래는 후속 구현의 기본 정책이며 현재 환경 파일에 추가한 설정이 아니다.

```text
executionPolicy = subscription_and_verified_free_only
paidApiEnabled = false               # 기존 유료 승인 플래그보다 우선
automaticProviderFallback = false
automaticCreditUse = false
maxConcurrentExecutions = 1
automaticRetries = 0
unknownQuotaOrBilling = block
```

구독/무료 한도 초과 시 진행 중 작업은 중단을 요청하고 새 작업·후속 단계를 차단한다. 공급자 측 이미 처리된 사용량까지 취소할 수 있다고 약속하지 않는다. 갱신 시간이 지나도 자동 재개하지 않고 상태 재검증 후 대표가 재개한다. 작업별 시간·입력 길이·턴 상한도 둔다. OpenAI의 구매 크레딧 사용 차단을 계정/공식 제어로 확인할 수 없다면 엄격한 구독 전용 자동 실행을 활성화하지 않는다.

로컬 관리자 인증과 공급자 로그인은 분리한다. 키가 없어도 관리자는 로그인할 수 있어야 한다. 기존 관리자 비밀번호, Host/Origin 검사, 세션 서명·유효기간을 유지하고 `/api/office/*` 범위에 맞춰 쿠키 경로를 검토한다. 서버는 루프백에만 바인딩하며 터널·공개 배포는 차단한다. SSE·조회·취소·승인에도 같은 세션/업무 권한 검사를 적용한다.

토큰과 키는 OS 자격 증명 저장소 또는 서버 전용 접근 제한 저장소로 관리한다. 클라이언트 번들, localStorage, URL 쿼리, JSON 응답, SSE, 로그, 오류 원문, 인계 자료에 포함하지 않는다. 공식 OAuth 과정의 단기 code/state 외에 bearer 토큰을 브라우저 앱에 전달하지 않는다. 프로세스 환경도 allowlist로 구성하고 비밀을 명령행 인자에 넣지 않는다. 새 SIWC 자격 증명과 기존 Codex 인증 저장소를 혼합하거나 덮어쓰지 않는다.

브라우저 쿠키 추출, 비공식 OAuth client 도용, 토큰 복사·중계로 서비스 제한 우회, 구독 세션의 범용 OpenAI 호환 프록시화는 금지한다. 기존 `.env.local`과 인증 파일은 덮어쓰지 않으며 키의 존재만으로 실행을 허용하지 않는다. 고객 자료는 자동 수집하지 않고 사용자가 선택한 최소 자료만 정제해 전달한다. 모든 도구·셸·MCP는 paid endpoint/키/원본 데이터에 접근할 수 없도록 제한한다.

## 4. 단계별 개발 계획과 완료 기준

| 순서 | 승인 후 개발 범위 | 완료 기준 |
| --- | --- | --- |
| 6-1 보존·정책 기반 | 변경 전 파일 해시·백업, 브라우저 내보내기 제공, 전역 유료 차단, 로컬 인증 분리 | 키/유료 플래그가 있어도 어떤 기존 API 경로도 결제 실행 불가, 기존 자료 복원 |
| 6-2 실행 계약·원장 | adapter 계약, 서버 실행 정본, 잠금·fingerprint·이벤트·중단 상태, 선택 필드 확장 | 구형 업무·usage 없는 결과·반려 회차를 손실 없이 읽음, 중복 실행 없음 |
| 6-3 Codex 연결 | 버전/프로토콜 확인, 공식 계정 상태와 기존 로그인 재사용 검증, 필요 시 SIWC 등록 설계 적용 | API-key 모드 거부, 구독·크레딧 정책 검증, 독립 thread와 최종 상태 처리 |
| 6-4 Antigravity 연결 | 설치/로그인 상태·공식 headless·Windows 격리 확인, Never/useG1Credits 검사 | API/ADC 경로 차단, 쓰기·명령 금지, 실패·한도 상태로 안전 정지 |
| 6-5 무료 Gemini 선택 | 전용 프로젝트와 키 검증, 모델/도구 allowlist, 사용량 예약·회로 차단 | 유료/미확인 프로젝트 거부, 429 후 재시도 없음, 검색 불가를 정직하게 표시 |
| 6-6 협업·화면 | 서비스·모델·구독/무료·미확인 표기, product/planning-marketing 인계, 출처·대표 결정 | 기획 근거와 버전이 개발·품질·마케팅에 전달, 기존 승인·반려·재작업 보존 |
| 6-7 무과금 검증 | 네트워크 차단 mock으로 모든 adapter와 회귀 검사 | 아래 검증 목록 통과, 비밀 유출 없음 |
| 6-8 구독/무료 실검증 | 별도 범위 확인 후 비민감 샘플로 최소 실행 | 추가 지출 경로 차단 증거·서비스 기록·한도 중단 확인; 유료 테스트는 계속 금지 |

패키지가 필요한지는 승인 후 설치 상태와 공식 실행 파일을 조사해 결정한다. 설치 필요 시 목록·버전·목적을 먼저 보고한다. 이번 문서 승인이 유료 API나 자동 크레딧 사용 승인을 의미하지 않는다.

검증 계획(이번에는 실행하지 않음):

- 기존 test:office / test:engine / test:smoke / test:browser / typecheck / build를 적절한 시점에 실행하고 기존 사용자 저장본 대신 복제 fixture를 사용한다.
- 기존 유료 경로에 spy/mock을 두고 환경에 API 키와 승인 플래그가 모두 있어도 호출 0회인지 검사한다. 공급자 실패 시 유료 fallback도 0회여야 한다.
- OAuth 실패·만료·잘못된 state/callback·API-key 로그인·권한 미확인·한도 고갈·초과 크레딧 허용 상태를 거부한다.
- Antigravity NDJSON 분할·오류·권한 대기·timeout·취소·프로세스 종료 및 Windows sandbox 미지원 시 동작을 검사한다.
- 무료 프로젝트의 billing enabled/unknown, 키 소속 불일치, 유료 모델·도구, 429, 상태 검증 만료를 차단한다.
- 새로고침·동시 요청·중간 종료에서 중복 호출 없이 복구하고, 부분 결과를 성공으로 인계하지 않는다.
- 검색 없는 정책 결과의 최신 주장 거부, 출처 날짜 누락/null 처리, 미검증 사실의 마케팅 전파 방지를 검사한다.
- 기존 localStorage 키·출처·모든 회차/승인/반려·고객 답변 보존과 브라우저/응답/로그의 비밀 부재를 검증한다.

## 5. 구현 전 남은 확인과 진행 조건

현재 계정의 ChatGPT 요금제/잔여량, Codex 설치 버전·인증 방식, Google 계정의 AI Pro 인식, Antigravity 설치 상태, 무료 프로젝트 존재와 결제 상태는 확인하지 않았다. 로그인 토큰과 키는 읽지 않았다. 이 항목들은 실제 연결 성공으로 보고할 수 없다.

특히 구독 자동 초과분 차감 차단, Windows 도구 격리, 무료 프로젝트 결제 상태 검증이 해결되지 않으면 해당 adapter를 비활성 상태로 출고한다. 이 경우 수동으로 공식 서비스에서 작성한 결과를 사용자가 가져오고 `manual_import`로 기록하는 대안을 제공한다. 외부에서 실행된 결과의 서비스·모델·검색 여부는 사용자 신고와 검증된 정보를 구분한다.

권장 다음 승인 범위는 **6-1~6-2의 보존·유료 차단·인증 분리·모의 실행 계약 구현**이다. 이후 연결 검증 결과를 보고하고 구독/무료 실실행 범위를 정한다. 현재는 이 문서를 검토한 다음 구현 승인을 기다린다.

## 6. 공식 근거

모두 2026-10-31 본문 열람. 개별 페이지 발행일은 확인되지 않아 미확인으로 기록한다. 검색엔진의 게시/수집 시각을 공식 발행일로 인용하지 않는다. 향후 구현 시 다시 확인한다.

- [O1 — Sign in with ChatGPT](https://developers.openai.com/siwc)
- [O2 — ChatGPT plan usage / 로컬·오픈소스 범위](https://developers.openai.com/siwc/token-sharing-open-source)
- [O3 — Codex App Server / 인증·프로토콜·한도](https://learn.chatgpt.com/docs/app-server)
- [O4 — 구독 OAuth의 Codex app-server 설정](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [O5 — 구독 경로 preview 제한](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [O6 — Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [O7 — Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [G1 — Antigravity Plans / AI Pro·초과 크레딧](https://antigravity.google/docs/plans)
- [G2 — Antigravity CLI Headless mode](https://antigravity.google/docs/cli/headless/)
- [G3 — Antigravity Authenticate](https://antigravity.google/docs/install/)
- [G4 — CLI commands / 설정·Windows·useG1Credits](https://antigravity.google/docs/cli/reference/)
- [G5 — Gemini API Billing](https://ai.google.dev/gemini-api/docs/billing)
- [G6 — Gemini API Pricing / 무료 모델·도구·데이터 조건](https://ai.google.dev/gemini-api/docs/pricing)

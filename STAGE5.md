# 5단계 — 서버 전용 OpenAI 직원 실행 엔진

## 구현 상태
구현과 무과금 모의 검증을 완료했습니다. 최초 유료 호출은 사용자 승인 전이므로 수행하지 않았습니다.
서버 키가 현재 설정되지 않았고, 유료 승인 설정도 꺼져 있습니다. 실제 키를 요청하거나 출력하지 않았습니다.
현재 확인용 프로덕션 서버: http://127.0.0.1:3000/office
기존 고객 페이지: http://127.0.0.1:3000/storybook
프로덕션 서버에서는 유료 실행을 허용하지 않습니다. 승인 후 로컬 개발 서버에서만 실제 모드를 활성화할 수 있습니다.

## 보존과 백업
Git 저장소·실행 파일이 확인되지 않아 Git 명령으로 변경·초기화하지 않았습니다.
32개 소스·설정·테스트·문서와 SHA-256 목록을 보존했습니다.
백업: `C:\Users\samsung-user\Downloads\ai-office-starter\.backups\stage5-before-2026-10-30T15-15-28-997Z`
검증 목록: `BACKUP-MANIFEST.json`.
실제 .env 파일과 빌드·캐시·의존성·서버 원장은 백업 대상에서 제외했고 원본을 변경하지 않았습니다.

/storybook 페이지, 질문 엔진, 저장 모듈, 기존 질문 브라우저 테스트, /api/run의 5개 파일은 백업과 SHA-256이 일치합니다.
브라우저 업무 키 `ai-office:workspace:v1`, 고객 답변 키 `ai-office:storybook:v1`과 version 1을 유지합니다.
기존 simulation:true 산출물과 executionMode/usage가 없는 과거 업무를 계속 읽습니다. 새 필드는 선택적으로 추가했습니다.
실제 결과는 simulation:false와 usage 메타데이터를 갖습니다. 한 회차에서 데모와 실제 결과를 섞지 않습니다.
고객 답변을 일괄 서버 이전하거나 초기화하는 처리는 없습니다.

## 직원 실행과 협업
공식 OpenAI SDK(openai 5.23.2)의 Responses API를 서버 전용 모듈에서 호출합니다. 키는 process.env.OPENAI_API_KEY에서만 읽습니다.
SDK 기본 URL 대신 공식 https://api.openai.com/v1을 명시해 임의 환경의 base URL로 키가 전송되지 않도록 했습니다.
클라이언트에는 키나 SDK 설정 객체를 보내지 않습니다. /api/office는 모델·제한·사용량 같은 비밀이 아닌 값만 제공합니다.

서로 독립된 지침:
- 개발자: 기능 명세, 코드 설계/구현 제안, 오류 분석, 테스트 계획. 실제 파일 수정 금지.
- 기획·리서치: 사업기획, 동화 플랫폼/질문 엔진 개선, 요구사항·UX. 검색 없이 실제 시장조사했다고 주장 금지.
- 마케팅: SNS 기획, 인스타그램·블로그 운영, 광고 카피·초안. 게시·집행 금지.
- 품질관리·디자인: 기획·개발안, UI/UX·디자인, 요구사항/사실 검토. 미검증 사항 명시.

기획→개발→품질 또는 기존 마케팅/단독 흐름을 유지합니다. 앞선 Artifact의 직원·종류·요약·항목·가정을 다음 호출에 구조화해서 전달합니다.
브라우저에 결과·사용량·진행/인계 이력을 저장하고 품질 결과까지 준비되면 대표 승인 대기로 전환합니다. 반려 사유는 새 회차 입력에 전달됩니다.
이번 단계는 업무 제안/초안 생성이며 Codex CLI, 파일 수정, 셸 명령, 외부 도구, 웹 검색을 연결하지 않습니다.
기존 홈 대시보드의 /api/run은 여전히 데모 전용입니다. 실제 연결은 /office의 명시적 실제 모드에만 추가했습니다.

## 비용·실행 제한
기본 모델은 기존 설정과 같은 gpt-4.1-mini입니다. OPENAI_MODEL로 변경할 수 있습니다.
2026-10-31 확인한 [공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-4.1-mini)의 일반 텍스트 단가는 입력 1M 토큰당 $0.40, 출력 $1.60입니다. 해당 페이지는 모델에 Deprecated 표기도 있으므로 계정에서의 실제 사용 가능 여부는 유료 승인 후 별도 확인해야 합니다.
다른 모델은 OFFICE_INPUT_USD_PER_MILLION과 OFFICE_OUTPUT_USD_PER_MILLION을 공식 단가로 반드시 설정해야 하며, 단가를 모르면 실행을 차단합니다.

기본 제한:
- 입력: UTF-8 바이트 수+메시지 여유 1024의 보수적 토큰 추정이 8000 이하인 요청만 허용.
- 출력: API max_output_tokens=600. 환경 설정 범위 128~2000.
- 시도: 단계당 최대 2회, SDK 자체 maxRetries=0.
- 재시도: 429 또는 5xx에서만 최대 1회. 시간 초과·연결 오류·기타 오류는 자동 재시도하지 않음.
- API 시간 제한: 시도당 20초, 설정 범위 1~30초. AbortSignal과 SDK timeout 사용.
- 회차별 최대 API 시도/예약 8회. 클라이언트가 아닌 서버 원장 기준으로 계산.
- 월간 예산: 기본 $5, 인증 후 작업실에서 $0~$1000 설정. UTC 월 기준.

호출 전에 최대 시도 횟수의 비용을 원장에 예약합니다. 예산 또는 호출 상한 초과 예상 시 API 전에 차단합니다.
각 시도의 모델·입력/출력 토큰·내부 비용·시도 상태를 기록하고, 프로젝트별 및 월간 합계를 표시합니다.
미사용 재시도는 0으로 해제합니다. 사용량을 받지 못한 실패/시간 초과/중단은 불확실 상태로 비용 상한을 유지하며 토큰은 미확인으로 표시합니다.
동일 업무/회차/단계의 요청은 지문과 영수증으로 중복을 차단하고, 완료 결과는 재사용합니다. 실패 요청은 새 회차를 명시적으로 등록해야 합니다.
원장 파일 잠금과 원자적 파일 교체로 동일 로컬 프로세스/프로젝트 디렉터리의 예산 경쟁을 방지합니다. 네트워크 호출 중에도 잠금을 유지하므로 로컬 유료 작업은 직렬 처리됩니다.

내부 추정은 공식 청구 금액이 아닙니다. 캐시 할인·세금·환율·다른 앱에서 사용한 비용은 포함하지 않습니다. 입력 계산은 토크나이저의 정확한 카운트가 아닌 보수적 추정이며 실제 usage로 사후 보정합니다.
네트워크 오류와 사용량 미수신 때문에 청구를 완벽히 재구성할 수 없습니다. OpenAI 계정의 프로젝트 예산/한도도 별도로 설정해야 합니다.

유료 검증안(아직 미실행): 기획→개발→품질의 비개인정보 샘플 업무 1개, 3단계 응답, 재시도 포함 최대 6회 시도.
기본 한도를 모두 소진하는 경우 상한 추정은 `6 × (8000×0.40 + 600×1.60)/1,000,000 = $0.02496`입니다. 첫 단일 단계는 최대 추정 $0.00832입니다. 이는 앱의 비용 추정이며 실제 청구 보증이 아닙니다.

## 인증·서버 저장·개인정보
실제 호출의 필수 조건:
1. NODE_ENV=development (npm run dev).
2. OFFICE_ALLOW_LOCAL_LIVE=true.
3. OFFICE_PAID_CALLS_APPROVED=true (사용자 승인 전에는 false 유지).
4. 서버 OPENAI_API_KEY 설정.
5. 별도의 OFFICE_ADMIN_PASSWORD 16자 이상.
6. 로컬 Host/Origin 검사와 HttpOnly·SameSite=Strict 세션 인증.

유료 API는 인증 실패 시 401, 비활성 상태·외부 Origin은 403으로 차단합니다.
비밀번호는 API 키와 다른 로컬 관리자 비밀번호입니다. 5회 실패 시 프로세스 기준 10분 제한, 세션 수명 1시간입니다.
세션은 서버 비밀로 HMAC 서명하며 브라우저에는 HttpOnly 쿠키만 남깁니다. HTTP 로컬 전용이므로 Secure 쿠키는 적용하지 않았고 외부 배포는 차단합니다.
로컬 호스트·Origin 검사만을 운영 인증의 대체로 보지 않습니다. 개발 서버는 반드시 127.0.0.1에 바인딩하고 프록시·터널로 공개하지 않아야 합니다.

서버 저장: `.office-data/ledger.json`에 월간 예산, 시도별 비용, 실행 ID·지문, 모델, 시간, 재사용용 결과를 보존합니다. 파일과 잠금은 Git에서 제외합니다.
업무 지시 원문과 고객 답변 전체를 원장에 별도 저장하지 않습니다. 생성 결과 자체에 민감한 내용이 있을 수 있으므로 OS 접근 권한으로 보호하고 보관·삭제 정책이 필요합니다.
API 전송 자료는 선택 업무 지시, 대표 피드백, 필요한 이전 산출물로 제한합니다. /storybook의 localStorage를 읽거나 전송하지 않습니다.
키 모양 문자열, 이메일, 국내 휴대전화/주민번호 모양은 전송과 결과에서 규칙 기반 제거합니다. 이름·주소 등 모든 개인정보를 탐지하는 장치는 아니므로 지시에서 불필요한 개인정보를 빼야 합니다.
Responses API store:false를 사용합니다. 이는 공급자 측 모든 보관을 금지한다는 보장은 아닙니다.
SDK 오류 객체·키·요청 원문은 서버 로그에 출력하지 않습니다. 클라이언트에는 제한된 오류 메시지만 전달합니다.

잠금 파일이 프로세스 비정상 종료 후 남으면 유료 실행은 안전하게 차단됩니다. 해당 작업이 실제로 종료됐는지와 원장/계정 사용량을 먼저 확인하고 관리자가 복구해야 합니다. 원장·예약을 자동 삭제하지 않습니다.

## 실제 운영 구조 설계 (후속)
현재는 단일 로컬 관리자·파일 원장이고 업무/승인은 계속 브라우저가 관리합니다. 운영용 다중 사용자 서버가 완성된 것은 아닙니다.
운영 전에는 사용자/프로젝트 멤버 권한 및 세션 인증, 서버가 소유하는 Task/Run/Step/Artifact/Approval 테이블, Call/Usage/BudgetReservation 테이블이 필요합니다.
예산 예약·사용량 확정을 DB 트랜잭션으로 처리하고 작업 큐·idempotency·웹훅/재조정·감사 로그·암호화·보관/삭제 정책을 추가해야 합니다.
클라이언트가 보낸 업무 상태는 운영 환경에서 권한/버전을 검증하는 서버 원본과 대조해야 합니다. 그래서 현재 프로덕션 유료 실행은 코드에서 비활성화되어 있습니다.

## API 설정 방법
기존 .env.local을 덮어쓰지 말고 필요한 항목만 서버에 추가합니다. 실제 값은 채팅이나 코드에 넣지 마세요.

```dotenv
OPENAI_API_KEY=<서버에 직접 설정>
OPENAI_MODEL=gpt-4.1-mini
OFFICE_ALLOW_LOCAL_LIVE=false
OFFICE_PAID_CALLS_APPROVED=false
OFFICE_ADMIN_PASSWORD=<API 키와 다른 16자 이상 비밀번호>
OFFICE_MAX_INPUT_TOKENS=8000
OFFICE_MAX_OUTPUT_TOKENS=600
OFFICE_MAX_ATTEMPTS=2
OFFICE_MAX_RUN_CALLS=8
OFFICE_TIMEOUT_MS=20000
```

1. 현재 기본 데모로 모든 기능을 먼저 확인합니다.
2. 최초 유료 검증 계획·비용에 대해 사용자 승인을 받습니다.
3. 승인 후 서버에 키/비밀번호를 직접 설정하고 두 허용 플래그를 true로 변경합니다.
4. 기존 서버를 종료한 후 `npm.cmd run dev -- --hostname 127.0.0.1`로 시작합니다.
5. /office에서 로컬 인증, 월간 예산 설정, 실제 모드 선택, 업무 등록.
6. 각 단계에서 토큰·시도·비용 추정 확인 창을 확인하고 실행합니다. 데모에서 시작한 회차는 실제 모드로 전환하지 않고 새 회차를 사용합니다.

## 테스트 결과
- TypeScript 검사 및 프로덕션 빌드: 통과.
- test:live: 네 역할 지침, 실제 모드 형식의 모의 응답, 인계, 비용/usage, 중복 호출 방지, 모델 단가·입력·호출·예산 제한, 429/5xx 제한 재시도, 시간 초과 오류 처리, 개인정보 규칙 제거, 저장 호환성 통과.
- 공식 SDK에 mock fetch를 주입해 Responses 요청/응답 파싱 검증. 실제 네트워크·유료 호출 없음.
- HTTP 단위 검증: 키/승인 없는 데모 상태, 인증 없는 유료 요청 401, 로컬 로그인/HttpOnly 쿠키, 외부 출처 거부, 프로덕션 비활성 통과.
- test:office: 기존 배정·협업·반려·재작업·승인·복원 통과.
- test:engine: 기존 질문 제한·수정·저장·삭제 검증 통과.
- test:smoke: 기존 대시보드·/api/run 회귀 통과.
- test:browser: 7개 통과 (기존 /storybook 4개 + 업무 협업/데이터 보존 2개 + 새 API 기본 차단 1개).
- npm audit: 취약점 0건.

테스트 중 Next.js 내부 URL과 실제 Host가 다른 정상 로컬 요청이 403이 되는 문제를 수정하고 전체 브라우저 테스트를 재실행해 통과했습니다.
Windows 파일 교체 EPERM에 대해 목적 파일을 지우지 않는 최대 5회의 짧은 파일 저장 재시도를 추가했고 비용 테스트를 재검증했습니다.
실제 계정의 모델 응답·권한·계정 청구 검증은 승인 및 서버 키 설정 전이므로 미실시입니다. 모의 응답을 실제 AI 성공으로 보고하지 않습니다.

## 변경 파일
- src/lib/office/server/config.ts, prompts.ts, auth.ts, ledger.ts, executor.ts (추가)
- src/app/api/office/route.ts (추가)
- src/app/office/live-controls.tsx (추가)
- src/app/office/page.tsx (모드·인증·비용·실행 연결)
- src/lib/office/model.ts, storage.ts (호환되는 모드/usage 확장)
- src/app/globals.css (설정 입력 스타일)
- scripts/live-test.cjs, tsconfig.live-tests.json (추가)
- tests/office.spec.ts (API 기본 차단 회귀 추가)
- package.json (test:live 명령), .env.example, .gitignore
- README.md, STAGE5.md

새 패키지는 설치하지 않고 기존 공식 SDK를 사용했습니다. package-lock.json과 고객 페이지·질문 엔진·고객 저장 모듈은 그대로입니다.

## 검증 명령
```powershell
npm.cmd run typecheck
npm.cmd run test:live
npm.cmd run test:office
npm.cmd run test:engine
# 실행 중인 서버를 종료한 후
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1
# 별도 터미널
npm.cmd run test:smoke
npm.cmd run test:browser
```

공식 근거: [OpenAI SDK 오류·재시도·timeout](https://developers.openai.com/api/reference/typescript), [모델/토큰 단가](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

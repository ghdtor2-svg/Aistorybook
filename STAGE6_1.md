# AI OFFICE 6-1단계 구현 보고

기준일: 2026-10-31, Asia/Seoul.

**상태: 공식 Codex app-server adapter·안전 정책·작업실 연결 구현 및 모의/회귀 검증 완료. 현재 환경의 기존 로그인 재사용과 실제 구독 추론은 미검증이며 실행 잠금 유지.** 실제 모델 호출이나 구독 사용량을 소비하는 검증은 수행하지 않았다. 기존 로그인 조회는 홈 디렉터리 오류로 실패했다. 이를 로그인 해제나 구독 부재로 해석하지 않는다.

## 1. 보존·백업과 변경 전 확인

`STAGE6_PLAN.md`와 기존 코드·테스트를 먼저 확인했다. 발견된 AGENTS.md는 없었다. Git 저장소를 전제로 초기화·체크아웃·되돌리기를 하지 않았다.

변경 전 45개 파일을 다음 위치에 복사하고 파일별 SHA-256 목록을 저장했다.

`C:\Users\samsung-user\Downloads\ai-office-starter\.backups\stage6-1-before-20261031-221502`

목록: `BACKUP-MANIFEST.json`. 최종 검사에서 백업 무결성 오류 0건. 기존 환경 파일은 보존용 로컬 백업에 포함했으며 내용을 로그·보고서에 노출하지 않았다. 사용자 인증 저장소는 복사하지 않았다. node_modules·빌드 캐시·테스트 출력은 백업에서 제외했다.

다음 파일은 변경 전 SHA-256과 일치한다.

- `src/app/storybook/page.tsx`
- `src/lib/storybook/engine.ts`, `src/lib/storybook/storage.ts`
- `src/app/api/run/route.ts`, `tests/storybook.spec.ts`
- `package-lock.json`, `.env.local`

`ai-office:workspace:v1`, `ai-office:storybook:v1` 및 version 1을 유지했다. 과거 유료 결과와 usage 없는 기록도 계속 읽는다. 직원·업무·회차 ID를 변경하거나 과거 결과를 구독 결과로 소급 표시하지 않는다. 고객 답변을 서버나 Codex로 자동 이전하지 않는다.

실제 사용자의 브라우저 프로필/localStorage는 열람·삭제·초기화하지 않았다. Playwright는 별도의 테스트 컨텍스트에서 고객 답변 보존·복원과 기존 업무 승인·반려·재작업을 검증했다. 따라서 실제 사용자 저장본을 직접 전수 감사했다고 주장하지 않는다. 기존 브라우저 출처를 유지하려고 테스트 서버도 `http://127.0.0.1:3000`에서 실행했다.

## 2. 구현한 기능

### 공식 Codex 연결과 역할

`src/lib/office/server/codex.ts`에 공식 app-server stdio JSONL adapter를 추가했다. 설치된 공식 Windows `codex.exe`를 직접 실행하며 `shell:false`를 사용한다. 업무 문자열은 셸 명령이나 명령행 인자로 삽입하지 않고 RPC 입력으로 전달한다. 새 패키지를 설치하지 않았다.

연결 순서:

1. `initialize` 응답 후 `initialized` 전송.
2. 공식 `account/read`에서 ChatGPT 개인 구독 인증 확인. API-key 모드 및 이번 범위에서 검증하지 않은 workspace 과금 유형은 거부.
3. `config/read`로 provider·읽기 전용·도구 제한·상속 설정 확인. 필수 값이 없거나 외부 provider/MCP/plugin/browser/computer-use 예외가 있으면 거부.
4. `account/rateLimits/read`로 한도와 추가 크레딧 가능성 확인.
5. 직원별 developer instructions로 읽기 전용 ephemeral thread 생성. 반환된 provider·sandbox·approval policy도 재검사.
6. `turn/start`, 최종 agent message 및 `turn/completed`의 completed 상태를 확인한 뒤 산출물로 변환.

개발자·품질관리·디자인·마케팅에 각기 다른 기존 역할 지침을 적용한다. 직원별 단계에서 새 thread를 만들어 문맥을 분리하며, 이전 결과는 명시적인 인계 자료로만 전달한다. 모델은 계정의 Codex 설정/공식 응답으로 확인하며 미검증 최신 모델명을 임의 지정하지 않았다.

기획·리서치는 **기존 데모**를 사용한다. 사용자의 이번 지시에 따라 `subscription` 회차에서 기획 데모 → Codex 개발 → Codex 품질, 또는 기획 데모 → Codex 마케팅을 허용한다. 기획 출력에는 simulation true와 데모 서비스 표기를 남기고 후속 직원에게도 실조사가 아님을 전달한다. 기존 일반 demo/live 회차의 모드 일관성은 유지한다.

### 저장·인계·대표 승인

`subscription.ts`에 기존 유료 원장과 별개인 `.office-data/subscription.json` 원장을 추가했다. 원장 폴더는 기존 `.gitignore` 범위에 들어간다. 실제 계정 실행으로 생성한 원장은 아직 없으며 단위 테스트에서는 별도 임시 폴더만 사용했다.

- task/run/step ID와 입력 fingerprint로 중복 실행을 막고 완료 결과를 재사용한다.
- 파일 잠금으로 전체 구독 실행을 직렬 처리하고 임시 파일→rename으로 저장한다.
- 이전 서버 산출물과 클라이언트의 다음 입력 상태가 다르면 실행하지 않는다. 새로운 회차도 정해진 협업 순서와 pending 상태를 검증한다.
- 결과에는 서비스·인증 유형·구독/데모 구분·모델·thread/turn·영수증 ID를 선택 필드로 저장한다. UI에서 사용 서비스를 볼 수 있다.
- 구독 결과에 기존 유료 API의 USD 추정치를 붙이거나 구독 전체 비용이 0원이라고 표시하지 않는다.
- 모든 단계 완료 후 기존 대표 승인 대기로 넘어가며 반려 사유와 새 회차를 보존한다.
- 중단/불명 상태는 자동 재시도하지 않는다. 부분 결과는 성공으로 인계하지 않으며 재작업 시 이전 회차를 남긴다.

초기 구현에서는 장기 상주 worker 대신 **단계마다 제한된 수명의 app-server 자식 프로세스**를 사용한다. 원장 잠금이 요청·개발 재로딩 간 중복을 막고 finally에서 프로세스를 닫는다. 설계의 향후 장기 worker는 아직 구현하지 않았다. 외부 배포나 다중 사용자 운영을 위한 구조가 아니다.

### 작업실 및 로컬 인증

`/office`에 구독 연결 상태, 추론 없는 로그인 확인 버튼, 별도 subscription 모드, 서비스 기록을 추가했다. 기존 데모와 과거 유료 기록은 보존한다. 실패 시 자동으로 다른 공급자를 호출하지 않으며 새 업무/재작업에서 기존 데모를 계속 사용할 수 있다.

기존 `/api/office` 로그인은 API 키 및 유료 실행 활성화 조건에서 분리했다. `OFFICE_ADMIN_PASSWORD` 16자 이상이 필요하다. 기존 로컬 Host/Origin 검사, 1시간 HMAC 세션, HttpOnly·SameSite=Strict 쿠키 및 실패 제한을 유지했다. 쿠키 Path `/api/office`는 새 하위 라우트에도 적용된다.

새 `/api/office/subscription`은 비밀 없는 상태 조회, 인증된 probe, 인증된 실행만 제공한다. 인증 없이 thread나 추론을 시작할 수 없다. 공급자 로그아웃 API는 호출하지 않아 기존 Codex 세션을 임의 해제하지 않는다.

## 3. 인증·안전·비용 제한

최초 실제 실행은 서버의 `OFFICE_CODEX_FIRST_RUN_APPROVED=true`가 있어야 한다. 기본은 false이고 이번 작업에서 실제 환경 파일을 바꾸지 않았다. 브라우저 클릭 확인은 이후 실행의 추가 확인이며 사용자가 요청한 최초 별도 승인 절차를 대신하지 않는다. 환경 플래그가 있어도 계정·설정·한도 검증 실패 시 실행하지 않는다.

공식 설정으로 shell tool, unified exec, hooks, apps, plugins, code mode, multi-agent, shell snapshot과 web search를 끄고 browser/computer-use 접근을 거부한다. notify 명령도 비운다. thread는 읽기 전용·사용자 검토 정책이며 모든 서버 발신 도구/승인/토큰 갱신 요청을 거부한다. 알 수 없는 도구 이벤트·연결 단절도 실행 실패로 처리한다. 관찰 이벤트는 사후 탐지이므로 그것만을 안전장치로 삼지 않고 실행 전 설정 검증과 sandbox를 함께 요구한다.

초기 읽기 범위는 **사용자가 선택한 업무·이전 산출물 텍스트**다. 프로젝트 파일을 자동 탐색하거나 셸로 읽지 않는다. 파일 수정·터미널 명령·외부 배포·게시·검색은 허용하지 않는다. 추후 프로젝트 직접 읽기가 필요하면 별도 검증 범위로 다룬다.

새 자식 프로세스 환경은 필수 OS 환경 변수만 허용한다. `OPENAI_API_KEY`, Gemini 키, ACCESS_TOKEN, proxy·클라우드 인증·CODEX_HOME 재지정 등을 전달하지 않는다. 인증은 Codex 자신의 공식 관리 저장소에서 처리한다. AI OFFICE는 auth.json/토큰·브라우저 쿠키를 직접 읽거나 복사하지 않는다. 원시 stderr/오류 객체는 브라우저나 로그에 중계하지 않는다.

한도 정보 누락·갱신 시각 경과·사용률 95% 이상·한도 도달·추가 크레딧 존재/불명은 보수적으로 차단한다. 여러 bucket이 오면 모두 검사한다. 크레딧 구매·리셋 소비·자동 유료 fallback은 구현하지 않았다. 실제 계정에서 필드가 제공되지 않으면 실행이 계속 잠길 수 있다. 한도 조회와 실행 사이 다른 앱의 사용·계정 설정 변경까지 완벽히 예측하는 기능은 아니다.

RPC 응답은 15초, 추론 완료 대기는 60초로 제한한다. 실패 시 알려진 turn에 interrupt를 요청한 뒤 프로세스를 종료한다. 이미 공급자가 수행한 추론이나 사용량까지 취소·환불된다고 보장하지 않는다. 자동 재시도는 없다.

기존 OpenAI API 실행기는 삭제하지 않았다. 다음 차단을 추가했다.

- `liveEnabled()`는 이전 유료 승인 플래그·키 유무와 관계없이 false.
- 인증된 기존 API run/preview 등 유료 경로도 403으로 거부.
- 기존 SDK provider는 실제 fetch가 기본인 경우 정책 예외를 던져 호출 전 차단. 기존 회귀 테스트용 명시적 mock transport는 유지.
- 보존된 `openai-workflow.ts`도 실행 시작 전에 같은 정책으로 차단.

## 4. 실제 환경에서 확인한 것과 미확인 사항

| 확인 항목 | 결과 |
| --- | --- |
| 설치된 Codex CLI | 공식 npm 설치의 `codex-cli 0.166.0` 확인 |
| app-server 기능 | 공식 CLI help와 로컬 JSON Schema 생성 성공. 설치·업데이트 없음 |
| `codex login status` | `Error loading configuration: Could not find home directory`로 실패 |
| 공식 codex.exe 직접 로그인 조회 | 같은 홈 디렉터리 오류 |
| adapter의 실제 app-server probe | connected false, authMode unavailable, planType unknown |
| 최초 실행 승인 | false 유지 |
| 현재 앱 로컬 인증 | 관리자 비밀번호 미설정으로 localAuthAvailable false |
| 기존 ChatGPT 로그인 재사용 | 공식 관리 인증 경로를 구현했으나 현재 환경에서는 확인 불가 |
| 실제 구독 추론·모델 결과 | 미실행·미검증 |
| 실제 계정 한도/크레딧·설정 반환 | 미검증. 누락이면 adapter는 차단 |
| 추가 유료 API 호출 | 수행하지 않음 |

이 오류를 해결하기 위해 인증 파일 복사, 홈 디렉터리 강제 재지정, 브라우저 쿠키 추출, 관리 정책 해제나 비공식 endpoint를 사용하지 않았다. 현재 환경에서 실제 연결 검증은 이 지점에서 중단했다. 일반 사용자 터미널에서 공식 Codex가 홈 디렉터리와 로그인을 정상 인식하는 환경이 먼저 필요하다.

**ChatGPT 구독 사용량 적용 여부:** 정상 ChatGPT 인증과 검증 조건을 통과했을 때 사용하는 경로로 설계·구현했으며 별도 API 키 실행과 분리했다. 그러나 실제 추론을 하지 않았으므로 이 계정에서 구독 사용량이 차감되는지, 어떤 모델 권한이 있는지까지 검증했다고 주장할 수 없다. AI OFFICE 직원 실행에 의한 실사용량 검증은 미실시다.

## 5. 테스트 결과

| 검증 | 결과 |
| --- | --- |
| `npm.cmd run test:subscription` | 통과: JSONL 분할 수신·승인 거부·단절 처리, 최초 승인 전 spawn 0회, 키/환경 격리, 3개 역할, 공식 RPC 순서, 인증/설정/한도/크레딧 차단, 실패·도구 감지 |
| 구독 업무 모의 협업 | 통과: 기획 데모→개발→품질, 기획 데모→마케팅, 서비스 저장·복원, 중복 방지·변조 거부·잠금·반려·새 회차·승인 |
| 구독 HTTP 모의 검증 | 통과: 무인증 401, 외부 Origin 403, 최초 실제 실행 잠금, Gemini 실행 차단 |
| `npm.cmd run test:live` | 통과: 기존 SDK/실행기 모의 회귀 및 모든 이전 유료 플래그와 인증이 있어도 실제 유료 run 403 |
| `npm.cmd run test:office` | 통과: 기존 업무·협업·대표 결정·복원 |
| `npm.cmd run test:engine` | 통과: 기존 고객 질문·답변·수정·저장·복원 |
| `npm.cmd run test:smoke` | 통과: 기존 대시보드·네 역할·데모·유료 모드 거부 |
| `npm.cmd run test:browser` | 최종 8개 통과: 기존 7개 + 구독 최초 실행 잠금·POST 0회·데모 전환·복원 |
| `npm.cmd run typecheck` | 통과 |
| `npm.cmd run build` | 최종 프로덕션 빌드 통과. `/office`, `/storybook`, 기존 API와 새 구독 API 포함 |
| 변경 전 백업 재검증 | 무결성 오류 0건 |

모의 테스트의 FakeRpc와 mock provider는 실제 모델이나 계정에 요청하지 않는다. 테스트에서 성공한 가짜 결과를 실제 Codex 성공으로 표시하지 않는다. 새 브라우저 검사는 Next.js의 별도 alert 요소까지 선택하는 테스트 locator 문제를 한 차례 수정한 뒤 전체 8개가 통과했다. 의존성 설치·audit 네트워크 조회·유료 테스트는 하지 않았다.

테스트용 프로덕션 앱은 `http://127.0.0.1:3000`에 루프백으로 실행했다. 실제 구독 실행이 검증된 프로덕션 서비스라는 뜻은 아니다. app-server 자체도 공식 문서상 실험적 인터페이스이며 공개 호스팅 배포는 이번 범위 밖이다.

## 6. 변경 파일

추가:

- `src/lib/office/server/codex.ts`, `subscription.ts`, `gemini.ts`, `policy.ts`
- `src/app/api/office/subscription/route.ts`
- `src/app/office/subscription-controls.tsx`
- `scripts/subscription-test.cjs`, `STAGE6_1.md`

수정:

- `src/lib/office/model.ts`, `storage.ts`: 선택적 service 기록과 subscription 회차 호환
- `src/lib/office/server/config.ts`, `executor.ts`, `src/lib/openai-workflow.ts`: 유료 차단·인증 분리
- `src/app/api/office/route.ts`, `src/app/office/page.tsx`, `live-controls.tsx`: 로컬 인증·구독 연결·기존 기록 표시
- `scripts/live-test.cjs`, `tests/office.spec.ts`, `tsconfig.live-tests.json`, `package.json`, `.env.example`: 무과금 검증과 설정 예시

`tsconfig.tsbuildinfo`와 빌드/테스트 출력은 검증 과정에서 갱신되었다. 패키지 버전과 lockfile, 실제 `.env.local`은 유지했다.

## 7. 다음 단계와 별도 실행 승인 조건

먼저 공식 Codex의 홈 디렉터리 오류와 기존 로그인 상태를 정상 환경에서 확인한다. 이어서 추론 없는 probe와 실제 config/rate-limit 응답을 확인해 현재 CLI가 모든 안전 조건을 입증할 수 있는지 검증한다. 필드 누락·관리 설정 충돌·추가 크레딧 사용 가능성이 남으면 실제 추론을 열지 않고 보고한다.

그다음에만 다음 최소 계획으로 별도 승인을 요청한다: 개발자 단독의 비민감 텍스트 업무 1개, Codex turn 1회, 추가 직원·도구·재시도·유료 API 없음. 구독 사용량 소비 가능, 60초 대기 상한, 중단해도 이미 소비한 사용량은 남을 수 있음. **이 보고서 작성 시에는 승인을 요청하거나 받은 것으로 처리하지 않았고 실행하지 않았다.**

Gemini는 `TextExecutor`와 `GeminiAuth` 인터페이스만 준비했다. `geminiExecutor`는 항상 비활성 오류를 반환하며 기획 직원은 데모를 유지한다. Google AI Pro/Antigravity 구독과 Gemini API 전용 프로젝트는 `sharedQuota:false`로 구분한다. 다음 연결 단계에서는 공식 Antigravity OAuth·headless·Windows 권한·초과 크레딧 Never를 검증하고, 무료 API는 별도 프로젝트 결제 미연결을 입증한 경우에만 검토한다. 비공식 인증 경로는 추가하지 않는다.

## 공식 근거

2026-10-31 공식 문서 본문 및 설치 CLI가 생성한 스키마를 확인했다. 페이지 자체 발행일은 미확인이다.

- [Codex App Server: 로컬 통합·인증·프로토콜·한도](https://learn.chatgpt.com/docs/app-server)
- [Configuration Reference: 로그인 강제·shell 도구·provider·권한 설정](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Hooks: 공식 hooks 비활성 설정](https://learn.chatgpt.com/docs/hooks)
- [Sign in with ChatGPT: 로컬/오픈소스 plan usage 범위](https://developers.openai.com/siwc/token-sharing-open-source)
- [별도 SIWC OAuth를 사용하는 app-server 설정](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)

이번 구현은 마지막 링크의 별도 OAuth 토큰 전달 방식을 사용하지 않고 기존 Codex 관리 ChatGPT 인증 경로를 선택했다. SIWC 신규 앱 등록·토큰 교환은 구현하지 않았다.

## 8. 추가 진단: Windows 홈 디렉터리 오류 (2026-10-31)

이 절은 앞선 미검증 상태를 갱신한다. **홈 경로 오류는 자식 프로세스의 공식 CODEX_HOME 지정으로 해결했고, 기존 ChatGPT 로그인 상태 조회에 성공했다. 다만 app-server는 별도의 접근 거부 오류로 아직 연결되지 않는다. 실제 추론 준비가 완료된 상태는 아니다.**

### 8.1 환경변수와 실제 홈 상태

| 항목 | 현재 진단 프로세스에서 확인한 값/결과 |
| --- | --- |
| USERPROFILE | `C:\Users\samsung-user` |
| HOME 환경변수 | 미설정 |
| HOMEDRIVE | `C:` |
| HOMEPATH | `\Users\samsung-user` |
| PowerShell 자동 변수 `$HOME` | `C:\Users\samsung-user` |
| 실제 사용자 홈 폴더 | 존재 |
| 기존 기본 Codex 폴더 | `C:\Users\samsung-user\.codex` 존재 |
| 초기 CODEX_HOME 환경변수 | 미설정 |
| Node `os.homedir()` | 정상 홈 경로 반환 |
| .NET `GetFolderPath(UserProfile)` | 빈 문자열 반환 |
| Node `os.userInfo()` | Windows 사용자 정보 조회에서 `uv_os_get_passwd / ENOMEM` 오류 |

USERPROFILE/HOME/HOMEDRIVE/HOMEPATH의 사용자·시스템 영구 환경변수 값은 이번 조회에서 모두 미설정이었다. 이는 현재 프로세스에 정상적인 USERPROFILE 등이 없는 것과는 다르다. Windows가 로그인 시 만드는 프로세스 변수와 영구 설정을 구분했다.

실제 홈 폴더가 삭제되었거나 USERPROFILE 문자열이 비어 있는 문제는 아니다. 관찰 결과는 **현재 제한된 실행 프로세스에서 Windows 프로필/사용자 정보 조회가 정상 작동하지 않는 것**을 가리킨다. Codex 내부에서 정확히 어느 Windows API 호출이 실패했는지까지 추적한 것은 아니므로 운영체제 전체 손상이나 메모리 부족으로 단정하지 않는다. HOME 미설정만을 단독 원인으로 보지도 않는다.

### 8.2 VS Code 상속 환경과 AI OFFICE 자식 환경 비교

진단 도구의 부모 환경은 `TERM_PROGRAM=vscode`였고 VSCODE_PID는 없었다. Codex 명령은 다음 npm 설치를 가리켰다.

`C:\Users\samsung-user\AppData\Roaming\npm\codex.cmd`

기존 코드가 사용한 공식 Windows codex.exe와 같은 npm 설치다. Node 실행 파일은 `C:\Program Files\nodejs\node.exe`였다. 사용자가 임의로 열어 둔 다른 대화형 VS Code 터미널 내부를 직접 읽은 것은 아니며, 아래 비교는 현재 상속 환경과 AI OFFICE 코드가 실제로 만드는 자식 환경을 동일한 공식 실행 파일에 전달한 재현 결과다.

| 실행 조건 | 공식 `login status` 결과 |
| --- | --- |
| 기존 VS Code 계열 상속 환경 | 종료 코드 1, `Could not find home directory` |
| 수정 전 AI OFFICE 허용 목록 환경 | 종료 코드 1, 같은 홈 오류 |
| 허용 목록 + 기존 기본 폴더를 CODEX_HOME으로 명시 | 종료 코드 0, `Logged in using ChatGPT` |

따라서 AI OFFICE가 환경변수를 정제한 것만이 최초 오류의 원인은 아니다. 정제 전 환경에서도 재현되었다. 기존 adapter는 HOME/HOMEDRIVE/HOMEPATH 및 CODEX_HOME을 전달하지 않았지만 USERPROFILE은 전달했다. 이번 실험에서 HOME이나 전역 Windows 환경변수를 바꿀 필요 없이 공식 CODEX_HOME 지정만으로 로그인 상태 조회가 정상화되었다.

### 8.3 적용한 최소 수정

`src/lib/office/server/codex.ts`의 `codexEnvironment()`만 다음 원칙으로 보완했다.

- USERPROFILE이 절대 경로이고 그 아래 기존 `.codex`가 있을 때, **Codex 자식 프로세스에만** 해당 경로를 CODEX_HOME으로 전달한다.
- 다른 CODEX_HOME이 이미 명시돼 있으면 임의로 대체하지 않고 경로 확인을 요구한다.
- 인증 파일을 읽어서 앱에 복사하거나 새 인증 저장소를 만들지 않는다. 공식 CLI가 기존 저장소를 읽는다.
- API 키·ACCESS_TOKEN·클라우드 인증·proxy 등의 자식 전달 차단은 유지한다.

이는 공식 환경변수의 정상 용도다. 임의 디렉터리에 인증을 복제하거나 권한을 우회한 것이 아니다. Windows 사용자/시스템 영구 환경변수, PowerShell 프로필, `.env.local`, 기존 Codex config와 인증 정보는 직접 변경하지 않았다. 로그인·로그아웃·재인증 명령도 실행하지 않았다.

일반 VS Code 터미널에서도 같은 프로세스 한정 설정을 재현하려면 아래 명령을 사용할 수 있다. 이번 작업에서는 별도 진단 자식 환경으로 같은 조건을 실행했으며 사용자 터미널 프로필에 이 코드를 추가하지 않았다.

```powershell
$env:CODEX_HOME = Join-Path $env:USERPROFILE '.codex'
codex login status
```

터미널의 기본 환경을 영구 변경하지 않았으므로, 기존 환경 그대로의 새 CLI 세션에서는 원래 오류가 다시 나타날 수 있다. AI OFFICE adapter는 위 경로 선택을 자체 자식 환경에 적용한다.

### 8.4 검증 결과와 남은 app-server 제한

수정한 AI OFFICE의 `codexEnvironment()`와 `codexBinary()`를 그대로 사용해 공식 `login status`를 다시 실행했다. **종료 코드 0, ChatGPT 로그인 확인**에 성공했다. 출력은 메모리에서 인증 방식만 판정하고 토큰·API 키·이메일·비밀번호·원시 진단 로그는 기록하지 않았다.

이후 추론 없는 app-server probe에서는 홈 오류가 사라졌지만 프로세스가 초기화 전에 **Windows 접근 거부(`os error 5`)**로 종료했다. 공식 보안 설정을 사용한 경우와 hooks/notify만 끈 최소 설정 모두 같은 결과였다. 따라서 역할 지침이나 모델 요청 실패가 아니다. thread/start와 turn/start는 보내지 않았다.

공식 `sqlite_home` 옵션으로 별도 앱 소유 진단 런타임 폴더 `.office-data/codex-runtime`을 사용한 실험에서도 접근 거부가 남았다. 이 옵션은 실제 adapter 설정에 추가하지 않았다. 기존 Codex 데이터베이스·세션을 옮기거나 삭제하지 않았으며, 이 실험만으로 거부된 정확한 내부 경로까지 특정하지 못했다. 숨겨진 환경변수·비공식 전송·권한 완화·인증 복사는 사용하지 않았다.

| 항목 | 최신 결과 |
| --- | --- |
| 기존 ChatGPT 로그인 존재 여부 | 공식 CLI가 확인, 종료 코드 0 |
| AI OFFICE 자식 환경의 홈 경로 설정 | 수정 및 CLI 상태 조회 검증 완료 |
| app-server 실제 account/read | 접근 거부로 초기화 전 종료, 아직 미검증 |
| 현재 웹 UI에서 완전한 Codex 연결 성공 | 미확인. probe는 여전히 connected false로 안전하게 보고 |
| 실제 AI 추론·구독 사용량 테스트 | 미실행 |
| 최초 실행 승인 플래그 | 변경하지 않음, 승인 잠금 유지 |

공식 로그인 상태 성공은 로컬 캐시의 인증 방식 확인이다. 토큰의 실제 추론 권한·만료 상태·구독 한도까지 모델 호출로 검증했다는 뜻이 아니다. 다음 조치는 정상 사용자 실행 환경에서 app-server의 접근 거부 원인을 확인하는 것이며, 이를 해결한 후에도 실제 추론은 별도 승인 전까지 시작하지 않는다.

### 8.5 보존과 테스트

수정 전 백업:

`C:\Users\samsung-user\Downloads\ai-office-starter\.backups\codex-home-fix-20261031-224546`

`codex.ts`, 관련 테스트와 보고서 및 보존 확인 대상의 백업/해시 목록을 저장했다. 로그인 토큰 저장소는 백업하지 않았다. 실제 변경 범위는 `codex.ts`, `scripts/subscription-test.cjs`, 이 보고서와 빌드/테스트 산출물이다. 진단 보조 스크립트는 앱 소스 밖 `.backups`에 두었고, 원시 인증 출력은 파일로 저장하지 않았다.

- `npm.cmd run typecheck`: 통과.
- `npm.cmd run build`: 프로덕션 빌드 통과. 기존 페이지와 새 구독 라우트 유지.
- `npm.cmd run test:subscription`: 통과. 기존 프로세스·인증·유료 차단 검사에 기본 기존 홈 선택, 존재하지 않는 경로, 다른 인증 경로의 거부 검증을 추가했다.
- `.env.local`, `package-lock.json`, 업무 저장 모듈과 고객 저장 모듈: 수정 전 SHA-256과 일치.
- 기존 업무/고객 localStorage 및 유료/구독 업무 원장 내용은 수정하지 않았다. 별도 진단 런타임만 생성했다.
- 유료 API·실제 AI 추론·패키지 설치·새 결제·로그인 초기화는 수행하지 않았다.

### 공식 근거 (2026-10-31 본문 열람)

- [Codex 환경변수: CODEX_HOME, CODEX_SQLITE_HOME](https://learn.chatgpt.com/docs/config-file/environment-variables)
- [공식 로그인 상태 조회 명령과 종료 코드](https://learn.chatgpt.com/docs/developer-commands)
- [기존 로그인 캐시와 인증 저장 방식](https://learn.chatgpt.com/docs/auth?surface=cli)
- [Windows의 기본 Codex 홈](https://learn.chatgpt.com/docs/app/windows)
- [sqlite_home 등 공식 설정](https://learn.chatgpt.com/docs/config-file/config-reference)

## 9. 추가 진단: app-server 접근 거부와 중단 판단 (2026-11-01)

**결론: 기존 ChatGPT 로그인은 정상 확인되지만, 현재 관리된 실행 환경에서 app-server 초기화에 필요한 Codex 홈 상태/제어 경로의 접근 제한이 확인되었다. 앱 코드 결함으로 단정하거나 ACL·보안 정책을 변경하지 않았다. 실제 app-server 연결은 아직 해결되지 않았으며, 권한 우회 없이 진단을 중단한다.** 아래 경로·단계 중 확인된 사실과 추정을 구분한다.

### 9.1 실패 단계와 대상 경로

같은 공식 실행 파일로 아래 결과를 재현했다. 원시 stderr는 저장하거나 그대로 출력하지 않고 종료 코드·정해진 오류 패턴·이미 알고 있는 경로의 포함 여부만 판정했다.

| 단계/조건 | 결과 |
| --- | --- |
| AI OFFICE 자식 환경으로 `login status` | 종료 코드 0, ChatGPT 인증 확인. 홈 오류 없음 |
| app-server에 AI OFFICE의 보안 설정 적용 | 자식 프로세스 생성 자체는 성공, exit 1, stdout 프로토콜 응답 없이 `os error 5` |
| 상속 터미널 환경 + 같은 CODEX_HOME, hooks/notify만 비활성화한 진단 | exit 1. `failed to initialize sqlite state runtime` 오류와 대상 `C:\Users\samsung-user\.codex` 확인 |
| app-server 설정 출력 전용 옵션 | 설정 관련 stdout은 생성되지만 전체 명령은 exit 1. 성공한 RPC 초기화로 취급하지 않음 |
| 동일 AI OFFICE 환경에서 작업 폴더만 상위 workspace로 변경 | 동일한 접근 거부. 앱 하위 작업 폴더만의 문제라는 근거 없음 |

진단용 최소 설정은 일반 터미널 실행과 비교하기 위한 조건이다. 이 설정으로 직원 실행을 허용하거나 제품 보안 설정을 완화하지 않았다. 실제 thread/start·turn/start는 실행하지 않았다.

**확정할 수 있는 실패 단계는 모델 호출 이전의 로컬 런타임 초기화다.** SQLite 오류가 구체적인 경로를 제공한 조건에서는 Codex 홈 루트까지 확인했다. 다만 이 CLI가 모든 설정에서 동일한 상세 오류를 반환하지는 않았으며, 실패한 개별 SQLite 파일명·CreateFile 등의 정확한 시스템 호출까지 확인하지 못했다. 파일명을 추정해 확정 원인으로 적지 않는다.

별도 읽기 전용 검사에서 `C:\Users\samsung-user\.codex\app-server-control`은 디렉터리 목록 조회와 Get-Acl 모두 `UnauthorizedAccessException`이었다. 기본 제어용 소켓 경로와 관련된 폴더에도 접근 제한이 있다는 증거다. **이 폴더의 거부가 모든 app-server 종료의 직접 원인이라고까지 입증된 것은 아니다.** SQLite 런타임 오류와 제어 폴더의 접근 제한을 하나의 확정 파일 오류로 합치지 않는다.

CLI 로그인 조회에도 PATH alias 생성 관련 접근 거부 경고가 있었지만 종료 코드 0으로 성공했다. 따라서 경고에 있는 `os error 5`와 app-server의 치명적 종료 오류를 구분했다. alias 경고만 고치면 서버도 정상이라는 결론은 내리지 않았다.

### 9.2 실행 파일·권한·작업 폴더·환경 비교

공식 codex.exe 경로:

`C:\Users\samsung-user\AppData\Roaming\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe`

CLI와 app-server는 이 **동일한 실행 파일**을 사용했다. npm의 codex.cmd와 같은 설치이며 Microsoft Store/WindowsApps 경로로 바꾸거나 실행 파일을 복사하지 않았다. 실행 파일의 Authenticode 상태는 Valid였다. 같은 파일의 로그인 명령이 성공하고 app-server 프로세스도 생성되므로, codex.exe 자체의 실행 권한 부재와는 구분된다. 같은 폴더에 공식 `codex-code-mode-host.exe`가 있는 것도 확인했지만 이를 별도 우회 호스트로 실행하지 않았다.

앱 작업 폴더는 `C:\Users\samsung-user\Downloads\ai-office-starter\ai-office-starter`다. CODEX_HOME은 이전에 수정한 기존 기본 경로를 계속 사용했다. AI OFFICE는 API 키·토큰·proxy 등을 제외한 허용 목록으로 환경을 구성하고 shell:false로 실행한다. 터미널 상속 환경과 앱 허용 목록 환경 모두 서버 오류를 재현해, 허용 목록에서 빠진 어떤 환경변수 하나가 확정 원인이라는 증거는 없다. HOME 경로 오류도 다시 나타나지 않았다.

여기서 ‘터미널 상속 환경’은 현재 진단 프로세스가 상속한 VS Code 계열 환경을 의미한다. **관리된 에이전트 실행 범위 밖에서 사용자가 직접 연 일반 권한 VS Code 터미널은 직접 조작하지 않았다.** 두 조건 모두 현재 제한된 프로세스 권한을 상속하므로, 일반 사용자 터미널도 반드시 실패한다고 주장할 수 없다. 이 차이는 후속 비교에 남는다.

### 9.3 파일 ACL·실행 정책·보안 이벤트

읽기 전용 Get-Acl 결과:

| 경로 | 확인 결과 |
| --- | --- |
| 사용자 `.codex` 루트 | ACL 조회 가능, 상속 활성, Allow 4개·Deny 0개 |
| `.codex/tmp` | ACL 조회 가능, 상속 활성, Allow 4개·Deny 0개 |
| `.codex/app-server-control` | 목록 및 ACL 조회 거부 |
| 앱 프로젝트 폴더 | ACL 조회 가능, 상속 활성, Allow 6개·Deny 0개 |

Allow/Deny 개수는 현재 제한 토큰의 유효 쓰기 권한을 계산한 결과가 아니다. 루트 ACL에 명시적 Deny가 없다고 모든 자식 경로에 접근할 수 있는 것은 아니다. 특히 이번 세션의 관리된 파일 쓰기 허용 범위는 workspace와 지정된 임시/작업 폴더이며, 사용자 `C:\Users\samsung-user\.codex`는 포함되지 않는다. 정상 로그인 캐시 읽기 성공이 app-server의 상태 기록·제어 경로 접근도 허용한다는 뜻은 아니다.

PowerShell Get-ExecutionPolicy -List는 모든 범위 Undefined였다. 진단용 ps1 파일 실행은 PSSecurityException으로 거부되었다. 이를 Bypass/Unrestricted나 정책 변경으로 우회하지 않았다. 필요한 ACL/이벤트 정보는 직접적인 읽기 전용 cmdlet 조회로 확인했다. app-server는 ps1이 아닌 직접 codex.exe 실행에서도 실패하므로, 스크립트 실행 정책 하나로 서버 오류를 설명할 수 없다.

최근 1시간, 최대 100개 이벤트 범위에서 Windows Defender Operational 로그에 codex.exe 또는 codex-code-mode-host.exe가 언급된 항목은 0개였다. CodeIntegrity Operational 및 AppLocker EXE and DLL 조회는 `NoMatchingEventsFound`였다. 후자의 결과를 ‘로그 권한 거부’로 해석하지 않는다. 이 제한된 조회로 모든 보안 프로그램이나 과거 차단을 배제할 수도 없다. Defender/AppLocker가 원인이라고 확정하지 않았고 어떠한 보안 기능도 끄지 않았다. 이벤트 원문은 출력·저장하지 않았다.

### 9.4 변경하지 않고 중단한 이유

사용자 요청의 ‘외부 보안 정책 또는 승인이 필요한 권한 변경이면 우회하지 말고 중단’ 조건을 적용했다. 현재 환경의 허용 범위 밖인 Codex 홈을 앱이 자유롭게 기록하도록 만들거나 보호된 제어 폴더에 접근시키는 변경은 수행하지 않는다. 기존 인증을 새 writable 폴더로 복제하는 방법도 사용하지 않는다.

이번에는 앱 소스·환경변수·실행기 인자·ACL·로그인 저장소를 수정하지 않았다. 진단 스크립트는 `.backups`에만 추가했고, 보고서와 테스트/빌드 산출물만 갱신했다. 관리자 상승, 폴더 전체 쓰기 권한 부여, 보안 제품 예외, 외부 제어 소켓/원격 호스트로의 전환, 추가 패키지 설치는 하지 않았다.

남은 확인은 일반 권한의 사용자 VS Code 터미널에서 **동일 공식 실행 파일·동일 기존 CODEX_HOME으로 app-server 초기화까지만** 비교하는 것이다. 그 환경에서는 성공한다면 현재 에이전트/서버 실행 컨텍스트의 정책 차이가 더욱 명확해진다. 거기서도 실패하면 해당 사용자가 열람 가능한 보안 기록이나 승인된 로컬 추적으로 정확한 하위 파일·시스템 호출을 확인해야 한다. 현재 증거만으로 특정 ACL 수정이나 관리자 실행을 처방하지 않는다.

### 9.5 재검증 및 보존

변경 전 보고서는 다음 위치에 별도 보존했다.

`C:\Users\samsung-user\Downloads\ai-office-starter\.backups\app-server-access-20261101-000933\STAGE6_1.md`

- TypeScript 검사 통과.
- test:subscription, test:live, test:office, test:engine 모의·기존 회귀 검사 통과. 실제 공급자 추론은 없음.
- `npm.cmd run build`: 프로덕션 빌드 통과. 기존 `/office`, `/storybook`과 API 라우트 유지.
- 기존 ChatGPT 로그인 조회 성공을 다시 확인했으며 로그인/로그아웃/초기화 명령은 실행하지 않았다.
- 고객 답변과 업무 원장, 브라우저 저장소, 기존 인증 파일을 삭제·이동·직접 수정하지 않았다.
- 웹 상태 조회에서 firstRunApproved=false, paidApiEnabled=false를 확인했다. 최초 실행 잠금과 유료 차단을 유지한다.

### 공식 근거 (2026-11-01 열람)

- [Codex App Server: stdio·제어 소켓·초기화 수명 주기](https://learn.chatgpt.com/docs/app-server)
- [공식 환경변수와 상태 저장 위치](https://learn.chatgpt.com/docs/config-file/environment-variables)
- [Codex 설정·권한 관련 참조](https://learn.chatgpt.com/docs/config-file/config-reference)

## 10. Windows 접근 거부 재진단 및 일반 PowerShell 복구 절차 (2026-11-01)

**결과: 현재 관리 실행 환경의 계정/권한 차이를 확인했다. 권한은 변경하지 않았으며 초기화 문제의 해결 완료는 미검증이다. 일반 사용자 PowerShell에서 아래 순서로 비교해야 한다.**

### 10.1 실제 실행 계정과 관찰된 권한

`whoami /user` 결과는 `대우PC\codexsandboxoffline`, SID `S-1-5-21-1719597592-1571102785-764237435-1003`이다. USERPROFILE은 `C:\Users\samsung-user`지만 프로세스의 실제 사용자는 다르다. 그룹에는 `CodexSandboxUsers`(SID 끝 1002)가 포함되고 관리자 그룹은 없다.

| 경로 (`C:\Users\samsung-user` 기준) | 소유자 | 상속 | 확인한 DACL |
| --- | --- | --- | --- |
| `.codex` | 대우PC\samsung-user (SID 끝 1001) | 활성 | SandboxUsers 명시적 RX; SYSTEM, Administrators, samsung-user 상속 F |
| `.codex\tmp` | 동일 | 활성 | 위 네 항목 상속, SandboxUsers RX |
| `.codex\tmp\arg0-windows` | 동일 | 활성 | 동일 |
| `.codex\app-server-control` | 조회 불가 | 조회 불가 | Get-Acl, icacls, 자식 목록 조회 모두 접근 거부 |
| `.codex\state_5.sqlite`, `state_5.sqlite-wal`, `state_5.sqlite-shm`, `.sqlite-maintenance.lock` | 대우PC\samsung-user | 활성 | SandboxUsers RX; SYSTEM, Administrators, samsung-user F |

RX는 읽기/실행, F는 전체 제어다. app-server-control은 일반 디렉터리로 보이고 관찰된 재분석 링크는 없다. 해당 폴더의 소유자나 상속 상태를 추정해서 채우지 않았다.

확인된 실패 경로는 tmp 아래 arg0 디렉터리 생성/정리 경고와 app-server-control의 ACL·목록 접근이다. SQLite 파일의 DACL에도 샌드박스 쓰기 권한이 없다. 이는 이 계정에서 SQLite 초기화가 실패할 수 있다는 근거지만, 실제 실패한 SQLite 파일/시스템 호출은 특정하지 못했다. 루트에 새 WAL/잠금 파일을 생성하려면 디렉터리 쓰기도 필요하므로 파일 하나의 ACL만 바꾸는 식으로 해결됐다고 볼 수 없다.

현재 환경의 쓰기 허용 목록은 workspace와 지정 임시 경로이며 사용자 `.codex`는 포함되지 않는다. 사용자 허가가 있어도 이 제한을 도구에서 변경할 수 없고 sandbox 승인 범주도 비활성이다. 제한 계정에 인증·DB 접근 권한을 확대하거나 소유권을 탈취하는 작업은 수행하지 않았다.

### 10.2 먼저 일반 PowerShell에서 확인 (관리자 실행 불필요)

사용자가 직접 연 일반 PowerShell에서 실행한다. 작업 디렉터리와 USERPROFILE이 아래 계정인지 확인하고, 샌드박스 계정이면 중단한다.

```powershell
Set-Location -LiteralPath 'C:\Users\samsung-user\Downloads\ai-office-starter\ai-office-starter'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$identity.Name
$identity.User.Value
if ($identity.User.Value -ne 'S-1-5-21-1719597592-1571102785-764237435-1001') {
  throw 'samsung-user 일반 PowerShell에서 다시 실행하세요.'
}
$env:CODEX_HOME = Join-Path $env:USERPROFILE '.codex'
$targets = @($env:CODEX_HOME, (Join-Path $env:CODEX_HOME 'tmp'),
  (Join-Path $env:CODEX_HOME 'app-server-control'))
foreach ($target in $targets) {
  Write-Host "폴더: $target"
  $acl = Get-Acl -LiteralPath $target -ErrorAction Stop
  $acl | Format-List Owner,AreAccessRulesProtected,Sddl
  $acl.Access | Format-Table IdentityReference,AccessControlType,FileSystemRights,IsInherited,InheritanceFlags,PropagationFlags -AutoSize
}
node .\scripts\codex-init-only.cjs
```

PASS이면 ACL 변경이 필요 없다. AI OFFICE 서버도 같은 일반 사용자 컨텍스트에서 실행해야 한다. 이 성공이 관리 샌드박스에서의 실행 성공을 의미하지는 않는다. 단순 `codex app-server` 상주 여부 대신 initialize 응답과 initialized 전송까지만 검사한다. 스크립트는 설치된 동일 codex.exe를 직접 실행하고 15초 제한을 두며 thread/start, turn/start, 계정 조회 또는 추론을 요청하지 않는다. PASS 후 해당 자식 프로세스만 종료한다. 실행 정책 변경 없이 Node로 실행한다.

### 10.3 권한 변경 후보와 사전 설명 — 아직 실행하지 않음

대상 후보는 **app-server-control 폴더 하나**다. 기존 권한은 현재 환경에서 조회 불가이므로 위 일반 PowerShell의 ACL 확인이 선행 조건이다. samsung-user가 이미 필요한 권한을 가지면 변경하지 않는다. ACL 조회가 여전히 실패하면 아래 변경 코드를 실행하지 말고 중단한다.

일반 사용자로도 실패하고 실제 ACL에서 samsung-user 수정 권한 누락이 확인된 경우에만, 현재 DACL을 백업한 다음 해당 사용자에게 이 폴더 자체의 Modify 허용 ACE 하나를 추가할 수 있다. FullControl을 부여하지 않고 소유자·상속·다른 ACE를 변경하지 않는다. /T, /reset, /grant:r, takeown을 사용하지 않는다. 기존 Deny가 관련 사용자/그룹에 적용되면 Allow 추가로 해결하려 하지 말고 해당 Deny의 출처를 먼저 확인한다. 자식 파일의 권한 부족은 별도로 조사하며 이 명령을 재귀 확대하지 않는다.

다음 코드는 **위 조건을 확인한 뒤에만** 같은 일반 PowerShell 세션에 붙여 넣는다. 관리자 승격은 포함되어 있지 않다.

```powershell
$target = Join-Path $env:CODEX_HOME 'app-server-control'
$acl = Get-Acl -LiteralPath $target -ErrorAction Stop
$acl | Format-List Owner,AreAccessRulesProtected,AccessToString
if ($acl.Access | Where-Object AccessControlType -eq Deny) {
  throw 'Deny ACE가 있으므로 자동 추가를 중단합니다. 출처와 적용 대상을 검토하세요.'
}
$backupDir = Join-Path (Get-Location).Path 'acl-backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backup = Join-Path $backupDir ('app-server-control-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.dacl.txt')
$accessSection = [System.Security.AccessControl.AccessControlSections]::Access
$acl.GetSecurityDescriptorSddlForm($accessSection) | Set-Content -LiteralPath $backup -Encoding UTF8
Write-Host "복구용 DACL 백업: $backup"
$rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
  $identity.User, [System.Security.AccessControl.FileSystemRights]::Modify,
  [System.Security.AccessControl.InheritanceFlags]::None,
  [System.Security.AccessControl.PropagationFlags]::None,
  [System.Security.AccessControl.AccessControlType]::Allow)
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $target -AclObject $acl -ErrorAction Stop
Get-Acl -LiteralPath $target | Format-List Owner,AreAccessRulesProtected,AccessToString
node .\scripts\codex-init-only.cjs
```

復구는 같은 세션에서 아래처럼 **백업 DACL만** 되돌린다. 다른 세션이면 `$target`과 `$backup`에 위 대상과 실제 백업 파일의 절대 경로를 먼저 지정한다. 이 변경 절차는 소유자와 SACL을 바꾸지 않으므로 복구도 DACL에 한정한다. 다른 프로세스가 그 사이 권한을 변경했다면 백업을 복원하기 전에 차이를 검토한다.

```powershell
$restoreAcl = Get-Acl -LiteralPath $target -ErrorAction Stop
$restoreAcl.SetSecurityDescriptorSddlForm(
  (Get-Content -LiteralPath $backup -Raw -Encoding UTF8).Trim(),
  [System.Security.AccessControl.AccessControlSections]::Access)
Set-Acl -LiteralPath $target -AclObject $restoreAcl -ErrorAction Stop
```

조회 또는 Set-Acl에서 접근 거부가 나면 반복 변경/소유권 변경을 하지 않는다. 관리자 작업은 이 절차에 포함하지 않았으며, 실제 일반 사용자 진단 결과와 변경할 ACE를 확인한 후 사용자의 별도 직접 승인이 필요하다. 지금은 관리자 승격을 요청하거나 수행하지 않았다. SQLite 접근 거부가 일반 사용자에서도 계속되면 오류에 표시된 정확한 DB/상위 경로의 ACL을 먼저 수집하고 다음 변경을 결정한다. DB 삭제·재생성이나 루트 전체 제어 부여는 하지 않는다.

### 10.4 이번 검증과 보존 사항

추가 도구: `scripts/codex-init-only.cjs`. 현재 제한 계정에서 한 번 실행한 결과 exit 1, tmp arg0 권한 경고 및 `Error: 액세스가 거부되었습니다. (os error 5)`, initialize 응답 없음이었다. 따라서 **현재 환경에서 초기화 실패 재현**, **일반 사용자 실행 및 수정 후 성공 검증은 미완료**로 기록한다. 권한 수정이 불가능한 환경이므로 위 직접 실행 명령을 제공한다.

인증 파일, 기존 데이터베이스, 보안 기능, 제품 설정, AI OFFICE 최초 실행 승인 잠금을 변경하지 않았다. 실제 AI 추론·유료 API 호출·thread/turn 생성은 수행하지 않았다. 기존 보고서를 보존하고 이 절을 추가했다.

공식 초기화 절차 근거: [OpenAI Docs — Codex App Server](https://learn.chatgpt.com/docs/app-server) (2026-11-01 열람). 로컬 ACL·계정에 관한 결론은 이번 Windows 조회 결과에 근거한다.

## 11. 일반 사용자 초기화 성공 이후 로그인 probe 조사 (2026-11-01)

### 확인된 증거와 남은 제한

사용자 직접 확인: 일반 PowerShell의 계정은 `대우pc\samsung-user`, `codex-init-only.cjs` 초기화 PASS, `codex.cmd login status`는 ChatGPT 로그인, 같은 터미널에서 dev 서버 실행 성공. 이 결과는 사용자 환경의 초기화·로그인 성공 증거로 채택했다. 도구의 codexsandboxoffline 실패로 이를 반박하거나 일반 사용자 오류라고 단정하지 않는다.

이 세션에서 http://127.0.0.1:3000/api/office/subscription 접속을 시도했으나 로컬 서버 응답을 확보하지 못했다. 따라서 사용자가 실행한 서버 프로세스의 실제 실패 RPC/종료 원인은 아직 미확정이다. 추정 설정 변경 대신 확인된 진단 결함만 수정했다.

### 호출 흐름과 실패 단계

`/office` → subscriptionRequest POST `/api/office/subscription` → 로컬 origin 검사 → 관리자 세션 검사 → action=probe → probeCodex → StdioRpc(기존 환경 allowlist 및 safeOverrides 적용) → initialize → initialized 알림 → account/read(refreshToken=false) → 연결·인증 유형 반환 → 자식 종료.

기존 코드에서는 예외를 모두 connected=false로 치환했으며 RPC 거부·프로세스 종료·초기화 실패가 동일 화면 메시지에 가려졌다. 이것이 이번 코드 조사로 확인된 결함이다. 새 결과는 stage와 고정된 reason 분류를 추가한다.

| 단계 | 로그인 버튼의 기존/현재 호출 여부 | 이번에 확인한 사항 |
| --- | --- | --- |
| initialize | 호출 | 기본 초기화 스크립트는 사용자 환경에서 PASS. 앱은 추가 안전 override/정제 환경을 사용하므로 같은 조건으로 별도 확인 필요 |
| account/read | initialize 성공 후 호출 | 공식 account.type=chatgpt 판정은 문서와 일치. 사용자 터미널의 login status만으로 이 RPC 성공을 확정하지 않음 |
| config/read | 호출하지 않음 | 실제 실행 execute에서만 호출. 버튼 실패 원인으로 단정할 수 없음 |
| account/rateLimits/read | 호출하지 않음 | 실제 실행 execute에서만 호출. 버튼 실패 원인으로 단정할 수 없음 |

따라서 configRead/rateLimitsRead는 결과에 not_requested로 명시한다. connected=true여도 ChatGPT 인증이 아니면 authMode=unavailable, reason=chatgpt_required로 표시하고 실행 허가로 취급하지 않는다.

### 최소 수정

- `src/lib/office/server/codex.ts`: probe 단계 및 고정 reason 반환; 원문 RPC 오류·stderr는 반환하지 않음. account 응답의 필수 형태 확인, planType은 알려진 값만 출력. stderr는 최대 16 KiB 메모리 버퍼로 실패 분류만 하고 종료 시 비운다. 프로세스 exit 대신 stdio가 배출된 close에서 종료 실패를 처리해 마지막 진단을 잃지 않게 했다. alias 경고만으로 access_denied로 단정하지 않는다. RPC 거부·시간 초과·프로토콜 오류도 구분한다.
- `src/app/office/subscription-controls.tsx`: 기존 포괄 메시지에 실제 실패 단계·분류를 표시한다. 인증된 기존 API를 사용하며 origin/세션 검사를 우회하지 않는다.
- `scripts/codex-probe-only.cjs`: 제품과 동일한 StdioRpc·safeOverrides·정제 환경을 쓰는 추론 없는 probe. 계정·설정·stderr 원문 및 비밀을 출력하지 않는다.
- `scripts/subscription-test.cjs`: 초기화 실패와 account/read 실패 구분, 프로세스 진단 분류, 경고/치명 오류 구분, 비밀 문자열 누출 차단, API-key 거부 및 후속 config/quota/thread/turn 미호출을 검증.

safeOverrides, 실제 실행의 설정·개인 구독 플랜·크레딧/한도 검증, 최초 실행 승인 플래그, 유료 API 차단은 변경하지 않았다. 설정 검사에서는 누락된 기능 값도 실패로 처리하고 quota 검사는 null/미확인 credits를 실패로 처리하므로 보수적이다. 실제 공식 응답에서 어떤 값이 누락되는지 확보하지 않은 상태에서 이를 임의 완화하지 않았다. features.code_mode.enabled는 공식 설정 참조에 있는 형태이며 추정으로 변경하지 않았다.

### 검증 결과와 직접 재검증 명령

모의 테스트 test:subscription, test:office, test:live 및 TypeScript typecheck 통과. 실제 모델·유료 API 호출 없음. 제한 계정에서 새 probe 실행 결과 stage=initialize, reason=disconnected, connected=false였다. 이 분류는 일반 사용자 실행 결과를 대신하지 않으며 원문으로 입증되지 않은 세부 원인을 추정하지 않는다.

사용자가 직접 연 **일반 PowerShell**에서:

```powershell
cd C:\Users\samsung-user\Downloads\ai-office-starter\ai-office-starter
whoami
npm.cmd exec -- tsc -p tsconfig.live-tests.json
node .\scripts\codex-probe-only.cjs
```

정상 기준은 connected=true, authMode=chatgpt, stage=complete, reason=none이다. 성공해도 실제 실행 승인이나 안전 설정/한도 검증 성공을 의미하지 않는다. 실패하면 이 스크립트의 안전한 JSON 결과(stage/reason)를 기준으로 다음 수정 범위를 정한다. 비밀번호·토큰·인증 파일 내용을 공유할 필요는 없다.

기존 dev 서버는 Ctrl+C로 중지한 뒤 **같은 일반 사용자 PowerShell**에서 `npm.cmd run dev`로 다시 시작하고 `/office`에서 로컬 인증 후 'Codex 로그인 상태 확인 · 추론 없음'을 누른다. 화면의 실패 단계/분류가 CLI probe와 다르면 dev 서버의 다른 설치/프로세스 환경을 우선 비교한다. 빌드 중 사용한 .env.local과 저장된 인증·사용자 DB·업무 데이터는 수정하지 않았다.

초기화 전용 기존 스크립트는 원래 상속 환경/기본 설정으로 실행하므로 새 제품 probe와 목적이 다르다. 새 스크립트는 서버와 동일한 프로세스 환경에서 실행할 때 제품 조건을 재현하며, 셸과 Next.js가 읽은 환경이 다르면 결과도 다를 수 있다.

공식 근거: [OpenAI Docs — app-server account/read 및 config/read](https://learn.chatgpt.com/docs/app-server), [공식 설정 참조](https://learn.chatgpt.com/docs/config-file/config-reference), 2026-11-01 열람.

**현재 상태: 오류 진단 결함 수정 및 모의 검증 완료. 사용자 일반 환경에서 버튼 실패의 정확한 원인 확인·연결 복구는 새 stage/reason 결과 대기이며 완료로 표시하지 않는다.**

최종 빌드 결과: npm.cmd run build 종료 코드 0. Next.js 프로덕션 컴파일·타입 검사·페이지 생성 완료.

## 12. initialize/disconnected 원인 특정 및 지원 종료된 승인 정책 수정 (2026-11-01)

사용자가 일반 PowerShell에서 새 제품 probe를 실행해 stage=initialize, reason=disconnected를 확인했다. account/read 이전 종료이며 config/read·account/rateLimits/read는 미호출이다.

### 확인한 직접 원인

초기화 조건 비교 도구 `scripts/codex-startup-diagnostic.cjs`를 추가했다. 기본 실행, 정제 환경, 명시적 stdio, 앱 override 조건을 비교하며 initialize만 전송한다. 원문 stderr·계정 정보·토큰은 출력하지 않고 종료 코드, 고정 분류, 미리 정한 설정 키/단어만 표시한다. 제품 정책을 변경하거나 추론을 요청하지 않는다.

현재 제한 계정에서도 앱 override 조건에서 approval_policy와 untrusted 설정을 지목하는 종료가 관찰됐다. 정확한 고정 오류 패턴 `approval_policy = "untrusted" ... no longer supported ... remove this setting`을 분류기에 추가한 후, 기존 제품 probe에서 reason=configuration이 재현됐다. 원문 오류에 민감 데이터가 섞일 수 있어 원문을 출력하지 않았다.

OpenAI 공식 설정 참조와 Agent approvals & security에서 명시적 approval_policy="untrusted"는 더 이상 지원되지 않음을 확인했다. 기존 앱은 이 값을 매번 -c 인자로 강제했다. 따라서 사용자 기본 초기화는 성공하고 앱 설정으로 실행하면 initialize 전에 종료되는 차이를 설명하는 확인된 코드 결함이다. 기존 disconnected 분류는 이 오류 문구를 놓친 결과였다. 앞 절의 안전 정책 무변경 판단은 당시 미확정 상태의 기록이며, 이 절의 구체적 원인 확인과 수정으로 갱신한다.

### 수정 및 안전성

`src/lib/office/server/codex.ts`의 CLI override, thread/start·turn/start 승인 정책, 반환 정책 검증을 지원되는 on-request로 일치시켰다. 설정 검사를 삭제하거나 승인 응답을 자동 허용하지 않았다. read-only sandbox, shell/exec/hooks/apps/plugins/code mode/search 등 비활성화, 모든 서버 도구/승인 요청 거부 handler, 최초 실제 실행 승인 잠금, ChatGPT 개인 구독·설정·크레딧/한도 검사 및 유료 API 차단은 유지했다. 사용자 config.toml을 변경하지 않고 자식 실행 인자만 수정했다. on-request 자체가 텍스트 전용을 보장하는 것은 아니며, 기존의 도구 차단과 요청 거부를 함께 유지하는 구조다.

모의 테스트에는 구형 오류 문구의 configuration 분류, 새 on-request 인자, 서버가 never 또는 untrusted 정책을 반환할 때 turn/start 이전 차단을 추가했다.

### 검증

- test:subscription, test:office, test:live: 모두 종료 코드 0.
- typecheck: 종료 코드 0.
- build: Next.js 컴파일·타입 검사·페이지 생성 모두 완료, 종료 코드 0.
- 제한 계정의 실제 probe: 수정 전 configuration 종료가 수정 후 sqlite_initialization으로 바뀜. 지원 종료 정책으로 인한 조기 종료를 통과하고 기존 샌드박스의 SQLite 접근 제한에 도달한 증거다. 이를 일반 사용자 환경의 SQLite 실패나 연결 성공으로 확대 해석하지 않는다.
- 인증·DB·사용자 데이터·보안 기능·최초 승인 잠금 변경 없음. 실제 추론·유료 API 호출 없음.

일반 사용자에서 최종 연결 성공은 아직 재검증이 필요하다. 같은 일반 PowerShell에서:

```powershell
cd C:\Users\samsung-user\Downloads\ai-office-starter\ai-office-starter
npm.cmd exec -- tsc -p tsconfig.live-tests.json
node .\scripts\codex-probe-only.cjs
```

정상 기대값은 connected=true, authMode=chatgpt, stage=complete, reason=none이다. 기존 dev 서버를 Ctrl+C로 중지하고 같은 일반 PowerShell에서 `npm.cmd run dev`로 다시 시작한 뒤 로그인 확인 버튼을 재검증한다. stage가 account/read로 바뀌거나 다른 오류가 나오면 새 단계/분류를 다음 진단 근거로 삼는다.

공식 근거(2026-11-01 열람): [Configuration Reference — approval_policy](https://learn.chatgpt.com/docs/config-file/config-reference), [Agent approvals & security — retired untrusted policy](https://learn.chatgpt.com/docs/agent-approvals-security).


## 13. 승인된 최초 텍스트 실행 안전 검증 (2026-11-01)

일반 Windows 사용자 환경에서 검증. 기존 인증·사용자 데이터·소스·.env 변경 없음. 실제 직원의 파일 수정·유료 API·추가 크레딧 구매·자동 재시도·게시·배포 금지. 설정 검증은 기존 CodexExecutor 조건을 그대로 재사용. 승인 플래그는 검증 통과 시에만 단일 executor 인스턴스에 적용하며 영구 저장하지 않음.

```json
{
  "date": "2026-11-01 Asia/Seoul",
  "tests": [
    "node_modules/typescript/bin/tsc -p tsconfig.live-tests.json PASS",
    "scripts/subscription-test.cjs PASS",
    "scripts/live-test.cjs PASS",
    "node_modules/typescript/bin/tsc -p tsconfig.office-tests.json PASS",
    "scripts/office-test.cjs PASS",
    "node_modules/typescript/bin/tsc --noEmit --incremental false PASS"
  ],
  "connected": true,
  "approval": "not_set",
  "turnStarts": 0,
  "automaticRetries": 0,
  "probe": {
    "connected": true,
    "authMode": "chatgpt",
    "planType": "plus",
    "stage": "complete",
    "reason": "none",
    "checks": {
      "configRead": "not_requested",
      "rateLimitsRead": "not_requested"
    }
  },
  "authMode": "chatgpt",
  "planType": "plus",
  "configRead": "blocked",
  "rateLimitsRead": "passed",
  "quota": [
    {
      "primaryUsedPercent": 10,
      "secondaryUsedPercent": 11,
      "hasCredits": false,
      "unlimited": false
    }
  ],
  "status": "blocked_before_inference"
}
```

turnStarts=0이면 추론을 요청하지 않았고 기존 실행 잠금을 유지함. turnStarts=1이면 구독 사용량이 소비될 수 있으며 백분율만으로 정확한 소비량을 확정하지 않음. 실패한 실행은 자동 재시도하지 않음. 테스트는 모의 테스트이며 모델 호출이 아님.


## 14. 사용자 명시 승인에 따른 최초 실행 잠금 해제 (2026-11-01)

사용자가 실행 잠금 해제를 명시적으로 요청하여 .env.local의 OFFICE_CODEX_FIRST_RUN_APPROVED만 true로 설정하고 저장 값을 확인했다. 실제 AI 업무·추론·유료 API·자동 재시도는 실행하지 않았다. 설정·개인 ChatGPT 인증·구독 한도·추가 크레딧 차단·텍스트 전용 검사는 유지하며 13절의 설정 검사 실패는 미해결이다. 기존 인증과 사용자 데이터 및 다른 환경 설정은 보존했다. 실행 중인 서버에는 재시작이 필요할 수 있다.


## 15. 설정 차단 항목의 추론 없는 진단 (2026-11-01)

VS Code는 필수 실행 의존성이 아니다. 현재 Codex 앱과 일반 Windows 사용자 Node.js에서 진단을 진행했다. 설정 원문·비밀은 출력하지 않았다. 실제 추론 및 설정 변경 없음.

```json
{
  "inferenceRequests": 0,
  "configChanged": false,
  "normalUser": true,
  "checks": {
    "model_provider": true,
    "forced_login_method": true,
    "sandbox_mode": true,
    "web_search": true,
    "mcp_servers_empty": false,
    "plugins_empty": false,
    "model_providers_empty": true,
    "openai_base_url_absent": true,
    "chatgpt_base_url_absent": false,
    "features.shell_tool": true,
    "features.unified_exec": true,
    "features.hooks": true,
    "features.apps": true,
    "features.plugins": true,
    "features.multi_agent": true,
    "features.shell_snapshot": true,
    "features.code_mode.enabled": true,
    "notify_empty": true,
    "computer_default_deny": true,
    "browser_default_deny": true,
    "browser_origins_empty": true,
    "computer_platform_absent": true
  },
  "failed": [
    "mcp_servers_empty",
    "plugins_empty",
    "chatgpt_base_url_absent"
  ],
  "featureSchema": {
    "codeModeType": "object",
    "codeModeEnabledType": "boolean"
  },
  "status": "blocked"
}
```


## 16. 연결 코드 최소 수정과 승인된 텍스트 업무 1회 검증 (2026-11-01)

사용자가 연결 코드 수정과 검증을 허용했다. 기존 인증/전역 설정은 변경하지 않고, 추론 없는 config/read 발견 단계 뒤 새 실행 자식의 MCP/플러그인별 enabled=false를 지정한다. 실제 유효 설정을 재검사하며 비활성 등록만 허용한다. ChatGPT 주소는 공식 기본 https://chatgpt.com/backend-api/로 실행 자식에서 고정하고 정확히 일치할 때만 허용한다. 도구 요청 거부·읽기 전용·ChatGPT 개인 구독·사용량/크레딧 검사 유지. 초기화는 연결별 한 번만 수행한다. 코드/테스트 원본 백업은 현재 작업 폴더 stage6-connection-backup에 보존했다. subscription/live/office 모의 테스트와 TypeScript 검사 통과. 실제 turn/start는 최대 1회이며 독점 영수증을 실행 전에 기록하고 자동 재시도하지 않는다.

```json
{
  "date": "2026-11-01 Asia/Seoul",
  "stage": "isolated_config",
  "status": "blocked_before_inference",
  "turnStarts": 0,
  "automaticRetries": 0,
  "tests": "subscription/live/office/typecheck PASS",
  "paidApiCalls": 0,
  "probe": {
    "connected": true,
    "authMode": "chatgpt",
    "planType": "plus",
    "stage": "complete",
    "reason": "none",
    "checks": {
      "configRead": "not_requested",
      "rateLimitsRead": "not_requested"
    }
  }
}
```

실제 추론이 요청되었다면 구독 사용량이 소비될 수 있다. 한도 백분율이 같아도 사용량 0을 뜻하지 않는다. 유료 API·추가 크레딧 구매·외부 게시·배포·직원 파일 수정 없음. 6-2 Gemini 실제 연결은 아직 미완료다.

공식 근거: https://learn.chatgpt.com/docs/config-file/config-reference 및 https://learn.chatgpt.com/docs/config-file/config-sample (2026-11-01 열람).


## 17. 설정 격리 통과 및 최초 텍스트 업무 성공 (2026-11-01)

사용자가 연결 코드 수정과 검증을 허용했다. 기존 인증/전역 설정은 변경하지 않고, 추론 없는 config/read 발견 단계 뒤 새 실행 자식의 MCP/플러그인별 enabled=false를 지정한다. 실제 유효 설정을 재검사하며 비활성 등록만 허용한다. ChatGPT 주소는 공식 기본 https://chatgpt.com/backend-api/로 실행 자식에서 고정하고 정확히 일치할 때만 허용한다. 도구 요청 거부·읽기 전용·ChatGPT 개인 구독·사용량/크레딧 검사 유지. 초기화는 연결별 한 번만 수행한다. 코드/테스트 원본 백업은 현재 작업 폴더 stage6-connection-backup에 보존했다. subscription/live/office 모의 테스트와 TypeScript 검사 통과. 실제 turn/start는 최대 1회이며 독점 영수증을 실행 전에 기록하고 자동 재시도하지 않는다.

```json
{
  "date": "2026-11-01 Asia/Seoul",
  "stage": "complete",
  "status": "completed",
  "turnStarts": 1,
  "automaticRetries": 0,
  "tests": "subscription/live/office/typecheck PASS",
  "paidApiCalls": 0,
  "probe": {
    "connected": true,
    "authMode": "chatgpt",
    "planType": "plus",
    "stage": "complete",
    "reason": "none",
    "checks": {
      "configRead": "not_requested",
      "rateLimitsRead": "not_requested"
    }
  },
  "configRead": "passed",
  "authMode": "chatgpt",
  "planType": "plus",
  "quotaBefore": [
    {
      "primaryUsedPercent": 15,
      "secondaryUsedPercent": 11,
      "hasCredits": false,
      "unlimited": false
    }
  ],
  "result": {
    "text": "목표: 동화 앱 ‘다음 페이지’ 버튼 접근성 검토\n제안 산출물:\n1. ‘다음 페이지’ 이름을 화면낭독기가 읽는지 확인\n2. 키보드 조작과 초점 표시 확인\n3. 충분한 버튼 크기·색상 대비 확인\n다음 직원 인계: 실제 화면에서 검증\n제약: 실행 없이 제안만 작성, 기존 /office·/storybook·저장·수정 기능 보존",
    "model": "gpt-6.1-sol"
  },
  "quotaAfter": [
    {
      "primaryUsedPercent": 15,
      "secondaryUsedPercent": 11,
      "hasCredits": false,
      "unlimited": false
    }
  ]
}
```

실제 추론이 요청되었다면 구독 사용량이 소비될 수 있다. 한도 백분율이 같아도 사용량 0을 뜻하지 않는다. 유료 API·추가 크레딧 구매·외부 게시·배포·직원 파일 수정 없음. 6-2 Gemini 실제 연결은 아직 미완료다.

공식 근거: https://learn.chatgpt.com/docs/config-file/config-reference 및 https://learn.chatgpt.com/docs/config-file/config-sample (2026-11-01 열람).


최종 보완·검증: 설치 CLI는 -c의 경로를 점으로 분리하므로 MCP 이름에 따옴표를 붙이면 초기화가 실패했다. MCP는 검증된 영문/숫자/밑줄/하이픈 식별자만 bare 경로로 전달하고, 플러그인은 이름이 인용된 TOML inline table로 enabled=false를 전달하도록 수정했다. 최종 실제 유효 설정에서 MCP 1개·플러그인 10개가 모두 비활성임을 확인했다. 첫 격리 실패에서는 turn/start=0이었으며 기록을 보존했다. 수정 후 최초 실제 turn/start=1과 완료 응답을 확인했고 추가 추론은 하지 않았다. 최종 npm.cmd run build 종료 코드 0, 컴파일·타입 검사·페이지 생성 완료. 6-1 최초 실제 실행 검증 완료, 6-2 Gemini 기획자 실제 연결은 미진행. VS Code 이동은 필요하지 않다.

## 2026-11-02 네 직원 자동 협업 후속 검증
연결 connected=true / authMode=chatgpt / Plus 확인. 비민감 가상 업무 1건을 기획→개발→마케팅→디자인 순서로 실제 gpt-6.1-sol 4회 실행하여 대표 승인 대기에 도달했다. 각 단계 설정·한도·추가 크레딧 차단 유지, 재시도·유료 API 없음. 기존 사용자 업무는 별도이며 완료로 표시하지 않았다. 신규 등록 즉시 GPT 협업, 기존 기록 보존 새 업무 시작, 서버 결과 복구 구현. 빌드 및 브라우저 16개 통과. 상세: AUTOMATIC_RUN.md. 인증·기존 데이터 보존.

## 2026-11-02 시각적 결과물 보관함
기획 문서, 로컬 상호작용 개발 화면, 마케팅 기획서/게시 문구/PNG, 디자인 HTML 미리보기 및 다운로드 구현. 기존 데이터·인증 보존. 실제 가상 업무 네 역할 결과물 생성 확인, 구독 사용량 사용, 추가 API/크레딧/자동 재시도 없음. 빌드 및 브라우저 17개 통과. 상세 DELIVERABLES.md 참조.

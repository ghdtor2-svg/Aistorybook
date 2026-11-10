# AI 직원 사무실 제거와 질문 화면 이미지 경량화 (2026-11-10)

대표 지시는 두 가지였다. AI 직원 사무실과 관련된 내용을 모두 빼고, 질문 화면 이미지를 손본다. 주문관리와 입금 키 발급 백오피스는 건드리지 않는다.

## 1. 남긴 것과 지운 것

지우기 전에 의존 관계를 먼저 떴다. 백오피스(`/office/orders`)가 사무실 라이브러리에서 쓰는 것은 `lib/office/server/auth.ts` 하나뿐이었고, 공개 생성 API(`/api/office/story`)와 Netlify 함수는 `lib/storybook` 만 썼다. 그래서 둘을 건드리지 않고 사무실만 떼어낼 수 있었다.

남긴 것:

- `/office/orders` 페이지와 `page.module.css` — 주문 조회, 입금 확인 키 발급, 별칭·메모, 키 재발급·중지, 관리 이력
- `/api/office/orders`, `/api/office/story-codes` — 백오피스 API
- `/api/office/story` — 공개 동화 생성 API
- `lib/office/server/auth.ts` — 백오피스 관리자 인증. 경로를 그대로 두어 백오피스 쪽 수정은 링크 한 줄로 그쳤다.
- `.office-data` 폴더 이름과 로컬 삽화 제작 워커(`scripts/storybook-worker.cjs`), 클라우드 연결 도구(`scripts/cloud-connection.cjs`) — 실제 주문 데이터가 있는 곳이라 이름을 바꾸지 않았다.

지운 것:

- `/office` 사무실 화면 전체와 직원 배정 데모: 직원 대화, 결재·승인, 업무 탐색, 산출물, 개발 보드, 자동 실행, 구독 제어, 백업, 수동 제작 코드, 3D 사무실(`components/office3d`)
- 사무실 API: `/api/office`, `/api/office/autonomous-status`, `/api/office/development`, `/api/office/owner-actions`, `/api/office/subscription`, `/api/run`
- `lib/office/**`(auth 제외)와 `lib/agents.ts`, `lib/demo.ts`, `lib/openai-workflow.ts`
- 사무실 전용 검사 22개와 브라우저 검사 24개, `tsconfig.office-tests.json`, `tsconfig.live-tests.json`
- `AUTOMATIC_RUN.md`, `PLATFORM_CHAT.md`
- `.env.example`에서 더 이상 읽는 곳이 없는 값: Supabase 3개, `OFFICE_ALLOW_LOCAL_LIVE`, `OFFICE_PAID_CALLS_APPROVED`, `OFFICE_MAX_*`, `OFFICE_TIMEOUT_MS`, `OFFICE_CODEX_*`, 단가 주석. `OPENAI_API_KEY`·`OPENAI_MODEL`은 동화 생성이, `OFFICE_ADMIN_PASSWORD`는 백오피스가 아직 쓰므로 남겼다.
- `package.json`의 `test:office`, `test:subscription`, `test:live`

`next.config.mjs`의 `local.tsx` 분리 장치는 그대로다. 이제 그 장치가 지키는 대상이 사무실이 아니라 주문 백오피스이므로 주석과 빌드 실패 문구를 그 기준으로 고쳤다. 공개 빌드에 백오피스가 들어가면 빌드를 실패시키는 안전장치도 그대로다.

## 2. 사무실에 걸쳐 있던 검사 정리

동화 화면을 검사하면서 사무실을 거쳐 가던 검사들은 지우지 않고 동화 화면만 쓰도록 고쳤다.

- `leave-guard`, `question-rescue`: 저장 실패 상태에서 화면을 떠날 때 확인을 받는지 보는 검사다. 떠나는 대상을 ‘직원 사무실’ 링크에서 ‘동화 홈’ 링크로 바꿨다. 이 링크들은 `aae21d9`에서 동화 화면의 사무실 링크를 없앤 뒤로 계속 실패하던 것들이다.
- `history-guard`: 사무실을 거쳐 동화 화면으로 들어가던 준비 과정을 동화 화면으로 바로 가게 했다.
- `home-entry`: 홈과 동화 화면에 사무실 링크가 없다는 단언은 남기고, 사무실 데모를 열어 보던 뒷부분만 뺐다.
- `storage-rescue`, `mobile-reading`, `platform`: 사무실 기록·채팅을 검사하던 항목만 빼고 동화 쪽 항목은 남겼다.
- `scripts/story-recovery-test.cjs`는 지웠다. 사무실 세션 쿠키로 `/api/office/story`에 접근하는 전제인데, 그 API는 제작 코드 인증으로 바뀐 뒤라 HEAD에서도 실패하던 낡은 검사였다. 같은 기능의 브라우저 검사 `tests/story-recovery.spec.ts`는 남겼고, 화면이 준비되기 전에 건너뛰기 버튼을 세던 경쟁 상태를 고쳐 통과하게 했다. 다만 이 기능의 노드 단위 검사는 지금 없다. 제작 코드 인증 기준으로 다시 쓰는 일은 하지 않았다.

## 3. 질문 화면 이미지

재 본 결과 질문 1번에 답하는 중에도 화풍 예시 10장 3.02MB를 모두 내려받고 있었다. 화면에는 160~240px 썸네일로 쓰면서 1200px 원본을 보내고 있었다.

`sharp`로 520px 너비 미리보기를 따로 만들어 격자에 쓰고, 원본은 ‘크게 보기’를 눌렀을 때만 받게 했다. 확대 보기의 화질은 그대로다.

- 첫 화면 이미지: 3.02MB → 389KB
- 측정 프레임률: 2fps → 63fps
- ‘크게 보기’를 누르면 그때 원본(수채화 250KB)을 받는 것을 확인했다

원본 파일은 지우지 않았다. 확대 보기와 `/storybook/styles/index.html` 이 쓴다.

## 검증

- `npm run typecheck` 통과
- `npm run build` 통과. 공개 빌드에 `/office/orders`와 백오피스 API가 들어가지 않는 것을 라우트 목록에서 확인했다
- `NEXT_PUBLIC_OFFICE_LOCAL=1 npm run build` 통과. `/office/orders`, `/api/office/orders`, `/api/office/story-codes`가 라우트로 잡히는 것을 확인했다
- `npm run test:engine`, `npm run test:cloud` 통과
- `npm run test:smoke`는 `localhost:3000`에 서버가 떠 있어야 하는 통합 검사라 이번에 돌리지 않았다

## 범위 밖

- 백오피스 자체의 동작은 코드로 건드리지 않았다. 다만 머리말에 있던 끊긴 ‘사무실’ 링크 한 줄을 ‘동화 화면’으로 바꿨다.
- 백오피스를 로컬 밖에서 열 수 있게 하는 일은 하지 않았다. 지금 보호는 빌드 제외와 출처 제한이 주된 방어막이고 비밀번호는 보조이며, 주문 데이터도 대표 PC의 `.office-data`에 있어 화면만 공개해서는 주문이 보이지 않는다. 별도 검토가 필요하다.
- `STAGE*.md`와 `docs/current`의 지난 기록은 당시 상태를 적어 둔 문서라 고치지 않았다.

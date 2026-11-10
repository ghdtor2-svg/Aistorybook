# 주문 백오피스를 공개 사이트로 (2026-11-10)

대표 지시는 "백오피스를 어디서든 열 수 있게"였다. 대표 PC가 늘 켜져 있지 않으므로 터널 방식은 쓸 수 없고, 관리 화면 자체를 공개 사이트에 올리기로 했다.

## 먼저 확인한 것

공개 사이트 `/api/storybook/availability` 가 `{"ready":true}` 를 돌려준다. 이 값이 나오려면 Netlify production 에 공유 저장소(`NANGMAN_STORAGE=netlify`, `NANGMAN_CLOUD_ENABLED=1`), 서명 비밀값 두 개, AI 키가 모두 있어야 하고 실제 저장소 접근까지 확인돼야 한다. 즉 주문 데이터를 클라우드에 두는 일은 `61e4c58`(2026-11-09) 시점에 이미 끝나 있었다. 2026-11-07 문서의 "배포 중단으로 검증 못 함"은 그 뒤에 해소된 과거 상태다.

대표 PC의 로컬 앱 폴더는 `45cb519` 로 11커밋 뒤처져 있고 백오피스 자체가 들어 있지 않았으며 주문 기록도 0건이었다. 그래서 로컬 설정을 손보는 대신 관리 화면을 공개 사이트에 올리는 쪽으로 정했다. 옮길 기존 주문이 없다.

## 고친 것: 백오피스 로그인

백오피스 페이지는 `/api/office` 로 로그인·로그아웃한다. 그 라우트에 AI 사무실 기능과 백오피스 로그인이 함께 들어 있었고, 사무실을 지우면서 파일째 지워 로그인이 끊겼다. 빌드와 타입 검사로는 드러나지 않았다. 로그인 전용 라우트를 새로 만들어 복구했다.

## 공개 전환

- `src/app/office/orders/page.local.tsx` → `page.tsx`, `api/office/orders`·`api/office/story-codes` 의 `route.local.ts` → `route.ts`. 세 라우트가 공개 빌드에 들어간다.
- `src/app/office/layout.tsx` 를 두어 관리 화면에 `noindex, nofollow, nocache` 를 붙였다. 주소를 검색에 올리지 않는다.
- `next.config.mjs` 의 `pageExtensions` 분리는 더 지킬 대상이 없어 걷어냈다. `NEXT_PUBLIC_OFFICE_LOCAL` 은 사이트 개폐(site-gate)에만 쓰고, Netlify 빌드에 들어오면 빌드를 실패시키는 안전장치는 그대로 뒀다.
- 화면의 "내 컴퓨터에서만 사용하는 관리 화면입니다" 안내는 사실과 달라져 고쳤다.

## 인증

`src/lib/storybook/admin-auth.ts` 로 옮기고 인터넷 공개 기준으로 다시 썼다. 기존 `lib/office/server/auth.ts` 는 지웠다.

- 비밀번호 최소 길이를 16자에서 **24자**로 올렸다. 짧으면 인증 자체를 열지 않는다.
- 받는 호스트는 내 PC(`localhost`, `127.0.0.1`, `[::1]`)와 `NANGMAN_PUBLIC_URL` 의 호스트뿐이다. Netlify 어댑터가 `request.url` 을 내부 주소로 바꾸므로 `Host` 헤더를 기준으로 본다.
- 쓰기 요청은 `Origin` 이 같은 호스트일 때만 받는다. `Origin` 이 없으면 거절한다.
- 세션 쿠키는 `HttpOnly`, `SameSite=Strict`, 경로 `/api/office` 한정이고 HTTPS 에서는 `Secure` 를 붙인다. HTTPS 판정은 `x-forwarded-proto` 를 먼저 본다.
- 비밀번호와 서명 비교는 `timingSafeEqual` 로 한다.
- `GET /api/office` 는 설정 여부와 로그인 상태만 돌려준다. 비밀번호도, 그 길이도 돌려주지 않는다.

## 로그인 시도 제한

`src/lib/storybook/admin-guard.ts` 를 새로 만들었다. 기존 제한은 함수 안의 메모리 변수여서 서버리스에서는 요청마다 사라져 사실상 없는 것과 같았다.

- 같은 곳에서 5회 실패하면 15분, 전체 30회 실패하면 모두 15분 막는다. 분산 시도를 함께 막기 위해서다.
- 기록은 Netlify Blobs 에 둔다. 15분간 조용하면 세던 횟수를 잊는다.
- 저장소를 읽지 못하면 시도를 막지 않는다. 잠금 장치의 고장이 대표의 로그인을 막으면 안 된다. 비밀번호 검사는 그대로 적용된다.

처음 구현에서 아직 차단되지 않은 실패 기록까지 매번 지워 횟수가 쌓이지 않는 잘못이 있었다. 검사에서 잡아 고쳤다.

## 검증

- `npm run typecheck` 통과. `NETLIFY=true CONTEXT=production npm run build` 통과. 라우트 목록에 `/office/orders`, `/api/office`, `/api/office/orders`, `/api/office/story-codes` 가 들어간 것을 확인했다.
- `npm run test:admin`(신규) 통과: 비밀번호 길이 하한, 허용 호스트와 위조 `Host` 거절, `Origin` 검사, 비밀번호 비교, 서명·만료·다른 호스트 쿠키 거절, `Secure` 플래그, 전달 프로토콜 판정, 호스트별·전체 시도 제한과 해제.
- `tests/admin-backoffice.spec.ts`(신규) 통과: 로그인 없이 `/api/office/orders` 와 `/api/office/story-codes` 가 403, 상태 응답에 비밀값이 없음, 틀린 비밀번호 거절, 올바른 비밀번호로 로그인과 로그아웃. 검사용 비밀번호는 환경 변수로 받고 저장소에 적지 않는다.
- 로컬 실측: 미로그인 상태 응답 `{"configured":true,"authenticated":false,"minSecretLength":24}`, 틀린 비밀번호 401, `Origin` 없는 쓰기 403, 미로그인 주문 조회 403, `meta robots`=`noindex, nofollow, nocache`.
- 브라우저 전체 57 통과 / 15 실패. 15건은 모두 이번 작업 전에도 실패하던 것이다(동화 생성 잠금·책장·이탈 경고). 변경 전 `main` 은 51 통과 / 88 실패였다.
- `site-gate` 검사를 되살렸다. 기대하는 빌드 경로를 만드는 tsconfig 가 없어 돌릴 수 없는 상태였다. `tsconfig.lib-tests.json` 을 더하고 `npm run test:gate` 로 등록했다.

## 남은 것과 범위 밖

- `OFFICE_ADMIN_PASSWORD` 는 Netlify production 환경 변수에 대표가 직접 넣는다. 24자 미만이면 `GET /api/office` 가 `configured:false` 를 돌려주고 로그인이 열리지 않는다.
- 이제 비밀번호 하나가 관리 화면의 유일한 열쇠다. 2단계 인증은 넣지 않았다. 필요하면 별도 과제로 한다.
- 전체 30회 제한은 누군가 일부러 시도를 반복해 대표의 로그인을 15분간 막을 수 있다는 뜻이기도 하다. 비밀번호가 길면 뚫릴 위험은 낮으므로 이 쪽을 택했다.
- `book-design-test.cjs` 의 마지막 단언(내려받은 HTML 에 생성된 표지 그림이 들어가는가)은 이전부터 실패한다. 제품이 실제 삽화를 쓰는 쪽으로 바뀐 뒤 검사만 남은 것으로 보이나 확인하지 않았다. `enhancement-test.cjs` 는 존재하지 않는 모듈 네 개를 참조해 되살릴 수 없다. 둘 다 이번에 손대지 않았다.

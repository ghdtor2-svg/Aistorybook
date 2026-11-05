/**
 * 요청이 우리 화면에서 온 것인지 본다.
 *
 * ── 왜 Host 헤더를 먼저 보는가 (2026-11-05 고침) ────────────────────
 * 전에는 `new URL(request.url).origin` 하나만 보고 맞췄습니다. 그런데
 * request.url 은 프레임워크가 **다시 만든** 주소라 브라우저가 실제로 붙은
 * 곳과 다를 수 있습니다. 개발 서버를 `--hostname 127.0.0.1` 로 띄우고
 * `http://127.0.0.1:3000` 으로 들어가면 request.url 이 `localhost:3000`
 * 으로 잡혔습니다. 그래서 결과가 뒤집혀 있었습니다.
 *
 *   Origin: http://127.0.0.1:3000  (진짜 우리 화면)  → 403 으로 막힘
 *   Origin: http://localhost:3000  (다른 출처)      → 200 으로 통과
 *
 * 막아야 할 것을 통과시키고 통과시켜야 할 것을 막았습니다. 프록시 뒤에서는
 * 같은 일이 공개 배포에서도 일어날 수 있습니다.
 *
 * 브라우저가 실제로 접속한 곳은 Host 헤더입니다. 그것을 기준으로 맞추고,
 * 맞지 않을 때만 예전 방식으로 한 번 더 봅니다(둘 다 아니면 막습니다).
 *
 * ── Origin 이 없는 요청 ─────────────────────────────────────────────
 * 통과시킵니다. 예전부터 그랬고 바꾸지 않았습니다. 브라우저는 교차 출처
 * POST 에 Origin 을 반드시 붙이므로, 이 구멍으로 들어오는 것은 브라우저가
 * 아닌 직접 호출입니다. 그쪽은 분당 횟수 제한과 승인 플래그가 막습니다.
 * 여기를 조이려면 별도 판단이 필요합니다 — 조용히 바꾸지 않았습니다.
 */
export function sameOrigin(request: {headers: {get(name: string): string | null}; url: string}): boolean {
 const origin = request.headers.get('origin');
 if (!origin) return true;
 let sent: URL;
 try {sent = new URL(origin);} catch {return false;}
 // 브라우저가 실제로 붙은 곳. 프록시가 원래 호스트를 따로 넘겨 주면 그쪽이 우선입니다.
 const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
 const host = forwarded || request.headers.get('host');
 // 붙은 곳을 알면 **그것만** 봅니다. 여기서 어긋난 요청을 재구성된 주소로
 // 한 번 더 봐주면, 바로 그 재구성된 주소를 사칭한 요청이 통과합니다
 // (개발 서버에서 Origin: localhost 가 통과하던 것이 이 경우였습니다).
 if (host) return sent.host === host;
 // 붙은 곳을 알 수 없을 때만 재구성된 주소로 봅니다.
 try {return sent.origin === new URL(request.url).origin;} catch {return false;}
}

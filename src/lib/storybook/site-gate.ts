/**
 * 공개 사이트 임시 차단 — "지금은 문을 닫았습니다" 한 장.
 *
 * 대표 결정(2026-11-05): 동화에 표지·내지 디자인을 입히는 동안 공개 주소를 닫는다.
 * 친구들이 시험하던 중이라 반쯤 바뀐 화면을 보여 주지 않기 위해서다.
 *
 * ── 닫히는 범위 ────────────────────────────────────────────────
 * middleware.ts 가 **모든 주소**에 이 페이지를 돌려줍니다. /api/office/story 도
 * 함께 막히므로 닫혀 있는 동안에는 유료 생성이 한 번도 일어나지 않습니다.
 * 응답은 503 + Retry-After 입니다. 404 가 아니라서 검색엔진이 주소를 지우지 않고,
 * X-Robots-Tag 로 이 안내문이 검색 결과에 실리는 것만 막습니다.
 *
 * ── 다시 여는 방법 (둘 중 하나) ────────────────────────────────
 *   1) Netlify → Site configuration → Environment variables 에 SITE_OPEN=1 을
 *      넣고 재배포. 코드를 고치지 않고 열 수 있어 가장 빠릅니다.
 *   2) 이 파일의 CLOSED_BY_CODE 를 false 로 바꾸고 커밋·푸시.
 *
 * 내 PC 작업장(.env.local 의 NEXT_PUBLIC_OFFICE_LOCAL=1)은 닫히지 않습니다.
 * 닫아 둔 동안에도 집에서는 그대로 만들고 확인할 수 있어야 하기 때문입니다.
 *
 * 방문자의 책장은 브라우저에 그대로 남습니다. 이 차단은 화면만 가립니다.
 */
import {COVER_ART, ART_DEFS} from './book-art';
import {BOOK_CSS, coverVars, coverVarText} from './book-design';
import {SITE_NAME} from '../brand';

/** 코드로 닫아 둔 상태. 다시 열 때 false 로 바꿉니다. */
export const CLOSED_BY_CODE = true;

export type GateEnv = {officeLocal?: string; siteOpen?: string};

/** 지금 이 요청을 막아야 하는가. 판단 근거를 한곳에 모아 둡니다(테스트: scripts/site-gate-test.cjs). */
export function siteClosed(env: GateEnv) {
 if (!CLOSED_BY_CODE) return false;      // 코드에서 이미 열어 둔 상태
 if (env.officeLocal === '1') return false; // 내 PC 작업장은 늘 열려 있다
 return env.siteOpen !== '1';            // Netlify 에서 SITE_OPEN=1 이면 열린다
}

/** 503 과 함께 보낼 헤더. 캐시에 남아 다시 열어도 안내문이 보이는 일을 막습니다. */
export const CLOSED_HEADERS: Record<string, string> = {
 'content-type': 'text/html;charset=utf-8',
 'cache-control': 'no-store, must-revalidate',
 'retry-after': '86400',
 'x-robots-tag': 'noindex, nofollow',
};

// 밤 표지를 씁니다. 그림과 색은 book-design.ts 에서 짝으로 가져옵니다.
const night = COVER_ART.find(art => art.id === 'night') ?? COVER_ART[0];
const vars = coverVarText(coverVars(night.id));

/**
 * 안내문 한 장. 바깥 요청이 전혀 없습니다(그림은 인라인 SVG, 글꼴은 기기 것).
 * 동화 표지와 같은 화풍이라 닫혀 있는 동안에도 같은 책의 얼굴로 보입니다.
 */
export function closedPage() {
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">' +
  '<meta name="robots" content="noindex,nofollow"><title>' + SITE_NAME + ' · 잠시 문을 닫았습니다</title><style>' +
  '*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
  'padding:clamp(16px,5vw,40px);background:#EFE9DD;color:#3F342C;font:1.125rem/1.9 system-ui,sans-serif;overflow-wrap:anywhere}' +
  '.gate{width:100%;max-width:26em}.gate-note{margin:1.4em 0 0;font-size:.82em;line-height:1.85;color:#6E6055;text-align:center;word-break:keep-all}' +
  BOOK_CSS + '</style></head><body class="book" style="' + vars + '">' +
  '<main class="gate"><svg class="bk-defs" aria-hidden="true" focusable="false">' + ART_DEFS + '</svg>' +
  '<div class="book-cover"><div class="book-cover-art" aria-hidden="true">' +
  '<svg viewBox="0 0 364 464" preserveAspectRatio="xMidYMid slice">' + night.art + '</svg></div>' +
  '<span class="book-cover-bind" aria-hidden="true"></span>' +
  '<p class="book-cover-tag">' + SITE_NAME + '</p>' +
  '<div class="book-cover-plate"><h1>잠시 문을<br>닫았습니다</h1>' +
  '<p class="book-cover-meta">표지와 내지에 그림을 입히고 있어요</p></div>' +
  '<p class="book-cover-foot">곧 다시 열겠습니다</p></div>' +
  '<p class="gate-note">이미 만든 동화는 쓰던 기기의 책장에 그대로 있습니다. 이 안내는 화면만 가린 것이고 책장을 지우지 않습니다.</p>' +
  '</main></body></html>';
}

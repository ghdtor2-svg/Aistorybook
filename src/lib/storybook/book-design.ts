/**
 * 동화 책 조판 — 겉 표지와 내지의 생김새.
 *
 * 화면에서 읽는 동화(StoryReader)와 내려받는 HTML 파일(book-document)이
 * **이 파일 하나**를 같이 씁니다. 그래서 두 곳이 어긋나지 않습니다.
 *   · 화면 … <style>{BOOK_CSS}</style>
 *   · 파일 … <style> 안에 BOOK_CSS 를 그대로 넣습니다
 *
 * 규격은 인쇄용 샘플 책(신규플랫폼_가치기반_동화/책/src/10_head.html)에서 가져왔습니다.
 *   본문 글자색 #3F342C · 보조 #6E6055 · 쪽번호·캡션 #9C8F82 · 괘선 #E2DAD0
 *   본문 들여쓰기 1em · 양끝맞춤 · 음절 단위 줄바꿈(국문 조판 관례)
 *   장 표제는 작은 장 번호(자간 .34em) + 제목 + 짧은 괘선
 * 종이는 샘플 책과 같이 흰 바탕을 쓰고 그림에만 색을 넣습니다.
 *
 * 글자 크기는 모두 em(본문 기준 비율)입니다. 읽기 도구에서 글자 크기를 바꾸면
 * 표지·장 표제·장식이 본문과 같은 비율로 함께 커집니다.
 */
import {bookArt} from './book-art';

/**
 * 표지 그림 위에 올라가는 글자색. 그림이 어두운 표지는 밝은 글자를 씁니다.
 *   plate … 제목 자리에 까는 종이판 (그림이 어떤 그림이든 제목이 읽혀야 한다)
 *   wash  … 표지 위·아래에 얇게 깔아 작은 글자를 받쳐 주는 색
 */
const COVER_INK: Record<string, {base: string; ink: string; soft: string; line: string; plate: string; wash: string}> = {
 meadow: {base: '#FBF4E6', ink: '#3B2E22', soft: '#6F5C47', line: '#C8B795', plate: '#FFFDF8E8', wash: '#FBF4E6EB'},
 night: {base: '#2E3A55', ink: '#FBF1CF', soft: '#DCE2EE', line: '#8E9BB5', plate: '#2E3A55E0', wash: '#2E3A55EB'},
 sea: {base: '#FBF8EE', ink: '#3B2E22', soft: '#6E5C49', line: '#C3B59A', plate: '#FFFDF8E8', wash: '#FBF8EEEB'},
 forest: {base: '#FAF6E8', ink: '#33301F', soft: '#625D40', line: '#BDBE94', plate: '#FFFDF8E8', wash: '#FAF6E8EB'},
};

/**
 * 표지 그림 하나에 딸린 색 묶음. CSS 변수로 얹습니다.
 * 그림과 색은 늘 짝으로 움직여야 합니다 — 밤 그림에 밝은 종이판을 깔면
 * 그 위의 밝은 글자가 사라집니다.
 */
export function coverVars(coverId: string) {
 const ink = COVER_INK[coverId] ?? COVER_INK.meadow;
 return {'--bk-cover-base': ink.base, '--bk-cover-ink': ink.ink, '--bk-cover-soft': ink.soft, '--bk-cover-line': ink.line,
  '--bk-cover-plate': ink.plate, '--bk-cover-wash': ink.wash} as Record<string, string>;
}

/**
 * 책 한 권의 겉모습. 그림과 표지 색을 함께 묶어 돌려줍니다.
 * 같은 책(아이디)은 언제 열어도 같은 표지를 받습니다.
 */
export function bookLook(seed: string) {
 const art = bookArt(seed);
 /** vars … 표지 요소에 얹는 CSS 변수. React 는 style, 내려받은 파일은 style="" 로 씁니다. */
 return {art, vars: coverVars(art.coverId)};
}

/** style="" 속성에 넣을 문자열. 값은 위 표의 색 상수뿐이라 바깥 입력이 섞이지 않습니다. */
export function coverVarText(vars: Record<string, string>) {
 return Object.entries(vars).map(([name, value]) => name + ':' + value).join(';');
}

export const BOOK_CSS = `
/* ── 화풍: 수채 색면 + 연필선 (book-art.ts 의 필터를 가리킨다) ── */
.bk-w{filter:url(#bk-wc)}
.bk-w2{filter:url(#bk-wc2)}
.bk-ln{filter:url(#bk-pn);fill:none;stroke:#4A3A2C;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.bk-lnt{stroke-width:1.15}
.bk-defs{position:absolute;width:0;height:0;overflow:hidden}

/* ── 책 ── */
.book{--bk-ink:#3F342C;--bk-ink2:#6E6055;--bk-ink3:#9C8F82;--bk-rule:#E2DAD0;--bk-paper:#FFFDF8;
 color:var(--bk-ink);line-height:1.9;
 font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',system-ui,sans-serif}

/* ── 겉 표지 ── */
.book-cover{position:relative;overflow:hidden;isolation:isolate;
 display:flex;flex-direction:column;justify-content:space-between;gap:.7em;
 max-width:min(100%,21em);min-height:min(116vw,27em);margin:0 auto;
 padding:1.9em 1.3em 1.6em;text-align:center;border-radius:2px 9px 9px 2px;
 background:var(--bk-cover-base,#FBF4E6);color:var(--bk-cover-ink,#3B2E22);
 box-shadow:0 10px 26px #2b211a2b}
.book-cover-art{position:absolute;inset:0;z-index:-1}
.book-cover-art svg{display:block;width:100%;height:100%}
/* 책등 — 왼쪽 제책 그림자 */
.book-cover-bind{position:absolute;left:0;top:0;bottom:0;width:.55em;z-index:-1;
 background:linear-gradient(90deg,#00000030,#ffffff2b 55%,#0000001a)}
/* 위·아래 얇은 색 받침. 어떤 그림이 와도 작은 글자가 읽히게 한다.
   ::after 라서 그림(.book-cover-art)보다 위, 글자보다 아래에 깔린다. */
.book-cover::after{content:'';position:absolute;inset:0;z-index:-1;
 background:linear-gradient(180deg,var(--bk-cover-wash,#FBF4E6) 0,#ffffff00 20%,#ffffff00 74%,var(--bk-cover-wash,#FBF4E6) 100%)}
.book-cover-tag{margin:0;font-size:.64em;letter-spacing:.3em;color:var(--bk-cover-soft,#7A6650);word-break:keep-all}
/* 제목 자리 — 종이판을 깔아 그림 위에서도 읽히게 한다 */
.book-cover-plate{margin:0;padding:.85em .7em;border-radius:3px;background:var(--bk-cover-plate,#FFFDF8E8);
 border-top:1px solid var(--bk-cover-line,#C8B795);border-bottom:1px solid var(--bk-cover-line,#C8B795)}
.book-cover h1,.book-cover h2{margin:0;font-weight:700;letter-spacing:.01em;line-height:1.45;word-break:keep-all;color:inherit}
.book-cover-meta{margin:.6em 0 0;font-size:.72em;letter-spacing:.14em;color:var(--bk-cover-soft,#7A6650)}
.book-cover-foot{margin:0;font-size:.62em;letter-spacing:.18em;color:var(--bk-cover-soft,#7A6650);word-break:keep-all}
/* 수정 중에는 표지 제목이 입력칸이 된다. 그림 위에서도 읽히도록 종이색을 깔아 준다. */
.book-cover input{display:block;width:100%;max-width:100%;min-height:44px;padding:.3em .5em;font:inherit;
 text-align:center;color:var(--bk-ink,#3F342C);background:#FFFDF8;
 border:1px solid var(--bk-cover-line,#C8B795);border-radius:6px}

/* ── 내지 ── */
.book-pages{background:var(--bk-paper);border:1px solid var(--bk-rule);border-radius:4px;
 margin:1.7em 0 0;padding:clamp(14px,4vw,1.9em) clamp(12px,4vw,2.1em);
 box-shadow:0 2px 14px #2b211a12}
.book-pages>section{padding-top:.4em}
.book-pages>section+section{margin-top:1.8em;border-top:1px solid var(--bk-rule);padding-top:1.6em}
.book-band{margin:0 0 1.1em}
.book-band svg{display:block;width:100%;height:auto}
.book-chapter-no{display:block;text-align:center;font-size:.6em;letter-spacing:.34em;color:var(--bk-ink3)}
.book-pages h2,.book-pages h3{text-align:center;font-size:1.12em;font-weight:600;letter-spacing:-.01em;
 margin:.55em 0 .5em;line-height:1.55;word-break:keep-all;color:#35291F}
.book-rule{width:4.4em;height:1px;margin:0 auto 1.3em;background:var(--bk-rule)}
/* 양끝맞춤 + 음절 단위 줄바꿈(국문 조판 관례).
   바깥에서 내려오는 overflow-wrap:anywhere 를 break-word 로 덮는다 —
   anywhere 는 어절 사이를 과하게 벌려 책처럼 보이지 않는다. 긴 낱말은 그대로 잘라 준다. */
.book-pages p{margin:0;text-indent:1em;text-align:justify;letter-spacing:-.012em;
 word-break:normal;line-break:normal;overflow-wrap:break-word}
.book-spot{width:7em;max-width:60%;margin:1.3em auto 0}
.book-spot svg{display:block;width:100%;height:auto}
/* 내지 수정 — 장 제목·본문 입력칸 */
.book-pages input{display:block;width:100%;max-width:100%;min-height:44px;padding:.3em .5em;font:inherit;
 color:var(--bk-ink);background:#fff;border:1px solid var(--bk-rule);border-radius:6px}
.book-pages textarea{margin-top:.5em;border-color:var(--bk-rule)}

/* 책 안의 단추도 책 색을 쓴다. 파란 화면 단추가 섞이면 책이 아니라 화면으로 보인다. */
.book button{background:#5E4B33;color:#FFFDF8;border:1px solid #5E4B33}
.book button.secondary{background:#F0E7D7;color:#4A3A2C;border:1px solid #D9CEBC;font-weight:600}
.book small{color:var(--bk-ink2)}
.book aside{color:var(--bk-ink2);font-size:.82em;line-height:1.8}

/* ── 인쇄 — 흰 종이에 그림만 얹는다 (샘플 책과 같은 결정) ──
   브라우저 인쇄는 '배경 그래픽'이 꺼진 채로 나가는 것이 보통입니다. 그래서 인쇄에서는
   제목을 그림 위에 얹지 않고 **그림 아래**로 내립니다. 종이판(배경)이 빠져도
   제목이 그림에 묻히지 않습니다. 그림은 SVG 라서 배경 설정과 무관하게 찍힙니다. */
@media print{
 .book{--bk-paper:#fff}
 .book-cover{display:block;min-height:0;padding:0;margin:0 auto;max-width:none;text-align:center;
  box-shadow:none;border-radius:0;background:none;break-inside:avoid;page-break-inside:avoid}
 /* 판형(175×225㎜)과 같은 비율로 깔아 그림이 잘리지 않게 한다.
    납작한 띠로 눌러 넣으면 나무 윗부분과 하늘이 잘려 나간다. */
 .book-cover-art{position:static;width:min(94mm,100%);aspect-ratio:364/464;height:auto;margin:0 auto 9mm}
 .book-cover-art svg{width:100%;height:100%}
 .book-cover::after,.book-cover-bind{display:none}
 .book-cover-plate{background:none;padding:.7em 0;margin-bottom:.8em}
 .book-pages{border:0;border-radius:0;padding:0;margin:0;box-shadow:none;background:#fff}
 .book-pages>section+section{border-top:0;margin-top:0;padding-top:0}
 .book-band{margin-bottom:1.3em}
 .book-pages h2,.book-pages h3{break-after:avoid;page-break-after:avoid}
 .book-spot{margin-top:1.6em}
}
`;

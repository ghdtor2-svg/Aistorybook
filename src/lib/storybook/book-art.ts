/**
 * 동화 책 그림 — 겉 표지 그림 · 내지 밴드 삽화 · 장 끝 장식.
 *
 * 화풍은 인쇄용 샘플 책(신규플랫폼_가치기반_동화/책/src/20_art_defs.html)과 같습니다.
 *   색면(bk-w / bk-w2) … 수채 번짐 + 가장자리 물고임 필터
 *   선(bk-ln)          … 연필 떨림 필터 · 따뜻한 갈색
 * 그래서 화면에서 읽는 동화와 인쇄한 책이 한 권의 책으로 보입니다.
 *
 * 외부 이미지가 없습니다. 전부 인라인 SVG(벡터)입니다.
 *   · 네트워크 요청이 없어 내려받은 HTML 파일을 인터넷 없이도 열 수 있습니다.
 *   · 내려받은 파일의 CSP 가 default-src 'none' 이라 외부 그림은 애초에 쓸 수 없습니다.
 *   · 확대해도 깨지지 않아 인쇄(300dpi 이상)에 그대로 씁니다.
 *
 * ── 그림이 들어가는 자리 ───────────────────────────────────────
 *   cover      겉 표지 전면 그림 (364×464 · 판형 175×225㎜ 와 같은 비율)
 *   band       내지 장 머리 밴드 (242×72 · 판면 폭을 꽉 채운다)
 *   spot       장 끝 장식 (60×16)
 * 책마다 아래 목록에서 하나씩 뽑아 쓰고, 뽑는 기준이 책 아이디라서
 * 같은 책은 언제 열어도 같은 그림이 나옵니다.
 *
 * 그림을 더 넣고 싶으면 아래 목록에 SVG 를 한 장 추가하면 됩니다.
 * 화면·내려받기·인쇄가 같은 목록을 쓰므로 세 곳이 함께 바뀝니다.
 */

/** 책 아이디 → 안정적인 정수. 같은 책은 항상 같은 그림을 받습니다. */
export function artSeed(seed:string){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.codePointAt(i)??0;h=Math.imul(h,16777619);}return Math.abs(h);}

/**
 * 필터와 그러데이션 정의. 문서에 한 번만 넣습니다.
 * defs 안의 요소는 use 섀도 트리로 복제되어 문서 CSS 가 닿지 않으므로
 * 그림 쪽은 전부 인라인 style 로 칠합니다(샘플 책과 같은 규칙).
 */
export const ART_DEFS = `<defs>
<filter id="bk-wc" x="-14%" y="-14%" width="128%" height="128%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.019 0.023" numOctaves="4" seed="9" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feMorphology in="d" operator="erode" radius="1" result="er"/>
<feComposite in="d" in2="er" operator="out" result="rim"/>
<feFlood flood-color="#5A4632" flood-opacity="0.14" result="fl"/>
<feComposite in="fl" in2="rim" operator="in" result="rimc"/>
<feMerge><feMergeNode in="d"/><feMergeNode in="rimc"/></feMerge></filter>
<filter id="bk-wc2" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.008 0.011" numOctaves="4" seed="17" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feMorphology in="d" operator="erode" radius="1.5" result="er"/>
<feComposite in="d" in2="er" operator="out" result="rim"/>
<feFlood flood-color="#5A4632" flood-opacity="0.10" result="fl"/>
<feComposite in="fl" in2="rim" operator="in" result="rimc"/>
<feMerge><feMergeNode in="d"/><feMergeNode in="rimc"/></feMerge></filter>
<filter id="bk-pn" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="3" seed="23" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G"/></filter>
<linearGradient id="bk-gSky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#BEDCEC"/><stop offset="68%" stop-color="#E4F1F7"/><stop offset="100%" stop-color="#F5F2E6"/></linearGradient>
<linearGradient id="bk-gNight" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#2E3A55"/><stop offset="100%" stop-color="#63718D"/></linearGradient>
<linearGradient id="bk-gDawn" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#F6D9C4"/><stop offset="60%" stop-color="#FBEEDF"/><stop offset="100%" stop-color="#F3F1E2"/></linearGradient>
<linearGradient id="bk-gSea" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#CFE6EC"/><stop offset="100%" stop-color="#EAF3F1"/></linearGradient>
</defs>`;

/** 공통 부품 — 둥근 나무·구름·새·별. 그림마다 자리와 크기만 바꿔 씁니다. */
const tree = (x: number, y: number, s: number, leaf: string) => `<g transform="translate(${x},${y}) scale(${s})">
<g class="bk-w"><path style="fill:#B08963" d="M-3,0 L-3,-36 L3,-36 L3,0 Z"/>
<path style="fill:${leaf}" d="M0,-24 C-24,-24 -34,-40 -28,-54 C-34,-68 -20,-82 -2,-78 C16,-84 32,-72 28,-56 C36,-42 24,-24 0,-24 Z"/></g>
<g class="bk-ln bk-lnt"><path d="M-3,0 L-3,-28 M3,0 L3,-28"/>
<path d="M0,-24 C-24,-24 -34,-40 -28,-54 C-34,-68 -20,-82 -2,-78 C16,-84 32,-72 28,-56 C36,-42 24,-24 0,-24 Z"/></g></g>`;
const cloud = (x: number, y: number, s: number) => `<g class="bk-w" transform="translate(${x},${y}) scale(${s})"><g style="fill:#FDFEFE">
<ellipse cx="0" cy="0" rx="30" ry="13"/><ellipse cx="20" cy="-8" rx="20" ry="12"/><ellipse cx="-18" cy="-4" rx="16" ry="9"/></g></g>`;
const bird = (x: number, y: number, s: number) => `<g class="bk-ln bk-lnt" transform="translate(${x},${y}) scale(${s})"><path d="M-9,0 C-5,-6 -2,-6 0,-2 C2,-6 5,-6 9,0"/></g>`;
const star = (x: number, y: number, r: number) => `<circle style="fill:#FFF8E3" cx="${x}" cy="${y}" r="${r}"/>`;

/**
 * 겉 표지 전면 그림. 364×464 는 판형 175×225㎜ 와 같은 비율이라
 * 화면의 표지와 인쇄한 표지가 같은 그림으로 보입니다.
 */
export const COVER_ART: {id: string; label: string; art: string}[] = [
 {id: 'meadow', label: '햇살 든 들판', art: `<g class="bk-w2"><rect style="fill:#FBF4E6" x="-4" y="-4" width="372" height="472"/>
<path style="fill:url(#bk-gSky)" d="M-4,-4 L368,-4 L368,300 C260,318 110,318 -4,300 Z"/>
<path style="fill:#D4E4B8" d="M-4,292 C110,274 260,274 368,292 L368,468 L-4,468 Z"/>
<path style="fill:#C6D9A6" d="M-4,352 C110,336 260,356 368,342 L368,468 L-4,468 Z"/></g>
<g class="bk-w"><circle style="fill:#FBE3A8" cx="296" cy="96" r="30"/></g>
${cloud(68, 132, 1)}${cloud(286, 176, 0.72)}
${bird(132, 110, 1.1)}${bird(158, 96, 0.9)}${bird(180, 116, 0.8)}
${tree(64, 330, 1.45, '#9EC47C')}${tree(312, 338, 1.15, '#88B26C')}${tree(240, 322, 0.85, '#A8CE86')}
<g class="bk-ln"><path d="M-4,296 C110,278 260,278 368,296"/><path d="M-4,356 C110,340 260,360 368,346"/></g>
<g class="bk-w"><g style="fill:#F4B6C8"><ellipse cx="44" cy="226" rx="5" ry="3.2" transform="rotate(22 44 226)"/>
<ellipse cx="104" cy="258" rx="4.4" ry="2.8" transform="rotate(-16 104 258)"/>
<ellipse cx="206" cy="242" rx="4.2" ry="2.7" transform="rotate(34 206 242)"/></g>
<g style="fill:#FBD89A"><circle cx="150" cy="394" r="4"/><circle cx="198" cy="408" r="3.4"/><circle cx="118" cy="420" r="3"/></g></g>`},
 {id: 'night', label: '별이 뜬 밤', art: `<g class="bk-w2"><rect style="fill:#2E3A55" x="-4" y="-4" width="372" height="472"/>
<path style="fill:url(#bk-gNight)" d="M-4,-4 L368,-4 L368,318 C260,336 110,336 -4,318 Z"/>
<path style="fill:#3C4A63" d="M-4,310 C110,292 260,292 368,310 L368,468 L-4,468 Z"/>
<path style="fill:#4A5872" d="M-4,368 C110,352 260,372 368,358 L368,468 L-4,468 Z"/></g>
<g class="bk-w"><path style="fill:#FBF1CF" d="M232,78 A34,34 0 1 1 268,120 A27,27 0 1 0 232,78 Z"/></g>
${star(62, 92, 3.4)}${star(104, 142, 2.4)}${star(152, 74, 2.8)}${star(190, 126, 2)}${star(298, 168, 2.6)}${star(330, 104, 3)}${star(44, 196, 2.2)}${star(258, 206, 2)}
${cloud(96, 206, 0.8)}
${tree(60, 348, 1.4, '#55724F')}${tree(310, 354, 1.1, '#48664A')}
<g class="bk-ln"><path d="M-4,314 C110,296 260,296 368,314"/><path d="M-4,372 C110,356 260,376 368,362"/></g>
<g class="bk-w"><g style="fill:#FBE3A8"><circle cx="140" cy="300" r="3.4"/><circle cx="186" cy="330" r="2.8"/><circle cx="232" cy="306" r="3"/><circle cx="96" cy="326" r="2.4"/></g></g>`},
 {id: 'sea', label: '아침 바다', art: `<g class="bk-w2"><rect style="fill:#FBF8EE" x="-4" y="-4" width="372" height="472"/>
<path style="fill:url(#bk-gDawn)" d="M-4,-4 L368,-4 L368,268 L-4,268 Z"/>
<path style="fill:url(#bk-gSea)" d="M-4,260 C110,250 260,250 368,260 L368,468 L-4,468 Z"/>
<path style="fill:#AFD2DC" d="M-4,340 C110,328 260,348 368,334 L368,468 L-4,468 Z"/></g>
<g class="bk-w"><circle style="fill:#F8C9A4" cx="182" cy="166" r="34"/></g>
${cloud(74, 110, 0.9)}${cloud(296, 142, 0.68)}
${bird(248, 96, 1.1)}${bird(272, 82, 0.85)}
<g class="bk-w"><path style="fill:#E7D7B6" d="M150,300 L214,300 L202,322 L162,322 Z"/>
<path style="fill:#F6F2E6" d="M180,298 L180,236 L222,298 Z"/>
<path style="fill:#F2A2B8" d="M176,298 L176,248 L142,298 Z"/></g>
<g class="bk-ln"><path d="M150,300 L214,300 L202,322 L162,322 Z"/><path d="M180,298 L180,232"/>
<path d="M180,240 L220,298 L180,298"/><path d="M176,254 L146,298 L176,298"/>
<path d="M-4,264 C110,254 260,254 368,264"/></g>
<g class="bk-ln bk-lnt"><path d="M40,370 C56,362 72,378 88,370"/><path d="M252,392 C268,384 284,400 300,392"/><path d="M120,412 C136,404 152,420 168,412"/></g>`},
 {id: 'forest', label: '숲으로 가는 길', art: `<g class="bk-w2"><rect style="fill:#FAF6E8" x="-4" y="-4" width="372" height="472"/>
<path style="fill:#DCE9DC" d="M-4,-4 L368,-4 L368,286 C260,304 110,304 -4,286 Z"/>
<path style="fill:#C8DCB4" d="M-4,278 C110,260 260,260 368,278 L368,468 L-4,468 Z"/>
<path style="fill:#E9DFC4" d="M150,290 C166,340 150,400 128,468 L236,468 C214,400 198,340 214,290 Z"/></g>
<g class="bk-w"><circle style="fill:#F6EBCF" cx="300" cy="86" r="26"/></g>
${cloud(74, 114, 0.78)}
${tree(44, 306, 1.6, '#7FA86A')}${tree(104, 286, 1.1, '#9EC47C')}${tree(332, 312, 1.5, '#6F9A5E')}${tree(272, 290, 1.05, '#8CB86E')}
<g class="bk-ln"><path d="M-4,282 C110,264 260,264 368,282"/>
<path d="M150,290 C166,340 150,400 128,468"/><path d="M214,290 C198,340 214,400 236,468"/></g>
<g class="bk-w"><g style="fill:#F2A2B8"><ellipse cx="86" cy="212" rx="4.6" ry="3" transform="rotate(20 86 212)"/>
<ellipse cx="286" cy="226" rx="4.2" ry="2.7" transform="rotate(-18 286 226)"/></g>
<g style="fill:#FBD89A"><circle cx="182" cy="372" r="3.6"/><circle cx="118" cy="398" r="3"/><circle cx="252" cy="412" r="3.2"/></g></g>`},
];

/** 내지 장 머리 밴드. 판면 폭을 꽉 채우고 글 위로는 걸치지 않습니다. */
export const BAND_ART: {id: string; art: string}[] = [
 {id: 'sprout', art: `<g class="bk-w2"><path style="fill:#EEF5E4" d="M0,24 C60,12 180,12 242,24 L242,60 C180,68 60,68 0,60 Z"/></g>
<g class="bk-w"><path style="fill:#CFE0B4" d="M0,46 C60,36 180,36 242,46 L242,68 L0,68 Z"/>
<g style="fill:#8CB86E"><path d="M40,46 C34,38 34,30 40,28 C46,30 46,38 40,46 Z"/><path d="M40,46 C46,40 54,40 56,44 C52,50 44,50 40,46 Z"/>
<path d="M86,48 C80,40 80,32 86,30 C92,32 92,40 86,48 Z"/><path d="M154,48 C148,40 148,32 154,30 C160,32 160,40 154,48 Z"/>
<path d="M154,48 C160,42 168,42 170,46 C166,52 158,52 154,48 Z"/><path d="M200,46 C194,38 194,30 200,28 C206,30 206,38 200,46 Z"/></g></g>
<g class="bk-ln bk-lnt"><path d="M0,46 C60,36 180,36 242,46"/>
<path d="M40,46 C34,38 34,30 40,28 C46,30 46,38 40,46 Z"/><path d="M86,48 C80,40 80,32 86,30 C92,32 92,40 86,48 Z"/>
<path d="M154,48 C148,40 148,32 154,30 C160,32 160,40 154,48 Z"/><path d="M200,46 C194,38 194,30 200,28 C206,30 206,38 200,46 Z"/></g>
<g class="bk-w"><g style="fill:#F4B6C8"><ellipse cx="62" cy="16" rx="4.4" ry="2.8" transform="rotate(22 62 16)"/>
<ellipse cx="184" cy="12" rx="4" ry="2.6" transform="rotate(-16 184 12)"/><ellipse cx="216" cy="30" rx="3.6" ry="2.4" transform="rotate(34 216 30)"/></g></g>`},
 {id: 'hill', art: `<g class="bk-w2"><path style="fill:#E7F0F5" d="M0,16 C60,6 180,6 242,16 L242,52 C180,60 60,60 0,52 Z"/></g>
<g class="bk-w"><path style="fill:#D4E4B8" d="M0,44 C48,30 104,52 150,40 C186,30 216,40 242,36 L242,68 L0,68 Z"/></g>
${tree(44, 60, 0.42, '#9EC47C')}${tree(196, 58, 0.34, '#88B26C')}
<g class="bk-ln bk-lnt"><path d="M0,44 C48,30 104,52 150,40 C186,30 216,40 242,36"/></g>
${bird(112, 20, 0.9)}${bird(132, 12, 0.7)}`},
 {id: 'wave', art: `<g class="bk-w2"><path style="fill:#EAF3F1" d="M0,10 C60,2 180,2 242,10 L242,46 C180,52 60,52 0,46 Z"/></g>
<g class="bk-w"><path style="fill:#CFE6EC" d="M0,44 C60,34 180,34 242,44 L242,68 L0,68 Z"/>
<path style="fill:#AFD2DC" d="M0,56 C60,48 180,48 242,56 L242,68 L0,68 Z"/></g>
<g class="bk-ln bk-lnt"><path d="M0,44 C60,34 180,34 242,44"/></g>
<g class="bk-w"><path style="fill:#F6F2E6" d="M124,44 L124,16 L144,44 Z"/>
<path style="fill:#F2A2B8" d="M120,44 L120,22 L102,44 Z"/>
<path style="fill:#E7D7B6" d="M102,44 L144,44 L136,55 L110,55 Z"/></g>
<g class="bk-ln bk-lnt"><path d="M102,44 L144,44 L136,55 L110,55 Z"/><path d="M122,44 L122,14"/>
<path d="M124,20 L142,44"/><path d="M120,26 L104,44"/>
<path d="M28,60 C40,53 52,65 64,58"/><path d="M168,62 C180,55 192,67 204,60"/></g>
${bird(44, 18, 0.8)}${bird(202, 14, 0.66)}`},
 {id: 'stars', art: `<g class="bk-w2"><path style="fill:#4A5872" d="M0,6 C60,-2 180,-2 242,6 L242,48 C180,56 60,56 0,48 Z"/></g>
<g class="bk-w"><path style="fill:#3C4A63" d="M0,44 C60,34 180,34 242,44 L242,68 L0,68 Z"/>
<path style="fill:#FBF1CF" d="M196,10 A13,13 0 1 1 210,26 A10,10 0 1 0 196,10 Z"/>
<g style="fill:#FBE3A8"><circle cx="34" cy="20" r="2.6"/><circle cx="70" cy="12" r="1.8"/><circle cx="104" cy="24" r="2.2"/>
<circle cx="140" cy="14" r="2"/><circle cx="160" cy="30" r="1.6"/><circle cx="18" cy="36" r="1.6"/></g></g>
<g class="bk-ln bk-lnt"><path d="M0,44 C60,34 180,34 242,44"/></g>
${tree(64, 64, 0.4, '#55724F')}${tree(178, 62, 0.32, '#48664A')}`},
];

/** 장 끝 장식 — 쉼표처럼 작게. 글 흐름을 끊지 않을 크기로 둡니다. */
export const SPOT_ART: {id: string; art: string}[] = [
 {id: 'leaf', art: `<g class="bk-ln bk-lnt"><path d="M4,8 L22,8"/><path d="M38,8 L56,8"/></g>
<g class="bk-w"><path style="fill:#9EC47C" d="M30,2 C24,5 24,11 30,14 C36,11 36,5 30,2 Z"/></g>
<g class="bk-ln bk-lnt"><path d="M30,2 C24,5 24,11 30,14 C36,11 36,5 30,2 Z"/></g>`},
 {id: 'star', art: `<g class="bk-ln bk-lnt"><path d="M4,8 L20,8"/><path d="M40,8 L56,8"/></g>
<g class="bk-w"><g style="fill:#E9C77E"><path d="M30,1 L32.4,6.6 L38,8 L32.4,9.4 L30,15 L27.6,9.4 L22,8 L27.6,6.6 Z"/></g></g>`},
 {id: 'dots', art: `<g class="bk-ln bk-lnt"><path d="M2,8 L16,8"/><path d="M44,8 L58,8"/></g>
<g class="bk-w"><g style="fill:#C79C74"><path d="M23,4 L25,7 L23,10 L21,7 Z"/><path d="M30,3 L32.4,7 L30,11 L27.6,7 Z"/><path d="M37,4 L39,7 L37,10 L35,7 Z"/></g></g>`},
];

/** 한 책이 쓰는 그림 묶음. 같은 아이디는 항상 같은 묶음을 받습니다. */
export function bookArt(seed: string) {
 const n = artSeed(seed), cover = COVER_ART[n % COVER_ART.length];
 return {
  coverId: cover.id,
  coverLabel: cover.label,
  cover: cover.art,
  band: (chapter: number) => BAND_ART[(n + chapter) % BAND_ART.length].art,
  spot: (chapter: number) => SPOT_ART[(n + chapter) % SPOT_ART.length].art,
 };
}

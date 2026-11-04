/* ══════════════════════════════════════════════════════════════
   조판 엔진

   설계 원칙 (어제 판의 문제를 고친 부분)
     · 빈 쪽을 뒤에 몰아넣지 않는다. 대수(8의 배수)는 뒷부속 쪽수로 맞춘다.
     · 삽화는 본문 사이에 흘려 넣지 않는다. 쪽의 맨 위 또는 맨 아래에만 둔다.
     · 장 표제 쪽 · 이야기 속표지는 반드시 오른쪽 면(홀수 쪽)에 온다.
     · 판면 안쪽(책등) 여백을 바깥보다 넓게 잡는다 — 무선제본 펼침 손실 보정.
   ══════════════════════════════════════════════════════════ */
function buildBook() {
  const out = document.getElementById("book");
  const MM = (() => {                       // 1㎜ = ? px
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;width:100mm;visibility:hidden";
    document.body.appendChild(d);
    const v = d.getBoundingClientRect().width / 100;
    d.remove();
    return v;
  })();
  const LEAD = 8.96 * MM;                   // 행간 25.4pt
  const TB_W = 121 * MM;
  const TB_H = (225 - 27 - 27) * MM;        // 171㎜ = 19행
  const GAP = 5 * MM;                       // 그림과 본문 사이

  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const art = id => document.getElementById(id).cloneNode(true);

  /* 밴드 삽화의 실제 높이 (판면 폭 121㎜에 맞췄을 때) */
  const bandH = id => {
    const vb = document.getElementById(id).getAttribute("viewBox").split(/\s+/).map(Number);
    return TB_W * vb[3] / vb[2];
  };

  /* ── 낱장 ── */
  const pages = [];
  function sheet(cls) {
    const s = el("div", "sheet");
    const p = el("div", "page " + (cls || ""));
    /* 면(오른쪽/왼쪽)을 만들 때 바로 정한다.
       .tb 의 좌우 여백이 여기서 결정되므로, 나중에 붙이면
       조판을 끝낸 뒤 판면 폭이 바뀌어 본문이 넘친다. */
    p.classList.add(pages.length % 2 === 0 ? "recto" : "verso");
    s.appendChild(p);
    out.appendChild(s);
    pages.push(p);
    return p;
  }

  /* 판면 높이를 행의 정수배로 자른다.
     이렇게 해야 마지막 행이 반만 잘려 나오는 일이 생기지 않는다. */
  const snap = h => Math.max(LEAD, Math.floor(h / LEAD + 0.02) * LEAD);

  /* ── 본문 쪽 ── */
  function textPage(story) {
    const p = sheet("textpage");
    p.dataset.story = story.id;
    p.dataset.folio = "1";
    const tb = el("div", "tb");
    const txt = el("div", "txt");
    tb.appendChild(txt);
    p.appendChild(tb);
    p.appendChild(el("div", "folio", '<span class="num"></span><span class="sep">·</span><span class="rt">' + story.title + "</span>"));
    const st = { page: p, tb: tb, txt: txt, band: null, h: snap(TB_H) };
    p.dataset.h = st.h;
    return st;
  }
  /* .txt 의 높이를 고정하지 않으므로 offsetHeight 가 곧 본문이 차지한 높이다.
     (높이를 지정하면 scrollHeight·offsetTop 모두 신뢰할 수 없다) */
  const used = st => st.txt.offsetHeight;
  const over = st => used(st) > st.h + 0.6;
  const room = st => st.h - used(st);
  /* 밴드를 넣었을 때 남는 본문 높이 (행의 정수배) */
  const hWithBand = id => snap(TB_H - bandH(id) - GAP);

  function putBandTop(st, id) {
    const h = bandH(id);
    const b = el("div", "band top");
    b.style.height = h + "px";
    b.appendChild(art(id));
    st.tb.insertBefore(b, st.txt);
    st.band = "top";
    st.h = hWithBand(id);
    st.page.dataset.band = "top"; st.page.dataset.h = st.h;
    st.txt.style.marginTop = (TB_H - st.h) + "px";
  }
  function putBandBottom(st, id) {
    const b = el("div", "band bottom");
    b.style.height = bandH(id) + "px";
    b.appendChild(art(id));
    st.tb.appendChild(b);
    st.band = "bottom";
    st.h = hWithBand(id);
    st.page.dataset.band = "bottom"; st.page.dataset.h = st.h;
  }

  /* ── 전면 삽화 쪽 ── */
  function platePage(story, id, cap) {
    const p = sheet("plate nofolio");
    if (story) p.dataset.story = story.id;
    const a = el("div", "art");
    a.appendChild(art(id));
    p.appendChild(a);
    if (cap) p.appendChild(el("div", "cap", cap));
    return p;
  }

  /* ── 한 문장 쪽 ── */
  let decoSeq = 0;
  const DECOS = ["deco-leaf", "deco-drop", "deco-star"];
  function soloPage(story, html) {
    const p = sheet("solo");
    p.dataset.story = story.id;
    p.dataset.folio = "1";
    p.appendChild(el("div", "in", '<span class="mk"></span><p>' + html + '</p><span class="mk b"></span>'));
    const d = el("div", "deco");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "-16 -16 32 32");
    s.appendChild(art(DECOS[decoSeq++ % DECOS.length]));
    d.appendChild(s);
    p.appendChild(d);
    p.appendChild(el("div", "folio", '<span class="num"></span><span class="sep">·</span><span class="rt">' + story.title + "</span>"));
  }

  /* ── 본문 흘리기 ── */
  function flow(story, ch) {
    let st = null, first = true, pending = null;
    const need = () => (st || (st = textPage(story)));

    /* 판면을 넘친 만큼 뒤쪽 문단부터 다음 쪽으로 넘긴다.
       밴드를 넣어 판면이 줄어든 경우에도 본문이 잘려 없어지지 않게 한다. */
    function spill() {
      let guard = 0;
      while (st && over(st) && st.txt.children.length > 1 && guard++ < 60) {
        const moved = [];
        while (st.txt.children.length > 1 && over(st)) {
          const last = st.txt.lastElementChild;
          st.txt.removeChild(last);
          moved.unshift(last);
        }
        const carry = pending; pending = null;
        st = textPage(story);
        if (carry) putBandTop(st, carry);
        while (moved.length && moved[0].classList.contains("lead-gap")) moved.shift();
        moved.forEach(n => st.txt.appendChild(n));
      }
    }

    /* 기다리던 밴드 삽화를 놓을 자리를 판단한다 */
    function settle() {
      if (!pending || !st) return;
      const newH = hWithBand(pending);
      if (used(st) <= newH && used(st) >= LEAD * 3) {   // 이 쪽 아래에 그대로 들어간다
        putBandBottom(st, pending); pending = null; spill();
      } else if (room(st) < LEAD * 4) {                 // 이 쪽은 거의 찼다 — 다음 쪽 위로
        st = textPage(story); putBandTop(st, pending); pending = null;
      }
      /* 그 사이(애매한 여백)라면 본문을 더 흘려 쪽을 채운 뒤 다시 판단한다 */
    }

    const put = node => {
      need().txt.appendChild(node);
      spill();
    };

    let prevDash = false;
    /* 빈 행은 쪽 첫머리에 오거나 쪽을 새로 만들게 해서는 안 된다 */
    const gap = () => {
      if (!st || used(st) <= 0) return;
      const n = el("p", "lead-gap");
      st.txt.appendChild(n);
      if (over(st)) st.txt.removeChild(n);
    };

    for (const raw of ch.body) {
      if (raw.startsWith("B|")) { pending = raw.slice(2); settle(); continue; }
      if (raw.startsWith("S|")) {
        if (pending && st) { settle(); }
        if (pending) { st = textPage(story); putBandTop(st, pending); pending = null; }
        soloPage(story, raw.slice(2)); st = null; first = true; continue;
      }
      if (raw.startsWith("P|")) {
        const [, id, cap] = raw.split("|");
        if (pending) { if (st) settle(); if (pending) { st = textPage(story); putBandTop(st, pending); pending = null; } }
        platePage(story, id, cap); st = null; first = true; continue;
      }
      if (raw.startsWith("O|")) {
        settle(); gap(); put(el("p", "orn", "✦ ✦ ✦")); gap();
        prevDash = false; continue;
      }

      let cls = "", txt = raw;
      const isDash = raw.startsWith("D|");
      if (isDash) { cls = "dash"; txt = raw.slice(2); }
      else if (raw.startsWith("“")) cls = "talk";
      if (first) cls = (cls ? cls + " first" : "first");
      settle();
      if (isDash !== prevDash) gap();            // 인용 덩어리 앞뒤로 한 행 비움
      put(el("p", cls, txt));
      prevDash = isDash;
      first = false;
    }
    /* 장이 끝났는데 아직 못 놓은 밴드가 있으면 여기서 처리 */
    if (pending) {
      if (st && room(st) >= bandH(pending) + GAP) putBandBottom(st, pending);
      else { st = textPage(story); putBandTop(st, pending); }
    }
  }

  /* ── 앞부속 ── */
  function halfTitle() {
    const p = sheet("halftitle nofolio");
    p.appendChild(el("div", "in", "<h1>" + BOOK.title + "</h1>"));
    const d = el("div", "mk");
    d.appendChild(art("art-mark"));
    p.querySelector(".in").appendChild(d);
  }
  function seriesPage() {
    const p = sheet("epigraph nofolio");
    p.appendChild(el("div", "in", "<p>" + BOOK.seriesLine + '</p><span class="src">' + BOOK.imprint + "</span>"));
  }
  function titlePage() {
    const p = sheet("titlepage nofolio");
    p.appendChild(el("div", "in", "<h1>" + BOOK.title + '</h1><div class="sub">' + BOOK.sub + "</div>"));
    const a = el("div", "art"); a.appendChild(art("art-mark")); p.appendChild(a);
    p.appendChild(el("div", "titles", BOOK.stories.map(s => '<div class="t">' + s.title + "</div>").join("")));
    p.appendChild(el("div", "imp", BOOK.imprint));
  }
  function dedication() {
    const p = sheet("ded nofolio");
    p.appendChild(el("div", "in", "<p>" + BOOK.dedication.map(l => l === "" ? "<br>" : l).join("<br>") +
      '</p><div class="sig">' + BOOK.dedicationSig + "</div>"));
  }
  let tocRows = [];
  function toc() {
    const p = sheet("toc nofolio");
    const inner = el("div", "in", "<h2>차 례</h2>");
    BOOK.stories.forEach(s => {
      const g = el("div", "grp");
      g.appendChild(el("div", "gt", '<span class="sm">' + s.label + "</span>" + s.title));
      s.chapters.forEach(c => {
        g.appendChild(el("div", "row",
          '<span class="n">' + c.n + '</span><span class="ti">' + c.title +
          '</span><span class="dots"></span><span class="pg" data-toc="' + s.id + "-" + c.n + '"></span>'));
      });
      inner.appendChild(g);
    });
    p.appendChild(inner);
  }

  /* ── 이야기 앞 ── */
  function storyHalf(s) {
    const p = sheet("storyhalf nofolio");
    p.dataset.story = s.id;
    const bg = el("div", "panel");
    bg.style.background = s.id === "tower" ? "var(--tint-spring)" : "var(--tint-mom)";
    p.appendChild(bg);
    p.appendChild(el("div", "lab", s.label));
    p.appendChild(el("h1", null, s.title));
    const a = el("div", "art"); a.appendChild(art(s.halfArt)); p.appendChild(a);
    p.appendChild(el("div", "sub", s.halfSub));
    p.appendChild(el("div", "by", s.by));
  }
  function storyEpigraph(s, c) {
    const p = sheet("epigraph nofolio");
    p.dataset.story = s.id;
    p.appendChild(el("div", "in", "<p>" + c.epi + '</p><span class="src">' + s.title + "</span>"));
  }
  function chapterOpener(s, c) {
    const p = sheet("chapter");
    p.dataset.story = s.id;
    p.dataset.folio = "1";
    p.dataset.tocKey = s.id + "-" + c.n;
    const a = el("div", "art"); a.appendChild(art(c.art)); p.appendChild(a);
    p.appendChild(el("div", "meta",
      '<span class="n">' + s.label.replace("이야기", "이야기 ·") + " " + c.n + '장</span><h2>' + c.title +
      '</h2><p class="epi">' + c.epi + "</p>"));
    p.appendChild(el("div", "rule"));
  }

  /* ── 여백 간지 (작은 모티프 하나) ── */
  function breather() {
    const p = sheet("solo nofolio breather");
    const d = el("div", "deco");
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "-16 -16 32 32");
    s.appendChild(art(DECOS[decoSeq++ % DECOS.length]));
    d.appendChild(s);
    d.style.cssText = "position:absolute;left:50%;transform:translateX(-50%);top:50%;width:26mm";
    p.appendChild(d);
  }

  /* 다음에 만들 쪽의 쪽번호 = pages.length + 1
     왼쪽 면(짝수) 로 맞추려면 현재 쪽수가 홀수여야 한다 */
  const toVerso = () => { if (pages.length % 2 === 0) breather(); };
  const toRecto = () => { if (pages.length % 2 === 1) breather(); };

  /* ══════════════ 조립 ══════════════ */
  halfTitle();      // 1 R
  seriesPage();     // 2 V
  titlePage();      // 3 R
  dedication();     // 4 V
  toc();            // 5 R

  BOOK.stories.forEach(s => {
    toVerso();                                   // 전면 삽화는 왼쪽 면
    platePage(s, s.openPlate, s.openCap);        // V
    storyHalf(s);                                // R
    s.chapters.forEach((c, i) => {
      /* 1장 앞에만 제사 쪽을 둔다. 2~4장 표제화는 앞 장이 끝난 자리에서
         바로 이어 붙인다 — 면을 맞추려고 빈 쪽을 넣지 않는다.
         (이야기 속표지만 오른쪽 면을 지킨다) */
      if (i === 0) storyEpigraph(s, c);          // V
      chapterOpener(s, c);
      flow(s, c);
    });
  });

  /* ── 뒷부속 — 대수(8의 배수)를 여기서 맞춘다 ── */
  function colophon() {
    const c = BOOK.colophon;
    const p = sheet("colophon nofolio");
    p.appendChild(el("div", "in",
      "<h2>" + c.title + '</h2><p class="lead">' + c.lead + "</p><table>" +
      c.rows.map(r => '<tr><td class="k">' + r[0] + "</td><td>" + r[1] + "</td></tr>").join("") +
      '</table><p class="fine">' + c.fine + "</p>"));
    p.appendChild(el("div", "stamp", c.stamp));
  }
  function afterword() {
    const p = sheet("colophon nofolio");
    p.appendChild(el("div", "in",
      "<h2>이 책을 덮고 나서</h2>" +
      '<p class="lead">두 이야기는 모두 “혼자서는 안 된다”는 같은 말을 다르게 합니다. ' +
      "아이와 함께 아래 세 가지를 이야기해 보세요. 오늘의 대답이 다음 책의 첫 줄이 됩니다.</p>" +
      "<table>" +
      '<tr><td class="k">하나</td><td>나에게 ‘불신이’가 속삭인 적이 있나요? 그때 뭐라고 했나요?</td></tr>' +
      '<tr><td class="k">둘</td><td>내가 없으면 심심할 사람은 누구인가요?</td></tr>' +
      '<tr><td class="k">셋</td><td>엄마·아빠도 처음이었던 날이 있었을까요?</td></tr>' +
      "</table>"));
    p.appendChild(el("div", "stamp", "다음 이야기는 당신의 대답에서 시작됩니다"));
  }
  function memoPage() {
    const p = sheet("colophon nofolio");
    p.appendChild(el("div", "in",
      "<h2>우리 집 이야기 서랍</h2>" +
      '<p class="lead">이 책을 읽은 날과, 아이가 한 말을 적어 두세요.</p>' +
      '<div style="margin-top:6mm">' +
      Array.from({ length: 9 }, () => '<div style="height:9.6mm;border-bottom:1px solid #E6DED4"></div>').join("") +
      "</div>"));
  }
  function meetingPage() {
    const p = sheet("colophon nofolio");
    p.appendChild(el("div", "in",
      "<h2>두 이야기가 만나는 곳</h2>" +
      '<p class="lead">한 편은 계절의 이야기이고 다른 한 편은 사람의 이야기입니다. ' +
      "그런데 두 이야기는 같은 자리에서 끝납니다.</p><table>" +
      '<tr><td class="k">사계의 탑</td><td>혼자서 가장 빛나려 할 때 세상이 멈췄고, ' +
      "서로의 자리를 인정하자 다시 돌기 시작했습니다.</td></tr>" +
      '<tr><td class="k">23살 우리엄마</td><td>완벽한 엄마를 바랄 때 서로가 아팠고, ' +
      "서툴렀던 시간을 알아보자 서로를 안을 수 있었습니다.</td></tr>" +
      '<tr><td class="k">같은 말</td><td>누구도 혼자서는 온전해지지 않는다는 것. ' +
      "그리고 서툰 것은 잘못이 아니라는 것.</td></tr>" +
      "</table>"));
    p.appendChild(el("div", "stamp", "두 편 모두 답변자가 쓴 마지막 문장으로 끝납니다"));
  }
  function imprintPage() {
    const p = sheet("colophon nofolio imprintpage");
    p.appendChild(el("div", "in",
      "<h2>" + BOOK.title + "</h2>" +
      '<p class="lead">' + BOOK.sub + "</p><table>" +
      '<tr><td class="k">펴낸 곳</td><td>' + BOOK.imprint + "</td></tr>" +
      '<tr><td class="k">판형</td><td>175 × 225㎜ · 무선제본</td></tr>' +
      '<tr><td class="k">쪽수</td><td><span id="pgcount"></span>쪽</td></tr>' +
      '<tr><td class="k">만든 날</td><td>2026년 9월</td></tr>' +
      "</table>" +
      '<p class="fine">이 책은 답변자의 동의 아래 제작되었습니다. ' +
      "본문과 삽화의 무단 복제를 금합니다.</p>"));
  }
  function seriesBack() {
    const p = sheet("epigraph nofolio");
    p.appendChild(el("div", "in",
      "<p>" + BOOK.back.big + '</p><span class="src">' + BOOK.back.cta + "</span>"));
  }

  function questionsPage() {
    const p = sheet("colophon nofolio");
    const qs = [
      "아이가 가장 무서워하는 것은 무엇인가요?",
      "아이에게 꼭 물려주고 싶은 말이 있나요?",
      "아이가 처음으로 당신을 울린 순간은 언제였나요?",
      "당신이 아이만 했을 때, 가장 아꼈던 것은 무엇인가요?",
      "지금 아이에게 해주지 못해 미안한 것이 있나요?"
    ];
    p.appendChild(el("div", "in",
      "<h2>이 책을 만든 질문들</h2>" +
      '<p class="lead">두 편의 이야기는 아래와 같은 질문에 답하는 것으로 시작되었습니다. ' +
      "정답은 없습니다. 떠오르는 대로 답하면 그것이 곧 이야기의 재료가 됩니다.</p><table>" +
      qs.map((q, i) => '<tr><td class="k">질문 ' + (i + 1) + "</td><td>" + q + "</td></tr>").join("") +
      "</table>"));
    p.appendChild(el("div", "stamp", "질문은 모두 17개입니다"));
  }
  function readerPage() {
    const p = sheet("colophon nofolio");
    p.appendChild(el("div", "in",
      "<h2>이 책을 읽어 준 사람</h2>" +
      '<p class="lead">언제, 누가, 누구에게 읽어 주었는지 적어 두세요.</p>' +
      '<div style="margin-top:6mm">' +
      Array.from({ length: 8 }, () =>
        '<div style="display:flex;gap:5mm;height:11mm;align-items:flex-end">' +
        '<div style="width:30mm;border-bottom:1px solid #E6DED4"></div>' +
        '<div style="flex:1;border-bottom:1px solid #E6DED4"></div></div>').join("") +
      "</div>"));
  }

  /* ── 뒷부속은 ‘반드시 넣는 2쪽(후지·판권) + 선택 6쪽’ 구조.
        대수(8의 배수)를 맞추려고 뒤에 백지를 몰아넣지 않는다.
        넣을 쪽수 자체를 골라 딱 떨어지게 만든다. ── */
  const OPT = [afterword, meetingPage, questionsPage, memoPage, readerPage, seriesBack];
  const b0 = pages.length;
  let pick = null;
  for (let pad = 0; pad <= 1 && !pick; pad++)
    for (let extra = 0; extra <= OPT.length; extra++)
      if ((b0 + pad + 2 + extra) % 8 === 0) { pick = { pad: pad, extra: extra }; break; }
  pick = pick || { pad: 0, extra: 0 };

  if (pick.pad) breather();
  colophon();
  for (let i = 0; i < pick.extra; i++) OPT[i]();
  imprintPage();                                 // 판권은 언제나 맨 뒤
  while (pages.length % 8 !== 0) breather();     // 안전망 — 위 계산이 맞으면 실행되지 않는다

  /* ══════════════ 2차 조판 — 쪽번호 · 차례 ══════════════ */
  pages.forEach((p, i) => {
    const n = i + 1;
    p.dataset.page = n;
    const num = p.querySelector(".folio .num");
    if (num) num.textContent = n;
  });

  out.querySelectorAll("[data-toc]").forEach(span => {
    const key = span.getAttribute("data-toc");
    const t = pages.find(p => p.dataset.tocKey === key);
    span.textContent = t ? t.dataset.page : "";
  });
  const pc = document.getElementById("pgcount");
  if (pc) pc.textContent = pages.length;

  /* ── 재단선 ── */
  if (document.documentElement.dataset.mode === "print") {
    const B = getComputedStyle(document.documentElement).getPropertyValue("--bleed").trim();
    document.querySelectorAll(".sheet").forEach(s => {
      const mk = (cls, css) => { const d = el("div", "crop " + cls); d.style.cssText = css; s.appendChild(d); };
      const b = B, W = "var(--trim-w)", H = "var(--trim-h)";
      mk("h", `left:0;top:${b}`);                                     mk("v", `left:${b};top:0`);
      mk("h", `right:0;top:${b}`);                                    mk("v", `right:${b};top:0`);
      mk("h", `left:0;top:calc(${b} + ${H})`);                        mk("v", `left:${b};bottom:0`);
      mk("h", `right:0;top:calc(${b} + ${H})`);                       mk("v", `right:${b};bottom:0`);
    });
  }

  /* ── 검증 로그 (빌드가 읽는다) ── */
  const report = {
    pages: pages.length,
    mult8: pages.length % 8 === 0,
    storyHalfOnRecto: pages.filter(p => p.classList.contains("storyhalf"))
      .every(p => p.classList.contains("recto")),
    /* 전면 삽화는 이야기 속표지와 마주 보는 왼쪽 면이어야 한다 */
    openPlateOnVerso: pages.filter((p, i) => p.classList.contains("plate") &&
      pages[i + 1] && pages[i + 1].classList.contains("storyhalf"))
      .every(p => p.classList.contains("verso")),
    breathers: pages.filter(p => p.classList.contains("breather")).length,
    /* 조용한 쪽(여백 간지)이 연달아 나오지 않아야 한다 — 어제 판의 가장 큰 문제 */
    maxQuietRun: (() => {
      let m = 0, r = 0;
      pages.forEach(p => { r = p.classList.contains("breather") ? r + 1 : 0; if (r > m) m = r; });
      return m;
    })(),
    plates: pages.filter(p => p.classList.contains("plate")).length,
    textPages: pages.filter(p => p.classList.contains("textpage")).length,
    /* 본문이 덜 찬 쪽.
       장·삽화 쪽 직전이라면 자연스러운 마무리이므로 문제 삼지 않는다.
       뒤에 본문 쪽이 곧바로 이어지는데 헐렁하면 그건 조판 오류다. */
    shortPages: pages.filter((p, i) => {
      if (!p.classList.contains("textpage")) return false;
      const t = p.querySelector(".txt");
      if (!t || !t.children.length) return false;
      if (t.offsetHeight >= (+p.dataset.h) - LEAD * 3.5) return false;
      const nx = pages[i + 1];
      return !!(nx && nx.classList.contains("textpage"));
    }).map(p => +p.dataset.page),
    chapterEndPages: pages.filter((p, i) => {
      if (!p.classList.contains("textpage")) return false;
      const t = p.querySelector(".txt");
      return t && t.children.length && t.offsetHeight < (+p.dataset.h) - LEAD * 3.5;
    }).length,
    /* 판면을 넘긴 쪽 — 본문이 여백을 침범하거나 잘려 나간다 */
    clipped: pages.filter(p => {
      const t = p.querySelector(".txt");
      return t && t.children.length && t.offsetHeight > (+p.dataset.h) + 1;
    }).map(p => +p.dataset.page),
    paraCount: out.querySelectorAll(".txt > p:not(.lead-gap), .solo .in p").length
  };
  document.title = BOOK.title + " · " + pages.length + "p";
  const meta = document.createElement("script");
  meta.id = "buildreport"; meta.type = "application/json";
  meta.textContent = JSON.stringify(report);
  document.body.appendChild(meta);
}

/* ── 본문 글꼴이 실제로 올라온 뒤에 조판한다 ──────────────────
   대체 글꼴 폭으로 줄 수를 세면 실제 글꼴에서 행이 넘쳐 잘린다.
   (문단이 통째로 사라지던 원인) */
(function () {
  const need = [
    "350 11.8pt BookSans", "400 10.4pt BookSans", "500 15.5pt BookSans",
    "600 20pt BookSans", "700 28pt BookSans"
  ];
  const go = () => buildBook();
  if (document.fonts && document.fonts.load) {
    Promise.all(need.map(f => document.fonts.load(f, "가나다 ABC 123").catch(() => null)))
      .then(() => document.fonts.ready)
      .then(go, go);
  } else {
    window.addEventListener("load", go);
  }
})();

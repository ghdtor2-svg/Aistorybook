# -*- coding: utf-8 -*-
"""
이야기 서랍 · 첫 번째 책 — 빌드

  src/*  →  HTML  →  (headless Chrome)  →  PDF

산출물
  본문_인쇄용.pdf   181×231㎜  도련 3㎜ + 재단선      ← 인쇄소 입고용
  본문_보기용.pdf   175×225㎜  재단 후 크기           ← 검토·교정용
  표지_인쇄용.pdf   (175+책등+175)×225㎜ + 도련      ← 인쇄소 입고용 (별쇄)

사용:  python build.py
"""
import os, re, json, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")

# ── 제작 사양 ──────────────────────────────────────────────
TRIM_W, TRIM_H = 175.0, 225.0      # 판형 ㎜
BLEED = 3.0                        # 도련 ㎜
PAPER_THICK = 0.11                 # 본문 용지 1장 두께 ㎜ (모조지 100g/㎡ 기준)
COVER_THICK = 0.55                 # 표지 용지 두께 ㎜ (스노우지 250g/㎡ 기준, 양쪽 합)
# 책등 = (쪽수 ÷ 2) × 본문 1장 두께 + 표지 두께

CHROME = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


def find_chrome():
    for p in CHROME:
        if os.path.exists(p):
            return p
    raise SystemExit("Chrome/Edge를 찾지 못했습니다.")


def head(mode, page_w, page_h):
    h = read("10_head.html")
    h = h.replace("__MODE__", mode)
    h = h.replace("__BLEED__", ("%gmm" % BLEED) if mode == "print" else "0mm")
    h = h.replace("__PAGEW__", "%gmm" % page_w).replace("__PAGEH__", "%gmm" % page_h)
    return h


def body_html(mode):
    b = BLEED if mode == "print" else 0
    parts = [
        head(mode, TRIM_W + 2 * b, TRIM_H + 2 * b),
        read("20_art_defs.html"),
        read("21_art_chapters.html"),
        read("22_art_spots.html"),
        read("50_tail.html").replace(
            "</body>",
            "<script>\n" + read("30_content.js") + "\n" + read("40_layout.js") + "\n</script>\n</body>"),
    ]
    return "\n".join(parts)


def cover_html(spine_mm):
    b = BLEED
    parts = [
        head("print", 2 * TRIM_W + spine_mm + 2 * b, TRIM_H + 2 * b),
        read("20_art_defs.html"),
        read("21_art_chapters.html"),
        read("60_cover.html").replace("__SPINE__", "%.2fmm" % spine_mm),
        "<script>document.querySelectorAll('.coversheet').forEach(s=>{"
        "const mk=(c,css)=>{const d=document.createElement('div');d.className='crop '+c;"
        "d.style.cssText=css;s.appendChild(d)};"
        "const b='%gmm',H='var(--trim-h)';"
        "mk('h','left:0;top:'+b);mk('v','left:'+b+';top:0');"
        "mk('h','right:0;top:'+b);mk('v','right:'+b+';top:0');"
        "mk('h','left:0;top:calc('+b+' + '+H+')');mk('v','left:'+b+';bottom:0');"
        "mk('h','right:0;top:calc('+b+' + '+H+')');mk('v','right:'+b+';bottom:0');"
        "});</script>" % BLEED,
        "</body></html>",
    ]
    return "\n".join(parts)


def to_pdf(html_path, pdf_path, extra_wait=30000):
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    cmd = [find_chrome(), "--headless=new", "--no-sandbox", "--disable-extensions",
           "--run-all-compositor-stages-before-draw",
           "--virtual-time-budget=%d" % extra_wait,
           "--no-pdf-header-footer",
           "--print-to-pdf=" + pdf_path,
           "file:///" + html_path.replace("\\", "/")]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=600)
    if not os.path.exists(pdf_path):
        print(r.stdout, r.stderr)
        raise SystemExit("PDF 생성 실패: " + pdf_path)


def dump_report(html_path):
    """레이아웃 엔진이 남긴 검증 정보를 헤드리스로 읽어 온다."""
    js = os.path.join(HERE, "_report.json")
    if os.path.exists(js):
        os.remove(js)
    cmd = [find_chrome(), "--headless=new", "--no-sandbox", "--disable-extensions",
           "--virtual-time-budget=25000", "--dump-dom",
           "file:///" + html_path.replace("\\", "/")]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=300)
    m = re.search(r'id="buildreport"[^>]*>(.*?)</script>', r.stdout or "", re.S)
    return json.loads(m.group(1)) if m else None


def missing_paragraphs(pdf_path):
    """원고(30_content.js)의 모든 문단이 PDF 안에 실제로 찍혔는지 대조한다."""
    import unicodedata
    try:
        import fitz
    except ImportError:
        return []
    src = read("30_content.js")
    paras = []
    for m in re.finditer(r"body:\s*\[(.*?)\n\s*\]", src, re.S):
        for s in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)):
            if s.startswith(("A|", "B|", "P|", "O|")):
                continue
            s = re.sub(r"^[SD]\|", "", s)
            s = re.sub(r"<[^>]+>", "", s).replace('\\"', '"')
            if s.strip():
                paras.append(s)
    d = fitz.open(pdf_path)
    book = "".join(d[i].get_text() for i in range(len(d)))
    d.close()
    norm = lambda t: re.sub(r"\s+", "", unicodedata.normalize("NFC", t))
    B = norm(book)
    return [p for p in paras if norm(p) not in B]


def verify(body_pdf, cover_pdf, rep, spine):
    try:
        import fitz
    except ImportError:
        print("PyMuPDF 없음 — 검사 생략")
        return
    ok = True
    print("─" * 62)
    d = fitz.open(body_pdf)
    n = len(d)
    w, h = d[0].rect.width / 72 * 25.4, d[0].rect.height / 72 * 25.4
    print("본문  %d쪽   %.1f × %.1f ㎜   %.1f MB"
          % (n, w, h, os.path.getsize(body_pdf) / 1024 / 1024))

    def chk(label, cond, detail=""):
        nonlocal ok
        print("   %s %-34s %s" % ("✔" if cond else "✘", label, detail))
        if not cond:
            ok = False

    chk("쪽수가 8의 배수 (대수)", n % 8 == 0, "%d쪽" % n)
    chk("도련 포함 규격", abs(w - (TRIM_W + 2 * BLEED)) < .6 and abs(h - (TRIM_H + 2 * BLEED)) < .6,
        "%.0f×%.0f㎜ (재단 후 %g×%g)" % (w, h, TRIM_W, TRIM_H))
    if rep:
        chk("본문이 판면 밖으로 잘리지 않음", not rep["clipped"],
            ("" if not rep["clipped"] else "잘린 쪽 " + ",".join(map(str, rep["clipped"]))))
        chk("이야기 속표지가 오른쪽 면", rep["storyHalfOnRecto"])
        chk("전면 삽화가 속표지와 마주 봄", rep["openPlateOnVerso"])
        chk("빈 쪽이 연달아 나오지 않음", rep["maxQuietRun"] <= 1,
            "최장 연속 %d쪽 · 여백 간지 전체 %d쪽" % (rep["maxQuietRun"], rep["breathers"]))
        chk("본문 중간에 헐렁한 쪽 없음", not rep["shortPages"],
            ("장·삽화 앞에서 자연스럽게 끝나는 쪽 %d" % rep["chapterEndPages"])
            if not rep["shortPages"] else "쪽 " + ",".join(map(str, rep["shortPages"])))
        print("   · 본문 쪽 %d · 전면 삽화 %d · 여백 간지 %d"
              % (rep["textPages"], rep["plates"], rep["breathers"]))

    # 원고 대조 — 문단이 하나라도 빠지면 안 된다
    miss = missing_paragraphs(body_pdf)
    chk("원고 문단 전부 수록", not miss,
        "누락 %d개: %s" % (len(miss), miss[0][:24] + "…") if miss else "")

    # 삽화 해상도 — 회전 배치를 고려해 변환행렬에서 실제 놓인 크기를 구한다
    import math
    lo = []
    for i in range(n):
        for im in d[i].get_image_info():
            m = im.get("transform")
            if m:
                wpt = math.hypot(m[0], m[1])          # x축 기저벡터 길이 = 놓인 폭(pt)
            else:
                wpt = im["bbox"][2] - im["bbox"][0]
            wmm = wpt / 72 * 25.4
            if wmm > 20:
                dpi = im["width"] / (wmm / 25.4)
                if dpi < 250:
                    lo.append((i + 1, int(dpi), round(wmm)))
    chk("삽화 300dpi 이상", not lo,
        "" if not lo else "미달 " + ", ".join("p%d %ddpi" % (p, v) for p, v, _ in lo[:5]))
    d.close()

    c = fitz.open(cover_pdf)
    cw, ch_ = c[0].rect.width / 72 * 25.4, c[0].rect.height / 72 * 25.4
    want_w = 2 * TRIM_W + spine + 2 * BLEED
    print("표지  1장   %.1f × %.1f ㎜   책등 %.1f㎜" % (cw, ch_, spine))
    chk("표지 펼침 규격", abs(cw - want_w) < .8, "기대 %.1f㎜" % want_w)
    c.close()
    print("─" * 62)
    print(("모든 검사 통과 — 인쇄 입고 가능" if ok else "검사에서 걸린 항목이 있습니다"))
    return ok


if __name__ == "__main__":
    # 1) 보기용(재단 후 크기) — 여기서 쪽수를 확정한다
    p_view_html = os.path.join(HERE, "본문_보기용.html")
    with open(p_view_html, "w", encoding="utf-8") as f:
        f.write(body_html("screen"))
    rep = dump_report(p_view_html)
    if rep:
        print("조판: %d쪽 (8의 배수: %s) · 본문 %d · 전면삽화 %d · 간지 %d"
              % (rep["pages"], "예" if rep["mult8"] else "아니오",
                 rep["textPages"], rep["plates"], rep["breathers"]))
    pages = rep["pages"] if rep else 64
    spine = round((pages / 2 * PAPER_THICK + COVER_THICK) * 2) / 2   # 0.5㎜ 단위 반올림

    to_pdf(p_view_html, os.path.join(HERE, "본문_보기용.pdf"))

    # 2) 인쇄용(도련 + 재단선)
    p_print_html = os.path.join(HERE, "본문_인쇄용.html")
    with open(p_print_html, "w", encoding="utf-8") as f:
        f.write(body_html("print"))
    to_pdf(p_print_html, os.path.join(HERE, "본문_인쇄용.pdf"))

    # 3) 표지 별쇄
    p_cov_html = os.path.join(HERE, "표지_인쇄용.html")
    with open(p_cov_html, "w", encoding="utf-8") as f:
        f.write(cover_html(spine))
    to_pdf(p_cov_html, os.path.join(HERE, "표지_인쇄용.pdf"))

    verify(os.path.join(HERE, "본문_인쇄용.pdf"),
           os.path.join(HERE, "표지_인쇄용.pdf"), rep, spine)

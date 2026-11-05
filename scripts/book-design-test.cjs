const assert=require('assert/strict');
const {bookArt,COVER_ART,BAND_ART,SPOT_ART,ART_DEFS}=require('../.test-build/storybook/book-art');
const {bookLook,BOOK_CSS}=require('../.test-build/storybook/book-design');
const {bookDocument}=require('../.test-build/storybook/book-document');
// 같은 책은 언제 열어도 같은 표지여야 한다. 열 때마다 표지가 바뀌면 내 책이 아니다.
const id='3f6a1e2c-0000-4000-8000-0123456789ab';
assert.equal(bookArt(id).cover,bookArt(id).cover);
assert.equal(bookArt(id).band(2),bookArt(id).band(2));
assert.equal(bookLook(id).vars['--bk-cover-ink'],bookLook(id).vars['--bk-cover-ink']);
// 책마다 다른 표지가 돌아가야 한다 — 네 가지가 모두 쓰이는지 본다.
const seen=new Set();for(let i=0;i<400;i++)seen.add(bookArt('book-'+i).coverId);
assert.equal(seen.size,COVER_ART.length);
// 한 책 안에서도 장마다 다른 밴드가 온다.
const art=bookArt(id);assert.notEqual(art.band(0),art.band(1));assert.notEqual(art.spot(0),art.spot(1));
// 그림 목록에 빈 항목이 없고 표지는 전부 색 짝을 가진다.
for(const cover of COVER_ART){assert.ok(cover.art.length>200);assert.ok(cover.label);assert.ok(bookLook('x').vars['--bk-cover-base']);}
for(const band of BAND_ART)assert.ok(band.art.length>120);
for(const spot of SPOT_ART)assert.ok(spot.art.length>60);
console.log('PASS the same book always gets the same cover, every cover is used, chapters differ');
// 필터는 그림이 쓰는 이름과 맞아야 한다. 어긋나면 그림이 민짜로 나온다.
for(const name of ['bk-wc','bk-wc2','bk-pn'])assert.ok(ART_DEFS.includes('id="'+name+'"'));
for(const name of ['bk-wc','bk-wc2','bk-pn'])assert.ok(BOOK_CSS.includes('url(#'+name+')'));
for(const name of ['bk-gSky','bk-gNight','bk-gDawn','bk-gSea'])assert.ok(ART_DEFS.includes('id="'+name+'"'));
const used=COVER_ART.map(c=>c.art).join('');
for(const match of used.match(/url\(#([a-zA-Z-]+)\)/g)||[])assert.ok(ART_DEFS.includes('id="'+match.slice(5,-1)+'"'),'표지가 없는 정의를 가리킨다: '+match);
console.log('PASS art and style agree on every filter and gradient name');
// 내려받은 파일에 표지·밴드·장식과 조판이 실제로 들어간다.
const book={id,title:'제목',chapters:[{title:'하나',text:'첫 이야기'},{title:'둘',text:'둘째 이야기'}],note:'창작',model:'mock',createdAt:''};
const html=bookDocument(book);const look=bookLook(id);
assert.ok(html.includes(look.art.cover));
assert.ok(html.includes(look.art.band(0)));assert.ok(html.includes(look.art.band(1)));
assert.ok(html.includes(look.art.spot(0)));
assert.ok(html.includes(BOOK_CSS));assert.ok(html.includes(ART_DEFS));
assert.ok(html.includes('class="book-cover"'));assert.ok(html.includes('class="book-pages"'));
assert.equal((html.match(/class="book-band"/g)||[]).length,book.chapters.length);
assert.equal((html.match(/<section /g)||[]).length,book.chapters.length);
// 장마다 본문 문단은 정확히 하나 — 인쇄 조판과 자동 검사가 이것을 전제로 한다.
assert.equal((html.match(/<p>/g)||[]).length,book.chapters.length);
assert.ok(html.includes('제 1 장'));assert.ok(html.includes('제 2 장'));
console.log('PASS downloaded file carries the cover, a band per chapter, the ornaments and the layout');

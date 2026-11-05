const assert=require('assert/strict');const {siteClosed,closedPage,CLOSED_HEADERS,CLOSED_BY_CODE}=require('../.test-build/storybook/site-gate');
// 내 PC 작업장은 어떤 경우에도 닫히지 않는다 — 닫아 둔 동안에도 집에서 계속 만들어야 한다.
assert.equal(siteClosed({officeLocal:'1'}),false);
assert.equal(siteClosed({officeLocal:'1',siteOpen:'1'}),false);
// Netlify 에서 SITE_OPEN=1 을 넣으면 코드를 고치지 않고 다시 열린다.
assert.equal(siteClosed({siteOpen:'1'}),false);
assert.equal(siteClosed({officeLocal:'0',siteOpen:'1'}),false);
// 아무 표시가 없는 공개 배포는 CLOSED_BY_CODE 를 따른다.
assert.equal(siteClosed({}),CLOSED_BY_CODE);
assert.equal(siteClosed({officeLocal:'0'}),CLOSED_BY_CODE);
assert.equal(siteClosed({siteOpen:'0'}),CLOSED_BY_CODE);
assert.equal(siteClosed({siteOpen:'true'}),CLOSED_BY_CODE);
console.log('PASS gate opens for the local workshop and for SITE_OPEN=1, follows the code flag otherwise');
const page=closedPage();
assert.ok(page.startsWith('<!doctype html>'));assert.ok(page.includes('lang="ko"'));
assert.ok(page.includes('잠시 문을'));assert.ok(page.includes('낭만한줄'));
// 안내문은 혼자 완성된다 — 바깥으로 나가는 요청이 하나도 없어야 한다.
assert.ok(!/<script|<img|<iframe|<form|<link/.test(page));
assert.ok(!/https?:\/\//.test(page));
assert.ok(page.includes('default-src \'none\''));
// 검색 결과에 안내문이 실리지 않게 한다. 주소 자체는 503 이라 지워지지 않는다.
assert.ok(page.includes('noindex'));
assert.equal(CLOSED_HEADERS['x-robots-tag'],'noindex, nofollow');
assert.equal(CLOSED_HEADERS['cache-control'],'no-store, must-revalidate');
assert.ok(CLOSED_HEADERS['retry-after']);
// 책장을 지우지 않는다는 안내가 반드시 보여야 한다.
assert.ok(page.includes('책장'));
console.log('PASS closed notice is self-contained, unindexed, uncached and says the shelf is kept');

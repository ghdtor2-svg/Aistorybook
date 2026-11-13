// Checks search and answer-engine tags on a running server (no AI calls).
// Usage: npm run build && npx next start -p 3108, then: node scripts/seo-check.cjs http://127.0.0.1:3108
const assert=require('assert/strict');
const origin=(process.argv[2]||'http://127.0.0.1:3108').replace(/\/$/,'');
const site='https://nangman-hanjul.netlify.app';
const get=async(path)=>{const response=await fetch(origin+path);return {status:response.status,type:response.headers.get('content-type')||'',robots:response.headers.get('x-robots-tag'),text:await response.text()};};
const meta=(html,attr,name)=>{const match=html.match(new RegExp('<meta[^>]*'+attr+'="'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"[^>]*content="([^"]*)"'))||html.match(new RegExp('<meta[^>]*content="([^"]*)"[^>]*'+attr+'="'+name+'"'));return match?.[1];};
const decode=text=>text.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
(async()=>{
  const home=await get('/');
  assert.equal(home.status,200);
  const html=home.text;
  assert.match(html,/<html lang="ko"/);
  assert.match(html,/<title>AI 맞춤 동화 만들기 \| 우리 아이 이야기로 만드는 동화 - 낭만한줄<\/title>/);
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,'exactly one h1');
  assert.match(html,/<h2 id="how-title">우리 아이 맞춤 동화는 이렇게 만들어져요<\/h2>/);
  assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1"/);
  assert.match(html,/<img src="\/storybook\/sample\/cover.webp"[^>]*height="933"/);
  assert.match(meta(html,'name','description'),/9,900원/);
  assert.ok(meta(html,'name','keywords').includes('AI 동화'));
  assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],site);
  assert.equal(meta(html,'property','og:image'),site+'/og-image.jpg');
  assert.equal(meta(html,'property','og:locale'),'ko_KR');
  assert.equal(meta(html,'name','twitter:card'),'summary_large_image');
  assert.doesNotMatch(meta(html,'name','robots')||'',/noindex/);
  assert.match(html,/<link rel="icon" href="\/icon.png/);
  assert.equal(meta(html,'name','google-site-verification'),'A9zoQ46J2GSimSzWOo96HFrlrCxOW-smBpY-tzGH7UI');
  assert.equal(meta(html,'name','naver-site-verification'),'7b109a4931cdb0215a2c7c5f4c577b6e13e4bd91');
  // 구조화 데이터: 화면의 질문·답과 FAQPage 가 같은 내용이어야 한다.
  const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const types=ld['@graph'].map(node=>node['@type']);
  assert.deepEqual(types,['Organization','WebSite','Service','FAQPage']);
  const faq=ld['@graph'][3].mainEntity;
  assert.ok(faq.length>=5);
  for(const item of faq){assert.ok(decode(html).includes(item.name),'question not visible: '+item.name);assert.ok(decode(html).includes(item.acceptedAnswer.text),'answer not visible: '+item.name);}
  assert.equal(ld['@graph'][2].offers.price,'9900');
  assert.equal(ld['@graph'][2].audience.audienceType,'아이를 키우는 부모와 가족');
  assert.ok(!/인쇄|배송/.test(JSON.stringify(ld)),'public text must not mention printing or delivery');
  // 동화 만들기 화면
  const book=await get('/storybook');
  assert.equal(book.status,200);
  assert.match(book.text,/<title>동화 만들기 · 내 책장 · 낭만한줄<\/title>/);
  assert.equal(book.text.match(/<link rel="canonical" href="([^"]+)"/)?.[1],site+'/storybook');
  assert.equal(meta(book.text,'property','og:image'),site+'/og-image.jpg');
  // 관리 화면은 검색에서 빠진다.
  const office=await get('/office/orders');
  assert.match(meta(office.text,'name','robots')||'',/noindex/);
  // robots.txt · sitemap.xml · llms.txt · manifest · 이미지
  const robots=await get('/robots.txt');
  assert.equal(robots.status,200);
  assert.match(robots.text,/User-Agent: \*\nAllow: \/\nDisallow: \/office\nDisallow: \/api\//);
  assert.match(robots.text,new RegExp('Sitemap: '+site+'/sitemap.xml'));
  const sitemap=await get('/sitemap.xml');
  assert.equal(sitemap.status,200);
  assert.deepEqual([...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]),[site+'/',site+'/storybook']);
  assert.ok(!sitemap.text.includes('/office'));
  const llms=await get('/llms.txt');
  assert.equal(llms.status,200);
  assert.match(llms.type,/text\/plain/);
  assert.match(llms.text,/^# 낭만한줄\n\n> /);
  for(const item of faq)assert.ok(llms.text.includes('### '+item.name));
  const manifest=JSON.parse((await get('/manifest.webmanifest')).text);
  assert.equal(manifest.name,'낭만한줄');
  for(const path of ['/og-image.jpg','/icon.png','/apple-icon.png']){const response=await fetch(origin+path);assert.equal(response.status,200,path);assert.match(response.headers.get('content-type')||'',/^image\//,path);}
  console.log('PASS seo: title/description/canonical/OG/twitter, JSON-LD (Organization, WebSite, Service, FAQPage = visible FAQ), robots, sitemap, llms.txt, manifest, icons, admin noindex');
})().catch(error=>{console.error(error);process.exitCode=1;});

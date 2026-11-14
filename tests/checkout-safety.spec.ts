import {test,expect,type Page} from '@playwright/test';
import {newProfile,submitAnswer} from '../src/lib/storybook/engine';
import {newPendingRequest,STORY_PENDING_KEY} from '../src/lib/storybook/pending-request';
const orderA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',orderB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const requestA='11111111-1111-4111-8111-111111111111';
const codeA='NG-'+orderA+'.'+'a'.repeat(32),codeB='NG-'+orderB+'.'+'b'.repeat(32);
const book={id:requestA,title:'이탈 후 돌아온 동화',chapters:[{title:'첫 장',text:'친구와 다시 만나 함께 웃었어요.'}],note:'시험 데이터',model:'mock',createdAt:new Date().toISOString()};
function profile(){let p=newProfile();while(p.currentQuestion)p=submitAnswer(p,p.currentQuestion,'',true);return {...p,completionStatus:'confirmed'};}
async function seed(page:Page,options:{code?:string;pending?:string;confirmed?:boolean}={}){
 await page.goto('/');
 await page.evaluate(({options,p,key})=>{localStorage.setItem('ai-office:storybook:v1',JSON.stringify({version:1,profile:p,draft:'',editingId:null}));if(options.pending)localStorage.setItem(key,options.pending);if(options.code)sessionStorage.setItem('nangman:production-code:v1',options.code);},{options,p:options.confirmed?profile():newProfile(),key:STORY_PENDING_KEY});
 await page.goto('/storybook');
}
test.beforeEach(async({page})=>{
 // No real order mutations or AI calls in browser QA.
 await page.route('**/api/office/story*',r=>r.fulfill({status:500,json:{error:'시험에서 지정하지 않은 요청'}}));
 await page.route('**/api/storybook/illustrations*',r=>r.fulfill({json:{bookId:requestA,base:[],alternative:null,busy:false,total:18}}));
});
for(const width of [360,390,1280])test(`production code and checkout fit viewport ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await seed(page,{confirmed:true});
 const input=page.getByRole('textbox',{name:'제작 코드',exact:true});await expect(input).toBeEnabled();await input.scrollIntoViewIfNeeded();
 const box=await input.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(58);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
 expect(await input.evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`work/checkout-${width}.png`});
});
test('manual save survives navigation, reload and closing the tab',async({page,context})=>{
 await seed(page);await page.getByLabel('답변',{exact:true}).fill('엄마와 함께 만든 별빛 이야기');
 await page.getByRole('button',{name:'브라우저에 저장하기',exact:true}).click();await expect(page.getByText('이 브라우저에 저장했어요.',{exact:false})).toBeVisible();
 await page.getByRole('navigation',{name:'서비스 이동'}).getByRole('link',{name:'동화 홈',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3110/');
 await page.goto('/storybook');await expect(page.getByLabel('답변',{exact:true})).toHaveValue('엄마와 함께 만든 별빛 이야기');
 await page.reload();await expect(page.getByLabel('답변',{exact:true})).toHaveValue('엄마와 함께 만든 별빛 이야기');await page.close();
 const returned=await context.newPage();await returned.goto('/storybook');await expect(returned.getByLabel('답변',{exact:true})).toHaveValue('엄마와 함께 만든 별빛 이야기');await expect(returned.getByRole('region',{name:'저장한 이야기 이어 쓰기'})).toBeVisible();
});
test('a quota failure never displays a successful save and preserves the stored draft',async({page})=>{
 await seed(page);await page.getByLabel('답변',{exact:true}).fill('보존할 질문');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:storybook:v1')!).draft)).toBe('보존할 질문');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='ai-office:storybook:v1')throw new DOMException('fixture','QuotaExceededError');return original.call(this,key,value);};});
 await page.getByLabel('답변',{exact:true}).fill('저장 실패한 최신 화면');await expect(page.getByRole('region',{name:'질문 화면 작성본 보관'})).toBeVisible();await page.getByRole('button',{name:'브라우저에 저장하기',exact:true}).click();
 await expect(page.getByText('저장하지 못했어요. 위쪽 저장 오류 안내를 확인하고 작성본 파일을 보관해 주세요.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:storybook:v1')!).draft)).toBe('보존할 질문');
});
test('accepted generation survives tab closure and returns without a second POST',async({page,context})=>{
 let posts=0,completed=false;
 const respond=async(route:import('@playwright/test').Route)=>{if(route.request().method()==='POST'){posts++;return route.fulfill({status:202,json:{requestId:requestA,state:'running'}});}return route.fulfill({json:completed?{state:'completed',book}:{state:'running',requestId:requestA}});};
 await context.route('**/api/office/story*',respond);await page.route('**/api/office/story*',respond);
 await seed(page,{confirmed:true,code:codeA});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'확인한 내용으로 동화 만들기',exact:true}).click();
 await expect.poll(()=>page.evaluate(key=>{const raw=localStorage.getItem(key);return raw&&JSON.parse(raw).id;},STORY_PENDING_KEY)).toBe(requestA);
 await page.close();completed=true;
 const returned=await context.newPage();await returned.goto('/storybook');await returned.getByRole('textbox',{name:'제작 코드',exact:true}).fill(codeA);
 await expect(returned.locator('#current-book-title')).toHaveText(book.title);expect(posts).toBe(1);expect(await returned.evaluate(key=>localStorage.getItem(key),STORY_PENDING_KEY)).toBeNull();
});
test('a lost POST response recovers after reload without resubmitting',async({page})=>{
 let posts=0;
 await page.route('**/api/office/story*',route=>{if(route.request().method()==='POST'){posts++;return route.abort('failed');}return route.fulfill({json:{state:'completed',book}});});
 await seed(page,{confirmed:true,code:codeA});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'확인한 내용으로 동화 만들기',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'자동 재시도하지 않습니다'})).toBeVisible();await page.reload();await expect(page.locator('#current-book-title')).toHaveText(book.title);expect(posts).toBe(1);
});
test('a different code cannot clear or overwrite the original pending order',async({page})=>{
 const receipt=newPendingRequest(requestA,codeA);let posts=0;
 await page.route('**/api/office/story*',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({json:{state:'ready'}});});
 await seed(page,{code:codeB,pending:receipt,confirmed:true});
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'대기 기록 해제',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'기록을 유지했어요'})).toBeVisible();expect(await page.evaluate(key=>localStorage.getItem(key),STORY_PENDING_KEY)).toBe(receipt);expect(posts).toBe(0);
});
test('paused lookup restores its receipt and displays the server reason',async({page})=>{
 let posts=0;await page.route('**/api/office/story*',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({json:{state:'paused',requestId:requestA,error:'시험 중단 사유: 결과를 먼저 확인해 주세요.'}});});
 await seed(page,{code:codeA});await page.getByRole('button',{name:'제작 코드로 내 동화 다시 불러오기',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'시험 중단 사유'})).toHaveText('시험 중단 사유: 결과를 먼저 확인해 주세요.');await expect(page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음',exact:true})).toBeVisible();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).orderId,STORY_PENDING_KEY)).toBe(orderA);expect(posts).toBe(0);
});
test('visibility return checks an existing request without generating',async({page})=>{
 let reads=0,posts=0;await page.route('**/api/office/story*',route=>{if(route.request().method()==='POST')posts++;else reads++;return route.fulfill({json:{state:'running',requestId:requestA}});});
 await seed(page,{code:codeA,pending:newPendingRequest(requestA,codeA)});await expect.poll(()=>reads).toBe(1);await expect(page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음',exact:true})).toBeEnabled();
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect.poll(()=>reads).toBe(2);expect(posts).toBe(0);expect(await page.evaluate(key=>localStorage.getItem(key),STORY_PENDING_KEY)).not.toBeNull();
});
test('generation conditions and final-confirmation shortcut are explained',async({page})=>{
 await seed(page,{confirmed:true});await expect(page.locator('#generation-help')).toContainText('제작 코드 전체');
 await page.getByRole('button',{name:'가격 확인 · 브라우저 저장 · 제작 코드 입력으로 이동',exact:true}).click();await expect(page.locator('#story-checkout')).toBeFocused();
 await page.getByRole('textbox',{name:'제작 코드',exact:true}).fill(codeA);await expect(page.locator('#generation-help')).toContainText('동의');
});
test('failed production availability can be retried on the same page',async({browser})=>{
 const context=await browser.newContext();const page=await context.newPage();let checks=0;
 await context.route('https://storybook.test/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/api/storybook/availability'){checks++;return route.fulfill({json:{ready:checks>1}});}const response=await route.fetch({url:'http://127.0.0.1:3110'+url.pathname+url.search});return route.fulfill({response});});
 await page.goto('https://storybook.test/storybook');const input=page.getByRole('textbox',{name:'제작 코드',exact:true});await expect(input).toBeDisabled();await expect(page.getByRole('button',{name:'연결 다시 확인',exact:true})).toBeEnabled();await page.getByRole('button',{name:'연결 다시 확인',exact:true}).click();await expect(input).toBeEnabled();expect(checks).toBe(2);
 // Scrolling to checkout starts lazy thumbnail requests. Let those proxy handlers
 // finish before disposing their request context; readiness is asserted above.
 await page.waitForLoadState('networkidle');await context.close();
});

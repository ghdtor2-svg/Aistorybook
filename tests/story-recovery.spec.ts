import {test,expect} from '@playwright/test';
const id='12345678-1234-1234-1234-123456789abc';
const book={id,title:'복구한 동화',chapters:[{title:'첫 장',text:'서버에 남아 있던 이야기입니다.'}],note:'창작',model:'mock',createdAt:new Date().toISOString()};
// 2026-11-07부터 동화 생성에는 제작 코드가 필요하다. 서버 응답은 모두 가짜(route)라 실제 주문·AI 호출이 없다.
test('lost generation response survives reload and recovers without another POST',async({page})=>{
 let posts=0,reads=0;
 await page.route('**/api/office/story*',route=>{if(route.request().method()==='POST'){posts++;return route.abort('failed');}reads++;return route.fulfill({json:{state:'completed',book}});});
 await page.goto('/storybook');await page.getByRole('button',{name:'이 질문 건너뛰기',exact:true}).waitFor();for(let i=0;i<15;i++){const skip=page.getByRole('button',{name:'이 질문 건너뛰기',exact:true});if(!await skip.count())break;await skip.click();}
 await page.getByRole('button',{name:'내용 최종 확인',exact:true}).click();await page.getByRole('textbox',{name:'제작 코드'}).fill('NG-'+id+'.recovery-test-code');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();
 await expect(page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'})).toBeVisible();expect(posts).toBe(1);
 await page.reload();await expect(page.getByRole('button',{name:'확인한 내용으로 동화 만들기'})).toBeDisabled();
 await page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'}).click();await expect(page.getByRole('heading',{name:'복구한 동화'})).toBeVisible();expect(posts).toBe(1);expect(reads).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'))).toBeNull();
});
test('running or unknown receipt cannot trigger automatic regeneration or overwrite edits',async({page})=>{
 await page.addInitScript(({id,book})=>{if(window.top!==window)return;localStorage.setItem('ai-office:story-request:v1',id);localStorage.setItem('ai-office:books:v1',JSON.stringify([{...book,title:'내가 수정한 제목'}]));},{id,book});
 let posts=0;await page.route('**/api/office/story*',r=>{if(r.request().method()==='POST')posts++;return r.fulfill({json:{state:'completed',book}});});await page.goto('/storybook');await page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'}).click();await expect(page.getByRole('heading',{name:'내가 수정한 제목'})).toBeVisible();expect(posts).toBe(0);const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')!));expect(stored).toHaveLength(1);expect(stored[0].title).toBe('내가 수정한 제목');
});
test('running receipt remains pending with no new generation',async({page})=>{
 await page.addInitScript(id=>{if(window.top===window)localStorage.setItem('ai-office:story-request:v1',id);},id);let posts=0;await page.route('**/api/office/story*',r=>{if(r.request().method()==='POST')posts++;return r.fulfill({json:{state:'running'}});});await page.goto('/storybook');await page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'}).click();await expect(page.getByRole('alert').filter({hasText:'새 생성은 실행하지 않습니다'})).toContainText('새 생성은 실행하지 않습니다');expect(posts).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'))).toBe(id);
});


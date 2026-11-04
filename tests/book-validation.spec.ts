import {test,expect} from '@playwright/test';
const id='12345678-1234-1234-1234-123456789abc';const book={id:'existing',title:'보존할 동화',chapters:[{title:'장',text:'수정해 둔 내용'}],note:'',model:'mock',createdAt:''};
test('wrong recovery ID keeps existing shelf and pending request unchanged',async({page})=>{
 await page.addInitScript(({id,book})=>{if(window.top!==window)return;localStorage.setItem('ai-office:story-request:v1',id);localStorage.setItem('ai-office:books:v1',JSON.stringify([book]));},{id,book});
 await page.route('**/api/office/story*',r=>r.fulfill({json:{state:'completed',book:{...book,id:'wrong-id'}}}));await page.goto('/storybook');await page.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'}).click();await expect(page.getByRole('alert').filter({hasText:'요청과 일치하지'})).toBeVisible();await expect(page.getByRole('heading',{name:'보존할 동화'})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'))).toBe(id);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')!))).toEqual([book]);
});
test('malformed shelf cannot crash the page or be overwritten',async({page})=>{
 const raw=JSON.stringify([{...book,chapters:[null]}]);await page.addInitScript(raw=>{if(window.top===window)localStorage.setItem('ai-office:books:v1',raw);},raw);let crashed=false;page.on('pageerror',()=>{crashed=true;});await page.goto('/storybook');await expect(page.getByRole('alert').filter({hasText:'원본은 보존'})).toBeVisible();await expect(page.getByRole('button',{name:'확인한 내용으로 동화 만들기'})).toBeDisabled();expect(await page.evaluate(()=>localStorage.getItem('ai-office:books:v1'))).toBe(raw);expect(crashed).toBe(false);
});

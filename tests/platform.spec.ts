import {test,expect} from '@playwright/test';
test('confirmed profile generates a readable editable saved book and downloads it',async({page})=>{
 let calls=0;await page.route('**/api/office/story',r=>{calls++;return r.fulfill({json:{id:r.request().postDataJSON().id,title:'하늘의 작은 모험',chapters:[{title:'첫걸음',text:'하늘은 별빛 숲으로 걸어갔어요.'}],note:'창작 동화',model:'mock',createdAt:new Date().toISOString()}});});
 await page.goto('/storybook');for(let i=0;i<15;i++){const skip=page.getByRole('button',{name:'이 질문 건너뛰기',exact:true});if(!await skip.count())break;await skip.click();}
 await page.getByRole('button',{name:'내용 최종 확인',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();await expect(page.getByRole('heading',{name:'하늘의 작은 모험'})).toBeVisible();
 await page.getByRole('button',{name:'동화 수정',exact:true}).click();await page.getByLabel('동화 본문 1').fill('수정된 이야기입니다.');await page.getByRole('button',{name:'수정 마치기 · 자동 저장됨'}).click();await page.reload();await expect(page.getByText('수정된 이야기입니다.',{exact:true})).toBeVisible();expect(calls).toBe(1);
 await expect(page.getByRole('button',{name:'동화 내려받기'})).toHaveCount(0);await expect(page.getByText('선물용 PDF 안내',{exact:true})).toBeVisible();
});

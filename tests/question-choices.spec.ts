import {test,expect} from '@playwright/test';
const key='ai-office:storybook:v1';
test('choices fill the answer, direct input adds, pressing again removes',async({page})=>{
 await page.goto('/storybook');
 await expect(page.getByRole('heading',{name:'누구에게 선물할 동화인가요?'})).toBeVisible();
 const field=page.getByLabel('답변',{exact:true});
 await page.getByRole('button',{name:'딸',exact:true}).click();
 await expect(field).toHaveValue('딸');
 await expect(page.getByRole('button',{name:'딸',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'✏️ 직접 입력'}).first().click();
 await page.getByLabel('누구에게 주는 동화인가요? · 직접 입력').fill('둘째 하린');
 await page.getByRole('button',{name:'추가',exact:true}).click();
 await expect(field).toHaveValue('딸, 둘째 하린');
 await expect(page.getByLabel('누구에게 주는 동화인가요? · 직접 입력')).toHaveCount(0);
 await page.getByRole('button',{name:'딸',exact:true}).click();
 await expect(field).toHaveValue('둘째 하린');
 await expect(page.getByRole('button',{name:'딸',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.reload();
 await expect(page.getByLabel('답변',{exact:true})).toHaveValue('둘째 하린');
 await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect(page.getByRole('heading',{name:'동화의 주인공은 누구로 할까요?'})).toBeVisible();
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.recipient,key)).toBe('둘째 하린');
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.evaluate(()=>document.body.clientWidth));
});
test('the real memory question is answered by writing, with no choices',async({page})=>{
 await page.goto('/storybook');
 await page.getByRole('button',{name:'딸',exact:true}).click();
 await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await page.getByRole('button',{name:'이 질문 건너뛰기',exact:true}).click();
 const memory=page.getByRole('heading',{name:'가장 기억에 남는 순간은 무엇인가요?'});
 await expect(memory).toBeVisible();
 await expect(page.getByRole('button',{name:'✏️ 직접 입력'})).toHaveCount(0);
 await expect(page.getByLabel('답변',{exact:true})).toBeVisible();
 await page.getByLabel('답변',{exact:true}).fill('바닷가에서 처음 혼자 파도를 넘은 날이에요.');
 await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.memorableEvent,key)).toBe('바닷가에서 처음 혼자 파도를 넘은 날이에요.');
});
test('nine planning topics are listed, closed, and open one at a time without blocking confirmation',async({page})=>{
 await page.goto('/storybook');
 for(let i=0;i<5;i++)await page.getByRole('button',{name:'이 질문 건너뛰기'}).click();
 await expect(page.getByRole('heading',{name:'이야기의 씨앗을 모았어요'})).toBeVisible();
 const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'더 들려주고 싶은 게 있나요?'})}).last();
 const rows=panel.locator('ul > li > details');
 await expect(rows).toHaveCount(9);
 // 제목은 전부 보이고, 내용은 전부 닫혀 있다
 for(const title of ['읽는 아이와 이야기의 목소리','목표와 가로막는 일','반드시 지킬 것과 피할 것'])await expect(panel.getByText(title,{exact:true}).first()).toBeVisible();
 expect(await rows.evaluateAll(list=>list.filter(d=>(d as HTMLDetailsElement).open).length)).toBe(0);
 // 열지 않아도 바로 최종 확인할 수 있다
 await expect(page.getByRole('button',{name:'내용 최종 확인',exact:true})).toBeEnabled();
 const world=panel.locator('summary').filter({hasText:'이야기 세계와 약속'});
 await world.click();
 await page.getByRole('button',{name:'숲속',exact:true}).click();
 await page.getByRole('button',{name:'겨울',exact:true}).click();
 await expect(page.getByText('지금 1가지 들려줬어요 · 더 안 해도 괜찮아요')).toBeVisible();
 await expect(world).toContainText('숲속, 겨울');
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.evaluate(()=>document.body.clientWidth));
 // 보기 없는 질문은 펼치면 바로 쓰는 칸이 나온다
 const hero=panel.locator('summary').filter({hasText:'주인공이 직접 내리는 선택'});
 await hero.click();
 await expect(page.getByLabel('주인공이 직접 내리는 선택',{exact:true})).toBeVisible();
 await world.click();
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.storyDesign.worldRules,key)).toBe('숲속, 겨울');
 await page.getByRole('button',{name:'내용 최종 확인',exact:true}).click();
 await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.completionStatus,key)).toBe('confirmed');
 await page.reload();
 await expect(panel.locator('summary').filter({hasText:'이야기 세계와 약속'})).toContainText('숲속, 겨울');
});

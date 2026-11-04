import {test,expect} from '@playwright/test';
const key='ai-office:storybook:v1';
test('answer, conditional followup, previous edit, refresh and deletion',async({page})=>{
 await page.goto('/storybook');
 await expect(page.getByRole('heading',{name:'누구에게 선물할 동화인가요?'})).toBeVisible();
 await page.getByLabel('답변',{exact:true}).fill('우리 딸');
 await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect(page.getByRole('heading',{name:'동화의 주인공은 누구로 할까요?'})).toBeVisible();
 await page.getByLabel('답변',{exact:true}).fill('작성 중인 별칭');await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).draft,key)).toBe('작성 중인 별칭');
 await page.reload();
 await expect(page.getByLabel('답변',{exact:true})).toHaveValue('작성 중인 별칭');
 await page.getByRole('button',{name:'이전 질문',exact:true}).click();
 await expect(page.getByLabel('답변',{exact:true})).toHaveValue('우리 딸');
 await page.getByLabel('답변',{exact:true}).fill('선물 대상: 엄마; 주인공: 엄마; 관계: 모녀');
 await page.getByRole('button',{name:'수정 저장하고 계속'}).click();
 await expect(page.getByRole('heading',{name:'가장 기억에 남는 순간은 무엇인가요?'})).toBeVisible();
 await page.getByRole('button',{name:'이 질문 건너뛰기'}).click();
 await expect(page.getByRole('heading',{name:'그 순간 어떤 마음이 들었나요?'})).toBeVisible();
 await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.answers.length,key)).toBe(2);const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
 expect(stored.profile.recipient).toBe('엄마');expect(stored.profile.answers).toHaveLength(2);
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.evaluate(()=>document.body.clientWidth));
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'저장 내용 삭제',exact:true}).click();
 await expect(page.getByText('작성 내용이 없습니다.')).toBeVisible();
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await page.reload();await expect(page.getByRole('heading',{name:'누구에게 선물할 동화인가요?'})).toBeVisible();
});
test('skip to summary, revise, confirm, restore, reset',async({page})=>{
 await page.goto('/storybook');
 for(let i=0;i<5;i++)await page.getByRole('button',{name:'이 질문 건너뛰기'}).click();
 await expect(page.getByRole('heading',{name:'이야기의 씨앗을 모았어요'})).toBeVisible();
 await expect(page.getByLabel('핵심 정보 수집 진행률 100%')).toHaveAttribute('value','100');
 await page.getByLabel('선물 대상',{exact:true}).fill('할머니');
 await page.getByLabel('동화적으로 각색해도 좋은 요소 (선택)').fill('달빛 숲 배경');
 await page.getByRole('button',{name:'내용 최종 확인',exact:true}).click();
 await expect(page.getByRole('button',{name:'내용 최종 확인',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'확인한 내용으로 동화 만들기'})).toBeDisabled();
 await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.completionStatus,key)).toBe('confirmed');await page.reload();await expect(page.getByLabel('선물 대상',{exact:true})).toHaveValue('할머니');
 await expect(page.getByLabel('동화적으로 각색해도 좋은 요소 (선택)')).toHaveValue('달빛 숲 배경');
 await page.getByLabel('전하고 싶은 마음',{exact:true}).fill('사랑합니다');
 await expect(page.getByRole('button',{name:'내용 최종 확인',exact:true})).toBeEnabled();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'처음부터 다시 작성'}).click();
 await expect(page.getByLabel('답변',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('핵심 정보 수집 진행률 0%')).toHaveAttribute('value','0');
});
test('earlier structured answer suppresses repeated cores and editing invalidates summary',async({page})=>{
 await page.goto('/storybook');await page.getByLabel('답변',{exact:true}).fill('선물 대상: 지민; 주인공: 지민이; 관계: 부모와 딸; 사건: 작년 여름 바다에서 함께 모래성을 만들며 웃었던 날; 감정: 정말 행복하고 뿌듯했어요; 특징: 늘 노란 장화를 신고 콧노래를 부르는 모습; 메시지: 언제나 네 편이고 사랑한다는 마음');
 await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect(page.getByRole('heading',{name:'이야기의 씨앗을 모았어요'})).toBeVisible();
 await page.getByRole('button',{name:'답변 1 수정',exact:true}).click();
 await page.getByLabel('답변',{exact:true}).fill('선물 대상: 친구; 주인공: 친구; 관계: 동창');
 await page.getByRole('button',{name:'수정 저장하고 계속'}).click();
 await expect(page.getByRole('heading',{name:'가장 기억에 남는 순간은 무엇인가요?'})).toBeVisible();
 await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.emotions,key)).toBe('');
});
test('question budget is bounded in the browser and no external calls occur',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))external.push(r.url());});
 await page.goto('/storybook');
 for(let i=0;i<15;i++){
  await page.getByLabel('답변',{exact:true}).fill('가');await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'이야기의 씨앗을 모았어요'})).toBeVisible();
 await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).profile.answers.length,key)).toBe(15);expect(external).toEqual([]);await page.screenshot({path:'test-results/storybook-mobile-summary.png',fullPage:true});
});


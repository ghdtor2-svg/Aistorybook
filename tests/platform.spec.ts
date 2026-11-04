import {test,expect} from '@playwright/test';
test('confirmed profile generates a readable editable saved book and downloads it',async({page})=>{
 let calls=0;await page.route('**/api/office/story',r=>{calls++;return r.fulfill({json:{id:r.request().postDataJSON().id,title:'하늘의 작은 모험',chapters:[{title:'첫걸음',text:'하늘은 별빛 숲으로 걸어갔어요.'}],note:'창작 동화',model:'mock',createdAt:new Date().toISOString()}});});
 await page.goto('/storybook');for(let i=0;i<15;i++){const skip=page.getByRole('button',{name:'이 질문 건너뛰기',exact:true});if(!await skip.count())break;await skip.click();}
 await page.getByRole('button',{name:'내용 최종 확인',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();await expect(page.getByRole('heading',{name:'하늘의 작은 모험'})).toBeVisible();
 await page.getByRole('button',{name:'동화 수정',exact:true}).click();await page.getByLabel('동화 본문 1').fill('수정된 이야기입니다.');await page.getByRole('button',{name:'수정 마치기 · 자동 저장됨'}).click();await page.reload();await expect(page.getByText('수정된 이야기입니다.',{exact:true})).toBeVisible();expect(calls).toBe(1);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'동화 내려받기'}).click();expect((await download).suggestedFilename()).toBe('my-story.txt');
});
test('chat command is persisted and can be handed to GPT without changing existing story data',async({page})=>{
 await page.goto('/office');await page.getByLabel('직원에게 세부 지시').fill('모바일 읽기 화면 개선');await page.getByRole('button',{name:'지시 저장',exact:true}).click();await expect(page.getByRole('log')).toContainText('모바일 읽기 화면 개선');await page.reload();await expect(page.getByRole('log')).toContainText('모바일 읽기 화면 개선');await expect(page.getByRole('button',{name:'저장한 지시로 GPT 협업 시작'})).toBeVisible();
});

test('three collaboration rounds stop at twelve calls and preserve all rounds',async({page})=>{
 const {beginStep,currentRun,finishStep}=await import('../src/lib/office/model');let calls=0;
 await page.route('**/api/office/subscription',async route=>{if(route.request().method()==='GET')return route.fulfill({json:{authenticated:true,firstRunApproved:true,localAuthAvailable:true}});calls++;let task=beginStep(route.request().postDataJSON().task,'subscription');const step=currentRun(task).steps.find(s=>s.status==='running')!;task=finishStep(task,{id:crypto.randomUUID(),agentId:step.agentId,kind:'review',summary:'검토 결과',items:['다음 회차에는 모바일 화면을 개선하세요.'],assumptions:[],simulation:false,createdAt:new Date().toISOString()});return route.fulfill({json:{task}});});
 page.on('dialog',d=>d.accept());await page.goto('/office');await page.getByRole('button',{name:'플랫폼 목표로 3회차 연속 협업'}).click();await expect(page.getByText('연속 협업을 마쳤습니다.',{exact:false})).toBeVisible();expect(calls).toBe(12);const tasks=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!).tasks);expect(tasks).toHaveLength(3);expect(tasks.every((t:any)=>t.status==='awaiting_approval')).toBe(true);expect(tasks[0].brief).toContain('모바일 화면');
});

import {test,expect,type Page} from '@playwright/test';
import {beginStep,currentRun,finishStep,failStep,type Task} from '../src/lib/office/model';

async function setup(page:Page,respond:(task:Task)=>Promise<Task>){
 await page.route('**/api/office/subscription',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{localAuthAvailable:true,authenticated:true,firstRunApproved:true,paidApiEnabled:false,research:'codex'}});
  const task=route.request().postDataJSON().task as Task;
  await route.fulfill({json:{task:await respond(task)}});
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/office');
 await page.getByLabel('실행 모드',{exact:true}).selectOption('subscription');
 await page.getByLabel('대표 업무 지시',{exact:true}).fill('자동 실행 회귀 검증용 개발 업무');
 await page.getByRole('button',{name:'업무 등록',exact:true}).click();
}
function complete(task:Task){
 const started=beginStep(task,'subscription');const next=currentRun(started).steps.find(s=>s.status==='running')!;
 return finishStep(started,{id:crypto.randomUUID(),agentId:next.agentId,kind:'requirements',summary:next.agentId+' 자동화 모의 결과',items:['검증용 텍스트'],assumptions:['실제 모델 호출 없음'],simulation:false,createdAt:new Date().toISOString(),service:{provider:'codex',product:'ChatGPT / Codex',authMode:'chatgpt',billingMode:'subscription',model:'mock',receiptId:next.id}});
}
test('one start hands off all steps, renders results and waits for owner; reload does not restart',async({page})=>{
 const calls:string[]=[];
 await setup(page,async task=>{calls.push(currentRun(task).steps.find(s=>s.status==='pending')!.agentId);return complete(task);});
 await page.getByRole('button',{name:'자동 실행 시작 · GPT',exact:true}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 expect(calls).toEqual(['research','developer','marketing','quality']);
 await expect(page.locator('.office-step').getByText('quality 자동화 모의 결과',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'대표 승인',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();expect(calls).toHaveLength(4);
});
test('failure preserves the first result and does not invoke the following role',async({page})=>{
 let calls=0;await setup(page,async task=>++calls===1?complete(task):failStep(beginStep(task,'subscription'),'모의 한도 차단'));
 await page.getByRole('button',{name:'자동 실행 시작 · GPT',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'직원 실행이 중단'})).toBeVisible();
 expect(calls).toBe(2);await expect(page.locator('.office-step').getByText('research 자동화 모의 결과',{exact:true})).toBeVisible();await expect(page.locator('.office-step').getByText('quality 자동화 모의 결과',{exact:true})).toHaveCount(0);
});
test('pause waits for the current result, then explicit resume skips the completed step',async({page})=>{
 let release!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;});let calls=0;
 await setup(page,async task=>{calls++;if(calls===1)await waiting;return complete(task);});
 await page.getByRole('button',{name:'자동 실행 시작 · GPT',exact:true}).click();
 await expect.poll(()=>calls).toBe(1);
 await page.getByRole('button',{name:'현재 직원 완료 후 일시정지',exact:true}).click();release();
 await expect(page.getByText('현재 직원의 결과를 저장하고 일시정지했습니다.',{exact:false})).toBeVisible();expect(calls).toBe(1);
 await page.getByRole('button',{name:'자동 실행 시작 · GPT',exact:true}).click();await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();expect(calls).toBe(4);
});
test('declining the single subscription confirmation sends no work request',async({page})=>{
 let calls=0;await setup(page,async task=>{calls++;return complete(task);});
 page.removeAllListeners('dialog');page.on('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'자동 실행 시작 · GPT',exact:true}).click();
 await expect(page.getByRole('button',{name:'자동 실행 시작 · GPT',exact:true})).toBeEnabled();expect(calls).toBe(0);
});

test('simple command registers and starts all four GPT roles with each previous output',async({page})=>{
 const calls:Task[]=[];
 await setup(page,async task=>{calls.push(task);return complete(task);});
 // A pre-existing selected task must not be executed by new registration.
 await page.getByLabel('대표 업무 지시',{exact:true}).fill('동화 서비스 출시 준비해 줘');
 await page.getByRole('button',{name:'등록하고 GPT 협업 시작',exact:true}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 expect(calls).toHaveLength(4);
 expect(new Set(calls.map(t=>t.id)).size).toBe(1);
 expect(calls.every(t=>t.brief==='동화 서비스 출시 준비해 줘')).toBe(true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!));
 const steps=currentRun(saved.tasks[0]).steps;
 expect(steps.map(s=>s.agentId)).toEqual(['research','developer','marketing','quality']);
 for(let i=0;i<4;i++)expect(steps[i].input!.upstream).toEqual(steps.slice(0,i).map(s=>s.output));
 expect(saved.tasks[1].status).toBe('queued');
 await page.reload();expect(calls).toHaveLength(4);
});
test('new GPT command without local authentication cannot silently become demo',async({page})=>{
 let calls=0;
 await page.route('**/api/office/subscription',async route=>{if(route.request().method()==='POST')calls++;await route.fulfill({json:{localAuthAvailable:true,authenticated:false,firstRunApproved:true}});});
 await page.goto('/office');await page.getByLabel('대표 업무 지시',{exact:true}).fill('서비스 출시 준비');
 await page.getByRole('button',{name:'등록하고 GPT 협업 시작',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'로컬 인증'})).toBeVisible();expect(calls).toBe(0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!));expect(saved.tasks).toHaveLength(0);
});
test('recover lost response reads stored results without calling another employee',async({page})=>{
 let stored:Task|undefined;let calls=0;
 await setup(page,async task=>{calls++;stored=complete(task);return stored;});
 // Simulate the server having finished a step whose response the browser lost.
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!));stored=complete(saved.tasks[0]);
 await page.route('**/api/office/subscription',async route=>{
  const body=route.request().postDataJSON();expect(body.action).toBe('recover');
  await route.fulfill({json:{state:'completed',task:stored}});
 });
 await page.getByRole('button',{name:'서버 결과 확인·복구 · 새 호출 없음'}).click();
 await expect(page.getByText('서버에 저장된 결과를 복구했습니다.',{exact:false})).toBeVisible();
 await expect(page.locator('.office-step').getByText('research 자동화 모의 결과',{exact:true})).toBeVisible();expect(calls).toBe(0);
});

test('legacy demo can start a new four-role GPT task without overwriting its results',async({page})=>{
 const calls:Task[]=[];await setup(page,async task=>{calls.push(task);return complete(task);});
 await page.getByLabel('실행 모드',{exact:true}).selectOption('demo');
 await page.getByRole('button',{name:'자동 실행 시작 · 데모',exact:true}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!).tasks[0]);
 await page.getByRole('button',{name:'이 지시로 네 직원 GPT 협업 새로 시작',exact:true}).click();
 await expect(page.locator('.office-step').getByText('quality 자동화 모의 결과',{exact:true})).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!).tasks);
 expect(saved[1]).toEqual(original);expect(saved[0].id).not.toBe(original.id);expect(saved[0].brief).toBe(original.brief);expect(calls).toHaveLength(4);
});

test('a stalled employee request releases the screen and recovers without running the next employee', async ({page}) => {
 await page.clock.install();
 await setup(page, async task => complete(task));
 const actions: string[] = [];
 let completed: Task | undefined;
 await page.route('**/api/office/subscription', async route => {
  if (route.request().method() === 'GET') return route.fallback();
  const body = route.request().postDataJSON();
  actions.push(body.action);
  if (body.action === 'run') {
   completed = complete(body.task);
   return; // Keep the browser request pending until its deadline.
  }
  expect(body.action).toBe('recover');
  await route.fulfill({json: {state: 'completed', task: completed}});
 });
 await page.getByRole('button', {name: '자동 실행 시작 · GPT', exact: true}).click();
 await expect.poll(() => actions.length).toBe(1);
 await page.clock.fastForward(300_001);
 await expect(page.getByText(/서버 응답 대기가 끝났습니다.*결과 확인·복구/)).toBeVisible();
 expect(actions).toEqual(['run']);
 await page.getByRole('button', {name: '서버 결과 확인·복구 · 새 호출 없음'}).click();
 await expect(page.getByText(/서버에 저장된 결과를 복구했습니다/)).toBeVisible();
 expect(actions).toEqual(['run', 'recover']);
});

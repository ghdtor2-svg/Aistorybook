import {test,expect} from '@playwright/test';
const first='첫 번째 지시 '+ '가'.repeat(1990),second='두 번째 지시 '+ '나'.repeat(1990);
const messages=[{id:'one',text:first,at:'2026-11-03T00:00:00Z'},{id:'two',text:second,at:'2026-11-03T00:00:01Z'}];
async function setup(page:any){await page.addInitScript(messages=>{if(window.top===window&&!localStorage.getItem('ai-office:chat:project'))localStorage.setItem('ai-office:chat:project',JSON.stringify(messages));},messages);let calls=0;await page.route('**/api/office/subscription',r=>{if(r.request().method()==='POST')calls++;return r.fulfill({json:{authenticated:true,firstRunApproved:true,localAuthAvailable:true}});});page.on('dialog',d=>d.dismiss());await page.goto('/office');return ()=>calls;}
test('long instructions can be selected without truncation and unselected text remains available',async({page})=>{
 const calls=await setup(page);await expect(page.getByRole('button',{name:'저장한 지시로 GPT 협업 시작'})).toBeDisabled();await page.getByRole('checkbox',{name:/지시 선택: 두 번째/}).uncheck();await expect(page.getByText(/선택 1건 · 보류 1건/)).toBeVisible();await page.getByRole('button',{name:'저장한 지시로 GPT 협업 시작'}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!).tasks.length)).toBe(1);const tasks=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!).tasks);expect(tasks).toHaveLength(1);expect(tasks[0].brief).toContain(first);expect(tasks[0].brief).not.toContain(second);expect(calls()).toBe(0);
 await page.getByRole('button',{name:'프로젝트 공통 지시',exact:true}).click();await expect(page.getByRole('checkbox',{name:/지시 선택: 두 번째/})).toBeVisible();const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:chat:project')!));expect(stored[0].taskId).toBe(tasks[0].id);expect(stored[1].taskId).toBeUndefined();expect(stored[1].text).toBe(second);
 await page.reload();await page.getByRole('button',{name:'프로젝트 공통 지시',exact:true}).click();await expect(page.getByRole('checkbox',{name:/지시 선택: 두 번째/})).toBeVisible();await page.getByRole('checkbox',{name:'기존 업무 목표 함께 전달',exact:true}).uncheck();await expect(page.getByRole('button',{name:'저장한 지시로 GPT 협업 시작'})).toBeEnabled();
});
test('zero selected instructions cannot register work and selection never deletes pending messages',async({page})=>{
 const calls=await setup(page);await page.getByRole('checkbox',{name:/지시 선택: 첫 번째/}).uncheck();await page.getByRole('checkbox',{name:/지시 선택: 두 번째/}).uncheck();await expect(page.getByText(/선택 0건 · 보류 2건/)).toBeVisible();await expect(page.getByRole('button',{name:'저장한 지시로 GPT 협업 시작'})).toBeDisabled();expect(calls()).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:chat:project')!))).toEqual(messages);
});


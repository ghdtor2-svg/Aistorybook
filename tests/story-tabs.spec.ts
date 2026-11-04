import {test,expect} from '@playwright/test';
import {newProfile,submitAnswer} from '../src/lib/storybook/engine';
function confirmed(){let profile=newProfile();while(profile.currentQuestion)profile=submitAnswer(profile,profile.currentQuestion,'',true);return {...profile,completionStatus:'confirmed'};}
async function prepare(context:any){await context.addInitScript(profile=>{if(window.top===window)localStorage.setItem('ai-office:storybook:v1',JSON.stringify({version:1,profile,draft:'',editingId:null}));},confirmed());const a=await context.newPage(),b=await context.newPage();await a.goto('/storybook');await b.goto('/storybook');await a.getByRole('checkbox').check();await b.getByRole('checkbox').check();return {a,b};}
test('another tab holding the generation lock blocks POST even before a pending ID is written',async({context})=>{
 let calls=0;await context.route('**/api/office/story',async route=>{calls++;const {id}=route.request().postDataJSON();await route.fulfill({json:{id,title:'한 번만 생성된 동화',chapters:[{title:'시작',text:'함께 읽는 이야기'}],note:'창작',model:'mock',createdAt:new Date().toISOString()}});});
 const {a,b}=await prepare(context);
 // Reproduce the race window after lock acquisition but before localStorage is written.
 await a.evaluate(()=>new Promise<void>(resolve=>{void navigator.locks.request('ai-office:story-generation:v1',async()=>{resolve();await new Promise<void>(release=>{(window as any).releaseStoryLock=release;});});}));
 try{await b.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();await expect(b.getByRole('alert').filter({hasText:'다른 탭에서 동화를 생성 중'})).toBeVisible();expect(calls).toBe(0);expect(await b.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'))).toBeNull();}
 finally{await a.evaluate(()=>(window as any).releaseStoryLock());}
 await b.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();await expect(b.getByRole('heading',{name:'한 번만 생성된 동화'})).toBeVisible();expect(calls).toBe(1);
});
test('pending receipt syncs across tabs and remains protected after failed response',async({context})=>{
 let calls=0;await context.route('**/api/office/story',route=>{calls++;return route.abort();});const {a,b}=await prepare(context);await a.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();await expect(b.getByRole('button',{name:'확인한 내용으로 동화 만들기'})).toBeDisabled();await expect(b.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'})).toBeVisible();expect(calls).toBe(1);
 const first=await a.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'));expect(await b.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'))).toBe(first);
});


test('a second tab cannot clear a pending receipt while generation holds the lock',async({context})=>{
 let release!:()=>void;
 const responseGate=new Promise<void>(resolve=>{release=resolve;});
 await context.route('**/api/office/story',async route=>{await responseGate;await route.abort();});
 const {a,b}=await prepare(context);
 await a.getByRole('button',{name:'확인한 내용으로 동화 만들기'}).click();
 const clear=b.getByRole('button',{name:'대기 기록 해제'});
 await expect(clear).toBeVisible();
 b.on('dialog',dialog=>dialog.accept());
 try{
  await clear.click();
  await expect(b.getByRole('alert').filter({hasText:'대기 기록을 유지했습니다'})).toBeVisible();
  await expect(b.getByRole('button',{name:'확인한 내용으로 동화 만들기'})).toBeDisabled();
 }finally{release();}
 await expect(a.getByRole('alert').filter({hasText:'자동 재시도하지 않습니다'})).toBeVisible();
 await clear.click();
 await expect(clear).toHaveCount(0);
});

test('a recovery keeps its pending receipt protected until the lookup finishes',async({context})=>{
 const {a,b}=await prepare(context);
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 await a.evaluate(value=>localStorage.setItem('ai-office:story-request:v1',value),id);
 await a.reload();
 let release!:()=>void;
 const responseGate=new Promise<void>(resolve=>{release=resolve;});
 await context.route('**/api/office/story?id=*',async route=>{
  await responseGate;
  await route.fulfill({json:{state:'completed',book:{id,title:'복구한 동화',chapters:[{title:'시작',text:'함께 읽는 이야기'}],note:'창작',model:'mock',createdAt:new Date().toISOString()}}});
 });
 const lookup=a.waitForRequest('**/api/office/story?id=*');
 await a.getByRole('button',{name:'생성 결과 확인·복구 · 새 생성 없음'}).click();
 await lookup;
 b.on('dialog',dialog=>dialog.accept());
 try{
  await b.getByRole('button',{name:'대기 기록 해제'}).click();
  await expect(b.getByRole('alert').filter({hasText:'대기 기록을 유지했습니다'})).toBeVisible();
  expect(await b.evaluate(()=>localStorage.getItem('ai-office:story-request:v1'))).toBe(id);
 }finally{release();}
 await expect(a.getByRole('heading',{name:'복구한 동화'})).toBeVisible();
 await expect(b.getByRole('button',{name:'대기 기록 해제'})).toHaveCount(0);
});

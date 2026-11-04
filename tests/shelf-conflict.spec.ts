import {test,expect} from '@playwright/test';
const book={id:'shelf-test',title:'원래 동화',chapters:[{title:'장',text:'원래 본문'}],note:'',model:'mock',createdAt:''};
async function setup(context:any){await context.addInitScript(book=>{if(window.top===window&&!localStorage.getItem('ai-office:books:v1'))localStorage.setItem('ai-office:books:v1',JSON.stringify([book]));},book);const a=await context.newPage(),b=await context.newPage();await a.goto('/storybook');await b.goto('/storybook');return {a,b};}
test('same book editing conflict preserves the stored copy and the local draft for download',async({context})=>{
 const {a,b}=await setup(context);await a.getByRole('button',{name:'동화 수정',exact:true}).click();await b.getByRole('button',{name:'동화 수정',exact:true}).click();
 await b.getByLabel('동화 제목 수정').fill('다른 탭이 저장한 제목');await expect.poll(()=>b.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')!)[0].title)).toBe('다른 탭이 저장한 제목');
 await a.getByLabel('동화 본문 1').fill('이 탭에서 쓴 수정본');await expect(a.getByRole('alert').filter({hasText:'다른 탭에서 이 동화를 변경'})).toBeVisible();await expect(a.getByLabel('동화 본문 1')).toHaveValue('이 탭에서 쓴 수정본');
 const stored=await a.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')!));expect(stored[0].title).toBe('다른 탭이 저장한 제목');expect(stored[0].chapters[0].text).toBe('원래 본문');
 const downloading=a.waitForEvent('download');await a.getByRole('button',{name:'동화 내려받기'}).click();const stream=await (await downloading).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);expect(Buffer.concat(chunks).toString()).toContain('이 탭에서 쓴 수정본');
 a.on('dialog',d=>d.accept());await a.getByRole('button',{name:'최신 책장 불러오기'}).click();await expect(a.getByRole('heading',{name:'다른 탭이 저장한 제목'})).toBeVisible();
});
test('a reading tab sees book edits and deletion without reviving the deleted book',async({context})=>{
 const {a,b}=await setup(context);await b.getByRole('button',{name:'동화 수정',exact:true}).click();await b.getByLabel('동화 제목 수정').fill('동기화된 제목');await expect(a.getByRole('heading',{name:'동기화된 제목'})).toBeVisible();await b.getByRole('button',{name:'수정 마치기 · 자동 저장됨'}).click();b.on('dialog',d=>d.accept());await b.getByRole('button',{name:'이 동화 삭제',exact:true}).click();await expect(a.getByRole('heading',{name:'동기화된 제목'})).toHaveCount(0);expect(await a.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')!))).toEqual([]);
});

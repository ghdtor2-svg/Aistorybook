import {test,expect,type Page} from '@playwright/test';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
// 고객이 브라우저 기록을 지워도 제작 코드로 서버 보관본(글과 그림)을 다시 불러와 PDF를 받을 수 있고,
// 대표는 관리 화면에서 같은 보관본으로 PDF를 만들 수 있다. AI 호출 없이 로컬 서버(next start)에 시험 주문을 만들어 확인한다.
// 실행: OFFICE_ADMIN_PASSWORD=<24자 이상> npx next start -p 3110 후
//       TEST_BASE_URL=http://127.0.0.1:3110 TEST_ADMIN_PASSWORD=<같은 값> npx playwright test tests/book-restore.spec.ts
const directory=path.join(process.cwd(),'.office-data','storybook-orders');
const id=randomUUID(),code='NG-'+id+'.'+randomBytes(24).toString('base64url');
const label='복구시험-'+id.slice(0,8);
const sentence=(n:number)=>`하린이는 ${n}번째 웅덩이 앞에서 우산을 꼭 쥐고 숨을 크게 쉬었어요. "할 수 있어!" 개구리 친구가 말했어요.`;
const chapters=['비 오는 아침','놀이터의 웅덩이','무지개를 따라서','맑게 갠 하늘','그림일기'].map((title,c)=>({title,text:Array.from({length:5},(_,p)=>Array.from({length:2},(_,k)=>sentence(c*10+p*2+k)).join(' ')).join('\n\n')}));
const book={id:randomUUID(),title:'하린이와 무지개 웅덩이',chapters,note:'',model:'test',createdAt:new Date().toISOString(),artStyleId:'soft-clay',qualityProfile:'seasons-tower-32-v1'};
const drawnBook={...book,title:'하린이와 무지개 웅덩이 (그림 보관본)'};
const assets=Array.from({length:18},()=>randomUUID());
const password=process.env.TEST_ADMIN_PASSWORD||'';
// 관리 API 의 POST 는 같은 사이트에서 온 요청(Origin)만 받는다.
const headers={origin:new URL(process.env.TEST_BASE_URL||'http://127.0.0.1:3000').origin};

async function jpeg(page:Page){
  const base64=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const context=canvas.getContext('2d')!;context.fillStyle='#7ab';context.fillRect(0,0,96,64);context.fillStyle='#fd5';context.fillRect(20,16,40,30);
    const blob:Blob=await new Promise(resolve=>canvas.toBlob(value=>resolve(value!),'image/jpeg',0.9));const bytes=new Uint8Array(await blob.arrayBuffer());let text='';bytes.forEach(byte=>{text+=String.fromCharCode(byte);});return btoa(text);});
  return Buffer.from(base64,'base64');
}
async function restore(page:Page,value=code){
  await page.goto('/storybook');
  await page.getByRole('textbox',{name:'제작 코드'}).fill(value);
  await page.getByRole('button',{name:'제작 코드로 내 동화 다시 불러오기'}).click();
}
async function pdfFrom(page:Page,button:string){
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:120_000}),page.getByRole('button',{name:button}).click()]);
  const bytes=await readFile(await download.path());
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
  expect((bytes.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length).toBe(17);
  return download.suggestedFilename();
}

test.describe.configure({mode:'serial'});
test.describe('restore a finished book from the server copy',()=>{
  test.beforeAll(async({browser})=>{
    const page=await browser.newPage();await page.goto('/');const image=await jpeg(page);await page.close();
    await mkdir(directory,{recursive:true});
    for(const name of assets)await writeFile(path.join(directory,id+'-'+name+'.jpg'),image);
    const now=Date.now();
    await writeFile(path.join(directory,id+'.json'),JSON.stringify({id,amount:9900,checkoutProof:'',createdAt:now,transferConfirmedAt:now,code,customerLabel:label,operatorNote:'',book,art:{base:assets,book:drawnBook,styleId:'soft-clay',qualityProfile:'seasons-tower-32-v1',job:{status:'completed',updatedAt:now}}}));
  });
  test.afterAll(async()=>{for(const name of await readdir(directory))if(name.startsWith(id))await unlink(path.join(directory,name)).catch(()=>{});});

  for(let round=1;round<=5;round++)test('empty browser restores text, all 18 pictures and the PDF · round '+round,async({browser})=>{
    const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();
    await restore(page);
    // 그림을 그릴 때의 글(보관본)이 돌아온다.
    await expect(page.locator('#current-book-title')).toHaveText(drawnBook.title,{timeout:30_000});
    await expect(page.getByText('완료 18/18장')).toBeVisible({timeout:30_000});
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')||'[]').map((b:{title:string})=>b.title))).toEqual([drawnBook.title]);
    expect(await pdfFrom(page,'PDF로 내려받기')).toMatch(/\.pdf$/);
    await context.close();
  });

  test('a copy already on the shelf keeps the customer edits',async({browser})=>{
    const context=await browser.newContext();const page=await context.newPage();
    await page.goto('/');
    await page.evaluate(value=>localStorage.setItem('ai-office:books:v1',JSON.stringify([value])),{...drawnBook,title:'고객이 고친 제목'});
    await restore(page);
    await expect(page.locator('#current-book-title')).toHaveText('고객이 고친 제목',{timeout:30_000});
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:books:v1')||'[]').length)).toBe(1);
    await context.close();
  });

  test('a wrong code restores nothing',async({page})=>{
    await restore(page,'NG-'+randomUUID()+'.'+randomBytes(24).toString('base64url'));
    await expect(page.locator('p[role=alert]')).toHaveText('결제 후 받은 제작 코드를 입력해 주세요.',{timeout:30_000});
    expect(await page.evaluate(()=>localStorage.getItem('ai-office:books:v1'))).toBeNull();
  });

  test('admin book copy needs a session and only serves pictures of that order',async({request})=>{
    expect((await request.post('/api/office/orders',{data:{id,action:'book'},headers})).status()).toBe(403);
    test.skip(!password,'TEST_ADMIN_PASSWORD not set');
    expect((await request.post('/api/office',{data:{action:'login',password},headers})).ok()).toBe(true);
    const copy=await (await request.post('/api/office/orders',{data:{id,action:'book'},headers})).json();
    expect(copy.book.title).toBe(drawnBook.title);expect(copy.base).toEqual(assets);
    expect((await request.post('/api/office/orders',{data:{id,action:'asset',asset:randomUUID()},headers})).status()).toBe(404);
    expect((await request.post('/api/office/orders',{data:{id,action:'asset',asset:'../'+id},headers})).status()).toBe(400);
    const image=await (await request.post('/api/office/orders',{data:{id,action:'asset',asset:assets[3]},headers})).json();
    expect(Buffer.from(image.image,'base64').subarray(0,2)).toEqual(Buffer.from([0xff,0xd8]));
    await request.post('/api/office',{data:{action:'logout'},headers});
  });

  test('admin downloads the book as a PDF from the order screen',async({browser})=>{
    test.skip(!password,'TEST_ADMIN_PASSWORD not set');
    const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();
    await page.goto('/office/orders');
    await page.getByLabel('관리자 비밀번호').fill(password);
    await page.getByRole('button',{name:'로그인',exact:true}).click();
    await page.getByRole('button',{name:'주문 보기 '+label}).click();
    expect(await pdfFrom(page,'동화 PDF 내려받기')).toMatch(/\.pdf$/);
    await expect(page.getByText('서버 보관본으로 PDF를 만들었어요.').first()).toBeVisible();
    await page.getByRole('button',{name:'로그아웃',exact:true}).click();
    await context.close();
  });
});

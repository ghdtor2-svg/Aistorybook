const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(path.resolve('node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--host-resolver-rules=MAP nangman.test 127.0.0.1']});
 try{
  const page=await browser.newPage();const base='http://nangman.test:3113';const apiBase='http://127.0.0.1:3113';
  await page.goto(base+'/');
  await page.getByRole('heading',{name:'사계의 탑',exact:true}).waitFor();
  await page.getByRole('button',{name:'샘플 장면 2',exact:true}).click();
  await page.getByText('봄을 깨우는 작은 인사',{exact:true}).waitFor();
  assert.equal((await page.request.get(apiBase+'/office')).status(),404);
  assert.equal((await page.request.get(apiBase+'/office/orders')).status(),404);
  assert.equal((await page.request.get(apiBase+'/api/office/orders')).status(),404);
  assert.equal((await page.request.get(apiBase+'/api/office')).status(),404);
  assert.equal((await page.request.post(apiBase+'/api/office/story',{data:{}})).status(),403);
  assert.equal((await page.request.post(apiBase+'/api/office/story-codes',{data:{}})).status(),404);
  assert.equal((await page.request.post(apiBase+'/api/storybook/illustrations',{data:{}})).status(),403);
  assert.equal((await page.request.post(apiBase+'/api/office/story/illustrate',{data:{}})).status(),404);
  assert.equal((await page.request.get(apiBase+'/nangman-story-spread-preview.pdf')).status(),200);
  for(const width of [1280,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:'../release-home-'+width+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
  await page.goto(base+'/storybook');
  const picker=page.getByRole('group',{name:'새 동화의 화풍을 골라주세요',exact:true});
  assert.equal(await picker.getByRole('radio').count(),11);
  await page.getByRole('radio',{name:'수채화',exact:true}).check();
  await picker.getByRole('button',{name:'유화 예시 크게 보기',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'화풍 예시 확대 보기',exact:true});await dialog.waitFor({state:'visible'});await dialog.getByRole('img').evaluate(image=>image.decode());
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('radio',{name:'수채화',exact:true}).isChecked(),true);
  await page.getByText('온라인 동화 제작과 결제는 준비 중입니다.',{exact:false}).waitFor();assert.equal(await page.getByLabel('제작 코드',{exact:true}).isDisabled(),true);
  const proof=page.getByRole('region',{name:'실제 제작 품질 확인',exact:true});await proof.getByText('실제로 만든 두 화풍 펼쳐 보기',{exact:true}).click();
  assert.equal(await proof.getByRole('img').count(),2);await proof.getByRole('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await picker.screenshot({path:'../release-styles-'+width+'.png'});}
  console.log('PASS public-domain main samples, 10 styles, actual API proof, mobile fit, no office/admin/legacy paid routes, and disabled unready checkout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');
const {chromium}=require(path.resolve('node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(10000);const api=context.request;const base='http://127.0.0.1:3107';const endpoint=base+'/api/office/orders';
  assert.equal((await api.get(endpoint)).status(),403);assert.equal((await api.post(endpoint,{data:{action:'reveal',id:randomUUID()},headers:{Origin:base}})).status(),403);
  await page.goto(base+'/office/orders');await page.getByLabel('관리자 비밀번호',{exact:true}).fill('fixture-only-password-123');await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('region',{name:'주문 현황',exact:true}).waitFor();
  await page.getByText('입금 확인 후 새 키 발급',{exact:true}).click();
  const issue=page.locator('details').first();const label='별님 가족 '+randomUUID().slice(0,8);
  await issue.getByLabel('고객 별칭',{exact:true}).fill(label);await issue.getByLabel('주문 메모',{exact:true}).fill('가상 주문 · 고객 데이터 없음');await issue.getByRole('checkbox').check();await issue.getByRole('button',{name:'입금 확인 · 제작 키 발급',exact:true}).click();
  const shown=page.getByLabel('고객에게 전달할 제작 키',{exact:true});await shown.waitFor().catch(async error=>{console.error(await page.locator('[role="status"]').allTextContents());await page.screenshot({path:'../backoffice-failure.png',fullPage:true});throw error;});const firstCode=await shown.inputValue();assert.match(firstCode,/^NG-/);const id=firstCode.slice(3,39);
  let listing=await (await api.get(endpoint)).json();assert.ok(!JSON.stringify(listing).includes(firstCode));assert.equal(listing.orders.find(order=>order.id===id).customerLabel,label);
  await page.getByRole('button',{name:'키 가리기',exact:true}).click();await page.getByLabel('주문 검색',{exact:true}).fill(label);await page.getByRole('button',{name:'주문 보기 '+label,exact:true}).click();
  const detail=page.getByRole('region',{name:'주문 상세',exact:true});await detail.getByLabel('주문 메모',{exact:true}).fill('전달 완료 · 테스트 메모');await detail.getByRole('button',{name:'메모 저장',exact:true}).click();await page.getByText('메모를 저장했어요.',{exact:true}).waitFor();
  for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:'../backoffice-'+width+'.png',fullPage:true});}
  const file=path.resolve('.office-data/storybook-orders',id+'.json');const record=JSON.parse(fs.readFileSync(file,'utf8'));record.book={id:randomUUID(),title:'테스트용 완성된 이야기',chapters:[{title:'가상 원고',text:'가상 검증 원고입니다.'}],note:'fixture',model:'fixture',createdAt:new Date().toISOString(),qualityProfile:'seasons-tower-32-v1',artStyleId:'watercolor'};record.art={base:['fixture-image-1','fixture-image-2'],alternative:{index:0,image:'fixture-revision'}};fs.writeFileSync(file,JSON.stringify(record));
  await page.getByRole('button',{name:'새로고침',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());await detail.getByRole('button',{name:'같은 주문에서 키 재발급',exact:true}).click();await shown.waitFor();const secondCode=await shown.inputValue();assert.notEqual(secondCode,firstCode);assert.equal(secondCode.slice(3,39),id);
  assert.equal((await api.get(base+'/api/office/story',{headers:{Authorization:'Bearer '+firstCode}})).status(),401);assert.equal((await (await api.get(base+'/api/office/story',{headers:{Authorization:'Bearer '+secondCode}})).json()).book.id,record.book.id);
  listing=await (await api.get(endpoint)).json();const updated=listing.orders.find(order=>order.id===id);assert.equal(updated.images,2);assert.equal(updated.revisionUsed,true);
  page.once('dialog',dialog=>dialog.accept());await detail.getByRole('button',{name:'키 사용 중지',exact:true}).click();await page.getByText('키 사용을 중지했어요.',{exact:true}).waitFor();assert.equal((await api.get(base+'/api/office/story',{headers:{Authorization:'Bearer '+secondCode}})).status(),401);
  assert.equal((await api.post(endpoint,{headers:{Origin:base},data:{id,action:'rotate'}})).status(),400);
  const current=JSON.parse(fs.readFileSync(file,'utf8'));current.request={id:randomUUID(),startedAt:Date.now()};fs.writeFileSync(file,JSON.stringify(current));assert.equal((await api.post(endpoint,{headers:{Origin:base},data:{id,action:'rotate',confirm:true}})).status(),409);delete current.request;fs.writeFileSync(file,JSON.stringify(current));
  await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('heading',{name:'관리자 로그인',exact:true}).waitFor();assert.equal((await api.get(endpoint)).status(),403);
  console.log('PASS private backoffice login, issue/search/notes, no key in list, same-order rotation preserving work and usage, old-key revocation, busy-order protection, logout, desktop/mobile.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

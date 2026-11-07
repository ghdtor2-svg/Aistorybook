const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(path.resolve('node_modules/playwright'));

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext();let page=await context.newPage(); page.setDefaultTimeout(8000);
  const base='http://127.0.0.1:3107';
  const api=page.request;
  const checkout=base+'/api/storybook/checkout',story=base+'/api/office/story',pictures=base+'/api/storybook/illustrations';
  await page.goto(base+'/');
  const sample=page.getByRole('region',{name:'사계의 탑',exact:true});
  await sample.waitFor();
  await sample.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.equal((await api.get(base+'/nangman-story-spread-preview.pdf?v=9')).status(),200);
  await sample.getByRole('button',{name:'샘플 장면 2',exact:true}).click();
  await sample.getByText('봄을 깨우는 작은 인사',{exact:true}).waitFor();
  assert.equal(await sample.getByRole('button',{name:'샘플 장면 2',exact:true}).getAttribute('aria-pressed'),'true');
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.screenshot({path:'../home-sample-v2-'+width+'.png',fullPage:true});
  }
  await page.goto(base+'/storybook');
  const picker=page.getByRole('group',{name:'새 동화의 화풍을 골라주세요',exact:true});
  await picker.waitFor();
  assert.equal(await picker.getByRole('radio').count(),11);
  await picker.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
  await page.setViewportSize({width:1280,height:900});
  await picker.screenshot({path:'../style-picker-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await picker.screenshot({path:'../style-picker-mobile.png'});
  await page.getByRole('radio',{name:'수채화',exact:true}).check();
  await picker.getByRole('button',{name:'유화 예시 크게 보기',exact:true}).click();
  const styleViewer=page.getByRole('dialog',{name:'화풍 예시 확대 보기',exact:true});
  await styleViewer.waitFor({state:'visible'});
  await styleViewer.getByRole('img').evaluate(image=>image.decode());
  assert.equal(await page.getByRole('radio',{name:'수채화',exact:true}).isChecked(),true);
  await page.keyboard.press('Escape');
  await styleViewer.waitFor({state:'hidden'});
  await page.reload();
  assert.equal(await page.getByRole('radio',{name:'수채화',exact:true}).isChecked(),true);
  await page.getByRole('heading',{name:'동화 한 편 · 5,000원'}).waitFor();
  await page.getByText('계좌이체 입금이 확인되면',{exact:false}).waitFor();
  assert.equal((await (await api.get(checkout)).json()).available,false);
  assert.equal((await api.post(checkout,{data:{action:'start'}})).status(),503);
  assert.equal((await api.get(story)).status(),401);
  const endpoint=base+'/api/office/story-codes';
  const request={id:randomUUID(),transferConfirmed:true};
  assert.equal((await api.post(endpoint,{data:request,headers:{Origin:base}})).status(),403);
  await page.goto(base+'/office');
  const login=await api.post(base+'/api/office',{headers:{Origin:base},data:{action:'login',password:'fixture-only-password-123'}});
  assert.equal(login.status(),200);
  assert.equal((await api.post(endpoint,{data:{...request,transferConfirmed:false},headers:{Origin:base}})).status(),400);
  await page.reload();
  const panel=page.getByRole('region',{name:'계좌이체 제작 코드 발급'});
  const issue=panel.getByRole('button',{name:'제작 코드 발급',exact:true});
  await issue.waitFor();
  assert.equal(await issue.isDisabled(),true);
  await panel.getByRole('checkbox',{name:'5,000원 입금을 확인했습니다.'}).check();
  await issue.click();
  const code=await panel.getByLabel('발급한 제작 코드').inputValue();
  assert.match(code,/^NG-/);
  await page.reload();
  await panel.getByRole('checkbox',{name:'5,000원 입금을 확인했습니다.'}).check();
  await issue.click();
  assert.equal(await panel.getByLabel('발급한 제작 코드').inputValue(),code);
  await page.goto(base+'/storybook');
  await page.getByLabel('제작 코드',{exact:true}).fill(code);
  const headers={Authorization:'Bearer '+code};
  const data={id:randomUUID(),brief:'아이와 종이배를 만든 가상 이야기. '.repeat(350)+'끝까지 보존할 특별한 사연',styleId:'watercolor'};
  assert.equal((await api.post(story,{headers,data:{...data,styleId:'unrecognized'}})).status(),400);
  const first=api.post(story,{headers,data});
  await new Promise(resolve=>setTimeout(resolve,80));
  const simultaneous=await api.post(story,{headers,data:{...data,id:randomUUID()}});
  assert.equal(simultaneous.status(),409);
  const response=await first;
  assert.equal(response.status(),200);
  const book=await response.json();
  assert.equal(book.artStyleId,'watercolor');
  assert.equal(book.qualityProfile,'seasons-tower-32-v1');
  assert.equal((await (await api.post(story,{headers,data:{...data,id:randomUUID()}})).json()).id,book.id);
  await page.getByRole('button',{name:'코드로 만든 동화 열기'}).click();
  await page.getByRole('heading',{name:book.title,exact:true}).waitFor();
  await page.getByLabel('읽을 위치 선택').selectOption('4');
  assert.equal(await page.locator('#book-chapter-4').evaluate(element=>element===document.activeElement),true);
  await page.getByRole('button',{name:'삽화 제작 상태 확인'}).click();
  await page.getByRole('button',{name:'표지와 삽화 만들기'}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="동화 삽화"]')?.textContent.includes('컴퓨터에서 그림을 이어'));
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='동화 수정')?.disabled);
  await page.close();
  // The reader is closed and cannot request the next picture. Keep only the test API context.
  for(let attempt=0;attempt<100;attempt++){
    const progress=await (await api.get(pictures,{headers})).json();
    if(progress.base.length===18)break;
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  page=await context.newPage();page.setDefaultTimeout(8000);
  await page.goto(base+'/storybook');
  await page.getByLabel('제작 코드',{exact:true}).fill(code);
  await page.getByRole('button',{name:'코드로 만든 동화 열기'}).click();
  await page.getByText('완료 18/18장',{exact:true}).waitFor({timeout:30000});
  const state=await (await api.get(pictures,{headers})).json();
  assert.equal(state.base.length,18);
  assert.equal(state.total,18);
  assert.equal(state.labels.length,18);
  assert.ok(typeof state.style==='string'&&state.style.length>0);
  assert.equal(state.style,'수채화');
  let imageFailures=0;
  const brokenAsset='**/api/storybook/illustrations?asset='+encodeURIComponent(state.base[1]);
  await page.route(brokenAsset,async route=>{
    if(imageFailures++===0)await route.fulfill({status:503,body:'simulated image fetch failure'});
    else await route.continue();
  });
  await page.reload();
  await page.getByRole('button',{name:'기존 그림 다시 불러오기',exact:true}).waitFor();
  await page.getByRole('button',{name:'기존 그림 다시 불러오기',exact:true}).click();
  await page.getByRole('button',{name:'장면 1 삽화 크게 보기',exact:true}).waitFor();
  assert.equal(imageFailures,2);
  await page.unroute(brokenAsset);
  await page.getByRole('radio',{name:'유화',exact:true}).check();
  assert.equal((await (await api.get(pictures,{headers})).json()).style,'수채화');
  const reader=page.locator('[data-storybook-pages="32"]');
  assert.equal(await reader.locator('[data-story-page]').count(),31);
  assert.equal(await reader.locator('[data-spread-index]').count(),16);
  assert.equal(await reader.locator('img').count(),17);
  const chapter=reader.locator('[data-spread-index="0"]');
  const scene=chapter.getByRole('img',{name:'장면 1 삽화'});
  await scene.waitFor({state:'visible'});
  await scene.evaluate(image=>image.decode());
  const ratio=await scene.evaluate(image=>image.naturalWidth/image.naturalHeight);
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});
    const art=await scene.boundingBox(),section=await chapter.boundingBox();
    assert.ok(art.x>=section.x-1&&art.x+art.width<=section.x+section.width+1);
    assert.ok(Math.abs(art.width/art.height-ratio)<0.001);
    assert.ok(await reader.evaluate(element=>element.scrollWidth<=element.clientWidth));
    await chapter.getByRole('button',{name:'장면 1 삽화 크게 보기',exact:true}).click();
    const viewer=page.getByRole('dialog',{name:'장면 1 삽화 확대 보기',exact:true});
    await viewer.waitFor({state:'visible'});
    const enlarged=viewer.getByRole('img');
    await enlarged.evaluate(image=>image.decode());
    const bounds=await enlarged.boundingBox();
    assert.ok(Math.abs(bounds.width/bounds.height-ratio)<0.001);
    await viewer.getByRole('button',{name:'더 크게 보기',exact:true}).click();
    assert.ok(await enlarged.evaluate(image=>image.clientWidth>=1600));
    await page.keyboard.press('Escape');
    await viewer.waitFor({state:'hidden'});
    assert.equal(await chapter.getByRole('button',{name:'장면 1 삽화 크게 보기',exact:true}).evaluate(button=>button===document.activeElement),true);
    await chapter.screenshot({path:'../standard32-'+width+'.png'});
  }
  await page.reload();
  await page.getByRole('button',{name:'코드로 만든 동화 열기'}).click();
  await scene.waitFor({state:'visible'});
  assert.equal(await reader.locator('[data-story-page]').count(),31);
  assert.equal((await (await api.get(pictures,{headers})).json()).style,state.style);
  assert.equal((await api.get(pictures+'?asset='+state.base[0])).status(),401);
  await page.getByLabel('바꾸고 싶은 내용').fill('표정을 밝게');
  await page.getByLabel('바꿀 그림').selectOption('1');
  await page.getByRole('button',{name:'이 그림 다시 만들기'}).click();
  await page.getByText('그림을 완성하지 못했어요.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'이 그림 다시 만들기'}).click();
  await page.getByRole('button',{name:'기존 그림 보기'}).waitFor();
  await page.waitForFunction(()=>{
    const section=document.querySelector('[data-spread-index="0"]');
    const image=section.querySelector('img');
    return image?.naturalWidth/image?.naturalHeight>=1.8;
  });
  await page.getByRole('button',{name:'기존 그림 보기'}).click();
  await page.getByRole('button',{name:'수정 그림 보기'}).waitFor();
  assert.equal((await api.post(pictures,{headers,data:{action:'revise',book,index:0,direction:'추가 수정'}})).status(),409);
  await page.getByRole('button',{name:'동화 수정',exact:true}).click();
  await page.getByText('이미 만든 그림은 자동으로 바뀌지 않으니',{exact:false}).waitFor();
  const orderFile=path.resolve('.office-data/storybook-orders',code.slice(3,39)+'.json');
  const originalOrder=fs.readFileSync(orderFile,'utf8');
  try{
    const interrupted=JSON.parse(originalOrder);
    interrupted.art.base=interrupted.art.base.slice(0,17);
    interrupted.art.alternative=undefined;
    interrupted.art.active={kind:'base',startedAt:Date.now()-300000};
    interrupted.art.job={status:'running',updatedAt:Date.now()-300000,inFlightIndex:17,origin:base};
    fs.writeFileSync(orderFile,JSON.stringify(interrupted));
    let recovered;
    for(let i=0;i<30;i++){
      recovered=await (await api.get(pictures,{headers})).json();
      if(recovered.job?.status==='paused')break;
      await new Promise(resolve=>setTimeout(resolve,300));
    }
    assert.equal(recovered.job.status,'paused');
    assert.equal(recovered.job.reason,'uncertain');
    assert.equal(recovered.base.length,17);
    assert.equal((await api.post(pictures,{headers,data:{action:'start',book}})).status(),409);
  }finally{fs.writeFileSync(orderFile,originalOrder);}
  console.log('PASS browser-independent 18-image job, 32 pages, saved style, original proportions, private art, retry, one revision and uncertain-request pause without paid retry');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});




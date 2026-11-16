import {test,expect} from '@playwright/test';
import {questionStoryExample,questionStoryUse,designStoryExample} from '../src/lib/storybook/question-guidance';
import {newProfile,submitAnswer} from '../src/lib/storybook/engine';

test('mobile input keeps example in view through keyboard-sized resize, expansion and reload',async({page})=>{
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:820});
  await page.goto('/storybook');
  const field=page.locator('#story-answer');
  await field.fill('하린이에게 주는 동화');await field.focus();
  // A short viewport models the space remaining above an on-screen keyboard.
  await page.setViewportSize({width,height:360});
  const guide=page.locator('#question-story-use');
  await expect(guide.getByText(questionStoryExample.recipient,{exact:true})).toBeInViewport({ratio:1});
  await expect(field).toBeInViewport({ratio:1});
  await expect(field).toBeFocused();
  await guide.getByRole('button',{name:'설명 더 보기',exact:true}).click();
  await expect(guide.getByText(questionStoryUse.recipient,{exact:true})).toBeVisible();
  await expect(field).toBeFocused();
  await guide.getByRole('button',{name:'설명 접기',exact:true}).click();
  await expect(field).toHaveValue('하린이에게 주는 동화');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await expect(field).toHaveValue('하린이에게 주는 동화');
 }
});

test('guidance follows the current question and resets expanded state',async({page})=>{
 await page.setViewportSize({width:375,height:750});await page.goto('/storybook');
 const field=page.locator('#story-answer');await field.fill('딸');
 await page.getByRole('button',{name:'설명 더 보기',exact:true}).click();
 await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect(page.locator('#current-question')).toHaveText('동화의 주인공은 누구로 할까요?');
 await expect(page.locator('#question-story-use')).toContainText(questionStoryExample.protagonist);
 await expect(page.getByRole('button',{name:'설명 더 보기',exact:true})).toHaveAttribute('aria-expanded','false');
 await expect(field).toBeEmpty();
});

test('optional writing also shows its example beside the focused input on mobile',async({page})=>{
 let profile=newProfile();while(profile.currentQuestion)profile=submitAnswer(profile,profile.currentQuestion,'',true);
 await page.goto('/storybook');await page.evaluate(value=>localStorage.setItem('ai-office:storybook:v1',JSON.stringify({version:1,profile:value,draft:'',editingId:null})),profile);
 await page.setViewportSize({width:375,height:750});await page.reload();
 await page.locator('summary').filter({hasText:'주인공이 직접 내리는 선택'}).click();
 const field=page.locator('#design-heroChoice');
 await field.fill('직접 친구에게 먼저 손을 내밀어요.');await field.focus();
 await page.setViewportSize({width:375,height:400});
 await expect(page.locator('#design-input-use-heroChoice').getByText(designStoryExample.heroChoice,{exact:true})).toBeInViewport({ratio:1});
 await expect(field).toBeInViewport({ratio:1});
});

test('desktop guidance remains fully visible and opening price clearly compares regular price',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.goto('/storybook');
 await expect(page.locator('#question-story-use').getByText(questionStoryUse.recipient,{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'설명 더 보기',exact:true})).toBeHidden();
 for(const width of [375,1280]){
  await page.setViewportSize({width,height:900});await page.goto('/');
  const price=page.locator('#purchase-guide');
  await expect(price.locator('del')).toHaveText('9,900원');
  await expect(price.getByText('오픈 특가',{exact:true})).toBeVisible();
  await expect(price.getByText('5,900원',{exact:true})).toBeVisible();
  await expect(price.getByText('정가보다 4,000원 할인',{exact:true})).toBeVisible();
  const sizes=await price.evaluate(node=>({original:parseFloat(getComputedStyle(node.querySelector('del')!).fontSize),sale:parseFloat(getComputedStyle(node.querySelector('strong')!).fontSize)}));
  expect(sizes.sale).toBeGreaterThan(sizes.original*2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

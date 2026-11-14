import {test,expect} from '@playwright/test';
import {newProfile,submitAnswer,fields} from '../src/lib/storybook/engine';
import {questionStoryUse,questionStoryExample,designStoryUse,designStoryExample,fictionalStoryUse,fictionalStoryExample} from '../src/lib/storybook/question-guidance';
import {designFields,designLabels} from '../src/lib/storybook/story-design';
test('each core question explains how its answer will be used',async({page})=>{
 await page.goto('/storybook');
 for(const field of ['recipient','memorableEvent','emotions','specialDetails','message'] as const){
  await expect(page.locator('#question-story-use')).toContainText(questionStoryUse[field]);await expect(page.locator('#question-story-use')).toContainText(questionStoryExample[field]);await expect(page.locator('#story-answer')).toHaveAttribute('aria-describedby','question-story-use');await page.getByRole('button',{name:'이 질문 건너뛰기',exact:true}).click();
 }
 for(const field of fields){await expect(page.locator('#summary-use-'+field)).toHaveText(questionStoryUse[field]);await expect(page.locator('#summary-'+field)).toHaveAttribute('aria-describedby','summary-use-'+field);}
 await expect(page.locator('#fictional-story-use')).toHaveText(fictionalStoryUse);await expect(page.getByText(fictionalStoryExample,{exact:true})).toBeVisible();
});
test('protagonist guidance stays visible while entering and editing the protagonist',async({page})=>{
 await page.setViewportSize({width:360,height:900});await page.goto('/storybook');await page.getByLabel('답변',{exact:true}).fill('딸');await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect(page.locator('#current-question')).toHaveText('동화의 주인공은 누구로 할까요?');await expect(page.locator('#question-story-use')).toContainText(questionStoryUse.protagonist);await expect(page.getByText('이름이나 별칭을 적어 주세요. 여러 명이 주인공이면 함께 등장할 인물도 알려 주세요.',{exact:true})).toBeVisible();
 await page.getByLabel('답변',{exact:true}).fill('대우');await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:storybook:v1')!).profile.protagonist)).toBe('대우');
 await expect(page.locator('#question-story-use')).toContainText(questionStoryUse.relationship);
 await page.getByRole('button',{name:'답변 2 수정',exact:true}).click();await expect(page.locator('#current-question')).toBeFocused();await expect(page.locator('#question-story-use')).toBeInViewport();await expect(page.locator('#question-story-use')).toContainText(questionStoryUse.protagonist);await expect(page.getByLabel('답변',{exact:true})).toHaveValue('대우');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'work/protagonist-guidance-mobile.png'});
});
test('recipient follow-up explains gift recipient instead of promising a protagonist',async({page})=>{
 await page.goto('/storybook');await page.getByLabel('답변',{exact:true}).fill('주인공: 지우');await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();
 await expect(page.locator('#question-story-use')).toContainText(questionStoryUse.recipient);await expect(page.locator('#current-question')).toContainText('선물을 받을 분');
});
test('all nine optional planning questions explain their role in the story',async({page})=>{
 await page.goto('/');let p=newProfile();while(p.currentQuestion)p=submitAnswer(p,p.currentQuestion,'',true);
 await page.evaluate(profile=>localStorage.setItem('ai-office:storybook:v1',JSON.stringify({version:1,profile,draft:'',editingId:null})),p);await page.goto('/storybook');
 for(const field of designFields){await page.getByText(designLabels[field],{exact:true}).first().click();await expect(page.locator('#design-use-'+field)).toContainText(designStoryUse[field]);await expect(page.locator('#design-use-'+field)).toContainText(designStoryExample[field]);}
});

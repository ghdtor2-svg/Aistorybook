import {test,expect} from '@playwright/test';
test('product collaboration, rejection, revision, approval and persistence preserve story data',async({page})=>{
 await page.goto('/storybook');await page.getByLabel('답변',{exact:true}).fill('선물 대상: 지민; 주인공: 지민이; 관계: 모녀');await page.getByRole('button',{name:'답변 저장하고 계속',exact:true}).click();await page.getByLabel('답변',{exact:true}).fill('이 문장은 그대로 보존되어야 합니다.');
 const before=await page.evaluate(()=>localStorage.getItem('ai-office:storybook:v1'));
 await page.goto('/office');await expect(page.getByRole('heading',{name:'공동 프로젝트 작업실'})).toBeVisible();
 await page.getByLabel('대표 업무 지시',{exact:true}).fill('동화 질문 기능 API 개발 및 품질 검토');
 await page.getByLabel('협업 방식',{exact:true}).selectOption('product');await page.getByRole('button',{name:'업무 등록',exact:true}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'다음 직원 데모 실행'}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'대표 반려',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'반려 사유'})).toContainText('반려 사유');
 await page.getByLabel('검토 의견 · 반려 시 필수').fill('접근성 테스트 계획 보완');await page.getByRole('button',{name:'대표 반려',exact:true}).click();
 await page.reload();await expect(page.getByText('검토 의견: 접근성 테스트 계획 보완')).toBeVisible();
 await page.getByRole('button',{name:'피드백 반영 재작업 등록'}).click();for(let i=0;i<3;i++)await page.getByRole('button',{name:'다음 직원 데모 실행'}).click();
 await expect(page.getByRole('heading',{name:'회차 1 · 이전 기록'})).toBeVisible();
 await page.getByRole('button',{name:'대표 승인',exact:true}).click();await expect(page.getByText('대표 승인 완료 · 외부 실행이나 배포는 하지 않았습니다.')).toBeVisible();
 await page.reload();await expect(page.getByText('대표 승인 완료 · 외부 실행이나 배포는 하지 않았습니다.')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('ai-office:storybook:v1'))).toBe(before);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!));expect(saved.tasks[0].runs).toHaveLength(2);expect(saved.tasks[0].runs[1].steps[2].input.upstream).toHaveLength(2);
 await page.screenshot({path:'test-results/office-mobile.png',fullPage:true});
 await page.goto('/storybook');await expect(page.getByLabel('답변',{exact:true})).toHaveValue('이 문장은 그대로 보존되어야 합니다.');
});
test('manual assignment and marketing workflows',async({page})=>{
 await page.goto('/office');
 await page.getByLabel('대표 업무 지시',{exact:true}).fill('인스타그램 SNS 광고 콘텐츠 초안');
 await expect(page.getByText(/자동 추천: AI 마케팅/)).toBeVisible();
 await page.getByLabel('협업 방식',{exact:true}).selectOption('planning-marketing');await page.getByRole('button',{name:'업무 등록',exact:true}).click();
 await page.getByRole('button',{name:'다음 직원 데모 실행'}).click();await page.getByRole('button',{name:'다음 직원 데모 실행'}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 await page.getByLabel('대표 업무 지시',{exact:true}).fill('동화 UI 검수');await page.getByLabel('담당 직원',{exact:true}).selectOption('quality');await page.getByLabel('협업 방식',{exact:true}).selectOption('auto');
 await page.getByRole('button',{name:'업무 등록',exact:true}).click();await page.getByRole('button',{name:'다음 직원 데모 실행'}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 const tasks=await page.evaluate(()=>JSON.parse(localStorage.getItem('ai-office:workspace:v1')!).tasks);expect(tasks[0].assignee).toBe('quality');expect(tasks[0].runs[0].steps).toHaveLength(1);
});

// 독립 테스트 컨텍스트에서만 새 API의 기본 차단 상태를 확인합니다.
test('live mode stays off without server approval and local auth',async({page})=>{
 await page.goto('/office');await expect(page.getByText('과거 유료 API 기록 · 실행 차단',{exact:true})).toBeVisible();
 await expect(page.locator('#office-mode option[value="live"]')).toBeDisabled();
 const status=await page.request.get('/api/office');expect(status.status()).toBe(200);expect((await status.json()).available).toBe(false);
 const denied=await page.request.post('/api/office',{headers:{Origin:'https://untrusted.example'},data:{action:'run'}});expect(denied.status()).toBe(403);
});

test('subscription UI keeps the first real run locked and preserves the demo fallback',async({page})=>{
 let attempts=0;
 await page.route('**/api/office/subscription',async route=>{
  if(route.request().method()==='POST')attempts++;
  await route.fulfill({json:{localAuthAvailable:true,authenticated:true,firstRunApproved:false,paidApiEnabled:false,research:'demo'}});
 });
 await page.goto('/office');
 await expect(page.getByText('별도 대표 승인 대기 · 잠김',{exact:false})).toBeVisible();
 await page.getByLabel('실행 모드',{exact:true}).selectOption('subscription');
 await page.getByLabel('대표 업무 지시',{exact:true}).fill('동화 개발 계획');
 await page.getByLabel('담당 직원',{exact:true}).selectOption('developer');
 await page.getByRole('button',{name:'업무 등록',exact:true}).click();
 await page.getByRole('button',{name:'다음 직원 구독 흐름 실행',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'최초 실제 Codex'})).toContainText('최초 실제 Codex 실행은 별도 대표 승인 대기');expect(attempts).toBe(0);
 await page.getByLabel('실행 모드',{exact:true}).selectOption('demo');
 await page.getByRole('button',{name:'다음 직원 데모 실행',exact:true}).click();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'대표 승인 대기',exact:true})).toBeVisible();
});

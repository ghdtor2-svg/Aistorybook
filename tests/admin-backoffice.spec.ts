import {test,expect} from '@playwright/test';
// 관리 화면은 공개 사이트에도 올라가므로 로그인 없이는 아무것도 보이지 않아야 한다.
// 비밀번호는 검사용 값을 환경 변수로 받는다. 저장소에 적어 두지 않는다.
const password=process.env.TEST_ADMIN_PASSWORD||'';
test.describe('order backoffice', ()=>{
 test('no session shows only the login form and the APIs refuse', async({page})=>{
  await page.goto('/office/orders');
  await expect(page.getByRole('heading',{name:'주문과 제작 키 관리'})).toBeVisible();
  await expect(page.getByLabel('관리자 비밀번호')).toBeVisible();
  const orders=await page.request.get('/api/office/orders');
  expect(orders.status()).toBe(403);
  const codes=await page.request.post('/api/office/story-codes',{data:{orderId:'x'}});
  expect(codes.status()).toBe(403);
  const status=await (await page.request.get('/api/office')).json();
  expect(status.authenticated).toBe(false);
  // 설정 여부만 알려주고 비밀번호나 그 길이는 돌려주지 않는다
  expect(Object.keys(status).sort()).toEqual(['authenticated','configured','minSecretLength']);
 });
 test('wrong password is refused and the right one opens the orders view', async({page})=>{
  test.skip(!password,'TEST_ADMIN_PASSWORD not set');
  await page.goto('/office/orders');
  await page.getByLabel('관리자 비밀번호').fill('definitely-not-the-right-secret');
  await page.getByRole('button',{name:'로그인',exact:true}).click();
  await expect(page.getByText('인증에 실패했습니다.')).toBeVisible();
  await page.getByLabel('관리자 비밀번호').fill(password);
  await page.getByRole('button',{name:'로그인',exact:true}).click();
  await expect(page.getByLabel('관리자 비밀번호')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();
  expect((await (await page.request.get('/api/office')).json()).authenticated).toBe(true);
  await page.getByRole('button',{name:'로그아웃',exact:true}).click();
  await expect(page.getByLabel('관리자 비밀번호')).toBeVisible();
  expect((await (await page.request.get('/api/office')).json()).authenticated).toBe(false);
 });
});

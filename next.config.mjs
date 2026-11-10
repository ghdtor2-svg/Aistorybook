/**
 * 공개 배포와 내 PC 작업장의 차이를 정합니다.
 *
 * 관리 화면(/office/orders)과 관리 API 는 2026-11-10 부터 공개 사이트에도 올라갑니다.
 * 빌드에서 빼는 방식 대신 관리자 비밀번호·출처 검사·로그인 시도 제한으로 지킵니다.
 * 판단 기준은 src/lib/storybook/admin-auth.ts 와 admin-guard.ts 에 적어 두었습니다.
 *
 * NEXT_PUBLIC_OFFICE_LOCAL 은 이제 사이트 개폐(site-gate)에만 씁니다.
 *   내 PC … .env.local 에 1 을 두면 SITE_OPEN 과 무관하게 늘 열립니다.
 *   Netlify … 이 변수를 넣지 마세요. 넣는 순간 공개 사이트의 개폐 장치가 무력해집니다.
 */
const officeLocal = process.env.NEXT_PUBLIC_OFFICE_LOCAL === '1';

// 실수로 Netlify 환경 변수에 스위치를 넣으면 닫아 둔 사이트가 열립니다.
// 조용히 열리느니 빌드를 실패시킵니다. Netlify 는 NETLIFY=true 를 넣어 줍니다.
if (officeLocal && process.env.NETLIFY === 'true') {
 throw new Error(
  'NEXT_PUBLIC_OFFICE_LOCAL 이 Netlify 빌드에 설정되어 있습니다.\n' +
  '이대로 배포하면 SITE_OPEN 과 무관하게 공개 사이트가 열립니다.\n' +
  'Netlify → Site configuration → Environment variables 에서 이 변수를 지우고 다시 배포하세요.'
 );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
 // 값을 못 박아야 번들러가 작업장 분기를 죽은 코드로 보고 지웁니다.
 // 변수를 아예 비워 두면 치환이 일어나지 않습니다.
 env: {
  NEXT_PUBLIC_OFFICE_LOCAL: officeLocal ? '1' : '0',
  // Netlify build metadata is not automatically available in Next.js Functions.
  // Capture only these non-secret markers; previews retain their own context.
  NETLIFY: process.env.NETLIFY === 'true' ? 'true' : 'false',
  CONTEXT: process.env.CONTEXT || '',
 },
};

export default nextConfig;

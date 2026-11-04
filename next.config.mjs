/**
 * 공개 배포와 내 PC 작업장을 같은 소스에서 갈라냅니다.
 *
 * AI 동화(/, /storybook, /api/office/story)만 인터넷에 공개합니다.
 * AI 오피스(/office)와 사무실 API는 내 PC 작업장 전용입니다.
 *
 * 가르는 방법: 사무실 라우트 파일 이름을 page.local.tsx / route.local.ts 로 두고,
 * pageExtensions 에 local 확장자를 넣을 때만 라우트로 인식되게 합니다.
 * 넣지 않으면 Next 가 그 파일들을 라우트로 보지 않으므로 빌드 결과물에
 * 아예 들어가지 않습니다. 숨기는 것이 아니라 존재하지 않습니다.
 *
 * 켜는 조건: NEXT_PUBLIC_OFFICE_LOCAL=1
 *   내 PC … .env.local 에 들어 있습니다(.gitignore 대상이라 저장소에 올라가지 않음).
 *   Netlify … 이 변수를 넣지 마세요. 넣는 순간 사무실이 인터넷에 공개됩니다.
 *
 * 서버의 localOrigin() 403 검사는 그대로 둡니다. 두 겹으로 막습니다.
 */
const officeLocal = process.env.NEXT_PUBLIC_OFFICE_LOCAL === '1';

// 실수로 Netlify 환경 변수에 스위치를 넣으면 사무실이 공개됩니다.
// 조용히 공개되느니 빌드를 실패시킵니다. Netlify 는 NETLIFY=true 를 넣어 줍니다.
if (officeLocal && process.env.NETLIFY === 'true') {
 throw new Error(
  'NEXT_PUBLIC_OFFICE_LOCAL 이 Netlify 빌드에 설정되어 있습니다.\n' +
  '이대로 배포하면 AI 오피스(/office)가 인터넷에 공개됩니다.\n' +
  'Netlify → Site configuration → Environment variables 에서 이 변수를 지우고 다시 배포하세요.'
 );
}

const base = ['tsx', 'ts', 'jsx', 'js'];

/** @type {import('next').NextConfig} */
const nextConfig = {
 pageExtensions: officeLocal ? ['local.tsx', 'local.ts', ...base] : base,
};

export default nextConfig;

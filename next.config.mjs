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

// 유료 결제는 공개 사이트에서 일어나면 안 됩니다 (대표 결정 2026-11-05).
// 승인 플래그가 Netlify 빌드에 들어오면 빌드를 멈춥니다.
// 3단계에서 온라인 생성을 열기로 하면 이 블록을 지우고 여는 것이 순서입니다.
if (process.env.OFFICE_STORY_GENERATION_APPROVED && process.env.NETLIFY === 'true') {
 throw new Error(
  'OFFICE_STORY_GENERATION_APPROVED 가 Netlify 빌드에 설정되어 있습니다.\n' +
  '이대로 배포하면 방문자가 동화 생성을 돌릴 수 있고 요금이 발생합니다.\n' +
  'Netlify → Project configuration → Environment variables 에서 지우고 다시 배포하세요.\n' +
  '의도적으로 온라인 생성을 여는 것이라면 next.config.mjs 의 이 검사를 먼저 지우세요.'
 );
}

const base = ['tsx', 'ts', 'jsx', 'js'];

/** @type {import('next').NextConfig} */
const nextConfig = {
 pageExtensions: officeLocal ? ['local.tsx', 'local.ts', ...base] : base,
 // 값을 못 박아야 번들러가 사무실 분기를 죽은 코드로 보고 지웁니다.
 // 변수를 아예 비워 두면 치환이 일어나지 않아 사무실 문구가 공개 번들에 남습니다.
 env: {NEXT_PUBLIC_OFFICE_LOCAL: officeLocal ? '1' : '0'},
};

export default nextConfig;

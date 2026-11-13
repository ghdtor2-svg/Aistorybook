export const legacyStoryQualityProfile='seasons-tower-v1';
export const storyQualityProfile='seasons-tower-32-v1';
export const storyPageCount=32;
// 대표 지시(2026-11-11): 본문은 약 2,500자. 쪽수(32쪽)와 그림 수(18장)는 그대로 두고 글씨를 키운다.
export const storyTextTarget=2500;
export const storyTextMin=1800;
export const storyTextMax=3600;
export const storyIllustrationCount=18;
export const storyCoverSize='1024x1536';
export const storyPanoramaSize='3072x1024';
export const storyQualityPrompt=[
  'Production standard: a finished premium picture book with professional polish and readability.',
  'Strong character identities, unmistakable signature colors, expressive faces, coherent lighting, rich scene-specific details and accomplished composition.',
  'Preserve the same characters and chosen artistic medium across the whole book.',
  'Every scene must depict its own narrative event with distinct staging, expressions and poses.',
  'Show every important face, hand and full character comfortably inside the canvas. Never crop a character to fill the frame.',
  'For a panorama, extend real scenery to both outer edges. Keep the central 8 percent quiet for the page fold, with faces, hands, important actions and focal props clearly off-center.',
  'Keep an airy low-detail upper background for separately typeset story text. No lettering, panels, frames or watermarks.',
].join('\n');

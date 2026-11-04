import type {TextExecutor} from './codex';
export type GeminiAuth='antigravity_official_oauth'|'gemini_api_verified_free_project';
export const geminiConnection={enabled:false,subscriptionService:'Google AI Pro / Antigravity',apiService:'Gemini API / 별도 프로젝트·무료 등급',sharedQuota:false} as const;
export const geminiExecutor:TextExecutor={async execute(){throw new Error('Gemini는 인터페이스만 준비되었습니다. 공식 인증·결제 상태 검증 전에는 기획 데모를 사용합니다.');}};

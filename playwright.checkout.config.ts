import {defineConfig} from '@playwright/test';
import base from './playwright.config';
// Preserve the project's Edge default; Linux QA can select an installed browser.
const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
export default defineConfig(base,{
 testMatch:['checkout-safety.spec.ts','question-guidance.spec.ts','question-concurrency.spec.ts','question-import.spec.ts','book-restore.spec.ts'],
 use:{...base.use,...(executablePath?{channel:undefined,launchOptions:{executablePath}}:{})},
});

import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',workers:1,use:{baseURL:process.env.TEST_BASE_URL||'http://127.0.0.1:3000',channel:'msedge',headless:true,viewport:{width:390,height:844}},reporter:'list'});

import {OFFICE_STORAGE_KEY} from './storage';import type {Workspace} from './model';
export const OFFICE_WRITER_LOCK='ai-office:office-writer:v1';
export function saveWorkspace(store:{getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void},expected:string|null,value:Workspace){if(store.getItem(OFFICE_STORAGE_KEY)!==expected)throw Error('다른 화면에서 업무 저장본이 바뀌었습니다. 추가 실행을 중단하고 현재 화면을 보관한 뒤 최신 업무를 불러오세요.');const raw=JSON.stringify(value);if(raw!==expected)store.setItem(OFFICE_STORAGE_KEY,raw);return raw;}

import type { ReactNode } from 'react';
import './globals.css';
import {SITE_NAME,SITE_DESCRIPTION} from '../lib/brand';
// 공개 사이트에는 동화 간판을, 내 PC 작업장에는 사무실 간판을 겁니다.
// 탭 제목과 설명문은 모든 페이지에 따라다니므로 여기서 갈라야 합니다.
const officeLocal=process.env.NEXT_PUBLIC_OFFICE_LOCAL==='1';
export const metadata = officeLocal
 ? { title: 'AI OFFICE', description: 'AI 직원 협업 사무실 MVP' }
 : { title: SITE_NAME, description: SITE_DESCRIPTION };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }

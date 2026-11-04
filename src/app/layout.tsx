import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'AI OFFICE', description: 'AI 직원 협업 사무실 MVP' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }

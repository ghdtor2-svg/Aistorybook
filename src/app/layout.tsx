import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: '낭만한줄', description: '나의 추억으로 만드는 한 권의 동화' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }

import type { ReactNode } from 'react';
import { Gaegu } from 'next/font/google';
import './globals.css';
// 동화 본문용 손글씨 글꼴. 글꼴 파일은 사이트가 직접 내려 주므로 방문자 정보가 구글로 가지 않습니다.
// 한글 글자는 쓰이는 조각만 그때그때 받도록 미리 받기(preload)는 끕니다.
const storyHand = Gaegu({ weight: ['400', '700'], subsets: ['latin'], preload: false, display: 'swap', variable: '--font-story-hand' });
export const metadata = { title: '낭만한줄', description: '나의 추억으로 만드는 한 권의 동화' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="ko" className={storyHand.variable}><body>{children}</body></html>; }

import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Gaegu } from 'next/font/google';
import { SITE_NAME } from '../lib/brand';
import { OG_IMAGE, SEO_DESCRIPTION, SEO_KEYWORDS, SEO_TITLE, SITE_URL } from '../lib/seo';
import './globals.css';
// 동화 본문용 손글씨 글꼴. 글꼴 파일은 사이트가 직접 내려 주므로 방문자 정보가 구글로 가지 않습니다.
// 한글 글자는 쓰이는 조각만 그때그때 받도록 미리 받기(preload)는 끕니다.
const storyHand = Gaegu({ weight: ['400', '700'], subsets: ['latin'], preload: false, display: 'swap', variable: '--font-story-hand' });
// 구글 서치콘솔·네이버 서치어드바이저 소유 확인(2026-11-13 등록). 페이지에 공개되는 값이라 비밀이 아닙니다. 환경 변수가 있으면 그 값을 씁니다.
const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'A9zoQ46J2GSimSzWOo96HFrlrCxOW-smBpY-tzGH7UI';
const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || '7b109a4931cdb0215a2c7c5f4c577b6e13e4bd91';
// 검색 결과·카카오톡·인스타그램 링크 미리보기에 쓰는 정보. 문구 기준은 src/lib/seo.ts 에 있습니다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SEO_TITLE, template: '%s · ' + SITE_NAME },
  description: SEO_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SEO_KEYWORDS,
  category: 'children books',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'ko_KR', siteName: SITE_NAME, url: '/', title: SEO_TITLE, description: SEO_DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: SEO_TITLE, description: SEO_DESCRIPTION, images: [OG_IMAGE.url] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: false, email: false, address: false },
  ...(google || naver ? { verification: { ...(google ? { google } : {}), ...(naver ? { other: { 'naver-site-verification': naver } } : {}) } } : {}),
};
export const viewport: Viewport = { themeColor: '#f5f7fb' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="ko" className={storyHand.variable}><body>{children}</body></html>; }

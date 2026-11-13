import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Gaegu } from 'next/font/google';
import { SITE_NAME } from '../lib/brand';
import { OG_IMAGE, SEO_DESCRIPTION, SEO_KEYWORDS, SEO_TITLE, SITE_URL } from '../lib/seo';
import './globals.css';
// 동화 본문용 손글씨 글꼴. 글꼴 파일은 사이트가 직접 내려 주므로 방문자 정보가 구글로 가지 않습니다.
// 한글 글자는 쓰이는 조각만 그때그때 받도록 미리 받기(preload)는 끕니다.
const storyHand = Gaegu({ weight: ['400', '700'], subsets: ['latin'], preload: false, display: 'swap', variable: '--font-story-hand' });
const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;
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

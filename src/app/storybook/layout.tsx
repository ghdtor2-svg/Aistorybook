import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {OG_IMAGE} from '../../lib/seo';
// 동화 만들기 화면은 클라이언트 화면이라 제목·설명을 이 레이아웃에서 붙입니다.
const title='동화 만들기 · 내 책장';
const description='몇 가지 질문에 답하고 화풍을 골라 우리 아이만의 맞춤 동화를 만들어 보세요. 완성한 동화는 내 책장에 보관하고 PDF로 내려받을 수 있어요.';
export const metadata:Metadata={
  title,description,
  alternates:{canonical:'/storybook'},
  openGraph:{type:'website',locale:'ko_KR',url:'/storybook',title,description,images:[OG_IMAGE]},
};
export default function StorybookLayout({children}:{children:ReactNode}){return children;}

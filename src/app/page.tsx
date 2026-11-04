'use client';
import HomeLanding from './HomeLanding';
import StaffDemo from './StaffDemo';
import {SITE_NAME,SITE_DESCRIPTION} from '../lib/brand';
// 공개 배포에서는 사무실로 가는 길도, 직원 배정 데모도 내보내지 않습니다.
// next.config.mjs 가 같은 값으로 /office 라우트 자체를 빌드에서 뺍니다.
const officeLocal=process.env.NEXT_PUBLIC_OFFICE_LOCAL==='1';
export default function Home(){
 return <main>
  <nav aria-label="고객 페이지">{officeLocal&&<><a href="/office">직원 사무실 →</a>{" · "}</>}<a href="/storybook">동화 서비스 →</a></nav><header><div><h1>{officeLocal?'AI OFFICE':SITE_NAME}</h1><p className="muted">{officeLocal?'나의 이야기를 만드는 동화 플랫폼과 AI 직원 사무실':SITE_DESCRIPTION}</p></div><span className="pill">동화 만들기 · 내 책장</span></header>
  <HomeLanding/>{officeLocal&&<StaffDemo/>}
 </main>;
}

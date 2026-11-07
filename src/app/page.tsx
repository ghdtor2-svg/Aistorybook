import HomeLanding from './HomeLanding';

export default function Home(){
  return <main>
    <header>
      <div><h1>낭만한줄</h1><p className="muted">나의 추억으로 만드는 한 권의 동화</p></div>
      <span className="pill">동화 만들기 · 내 책장</span>
    </header>
    <HomeLanding/>
  </main>;
}

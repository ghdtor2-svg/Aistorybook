import {FAQ,homeJsonLd,jsonLdText} from '../lib/seo';
import styles from './HomeFaq.module.css';
// 검색엔진과 AI 답변엔진이 그대로 인용할 수 있는 질문과 답. 화면 글과 구조화 데이터가 같은 원본(FAQ)을 씁니다.
export default function HomeFaq(){
  return <section id="faq" className={styles.faq} aria-labelledby="faq-title">
    <h2 id="faq-title">자주 묻는 질문</h2>
    {FAQ.map(item=><details key={item.question}><summary><h3>{item.question}</h3></summary><p>{item.answer}</p></details>)}
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLdText(homeJsonLd())}}/>
  </section>;
}

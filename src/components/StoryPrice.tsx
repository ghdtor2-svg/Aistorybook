import {STORY_PRICE,STORY_PRICE_LABEL,STORY_REGULAR_PRICE} from '../lib/storybook/product';
import styles from './StoryPrice.module.css';
export default function StoryPrice(){
 return <div className={styles.offer}>
  <div className={styles.previous}><span>정가</span> <del>{STORY_REGULAR_PRICE.toLocaleString('ko-KR')}원</del><span className={styles.badge}>{STORY_PRICE_LABEL}</span></div>
  <strong className={styles.amount}>{STORY_PRICE.toLocaleString('ko-KR')}<span>원</span></strong>
  <span className={styles.saving}>정가보다 {(STORY_REGULAR_PRICE-STORY_PRICE).toLocaleString('ko-KR')}원 할인</span>
 </div>;
}

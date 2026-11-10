'use client';

import {useState} from 'react';
import {PURCHASE_CONTACT} from '../lib/storybook/purchase-info';
import {STORY_PRICE} from '../lib/storybook/product';
import styles from './PurchaseGuide.module.css';

export default function PurchaseGuide(){
 const [copyMessage,setCopyMessage]=useState('');
 async function copyAccount(){
  try{await navigator.clipboard.writeText(PURCHASE_CONTACT.account);setCopyMessage('계좌번호를 복사했어요.');}
  catch{setCopyMessage('자동 복사가 되지 않았어요. 아래 계좌번호를 길게 누르거나 선택해 복사해 주세요.');}
 }
 return <section id="purchase-guide" tabIndex={-1} className={styles.guide} aria-labelledby="purchase-guide-title">
  <div className={styles.intro}>
   <div><p className={styles.eyebrow}>구매를 원하시나요?</p><h2 id="purchase-guide-title">구매 문의 · 입금 안내</h2><p>담당자에게 먼저 DM을 보내주세요.<br/>제작 가능 여부와 입금 안내를 확인해 드려요.</p></div>
   <p className={styles.price}>맞춤형 디지털 동화 1편<strong>{STORY_PRICE.toLocaleString('ko-KR')}원</strong></p>
  </div>
  <div className={styles.columns}>
   <div className={styles.contact}>
    <h3>01 · 인스타그램으로 문의</h3>
    <p>“동화 구매 문의합니다”라고 DM을 보내주세요. 담당자와 안내를 확인한 뒤 입금해 주세요.</p>
    <a className={styles.dm} href={PURCHASE_CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer">인스타그램 DM으로 구매 문의 <span aria-hidden="true">↗</span><span className="sr-only"> (새 창)</span></a>
    <p className={styles.caption}>@{PURCHASE_CONTACT.instagramHandle} · 프로필에서 ‘메시지’를 눌러주세요. 인스타그램 로그인이 필요할 수 있어요.</p>
   </div>
   <div className={styles.payment}>
    <h3>02 · 안내 확인 후 계좌이체</h3>
    <dl><div><dt>은행</dt><dd>{PURCHASE_CONTACT.bank}</dd></div><div><dt>계좌번호</dt><dd className={styles.account}>{PURCHASE_CONTACT.account}</dd></div><div><dt>예금주</dt><dd>{PURCHASE_CONTACT.accountHolder}</dd></div></dl>
    <button className={styles.copy} type="button" onClick={()=>void copyAccount()}>계좌번호 복사</button>
    <p className={styles.feedback} role="status">{copyMessage}</p>
   </div>
  </div>
  <div className={styles.next}><strong>03 · 입금 확인 후 제작 코드 받기</strong><p>입금 후 같은 DM으로 입금자명과 입금 금액을 알려주세요. 담당자가 확인 후 제작 코드를 안내해 드립니다. 받은 코드는 동화 화면의 ‘제작 코드’ 칸에 입력해 주세요.</p></div>
  <p className={styles.caption}>입금 확인과 코드 전달은 담당자가 진행합니다. 이 화면에서 자동 결제되거나 코드가 즉시 발급되지는 않아요. 코드가 오지 않거나 제작 중 도움이 필요하면 같은 DM으로 문의해 주세요.</p>
 </section>;
}

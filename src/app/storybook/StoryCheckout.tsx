'use client';

import {STORY_PRICE} from '../../lib/storybook/product';
import type {StoryConnection} from './useLocalStoryWorkspace';
import styles from './StoryCheckout.module.css';

export const productionCodeKey='nangman:production-code:v1';
export type DraftStorage={onSave:()=>Promise<void>;saving:boolean;saved:boolean;error:string;available:boolean;onBackup:()=>void};

export default function StoryCheckout({code,onCode,draftStorage,connection,codeLocked}:{code:string;onCode:(value:string)=>void;draftStorage:DraftStorage;connection:StoryConnection;codeLocked:boolean}){
  const {available:local,checking,retry}=connection;
  return <section id="story-checkout" tabIndex={-1} className={styles.checkout} aria-label="결제와 제작 코드">
    <h3>동화 한 편 · {STORY_PRICE.toLocaleString('ko-KR')}원</h3>
    <p>본문 32쪽과 표지·마침으로 구성되며, 그림은 총 18장이에요. PDF는 표지 1쪽·본문 펼침면 16쪽·마침 1쪽, 총 18쪽으로 받아요.</p>
    <section className={styles.saveCard} aria-labelledby="draft-save-title">
      <h4 id="draft-save-title">입금 전에, 작성한 이야기를 보관하세요</h4>
      <p>질문 답변과 요약, 추가로 적은 내용을 이 브라우저에 저장해 두세요. 같은 기기·같은 브라우저로 다시 방문하면 이어서 만들 수 있어요.</p>
      <div className="story-actions">
        <button type="button" disabled={!draftStorage.available||draftStorage.saving} onClick={()=>void draftStorage.onSave()}>{draftStorage.saving?'저장 중…':'브라우저에 저장하기'}</button>
        <a className={styles.guideLink} href="#purchase-guide">구매 문의 · 입금 안내 보기</a>
      </div>
      <p role="status" className={styles.saveStatus}>{draftStorage.error?'저장하지 못했어요. 위쪽 저장 오류 안내를 확인하고 작성본 파일을 보관해 주세요.':draftStorage.saved?'이 브라우저에 저장했어요. 입금 안내를 확인한 뒤, 돌아와서 이어서 만들어 주세요.':draftStorage.available?'작성 내용은 자동 저장되며, 버튼을 누르면 현재 내용의 저장을 확인할 수 있어요.':'질문을 작성하면 여기에 저장할 수 있어요.'}</p>
      <p className={styles.note}>브라우저 데이터를 지우거나 다른 기기에서 열면 작성 내용이 보이지 않아요. 따로 보관하려면 작성본 파일도 받아 두세요. 공용 기기에서는 이용 후 답변을 삭제해 주세요.</p>
      <button type="button" className="secondary" disabled={!draftStorage.available} onClick={draftStorage.onBackup}>질문 작성본 파일로 보관하기</button>
    </section>
    <section className={styles.codeCard} aria-labelledby="production-code-title">
      <h4 id="production-code-title">입금 후 받은 제작 코드를 입력해 주세요</h4>
      {local?<p>인스타그램 DM으로 입금 확인을 요청하고, 담당자에게 받은 제작 코드를 아래에 붙여 넣어 주세요.</p>:<p id="production-unavailable" role="status">{checking?'제작 연결을 확인하고 있어요. 잠시만 기다려 주세요.':'제작 연결을 확인하지 못해 코드 입력이 잠겨 있어요. 연결을 다시 확인하거나, 입금 전에 아래 구매 안내의 인스타그램 DM으로 제작 가능 여부를 확인해 주세요.'}</p>}
      {!local&&<button type="button" className="secondary" disabled={checking} onClick={retry}>{checking?'연결 확인 중…':'연결 다시 확인'}</button>}
      <label htmlFor="story-production-code">제작 코드</label>
      <input id="story-production-code" aria-describedby={'production-code-help'+(!local?' production-unavailable':'')} disabled={!local||codeLocked} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="받으신 제작 코드를 붙여 넣어 주세요" value={code} maxLength={72} onChange={event=>onCode(event.target.value)}/>
      <p id="production-code-help" className={styles.note}>제작 코드 하나로 동화 한 편을 만들고 다시 열 수 있어요. 질문 저장과 달리 코드는 이 탭에만 임시로 보관돼요. 탭을 닫으면 다시 입력해야 할 수 있으니 받은 DM을 보관해 주세요.</p>
      {codeLocked&&<p role="status">진행 중인 작업을 마친 뒤 제작 코드를 바꿀 수 있어요.</p>}
    </section>
  </section>;
}

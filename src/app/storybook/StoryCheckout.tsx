'use client';

import {STORY_PRICE} from '../../lib/storybook/product';
import {useLocalStoryWorkspace} from './useLocalStoryWorkspace';

export const productionCodeKey='nangman:production-code:v1';

export default function StoryCheckout({code,onCode}:{code:string;onCode:(value:string)=>void}){
  const local=useLocalStoryWorkspace();
  return <section aria-label="결제와 제작 코드">
    <h3>동화 한 편 · {STORY_PRICE.toLocaleString('ko-KR')}원</h3>
    {local?<p>계좌이체 입금이 확인되면 제작 코드를 안내해 드려요. 받은 코드를 입력해 주세요.</p>:<p role="status">온라인 동화 제작과 결제는 준비 중입니다. 지금은 이야기 소재 작성, 화풍 살펴보기와 샘플 읽기를 이용할 수 있어요. 입금이나 제작 코드 입력은 아직 받지 않아요.</p>}
    <p>기본 구성은 표지 포함 32쪽, 표지와 본문 그림 총 18장이에요.</p>
    <label htmlFor="story-production-code">제작 코드</label>
    <input id="story-production-code" disabled={!local} autoComplete="off" spellCheck={false} value={code} maxLength={72} onChange={event=>onCode(event.target.value)}/>
    <small>제작 코드 하나로 동화 한 편을 만들고 다시 열 수 있어요.</small>
  </section>;
}

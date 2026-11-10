'use client';

import {STORY_PRICE} from '../../lib/storybook/product';
import {useLocalStoryWorkspace} from './useLocalStoryWorkspace';

export const productionCodeKey='nangman:production-code:v1';

export default function StoryCheckout({code,onCode}:{code:string;onCode:(value:string)=>void}){
  const local=useLocalStoryWorkspace();
  return <section aria-label="결제와 제작 코드">
    <h3>동화 한 편 · {STORY_PRICE.toLocaleString('ko-KR')}원</h3>
    {local?<p>이미 입금하셨나요? 인스타그램 DM으로 입금 확인을 요청하고, 담당자에게 받은 제작 코드를 입력해 주세요.</p>:<p role="status">현재 온라인 제작 연결을 확인 중입니다. 입금 전에 페이지 아래 구매 안내의 인스타그램 DM으로 제작 가능 여부를 확인해 주세요. 이야기 소재 작성, 화풍 살펴보기와 샘플 읽기는 이용할 수 있어요.</p>}
    <p>기본 구성은 표지 포함 32쪽, 표지와 본문 그림 총 18장이에요.</p>
    <label htmlFor="story-production-code">제작 코드</label>
    <input id="story-production-code" disabled={!local} autoComplete="off" spellCheck={false} value={code} maxLength={72} onChange={event=>onCode(event.target.value)}/>
    <small>제작 코드 하나로 동화 한 편을 만들고 다시 열 수 있어요.</small>
  </section>;
}

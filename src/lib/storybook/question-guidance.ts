import type {Field} from './engine';
import type {DesignField} from './story-design';
// Explain the actual destination field, including follow-up questions in the same group.
export const questionStoryUse:Record<Field,string>={
 recipient:'동화를 선물 받을 사람을 정해요. 이야기 속 주인공과는 다를 수 있어요.',
 protagonist:'여기에 적은 이름이나 인물이 동화의 주인공이 되어 이야기를 이끌어요.',
 relationship:'선물하는 사람과 받는 사람의 관계를 바탕으로, 동화에 담을 말투와 애정의 표현을 정해요.',
 memorableEvent:'적어 주신 추억이 동화의 중심 사건과 배경 장면을 만드는 바탕이 돼요.',
 emotions:'그때의 마음을 주인공의 표정·대사·행동으로 표현하는 데 써요.',
 specialDetails:'적어 주신 모습·말버릇·소중한 물건은 인물을 알아보게 하는 특징과 장면의 소재가 돼요.',
 message:'전하고 싶은 마음은 이야기의 결말과 마지막에 남길 메시지의 바탕이 돼요.',
};
export const designStoryUse:Record<DesignField,string>={
 readingExperience:'읽는 아이의 나이와 취향에 맞춰 문장 길이·이야기의 목소리·분위기를 정해요.',
 characters:'인물의 외모·옷·고유색과 관계를 정해 글과 그림에서 같은 인물로 이어 가는 기준으로 써요.',
 worldRules:'이야기의 장소와 마법의 규칙을 정해 사건이 일어나는 배경과 해결 방법에 반영해요.',
 goalAndObstacle:'주인공이 이루려는 목표와 어려움을 정해 모험의 시작과 갈등 장면을 구성해요.',
 heroChoice:'어려운 순간에 주인공이 직접 선택하고 행동하는 절정 장면의 바탕이 돼요.',
 emotionalJourney:'시작과 끝의 마음 차이를 정해 주인공의 대사·표정·행동이 달라지는 과정에 반영해요.',
 motifAndEnding:'처음 등장한 물건·말·장소를 뒤에서 다시 연결하는 단서와 마지막 장면의 바탕이 돼요.',
 visualScenes:'꼭 보고 싶은 순간을 글 속 장면과 삽화를 구성하는 소재로 전달해요.',
 boundaries:'바꾸지 않을 사실과 피할 표현을 정해 이야기와 그림을 만드는 기준으로 전달해요.',
};
export const fictionalStoryUse='실제 추억을 어떤 범위까지 상상 속 장면으로 바꿔도 되는지 정해요.';

// Illustrative sentences, never copied into the customer's answers or generation brief.
export const questionStoryExample:Record<Field,string>={
 recipient:'예) 선물 대상이 ‘하린’이면, “하린에게 전하고 싶은 따뜻한 마음을 이 이야기에 담았어요.”처럼 선물의 뜻을 담아요.',
 protagonist:'예) 주인공을 ‘지우’로 적으면, “지우는 작은 용기를 내어 숲속으로 한 걸음 들어갔어요.”처럼 이야기가 펼쳐져요.',
 relationship:'예) ‘엄마와 딸’이면, “엄마는 지우의 손을 잡고 언제나 네 편이라고 말했어요.”처럼 따뜻한 마음을 담아요.',
 memorableEvent:'예) ‘처음 자전거를 탄 날’이면, “넘어진 지우는 무릎을 털고 다시 페달을 밟았어요.” 같은 중심 장면이 돼요.',
 emotions:'예) ‘무서웠지만 뿌듯했어요’라면, “지우는 떨리는 손을 꼭 쥐었다가, 해낸 뒤 활짝 웃었어요.”처럼 표현해요.',
 specialDetails:'예) ‘노란 장화’라면, “지우의 노란 장화가 물웅덩이 위로 첨벙 뛰어올랐어요.”처럼 특징이 장면에 들어가요.',
 message:'예) ‘실패해도 괜찮아’라면, “지우는 한 번 더 해 볼 수 있다는 마음으로 새로운 길을 바라보았어요.”처럼 마무리해요.',
};
export const designStoryExample:Record<DesignField,string>={
 readingExperience:'예) ‘여섯 살과 함께 읽는 포근한 이야기’라면, “괜찮아, 천천히 가 보자.”처럼 짧고 다정한 문장을 써요.',
 characters:'예) ‘빨간 가방을 멘 토끼’라면, “빨간 가방을 꼭 멘 토끼가 지우를 따라왔어요.”처럼 같은 특징을 이어 가요.',
 worldRules:'예) ‘고맙다고 말하면 열리는 문’이라면, “지우가 고마워라고 말하자 숲의 문이 살며시 열렸어요.” 같은 규칙이 생겨요.',
 goalAndObstacle:'예) ‘해 지기 전 집에 가고 싶은데 다리가 끊어졌어요’라면, “지우는 건널 방법을 찾아 강가를 살펴보았어요.”로 사건이 이어져요.',
 heroChoice:'예) ‘친구에게 도움을 요청해요’라면, “지우는 망설이다가 함께 다리를 만들어 보자고 말했어요.”가 중요한 선택이 돼요.',
 emotionalJourney:'예) ‘처음에는 수줍지만 마지막에는 먼저 인사해요’라면, “지우가 친구에게 다가가 내일도 같이 놀자고 말했어요.”로 변화를 보여 줘요.',
 motifAndEnding:'예) ‘처음 주운 작은 열쇠’라면, “지우는 주머니 속 열쇠로 모두가 기다리던 문을 열었어요.”처럼 앞의 단서를 다시 연결해요.',
 visualScenes:'예) ‘비가 갠 뒤 무지개를 보는 순간’이라면, “지우와 토끼가 반짝이는 하늘을 함께 올려다보았어요.”를 장면의 소재로 삼아요.',
 boundaries:'예) ‘무서운 괴물은 빼 주세요’라면, “지우는 낯선 소리의 정체가 작은 새임을 알고 안심했어요.”처럼 부담 없는 장면으로 풀어요.',
};
export const fictionalStoryExample='예) ‘인형이 말해도 좋아요’라면, “토끼 인형이 지우에게 한 번 더 해 보자고 속삭였어요.”처럼 상상 장면을 더할 수 있어요.';

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

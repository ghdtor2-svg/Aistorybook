// Additive planning fields: preserve legacy IDs, replay and saved answers.
export const designFields=['readingExperience','characters','worldRules','goalAndObstacle','heroChoice','emotionalJourney','motifAndEnding','visualScenes','boundaries'] as const;
export type DesignField=typeof designFields[number];
export type StoryDesign=Partial<Record<DesignField,string>>;
export const designLabels:Record<DesignField,string>={readingExperience:'읽는 아이와 이야기의 목소리',characters:'캐릭터의 변하지 않는 모습',worldRules:'이야기 세계와 약속',goalAndObstacle:'목표와 가로막는 일',heroChoice:'주인공이 직접 내리는 선택',emotionalJourney:'마음이 바뀌는 과정',motifAndEnding:'처음의 단서와 마지막 장면',visualScenes:'그림으로 보고 싶은 장면',boundaries:'반드시 지킬 것과 피할 것'};
export function parseStoryDesign(value:unknown):StoryDesign{
 if(value===undefined)return {};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('이야기 설계 형식을 확인해 주세요.');
 const result:StoryDesign={};
 for(const [key,text]of Object.entries(value)){
  if(!designFields.includes(key as DesignField)||typeof text!=='string'||text.length>4000)throw Error('이야기 설계 내용을 확인해 주세요.');
  result[key as DesignField]=text;
 }
 return result;
}
export type DesignQuestion={id:DesignField;question:string;why:string;example:string;prompts:string[]};
export function storyDesignQuestions(profile:{memorableEvent:string;emotions:string}):DesignQuestion[]{
 const event=profile.memorableEvent;
 const obstacle=/이별|떠나|헤어|이사/.test(event)?'달라진 일상에서 지키거나 새로 시작하고 싶은 것은 무엇인가요?':/학교|유치원|입학|친구/.test(event)?'새 친구나 낯선 장소에서 해 보고 싶은 일과 망설이는 이유는 무엇인가요?':'주인공은 무엇을 이루고 싶고, 무엇 때문에 처음에는 잘되지 않나요?';
 return [
  {id:'readingExperience',question:'누가 어떻게 읽을 동화인가요?',why:'나이와 이야기의 목소리에 맞춰 문장 길이와 긴장감을 정해요.',example:'예: 여섯 살, 부모와 함께 읽기. 짧은 대화가 많은 포근한 모험. 주인공이 “나는” 하고 들려주는 방식.',prompts:['대략적인 나이·읽기 수준','혼자 읽기 / 함께 읽기','포근함·유머·모험 등 원하는 분위기와 말하는 목소리']},
  {id:'characters',question:'그림이 바뀌어도 꼭 같은 모습이어야 할 특징은 무엇인가요?',why:'인물의 외형·고유색·관계를 정해 장면 사이에서 다른 캐릭터가 되는 일을 줄여요.',example:'예: 나린은 밤색 단발, 연두 망토. 포포는 흰 토끼, 빨간 귀끝, 파란 가방.',prompts:['이름·별칭과 인물 또는 동물의 종류','머리·옷·몸의 고유색과 소중한 물건','친구들의 관계와 서로 다른 성격, 누가 어떤 장면에 등장하는지']},
  {id:'worldRules',question:'어떤 세계에서 어떤 약속을 따라 움직이나요?',why:'한 가지 분명한 규칙이 있으면 사건이 우연 대신 이유를 가지고 이어져요.',example:'예: 사계절이 나뉜 숲. 계절 문은 친구들이 각자 잘하는 일을 보탤 때만 열린다. 주문 한 번으로 모든 문제를 풀지는 못한다.',prompts:['주요 장소와 계절·시간','현실적인 세계 / 허용할 판타지','할 수 있는 일과 할 수 없는 일, 그 이유']},
  {id:'goalAndObstacle',question:obstacle,why:'구체적인 목표와 장애물이 있으면 다음 장면이 궁금해져요.',example:'예: 해 지기 전에 길을 복원하고 싶다. 남이 그린 화살표를 믿었다가 끊어진 다리를 만난다.',prompts:['주인공이 정말 바라는 구체적인 일','첫 시도가 잘되지 않는 이유','실패하면 아쉬운 점과 부담스럽지 않은 긴장감']},
  {id:'heroChoice',question:'어려운 순간에 주인공은 무엇을 직접 선택하고 해 보나요?',why:'아이의 관찰·실패·재도전이 결과를 바꾸면 성장이 보여요.',example:'예: 남의 답을 베끼는 대신 직접 관찰하기로 한다. 친구와 기억을 비교하고 가장 중요한 길은 스스로 확인하러 간다.',prompts:['처음 해 볼 행동과 실패한 뒤 바꿀 행동','친구가 보탤 도움과 주인공이 맡을 몫','절정에서 망설이다가 직접 내리는 결정']},
  {id:'emotionalJourney',question:'처음과 마지막의 마음은 어떻게 달라지면 좋을까요?',why:'감정 이름만 붙이지 않고 말·표정·작은 행동의 변화로 보여 줘요.',example:'예: 틀릴까 봐 질문을 숨기던 아이가 “모르겠어, 같이 볼래?”라고 말한다. 마지막에는 새 길 앞에서 먼저 종이를 꺼낸다.',prompts:['시작할 때의 걱정 또는 바람','마음이 흔들리거나 도움을 받는 작은 순간','끝에서 달라진 행동과 억지로 지우지 않아도 되는 감정']},
  {id:'motifAndEnding',question:'처음에 보인 작은 단서가 끝에서 어떤 의미가 되면 좋을까요?',why:'물건·말·장소가 다시 등장하며 역할이 달라지면 이야기가 하나로 묶여요.',example:'예: 처음 주운 별 모양 나뭇조각이 표식을 여는 열쇠가 되고, 마지막에는 새 길을 함께 찾는 사람들의 약속이 된다.',prompts:['물건·한마디·장소 중 기억할 단서 하나','그 단서가 중간에 실제로 하는 일','첫 장면과 이어지는 마지막 장면, 남기고 싶은 여운']},
  {id:'visualScenes',question:'서로 다른 그림으로 꼭 보고 싶은 순간은 무엇인가요?',why:'같은 자세를 반복하지 않고 사건과 감정이 드러나는 장면을 만들어요.',example:'예: 지도 앞의 발견 → 갈림길의 망설임 → 개울 건너기 → 단서 연결 → 마을 사람들과 완성. 마지막에는 작은 보라색 꽃을 기록한다.',prompts:['시작·실패·발견·절정·마무리 장면','장소·시간·등장인물·표정·동작의 차이','큰 풍경과 가까운 표정, 이어져야 하는 소품의 상태']},
  {id:'boundaries',question:'반드시 지켜야 하거나 피하고 싶은 표현이 있나요?',why:'실제 추억과 허용한 각색을 구분하고 원하지 않는 장면을 피하게 해요.',example:'예: 실제 가족관계는 바꾸지 않기. 아이 혼자 잠수하는 장면 피하기. 헤어진 친구는 결말의 집 안에 다시 등장하지 않기.',prompts:['추억에서 바꾸면 안 되는 부분','무서움·슬픔·갈등의 범위와 피할 소재','제공하지 않은 개인정보는 넣지 않기']},
 ];
}
export function designProgress(value:StoryDesign={}){const design=parseStoryDesign(value);return {answered:designFields.filter(f=>design[f]?.trim()).length,total:designFields.length};}
export function coreQuestionHint(group:string){
 const hints:Record<string,string>={recipient:'이름 대신 별칭으로 적어도 좋아요. 주인공이 될 사람과 어떤 사이인지 함께 들려주세요.',event:'그날의 장소, 작은 문제, 직접 한 행동, 이후 달라진 일을 떠오르는 만큼 적어 보세요.',emotion:'“행복했어요”에 그때의 말이나 행동을 한 가지 더하면 마음이 더 잘 전해져요.',details:'그림마다 유지할 모습·고유색·소중한 물건이나 말버릇을 떠올려 보세요.',message:'교훈 한 문장보다 마지막에 아이가 어떤 행동을 해 보면 좋을지 적어도 좋아요.'};
 return hints[group]||'떠오르는 만큼만 적어 주세요.';
}
export const storyCraftInstructions=[
 '입력은 사용자가 확인한 이야기 소재다. 실제 정보와 허용된 창작 각색을 구분하고 비어 있는 개인정보·성격·관계를 실제 사실로 추측하지 않는다.',
 '사계의 탑은 완성도의 목표다. 원작의 줄거리·캐릭터를 복제하거나 같은 품질을 보장한다는 뜻이 아니다.',
 '읽는 연령과 목소리, 캐릭터 고유색·복장·관계, 세계 규칙을 유지한다. 허용한 각색과 반드시 지킬 조건을 따른다.',
 '구체적인 목표 → 첫 시도와 이유 있는 실패 → 관찰·협력으로 바뀐 시도 → 주인공의 선택이 결과를 바꾸는 절정 → 달라진 행동이 보이는 결말로 인과를 연결한다. 우연·새 마법·어른의 일방적인 해결로 끝내지 않는다.',
 '초반의 물건·말·장소를 중간의 행동과 결말에 회수한다. 감정은 대화·표정·행동으로 보여 주고 설교로 요약하지 않는다. 제공되지 않은 감정의 원인을 사실로 단정하지 않는다.',
 '표지 포함 32쪽·본문 삽화 17장으로 편집할 수 있게 장소·시간·인물 배치·동작·감정이 다른 장면을 만든다. 누가 어디에 있고 소품이 어떤 상태인지 이어 준다. 퇴장하거나 헤어진 인물이 설명 없이 다시 등장하지 않게 한다.',
 '한국어 본문 약 2500자(2300~2800자), 연속된 5장. 최종 출력 전 분량·인과·주인공 선택·단서 회수·캐릭터와 소품 연속성·금지 요소를 점검하고 검수 문구를 본문에 섞지 않는다.',
].join('\n');

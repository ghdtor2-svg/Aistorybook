/**
 * 이야기의 결 — 같은 추억으로 어떤 동화를 만들지 고르는 선택지.
 *
 * 왜 넣었나: 지금까지는 추억을 모아 그대로 동화로 옮겼습니다. 그래서 완성된
 * 동화가 '무엇을 전하는 이야기'인지는 운에 맡겨져 있었습니다. 같은 답변으로
 * 다시 만들어도 결이 달라져, 선물로 주려던 마음이 담기지 않는 일이 있었습니다.
 *
 * 고른 결은 생성 지시문에 한 문단으로 들어갑니다. 추억을 바꾸지는 않습니다.
 * 사용자가 적은 사실은 그대로 두고, 그 사실을 어느 쪽으로 비출지만 정합니다.
 *
 * `memory` 가 기본값입니다. 아무것도 고르지 않은 기존 사용자와 이미 만든
 * 동화는 모두 이 값으로 읽힙니다(저장된 값이 없으면 memory 로 복원).
 *
 * 문구를 고칠 때: guidance 는 모델에게 가는 글이고 summary 는 화면에 보이는
 * 글입니다. 둘을 같이 고쳐야 화면과 결과가 어긋나지 않습니다.
 */
export type Theme = {id: string; label: string; summary: string; guidance: string};

export const THEMES: Theme[] = [
 {
  id: 'memory',
  label: '추억 그대로',
  summary: '들려주신 기억의 결을 그대로 따라갑니다. 교훈을 덧붙이지 않아요.',
  guidance: '교훈이나 주제를 따로 덧붙이지 마세요. 사용자가 들려준 기억의 분위기와 순서를 그대로 따라가며, 그 장면이 왜 특별했는지가 자연스럽게 드러나게 씁니다.',
 },
 {
  id: 'gratitude',
  label: '감사와 사랑',
  summary: '전하고 싶은 마음을 중심에 둡니다. 선물로 주는 동화에 어울려요.',
  guidance: '전하고 싶은 마음이 이야기의 중심에 오게 하세요. 고맙다는 말을 직접 적기보다, 주인공이 그 마음을 깨닫는 장면으로 보여 줍니다. 마지막 장은 받는 사람에게 건네는 따뜻한 마무리로 씁니다.',
 },
 {
  id: 'selfEsteem',
  label: '자존감',
  summary: '스스로를 귀하게 여기는 마음이 자라나는 이야기로 풀어냅니다.',
  guidance: '주인공이 자기 자신을 귀하게 여기게 되는 과정을 중심에 두세요. 남과 견주어 이기는 방식이 아니라, 자신의 고유한 점을 스스로 알아보는 방식으로 씁니다. 외모나 성적으로 가치를 매기지 마세요.',
 },
 {
  id: 'relationship',
  label: '관계와 우정',
  summary: '함께한 사람과의 사이가 깊어지는 과정을 그립니다.',
  guidance: '주인공과 상대의 관계가 깊어지는 과정을 중심에 두세요. 오해나 서운함이 있었다면 서로를 이해하게 되는 장면을 넣되, 어느 한쪽을 나쁜 사람으로 만들지 마세요.',
 },
 {
  id: 'emotion',
  label: '감정 표현',
  summary: '그때의 마음에 이름을 붙이고 말로 꺼내는 법을 담습니다.',
  guidance: '주인공이 자기 감정을 알아차리고 말로 꺼내는 과정을 중심에 두세요. 감정에 좋고 나쁨을 매기지 말고, 슬픔이나 화남도 있는 그대로 받아들이는 장면을 넣습니다.',
 },
 {
  id: 'courage',
  label: '용기와 도전',
  summary: '망설이던 일에 한 걸음 내딛는 순간을 중심에 둡니다.',
  guidance: '주인공이 망설이던 일에 한 걸음 내딛는 순간을 중심에 두세요. 두려움을 없애는 것이 아니라 두려움을 안고도 해내는 모습으로 씁니다. 결과의 성공 여부보다 시도한 것 자체를 귀하게 다룹니다.',
 },
];

export const DEFAULT_THEME = 'memory';

/** 저장된 값이나 화면에서 온 값이 아는 결인지 확인한다. 모르는 값은 기본값으로 떨어진다. */
export function isTheme(value: unknown): value is string {
 return typeof value === 'string' && THEMES.some(theme => theme.id === value);
}

/** 결 하나를 찾는다. 모르는 값이면 기본값을 돌려준다(화면이 빈칸이 되지 않게). */
export function findTheme(id: unknown): Theme {
 return THEMES.find(theme => theme.id === id) ?? THEMES[0];
}

/** 생성 지시문에 넣을 한 문단. 결을 고르지 않았으면 빈 문자열이라 지시문이 늘어나지 않는다. */
export function themeGuidance(id: unknown): string {
 const theme = findTheme(id);
 return theme.id === DEFAULT_THEME ? '' : '이야기의 결: ' + theme.label + '. ' + theme.guidance;
}

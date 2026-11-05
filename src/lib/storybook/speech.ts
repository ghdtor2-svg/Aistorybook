/**
 * 동화 낭독 — 읽어 주는 기능의 규칙만 모은 곳. 브라우저 API 는 여기 없습니다.
 *
 * 왜 문장으로 쪼개나: 브라우저 음성(SpeechSynthesis)에 긴 글을 통째로 넘기면
 * 중간에 말을 멈추고 다시 시작하지 않습니다. 크롬 계열에서 특히 그렇습니다.
 * 한 장을 통째로 넘기면 동화 중간에서 조용해지고, 왜 멈췄는지도 알 수 없습니다.
 * 그래서 문장 단위로 끊어 하나씩 넘기고, 하나가 끝나면 다음을 넘깁니다.
 * 중간에 멈춰도 어디까지 읽었는지 알 수 있어 이어 읽기와 따라가기가 됩니다.
 *
 * 쪼갠 조각을 모두 이으면 원문이 그대로 나와야 합니다(공백 정리는 제외).
 * 글자가 사라지면 듣는 사람은 알아차릴 방법이 없습니다. 검사로 묶어 두었습니다.
 *
 * 낭독은 읽기 보조일 뿐이라 글을 바꾸지 않습니다. 실패해도 동화는 그대로 읽힙니다.
 */

/** 한 조각의 최대 길이. 이보다 길면 말이 끊기기 시작합니다. */
export const SPEECH_SEGMENT_MAX = 180;

/** 고를 수 있는 낭독 속도. 글자 크기처럼 몇 개만 둡니다. */
export const SPEECH_RATES = [0.8, 1, 1.2] as const;
export type SpeechRate = typeof SPEECH_RATES[number];
export const DEFAULT_SPEECH_RATE: SpeechRate = 1;
export const SPEECH_RATE_LABELS: Record<string, string> = {'0.8': '느리게', '1': '보통', '1.2': '조금 빠르게'};

export function isSpeechRate(value: unknown): value is SpeechRate {
 return typeof value === 'number' && (SPEECH_RATES as readonly number[]).includes(value);
}

/** 문장이 끝났다고 볼 글자. 말줄임표와 한자권 마침표까지 포함합니다. */
const SENTENCE_END = /([.!?。！？…]+["'”’)\]】』」]*)\s+/g;

/**
 * 너무 긴 한 문장을 다시 자른다. 마침표가 없는 글(대사·목록)에서 생깁니다.
 * 띄어쓰기에서 자르고, 띄어쓰기마저 없으면 길이로 자릅니다(자르지 않으면 말이 끊김).
 */
function splitLong(part: string): string[] {
 if (part.length <= SPEECH_SEGMENT_MAX) return [part];
 const out: string[] = [];
 let rest = part;
 while (rest.length > SPEECH_SEGMENT_MAX) {
  const window = rest.slice(0, SPEECH_SEGMENT_MAX + 1);
  const cut = window.lastIndexOf(' ');
  const at = cut > 40 ? cut : SPEECH_SEGMENT_MAX;
  out.push(rest.slice(0, at).trim());
  rest = rest.slice(at).trim();
 }
 if (rest) out.push(rest);
 return out.filter(Boolean);
}

/**
 * 읽어 줄 조각 목록. 빈 조각은 넣지 않습니다(빈 조각을 넘기면 그 자리에서 멈춥니다).
 * 줄바꿈은 문단 경계로 보아 먼저 끊습니다.
 */
export function speechSegments(text: string): string[] {
 if (typeof text !== 'string' || !text.trim()) return [];
 return text
  .split(/\n+/)
  .flatMap(line => line.replace(SENTENCE_END, '$1\u0000').split('\u0000'))
  .map(part => part.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .flatMap(splitLong);
}

/** 읽어 줄 조각 하나. chapter 가 -1 이면 겉 표지(동화 제목)입니다. */
export type SpeechPart = {text: string; chapter: number};

/**
 * 한 권을 통째로 읽을 때의 순서. 제목 → 장 제목 → 장 본문.
 *
 * 조각마다 몇 장인지 달아 둡니다. 읽는 중에 그 장으로 화면을 옮기고
 * '지금 몇 장을 읽는 중'이라고 알리기 위해서입니다. 달아 두지 않으면
 * 듣는 사람이 눈으로 따라갈 수 없습니다.
 */
export function bookSpeechPlan(book: {title: string; chapters: {title: string; text: string}[]}): SpeechPart[] {
 return [
  ...speechSegments(book.title).map(text => ({text, chapter: -1})),
  ...book.chapters.flatMap((chapter, index) =>
   [...speechSegments(chapter.title), ...speechSegments(chapter.text)].map(text => ({text, chapter: index}))),
 ];
}

/**
 * 한국어를 읽을 수 있는 목소리를 고른다.
 *
 * 목소리 목록은 기기마다 다르고, 없을 수도 있습니다. 없으면 null 을 돌려주고
 * 화면이 '이 기기에서는 낭독할 수 없다'고 알립니다. 아무 목소리나 집어서
 * 한국어를 영어 발음으로 읽게 두지 않습니다.
 */
export function pickKoreanVoice<T extends {lang: string; localService?: boolean; default?: boolean}>(voices: T[]): T | null {
 const korean = voices.filter(voice => typeof voice?.lang === 'string' && /^ko(-|_|$)/i.test(voice.lang));
 if (korean.length === 0) return null;
 return korean.find(voice => voice.default) ?? korean.find(voice => voice.localService) ?? korean[0];
}

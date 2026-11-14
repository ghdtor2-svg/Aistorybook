import type {Book} from './books';
import {validStoryUnicode} from './story-font';
export const reviewChecks=['causality','continuity','characters','sourceRespect','naturalKorean','completeEnding'] as const;
export const storyReviewInstructions=[
 '당신은 동화의 출고 전 편집자입니다. 아래 원래 요청과 완성 초안을 비교하여 개연성·연속성·한국어 문장을 검수하고, 문제가 있으면 고친 완성본을 반환하세요.',
 '장면 사이에서 장소·시간·인물의 이동이 설명 없이 바뀌는지, 아직 받지 않은 물건을 쓰거나 이미 떠난 인물이 갑자기 나오는지 확인하세요. 필요한 짧은 연결 문장으로 해결하고 불필요한 새 사건을 늘리지 마세요.',
 '주인공의 목표→행동→결과가 원인과 결과로 연결되어야 합니다. 우연이나 갑자기 나타난 인물·도구가 문제를 대신 해결하지 않게 하고, 마지막 장까지 앞선 사건의 결과로 닫으세요.',
 '제공한 주인공 이름·별칭·관계·나이·기억·금지 요소를 바꾸지 마세요. 선물 대상과 주인공을 혼동하거나 성인 관계를 어린아이 관계로 바꾸지 마세요. 원래 요청에 없는 개인정보는 사실처럼 덧붙이지 마세요.',
 '어색한 비유·주어와 서술어 불일치·반복 문장·호칭과 시제 오류·깨진 문자·오탈자를 바로잡으세요. 말투는 요청한 독자와 분위기에 맞추세요.',
 '정확히 5개 장, 본문 공백 포함 1800~3600자(목표 약 2500자)를 유지하세요. 이야기 본문에 검수 보고나 장 번호·쪽 번호를 섞지 마세요.',
 'JSON만 반환하세요: {"title":"제목","chapters":[{"title":"장 제목","text":"본문"}],"note":"창작 안내","review":{"causality":true,"continuity":true,"characters":true,"sourceRespect":true,"naturalKorean":true,"completeEnding":true}}.',
 'review 항목은 고친 최종 본문을 다시 읽고 각각 충족할 때만 true로 쓰세요. 원래 요청의 충돌 등으로 해결할 수 없으면 해당 항목을 false로 쓰세요. 검수가 통과하지 않으면 고객에게 완성본을 전달하지 않습니다.',
].join('\n');
export function validStoryReview(value:unknown){
 if(!value||typeof value!=='object')return false;
 const review=(value as Record<string,unknown>).review;
 return !!review&&typeof review==='object'&&reviewChecks.every(check=>(review as Record<string,unknown>)[check]===true);
}
export function validBookText(book:Book){return validStoryUnicode(book.title+book.note+book.chapters.map(chapter=>chapter.title+chapter.text).join(''));}

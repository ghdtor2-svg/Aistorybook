const assert=require('assert/strict');
const {emphasize}=require('../.test-build/storybook/emphasis');

const join=pieces=>pieces.map(piece=>piece.text).join('');
const kinds=pieces=>pieces.filter(piece=>piece.kind!=='plain').map(piece=>piece.kind+':'+piece.text);

const text='엄마는 손을 흔들었어요. "잘 하고 있어, 지우!" 마음은 두근두근, 바람은 살랑살랑 불었어요.';
const {pieces,endsInSpeech}=emphasize(text);
assert.equal(join(pieces),text);
assert.equal(endsInSpeech,false);
assert.deepEqual(kinds(pieces),['speech:"잘 하고 있어, 지우!"','sound:두근두근','sound:살랑살랑']);

// 굽은 따옴표. 대사 안의 반복말은 대사 하나로 묶는다.
assert.deepEqual(kinds(emphasize('“째깍째깍, 시간이야!” 하고 말했어요.').pieces),['speech:“째깍째깍, 시간이야!”']);
// 강조할 곳이 없으면 글 전체가 한 조각이다.
assert.deepEqual(emphasize('조용한 오후였어요.').pieces,[{text:'조용한 오후였어요.',kind:'plain'}]);
assert.deepEqual(emphasize('').pieces,[]);

// 대사가 쪽을 넘어가는 경우: 앞쪽 끝은 대사로 열린 채 끝나고, 다음 쪽은 대사로 시작한다.
const first='엄마가 말했어요. "지우야, 조심해서 타렴.';
const second=' 토끼 인형도 잊지 말고." 엄마의 말에 지우는 웃었어요.';
const a=emphasize(first);
assert.equal(join(a.pieces),first);
assert.equal(a.endsInSpeech,true);
assert.deepEqual(kinds(a.pieces),['speech:"지우야, 조심해서 타렴.']);
const b=emphasize(second,a.endsInSpeech);
assert.equal(join(b.pieces),second);
assert.equal(b.endsInSpeech,false);
assert.deepEqual(kinds(b.pieces),['speech: 토끼 인형도 잊지 말고."']);
console.log('PASS emphasis: speech across pages, repeated sound words, text preserved');

// 쪽 단위: 같은 문단이면 대사를 이어 강조하고, 문단이 바뀌면 끊는다.
const {emphasizePages}=require('../.test-build/storybook/emphasis');
const pages=[
  {parts:[{text:first,chapterIndex:0,paragraphIndex:1}]},
  {parts:[{text:second,chapterIndex:0,paragraphIndex:1},{text:'"닫히지 않은',chapterIndex:0,paragraphIndex:2}]},
  {parts:[{text:'새 문단이에요.',chapterIndex:0,paragraphIndex:3}]},
];
const marked=emphasizePages(pages);
assert.deepEqual(kinds(marked[1][0]),['speech: 토끼 인형도 잊지 말고."']);
assert.deepEqual(kinds(marked[2][0]),[]);
console.log('PASS emphasizePages: carries speech within a paragraph only');

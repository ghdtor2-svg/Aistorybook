const assert=require('node:assert/strict');
const {planStorybook,planStoryPages}=require('../.test-build/storybook/book-layout');
const {wrapText,wordGroups}=require('../.test-build/storybook/word-wrap');
const segmenter=new Intl.Segmenter('ko',{granularity:'sentence'});
function verify(chapters,count=32){
 const pages=planStoryPages(chapters,count);
 assert.equal(pages.length,count);
 const expected=chapters.flatMap((chapter,c)=>chapter.text.split(/\n\s*\n/).flatMap((p,k)=>Array.from(segmenter.segment(p),s=>({text:s.segment,c,k})).filter(s=>s.text.trim())));
 let index=0;
 for(const page of pages){
  for(const part of page.parts){
   let combined='';
   while(combined.length<part.text.length){
    const next=expected[index++];assert.ok(next,'Extra text');
    assert.equal(part.chapterIndex,next.c);assert.equal(part.paragraphIndex,next.k);
    combined+=next.text;
   }
   assert.equal(part.text,combined,'Page must end at a complete sentence boundary');
  }
 }
 assert.equal(index,expected.length,'No sentence may disappear');
 return pages;
}
const example='낙엽이가 계절을 넘겨받았어.';
const normal=Array.from({length:5},(_,c)=>({title:'장 '+c,text:Array.from({length:13},(_,i)=>`${i}번째 날이 되었어. ${example} “이제 내 차례야!” 친구들이 말했어.`).join('\n\n')}));
verify(normal);
const long='낙엽이는 '+('친구들과 계절의 아름다움을 이야기하며 '.repeat(30))+'계절을 넘겨받았어.';
verify([{title:'긴 문장',text:long+' '+example}]);
verify([{title:'마지막',text:Array.from({length:33},(_,i)=>`${i}번째 친구가 계절을 넘겨받았어.`).join(' ')}]);
verify([{title:'짧은 원고',text:example}]);
verify([{title:'대사',text:'“낙엽아, 이제 네 차례야. 천천히 시작해도 좋아!”\n\n눈송이는 고개를 끄덕였어. 마지막 문장은 마침표 없이 끝나도 보존해'}]);
verify([{title:'비어 있음',text:''}]);
const brokenParagraph=verify([{title:'입력 줄바꿈',text:'낙엽이가 계절을\n\n넘겨받았어. 다음 계절이 시작됐어.'}]);
assert.ok(brokenParagraph.some(p=>p.parts.map(t=>t.text).join(' ').includes('낙엽이가 계절을 넘겨받았어.')),'Blank lines inside a sentence must not force a page turn');
const plan=planStorybook({chapters:normal});assert.equal(plan.spreads.length,16);assert.equal(plan.scenes.length,17);
assert.deepEqual(wrapText(s=>s.length,example,8),['낙엽이가 계절을','넘겨받았어.']);
assert.deepEqual(wrapText(s=>s.length,'아주아주긴어절도쪼개지않아요',4),['아주아주긴어절도쪼개지않아요']);
assert.deepEqual(wrapText(s=>s.length,'첫 문장\n다음 문장',5),['첫 문장','다음 문장']);
const groups=wordGroups([{text:'두근',kind:'sound'},{text:'두근해졌어. ',kind:'plain'},{text:'“내 차례야!”',kind:'speech'}]);
assert.deepEqual(groups.map(g=>g.map(p=>p.text).join('')),['두근두근해졌어. ','“내 ','차례야!”']);
assert.equal(groups[0].length,2,'A styled word must stay together without losing styles');
console.log('PASS pagination: whole sentences, long/short/empty manuscripts, final page, dialogue, preserved text; word wrapping including style boundaries');

const assert=require('assert/strict');
const {THEMES,DEFAULT_THEME,isTheme,findTheme,themeGuidance}=require('../.test-build/storybook/themes');
const {parseBook,parseBooks,TALKING_POINT_LIMIT,TALKING_POINT_LENGTH}=require('../.test-build/storybook/books');
const {parseReadingPreferences,applyReadingPatch,saveReadingPatch,emptyReadingPreferences,READING_KEY}=require('../.test-build/storybook/reading-preferences');
const {speechSegments,bookSpeechPlan,pickKoreanVoice,SPEECH_SEGMENT_MAX,SPEECH_RATES,DEFAULT_SPEECH_RATE,isSpeechRate}=require('../.test-build/storybook/speech');
const {parseImageStore,putBookImages,removeBookImages,bookImages,hasBookImages,emptyImageStore,serializeImageStore,IMAGE_STORE_LIMIT,IMAGE_MAX_LENGTH,IMAGE_PER_BOOK}=require('../.test-build/storybook/book-images');
const {bookDocument}=require('../.test-build/storybook/book-document');

// ── 이야기의 결 ──────────────────────────────────────────────────────
assert.ok(THEMES.length>=2);
assert.equal(new Set(THEMES.map(t=>t.id)).size,THEMES.length,'결 아이디는 겹치면 안 된다');
assert.ok(THEMES.every(t=>t.label&&t.summary&&t.guidance),'화면 문구와 모델 지시문이 모두 있어야 한다');
assert.ok(isTheme(DEFAULT_THEME));
// 모르는 값이 와도 화면이 빈칸이 되지 않는다. 기본값으로 떨어진다.
assert.equal(isTheme('고양이'),false);
assert.equal(isTheme(null),false);
assert.equal(findTheme('고양이').id,DEFAULT_THEME);
assert.equal(findTheme(undefined).id,DEFAULT_THEME);
// 기본값은 지시문을 늘리지 않는다 — 아무것도 고르지 않은 사람에게 교훈을 붙이지 않는다.
assert.equal(themeGuidance(DEFAULT_THEME),'');
const picked=THEMES.find(t=>t.id!==DEFAULT_THEME);
assert.ok(themeGuidance(picked.id).includes(picked.label));
assert.equal(themeGuidance('없는결'),'');
console.log('PASS themes are unique, unknown values fall back, and the default adds no instruction');

// ── 예전 책장이 그대로 열린다 ────────────────────────────────────────
// 결과 대화 질문은 나중에 더한 항목이다. 없다고 책을 버리면 책장을 통째로 잃는다.
const old={id:'book-1',title:'오래된 동화',chapters:[{title:'1장',text:'본문'}],note:'메모',model:'gpt',createdAt:'2026-01-01T00:00:00.000Z'};
const restored=parseBook(old);
assert.equal(restored.theme,DEFAULT_THEME);
assert.deepEqual(restored.talkingPoints,[]);
assert.equal(restored.title,'오래된 동화');
// 모르는 결이 저장돼 있어도 책을 버리지 않는다.
assert.equal(parseBook({...old,theme:'사라진결'}).theme,DEFAULT_THEME);
// 대화 질문이 깨져 있어도 던지지 않는다 — 동화를 읽는 데 필요한 내용이 아니다.
assert.deepEqual(parseBook({...old,talkingPoints:'문자열'}).talkingPoints,[]);
assert.deepEqual(parseBook({...old,talkingPoints:[1,null,{},'  ']}).talkingPoints,[]);
assert.deepEqual(parseBook({...old,talkingPoints:['좋아','',42,'싫어']}).talkingPoints,['좋아','싫어']);
// 너무 긴 질문과 너무 많은 질문은 버린다.
assert.deepEqual(parseBook({...old,talkingPoints:['가'.repeat(TALKING_POINT_LENGTH+1)]}).talkingPoints,[]);
assert.equal(parseBook({...old,talkingPoints:Array.from({length:TALKING_POINT_LIMIT+4},(_,i)=>'질문'+i)}).talkingPoints.length,TALKING_POINT_LIMIT);
// 책장 전체를 거쳐도 값이 유지된다.
const shelf=parseBooks(JSON.stringify([{...old,theme:picked.id,talkingPoints:['무엇이 기억에 남았어?']}]));
assert.equal(shelf[0].theme,picked.id);
assert.deepEqual(shelf[0].talkingPoints,['무엇이 기억에 남았어?']);
console.log('PASS older shelves still open, unknown themes and broken talking points degrade instead of throwing');

// ── 읽기 설정: 낭독 속도를 더해도 기존 설정이 살아남는다 ─────────────
assert.equal(parseReadingPreferences(null).speechRate,DEFAULT_SPEECH_RATE);
// 낭독이 없던 시절의 저장본. 글자 크기와 읽던 장이 그대로 남아야 한다.
const legacy=JSON.stringify({version:1,size:22,selectedBookId:'book-1',chapters:{'book-1':3}});
const read=parseReadingPreferences(legacy);
assert.equal(read.size,22);
assert.equal(read.selectedBookId,'book-1');
assert.equal(read.chapters['book-1'],3);
assert.equal(read.speechRate,DEFAULT_SPEECH_RATE,'없던 값은 기본 속도로 읽는다');
// 속도 값만 깨져 있어도 나머지 설정을 잃지 않는다.
const broken=parseReadingPreferences(JSON.stringify({version:1,size:26,chapters:{},speechRate:'빠르게'}));
assert.equal(broken.size,26);
assert.equal(broken.speechRate,DEFAULT_SPEECH_RATE);
// 저장은 다시 읽어 확인하는 구조다. 새 값이 그 왕복에서 사라지면 설정이 저장되지 않는다.
const store={value:null,getItem(){return this.value;},setItem(key,value){this.value=value;}};
const rate=SPEECH_RATES.find(r=>r!==DEFAULT_SPEECH_RATE);
const saved=saveReadingPatch(store,{kind:'rate',rate});
assert.equal(saved.speechRate,rate);
assert.equal(parseReadingPreferences(store.value).speechRate,rate,'왕복 뒤에도 속도가 남아야 한다');
// 다른 설정을 바꿔도 속도가 지워지지 않는다.
assert.equal(saveReadingPatch(store,{kind:'size',size:26}).speechRate,rate);
assert.throws(()=>applyReadingPatch(emptyReadingPreferences(),{kind:'rate',rate:9}));
assert.equal(isSpeechRate(9),false);
console.log('PASS speech rate persists through the save round-trip and never costs existing reading settings');

// ── 낭독 조각 ────────────────────────────────────────────────────────
assert.deepEqual(speechSegments(''),[]);
assert.deepEqual(speechSegments('   '),[]);
assert.deepEqual(speechSegments(null),[]);
// 글자가 사라지면 듣는 사람은 알아차릴 수 없다. 이으면 원문이 그대로 나와야 한다.
for(const sample of [
 '옛날에 작은 토끼가 살았어요. 토끼는 숲을 좋아했어요! 정말로요?',
 '첫째 줄입니다.\n둘째 줄입니다.\n\n셋째 줄입니다.',
 '“같이 가자.” 토끼가 말했어요… 그리고 둘은 떠났어요.',
 '마침표가 하나도 없는 아주 긴 문장 '.repeat(30),
]){
 const parts=speechSegments(sample);
 assert.ok(parts.length>0);
 assert.ok(parts.every(part=>part.trim().length>0),'빈 조각을 넘기면 그 자리에서 낭독이 멈춘다');
 assert.ok(parts.every(part=>part.length<=SPEECH_SEGMENT_MAX),'조각이 길면 브라우저가 중간에 말을 멈춘다');
 assert.equal(parts.join(' '),sample.replace(/\s+/g,' ').trim(),'조각을 이으면 원문이어야 한다');
}
// 한 권을 읽을 때 지금 몇 장인지 따라갈 수 있어야 한다.
const plan=bookSpeechPlan({title:'제목',chapters:[{title:'1장',text:'가나다.'},{title:'2장',text:'라마바.'}]});
assert.equal(plan[0].chapter,-1,'표지(동화 제목)는 -1 이다');
assert.ok(plan.some(part=>part.chapter===0));
assert.ok(plan.some(part=>part.chapter===1));
assert.ok(plan.every(part=>part.text.trim()));
// 장 번호는 뒤로만 간다. 뒤섞이면 화면이 엉뚱한 장으로 튄다.
const order=plan.map(p=>p.chapter);
assert.deepEqual(order,[...order].sort((a,b)=>a-b));
// 한국어 목소리가 없으면 없다고 해야 한다. 영어 목소리로 한국어를 읽히지 않는다.
assert.equal(pickKoreanVoice([]),null);
assert.equal(pickKoreanVoice([{lang:'en-US'},{lang:'ja-JP'}]),null);
assert.equal(pickKoreanVoice([{lang:'en-US'},{lang:'ko-KR'}]).lang,'ko-KR');
assert.equal(pickKoreanVoice([{lang:'ko-KR',localService:true},{lang:'ko-KR',default:true}]).default,true);
console.log('PASS speech chunks keep every character, stay short enough to finish, and refuse non-Korean voices');

// ── 삽화 서랍 ────────────────────────────────────────────────────────
const picture=length=>'data:image/webp;base64,'+'A'.repeat(length);
assert.deepEqual(parseImageStore(null),emptyImageStore());
assert.deepEqual(parseImageStore('깨진 내용'),emptyImageStore(),'서랍이 깨져도 화면이 멈추면 안 된다');
assert.deepEqual(parseImageStore(JSON.stringify({version:2,images:[]})),emptyImageStore());
// 바깥 주소는 받지 않는다. 받으면 동화 파일을 열 때 바깥으로 요청이 나간다.
const outside=JSON.stringify({version:1,images:[{bookId:'b',chapter:0,dataUrl:'https://example.com/a.png',createdAt:'2026-01-01T00:00:00.000Z'}]});
assert.deepEqual(parseImageStore(outside).images,[]);
const scripted=JSON.stringify({version:1,images:[{bookId:'b',chapter:0,dataUrl:'data:text/html;base64,AAAA',createdAt:'2026-01-01T00:00:00.000Z'}]});
assert.deepEqual(parseImageStore(scripted).images,[]);
// 장 번호가 책 밖이면 받지 않는다.
const far=JSON.stringify({version:1,images:[{bookId:'b',chapter:IMAGE_PER_BOOK,dataUrl:picture(10),createdAt:'2026-01-01T00:00:00.000Z'}]});
assert.deepEqual(parseImageStore(far).images,[]);
// 넣고 꺼내기. 그리지 않은 장은 빈칸이다.
let drawer=putBookImages(emptyImageStore(),'book-1',[{chapter:0,dataUrl:picture(20)},{chapter:2,dataUrl:picture(20)}],'2026-01-01T00:00:00.000Z').store;
assert.deepEqual(bookImages(drawer,'book-1',3),[picture(20),'',picture(20)]);
assert.equal(hasBookImages(drawer,'book-1'),true);
assert.equal(hasBookImages(drawer,'book-2'),false);
assert.deepEqual(bookImages(drawer,'book-2',2),['','']);
// 서랍을 거쳐도 값이 살아남는다.
assert.deepEqual(bookImages(parseImageStore(serializeImageStore(drawer)),'book-1',3),[picture(20),'',picture(20)]);
// 지우면 그 권만 사라진다.
const two=putBookImages(drawer,'book-2',[{chapter:0,dataUrl:picture(20)}]).store;
assert.equal(hasBookImages(removeBookImages(two,'book-1'),'book-2'),true);
assert.equal(hasBookImages(removeBookImages(two,'book-1'),'book-1'),false);
// 받을 수 없는 그림만 왔으면 조용히 넘어가지 않고 알린다.
assert.throws(()=>putBookImages(emptyImageStore(),'book-1',[{chapter:0,dataUrl:'https://example.com/a.png'}]));
assert.throws(()=>putBookImages(emptyImageStore(),'book-1',[]));
// 한 장이 한도를 넘으면 받지 않는다(화면의 줄이기가 실패했다는 뜻).
assert.throws(()=>putBookImages(emptyImageStore(),'book-1',[{chapter:0,dataUrl:picture(IMAGE_MAX_LENGTH+1)}]));
console.log('PASS the image drawer rejects outside URLs, survives corruption, and keeps books separate');

// ── 자리가 모자랄 때: 방금 그린 그림은 지키고 오래된 권부터 버린다 ────
const big=390_000;
let full=emptyImageStore();
const pack=index=>Array.from({length:3},(_,chapter)=>({chapter,dataUrl:picture(big)}));
full=putBookImages(full,'old-1',pack(),'2026-01-01T00:00:00.000Z').store;
full=putBookImages(full,'old-2',pack(),'2026-02-01T00:00:00.000Z').store;
const result=putBookImages(full,'new-book',pack(),'2026-03-01T00:00:00.000Z');
assert.ok(serializeImageStore(result.store).length<=IMAGE_STORE_LIMIT,'한도를 넘으면 브라우저가 저장을 거부한다');
// 방금 그린 그림은 절대 버리지 않는다. 버리면 돈만 쓰고 아무것도 남지 않는다.
assert.equal(hasBookImages(result.store,'new-book'),true);
assert.equal(bookImages(result.store,'new-book',3).filter(Boolean).length,3);
// 가장 오래된 권부터 버린다.
assert.ok(result.evicted.includes('old-1'));
assert.equal(hasBookImages(result.store,'old-1'),false);
// 권 단위로 버린다 — 한 권의 그림을 일부만 남기면 중간 장만 그림이 있는 책이 된다.
for(const id of ['old-1','old-2','new-book']){
 const drawn=bookImages(result.store,id,3).filter(Boolean).length;
 assert.ok(drawn===0||drawn===3,'그림은 권 단위로 남거나 사라져야 한다 ('+id+')');
}
console.log('PASS eviction frees space by whole books, oldest first, and never drops the images just paid for');

// ── 내려받는 파일 ────────────────────────────────────────────────────
const book={id:'book-1',title:'제목',chapters:[{title:'1장',text:'본문입니다.'},{title:'2장',text:'둘째 본문.'}],note:'메모',model:'gpt',createdAt:'2026-01-01T00:00:00.000Z',theme:DEFAULT_THEME,talkingPoints:['무엇이 가장 기억에 남았어?','너라면 어떻게 했을까?']};
const withPictures=bookDocument(book,[picture(12),picture(12)]);
assert.ok(withPictures.includes('<img alt="" src="'+picture(12)+'"'),'보관한 그림이 파일에 들어가야 한다');
assert.ok(withPictures.includes("img-src data:"),'그림을 넣으면 CSP 가 data: 를 허용해야 보인다');
// 그림을 넣어도 바깥으로 나가는 요청은 하나도 없어야 한다.
assert.ok(!/https?:\/\//.test(withPictures),'바깥 주소가 들어가면 파일을 열 때 요청이 나간다');
assert.ok(!/<script|<iframe|<form/.test(withPictures));
// 바깥 주소를 그림 자리에 넣으려 해도 들어가지 않는다.
const injected=bookDocument(book,['https://example.com/a.png','javascript:alert(1)']);
assert.ok(!injected.includes('example.com'));
assert.ok(!injected.includes('javascript:'));
assert.ok(!injected.includes('<img'),'받을 수 없는 그림은 아예 넣지 않는다');
// 대화 질문이 보이고, 사용자 글이므로 escape 를 거친다.
assert.ok(withPictures.includes('읽고 나서 함께 나눌 이야기'));
assert.ok(withPictures.includes('무엇이 가장 기억에 남았어?'));
const nasty=bookDocument({...book,talkingPoints:['<script>alert(1)</script>']},[]);
assert.ok(!nasty.includes('<script>'));
assert.ok(nasty.includes('&lt;script&gt;'));
// 대화 질문이 없던 예전 책도 그대로 내려받힌다 — 여기서 죽으면 내려받기 전체가 막힌다.
const legacyDoc=bookDocument({id:'b',title:'제목',chapters:[{title:'1장',text:'본문'}],note:'',model:'',createdAt:''});
assert.ok(legacyDoc.startsWith('<!doctype html>'));
assert.ok(!legacyDoc.includes('읽고 나서 함께 나눌 이야기'));
assert.ok(bookDocument({...book,talkingPoints:undefined},[]).startsWith('<!doctype html>'));
console.log('PASS downloaded file embeds only stored images, stays request-free, and escapes talking points');

// ── 요청 출처 검사 ────────────────────────────────────────────────────
const {sameOrigin}=require('../.test-build/storybook/same-origin');
const req=(headers,url='http://localhost:3000/api/office/story')=>({url,headers:{get:name=>headers[name]??null}});
// 2026-11-05 에 실제로 뒤집혀 있던 경우. 개발 서버를 127.0.0.1 로 띄우면
// request.url 이 localhost 로 잡혀, 진짜 우리 화면이 막히고 남이 통과했다.
assert.equal(sameOrigin(req({origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'})),true,'브라우저가 붙은 곳과 같으면 통과해야 한다');
assert.equal(sameOrigin(req({origin:'http://localhost:3000',host:'127.0.0.1:3000'})),false,'붙은 곳과 다르면 막아야 한다');
// 바깥 사이트는 어떤 경우에도 막는다.
assert.equal(sameOrigin(req({origin:'https://evil.example',host:'nangman-hanjul.netlify.app'},'https://nangman-hanjul.netlify.app/api/office/story')),false);
assert.equal(sameOrigin(req({origin:'https://nangman-hanjul.netlify.app.evil.example',host:'nangman-hanjul.netlify.app'})),false);
// 공개 배포에서 정상 요청.
assert.equal(sameOrigin(req({origin:'https://nangman-hanjul.netlify.app',host:'nangman-hanjul.netlify.app'},'https://nangman-hanjul.netlify.app/api/office/story')),true);
// 프록시가 원래 호스트를 따로 넘겨 주는 경우.
assert.equal(sameOrigin(req({origin:'https://nangman-hanjul.netlify.app','x-forwarded-host':'nangman-hanjul.netlify.app',host:'internal.local'})),true);
// Host 가 없으면 예전 방식으로 떨어진다.
assert.equal(sameOrigin(req({origin:'http://localhost:3000'})),true);
assert.equal(sameOrigin(req({origin:'http://127.0.0.1:3000'})),false);
// Origin 이 없는 요청은 예전처럼 통과시킨다(분당 제한과 승인 플래그가 막는다).
assert.equal(sameOrigin(req({})),true);
// 망가진 Origin 은 막는다.
assert.equal(sameOrigin(req({origin:'아무거나'})),false);
assert.equal(sameOrigin(req({origin:''})),true);
console.log('PASS origin check follows the host the browser actually reached, not a rebuilt URL');

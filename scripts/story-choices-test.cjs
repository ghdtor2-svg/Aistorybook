const assert=require('node:assert/strict');
const path=require('node:path');
const compiled=path.join(process.argv[2]||process.cwd(),'.test-build');
const {isChosen,addChoice,toggleChoice,chosenCount,coreQuestionChoices,designQuestionChoices,CHOICE_SEPARATOR,MAX_DIRECT_CHOICE_LENGTH}=require(path.join(compiled,'story-choices'));
const {designFields,storyDesignQuestions}=require(path.join(compiled,'story-design'));
const {fields,coreQuestions,newProfile,submitAnswer}=require(path.join(compiled,'engine'));

// 선택과 해제
assert.equal(toggleChoice('','기뻤어요'),'기뻤어요');
assert.equal(toggleChoice('기뻤어요','고마웠어요'),'기뻤어요, 고마웠어요');
assert.equal(toggleChoice('기뻤어요, 고마웠어요','기뻤어요'),'고마웠어요');
assert.equal(toggleChoice('기뻤어요, 고마웠어요, 설렜어요','고마웠어요'),'기뻤어요, 설렜어요');
assert.equal(toggleChoice('기뻤어요','기뻤어요'),'');
assert(isChosen('기뻤어요, 고마웠어요','고마웠어요'));
assert(!isChosen('기뻤어요, 고마웠어요','설렜어요'));

// 다른 선택 안에 들어 있는 글자를 같은 선택으로 보지 않는다
assert(!isChosen('할머니 집','우리 집'));
assert(!isChosen('분홍 리본을 좋아해요','분홍'));
assert(isChosen('분홍, 노랑','분홍'));
assert.equal(toggleChoice('분홍 리본을 좋아해요','분홍'),'분홍 리본을 좋아해요, 분홍');

// 직접 쓴 문장은 그대로 남는다
const written='놀이터에서 처음 그네를 혼자 탔어요.';
assert.equal(toggleChoice(written,'놀이터'),written+', 놀이터');
assert.equal(toggleChoice(written+', 놀이터','놀이터'),written);

// 직접 입력 추가와 중복·길이 제한
assert.equal(addChoice('공룡','티라노사우루스'),'공룡, 티라노사우루스');
assert.equal(addChoice('공룡, 티라노사우루스','티라노사우루스'),'공룡, 티라노사우루스');
assert.equal(addChoice('','  '),'');
assert.equal(addChoice('a'.repeat(30),'b'.repeat(30),40),'a'.repeat(30));
assert.equal(chosenCount(''),0);
assert.equal(chosenCount('분홍, 노랑, 하늘색'),3);
assert.equal(chosenCount('이모·고모'),1);
assert.equal(CHOICE_SEPARATOR,', ');
assert.equal(MAX_DIRECT_CHOICE_LENGTH,200);

function check(groups,where){
 assert(Array.isArray(groups)&&groups.length>0,where+'에 선택지가 없습니다.');
 const all=[];
 for(const group of groups){
  assert(group.label&&group.label.length<=40,where+' 묶음 이름을 확인하세요.');
  assert(group.options.length>=3,where+' 선택지가 너무 적습니다.');
  for(const option of group.options){
   assert(option.trim()===option&&option.length>0&&option.length<=30,where+' 선택지 문구를 확인하세요: '+option);
   assert(!option.includes(',')&&!option.includes('\n'),where+' 선택지에 구분자를 쓰지 않습니다: '+option);
   assert(option!=='직접 입력',where+' 직접 입력은 저장 문구가 아닙니다.');
   all.push(option);
  }
 }
 assert.equal(new Set(all).size,all.length,where+' 선택지가 중복됩니다.');
 // 한 질문 안에서 서로를 포함하는 문구가 없어야 선택·해제가 섞이지 않는다
 for(const option of all)for(const other of all)if(option!==other)assert(!isChosen(option,other),where+' 선택지가 서로 겹칩니다: '+option+' / '+other);
 // 선택을 모두 누른 뒤 다시 눌러 지우면 처음으로 돌아온다
 let text='';for(const option of all)text=toggleChoice(text,option);
 assert.equal(chosenCount(text),all.length);
 for(const option of all)assert(isChosen(text,option),where+' 선택이 유지되지 않습니다: '+option);
 for(const option of all)text=toggleChoice(text,option);
 assert.equal(text,'',where+' 선택을 모두 해제하면 비어야 합니다.');
 return groups;
}

// 고를 수 있는 답이 있는 핵심 항목에만 선택지를 둔다
const withChoices=['recipient','protagonist','relationship','emotions','specialDetails','message'];
for(const target of withChoices)check(coreQuestionChoices({target}),'핵심 '+target);
// 실제 기억을 묻는 질문은 보기를 두지 않고 직접 쓰게 한다
assert.deepEqual(coreQuestionChoices({target:'memorableEvent'}),[]);
assert.deepEqual(coreQuestionChoices({target:'unknown'}),[]);
assert.deepEqual(fields.filter(f=>coreQuestionChoices({target:f}).length),withChoices);

// 선택 질문 9개 모두 선택지를 제공한다
const questions=storyDesignQuestions({memorableEvent:'학교에 처음 간 날',emotions:''});
assert.equal(questions.length,9);
const freeWriting=['goalAndObstacle','heroChoice','motifAndEnding'];
for(const question of questions){
 if(freeWriting.includes(question.id))assert.deepEqual(designQuestionChoices(question.id),[],question.id+'은 직접 쓰게 둔다.');
 else check(designQuestionChoices(question.id),'선택 '+question.id);
}
assert.deepEqual(designFields.filter(f=>!designQuestionChoices(f).length),freeWriting);
assert.deepEqual(designQuestionChoices('unknown'),[]);

// 보기가 있는 질문은 누르기만 해도, 없는 질문은 직접 써서 끝까지 저장할 수 있다
let profile=newProfile();let guard=0,typed=0;
while(profile.currentQuestion&&guard++<40){
 const groups=coreQuestionChoices(profile.currentQuestion);
 let answer='';
 if(groups.length)for(const option of groups[0].options.slice(0,3))answer=toggleChoice(answer,option);
 else{answer='바닷가에서 처음 혼자 파도를 넘은 날이에요.';typed++;}
 profile=submitAnswer(profile,profile.currentQuestion,answer);
}
assert(typed>0,'보기 없는 질문이 하나는 있어야 합니다.');
assert.equal(profile.currentQuestion,null);
assert.equal(profile.completionStatus,'review');
for(const core of coreQuestions)assert(profile.answers.some(a=>a.question.group===core.group),core.group+' 질문이 저장되지 않았습니다.');
assert(profile.answers.every(a=>!a.skipped));
console.log('PASS choice select/deselect, boundary safety, free text preserved, direct input, choices only where an answer is pickable, memory and plot questions left to free writing, mixed core submission.');

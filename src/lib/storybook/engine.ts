export const fields = ['recipient','protagonist','relationship','memorableEvent','emotions','specialDetails','message'] as const;
import type {StoryDesign} from './story-design';
export type Field = typeof fields[number];
export type Group = 'recipient'|'event'|'emotion'|'details'|'message';
export type Question = {id:string;group:Group;kind:'core'|'followup';text:string;target:Field;number:number};
export type Answer = {question:Question;text:string;skipped:boolean};
export type StoryProfile = Record<Field,string> & {
 storyId:string;answers:Answer[];currentQuestion:Question|null;
 completionStatus:'in_progress'|'review'|'confirmed';createdAt:string;updatedAt:string;
 facts:Partial<Record<Field,{value:string;sourceAnswerIds:string[];source:'answer'|'summary_edit'}>>;
 fictionalElements:string;summaryEdits:Partial<Record<Field,string>>;storyDesign?:StoryDesign;
};
export const labels:Record<Field,string>={recipient:'선물 대상',protagonist:'주인공',relationship:'관계',memorableEvent:'기억에 남는 순간',emotions:'그때의 감정',specialDetails:'특별한 모습이나 이야기',message:'전하고 싶은 마음'};
export const coreQuestions = [
 {group:'recipient',target:'recipient',text:'누구에게 선물할 동화인가요?'},
 {group:'event',target:'memorableEvent',text:'가장 기억에 남는 순간은 무엇인가요?'},
 {group:'emotion',target:'emotions',text:'그 순간 어떤 마음이 들었나요?'},
 {group:'details',target:'specialDetails',text:'꼭 담고 싶은 특별한 모습이나 이야기가 있나요?'},
 {group:'message',target:'message',text:'동화를 통해 어떤 마음을 전하고 싶나요?'}
] as const;
export type Evaluation={values:Record<Field,string>;facts:StoryProfile['facts'];next:Question|null;resolvedGroups:number};
export interface QuestionEngine {evaluate(answers:Answer[]):Evaluation}
const emptyValues=():Record<Field,string>=>Object.fromEntries(fields.map(f=>[f,''])) as Record<Field,string>;
const groupFields:Record<Group,Field[]>={recipient:['recipient','protagonist','relationship'],event:['memorableEvent'],emotion:['emotions'],details:['specialDetails'],message:['message']};
const followups:Record<Field,[string,string]>={
 recipient:['선물을 받을 분을 이름이나 별칭으로 알려 주실래요?','선물을 받을 분을 조금만 더 소개해 주실래요?'],
 protagonist:['동화의 주인공은 누구로 할까요?','주인공을 이름이나 별칭으로 정해 주실래요?'],
 relationship:['선물 받을 분과 어떤 사이인가요?','두 분의 관계를 짧게 알려 주실래요?'],
 memorableEvent:['그날 어디에서 어떤 일이 있었나요?','그 순간 가장 또렷하게 떠오르는 장면은 무엇인가요?'],
 emotions:['그 마음이 들었던 이유를 조금 들려주실래요?','그때 표정이나 행동은 어땠나요?'],
 specialDetails:['기억에 남는 말버릇이나 좋아하는 물건이 있나요?','그 특징이 드러났던 작은 장면이 떠오르나요?'],
 message:['마지막에 건네고 싶은 한마디가 있나요?','그 말을 전하게 된 특별한 이유가 있을까요?']
};
function collect(answers:Answer[]){
 const values=emptyValues();const facts:StoryProfile['facts']={};
 function put(field:Field,value:string,id:string){
  if(!value.trim())return;values[field]=values[field]?values[field]+' / '+value.trim():value.trim();
  facts[field]={value:values[field],sourceAnswerIds:[...new Set([...(facts[field]?.sourceAnswerIds??[]),id])],source:'answer'};
 }
 for(const answer of answers){
  if(answer.skipped)continue;
  const text=answer.text.trim();
  // 명시적 라벨만 다른 핵심 항목으로 전달합니다. 일반 문장의 의미를 추론하지 않습니다.
  const tagged=new Set<Field>();
  const aliases:Record<Field,string>={recipient:'선물 대상|받는 사람',protagonist:'주인공',relationship:'관계',memorableEvent:'사건|기억에 남는 순간',emotions:'감정|마음',specialDetails:'특징|개인화 요소',message:'메시지|전하고 싶은 말'};
  for(const field of fields){
   const match=text.match(new RegExp('(?:^|[;\\n])\\s*(?:'+aliases[field]+')\\s*[:：]\\s*([^;\\n]+)'));
   if(match){put(field,match[1],answer.question.id);tagged.add(field);}
  }
  if(!tagged.size)put(answer.question.target,text,answer.question.id);
 }
 return {values,facts};
}
function missing(group:Group,values:Record<Field,string>):Field|undefined{
 const absent=groupFields[group].find(field=>values[field].length<(group==='recipient'?1:2));
 if(absent)return absent;
 const field=groupFields[group][0];
 if(group==='recipient')return;
 // 데모의 충분성 기준은 길이와 구체적 표지뿐이며 의미 이해를 주장하지 않습니다.
 const value=values[field];
 if(group==='event'&&(value.length<20||!/(에서|날|때|함께|학교|집|공원|바다|여행)/.test(value)))return field;
 if(group==='details'&&value.length<10)return field;
 if((group==='emotion'||group==='message')&&value.length<6)return field;
 // 기록이 있는 짧은 답변에는 최대 두 번까지만 구체화를 제안합니다.
 
}
export const demoEngine:QuestionEngine={evaluate(answers){
 const {values,facts}=collect(answers);let resolvedGroups=0;
 for(const core of coreQuestions){
  const existing=answers.filter(a=>a.question.group===core.group);
  if(existing.some(a=>a.skipped)){resolvedGroups++;continue;}
  const needed=missing(core.group,values);
  if(!needed){resolvedGroups++;continue;}
  const coreAnswer=existing.find(a=>a.question.kind==='core');
  if(!coreAnswer&&!values[core.target])return {values,facts,resolvedGroups,next:{id:core.group+':core',group:core.group,target:core.target,text:core.text,kind:'core',number:0}};
  const followCount=existing.filter(a=>a.question.kind==='followup').length;
  if(followCount>=2){resolvedGroups++;continue;}
  const previousForTarget=existing.filter(a=>a.question.kind==='followup'&&a.question.target===needed).length;
  if(core.group==='recipient'&&previousForTarget>0){resolvedGroups++;continue;}
  const text=followups[needed][Math.min(previousForTarget,1)];
  if(existing.some(a=>a.question.text===text)){resolvedGroups++;continue;}
  return {values,facts,resolvedGroups,next:{id:core.group+':follow'+(followCount+1),group:core.group,target:needed,text,kind:'followup',number:followCount+1}};
 }
 return {values,facts,next:null,resolvedGroups:5};
}};
export function newProfile():StoryProfile {
 const now=new Date().toISOString();return rebuild({ ...emptyValues(),storyId:crypto.randomUUID(),answers:[],currentQuestion:null,completionStatus:'in_progress',createdAt:now,updatedAt:now,facts:{},summaryEdits:{},fictionalElements:''});
}
export function rebuild(profile:StoryProfile,engine:QuestionEngine=demoEngine):StoryProfile{
 const evaluated=engine.evaluate(profile.answers);
 const facts={...evaluated.facts};const values={...evaluated.values};
 for(const field of fields)if(profile.summaryEdits[field]!==undefined){values[field]=profile.summaryEdits[field]!;facts[field]={value:values[field],sourceAnswerIds:[],source:'summary_edit'};}
 return {...profile,...values,facts,currentQuestion:evaluated.next,completionStatus:evaluated.next?'in_progress':profile.completionStatus==='confirmed'?'confirmed':'review'};
}
export function submitAnswer(profile:StoryProfile,question:Question,text:string,skipped=false):StoryProfile{
 const index=profile.answers.findIndex(a=>a.question.id===question.id);
 const prefix=index<0?profile.answers:profile.answers.slice(0,index);
 const expected=demoEngine.evaluate(prefix).next;
 if(!expected||expected.id!==question.id)throw new Error('질문 순서가 변경되었습니다.');
 if(!skipped&&(!text.trim()||text.length>4000))throw new Error('답변은 1~4000자로 입력하거나 건너뛰어 주세요.');
 return rebuild({...profile,answers:[...prefix,{question:expected,text:skipped?'':text.trim(),skipped}],summaryEdits:{},completionStatus:'in_progress',updatedAt:new Date().toISOString()});
}
export function editSummary(profile:StoryProfile,field:Field,value:string):StoryProfile{
 return rebuild({...profile,summaryEdits:{...profile.summaryEdits,[field]:value.slice(0,4000)},completionStatus:'review',updatedAt:new Date().toISOString()});
}




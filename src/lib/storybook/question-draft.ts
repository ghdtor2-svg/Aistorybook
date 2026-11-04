import {fields,labels} from './engine';import {restoreStory,type SavedStory} from './storage';
// Export only question data. Never enumerate browser storage or copy authentication.
export function questionDraftJSON(story:SavedStory){const p=story.profile;return JSON.stringify({format:'ai-office-question-draft',version:1,exportedAt:new Date().toISOString(),story:{version:1,profile:{storyId:p.storyId,createdAt:p.createdAt,updatedAt:p.updatedAt,completionStatus:p.completionStatus,answers:p.answers.map(a=>({question:{id:a.question.id},text:a.text,skipped:a.skipped})),summaryEdits:Object.fromEntries(fields.filter(f=>typeof p.summaryEdits[f]==='string').map(f=>[f,p.summaryEdits[f]])),fictionalElements:p.fictionalElements},draft:story.draft,editingId:story.editingId}},null,2);}
export function questionDraftText(story:SavedStory){const p=story.profile,current=story.editingId?p.answers.find(a=>a.question.id===story.editingId)?.question:p.currentQuestion;return ['이야기의 씨앗 · 현재 화면 작성본','내려받은 파일은 브라우저 저장 성공을 뜻하지 않습니다.','',...p.answers.flatMap((a,i)=>[(i+1)+'. '+a.question.text,a.skipped?'(건너뛴 질문)':a.text,'']),'현재 작성 중인 질문',current?.text||'(질문 작성 완료)',story.draft,'','화면에 정리된 내용',...fields.flatMap(f=>[labels[f]+':',p[f],'']),'허용된 각색:',p.fictionalElements].join('\n');}

export function importQuestionDraft(raw:string):SavedStory{
 try{
  if(raw.length>400000)throw Error();const value=JSON.parse(raw),data=value?.story,p=data?.profile;
  const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const text=(v:unknown,n:number)=>typeof v==='string'&&v.length<=n;
  if(value?.format!=='ai-office-question-draft'||value.version!==1||!record(data)||data.version!==1||!record(p)||!text(p.storyId,200)||!p.storyId||!text(data.draft,4000)||(data.editingId!==null&&!text(data.editingId,200))||!text(p.fictionalElements,4000)||!record(p.summaryEdits)||!['in_progress','review','confirmed'].includes(String(p.completionStatus))||!text(p.createdAt,100)||!Number.isFinite(Date.parse(String(p.createdAt)))||!text(p.updatedAt,100)||!Number.isFinite(Date.parse(String(p.updatedAt))))throw Error();
  for(const [key,value]of Object.entries(p.summaryEdits))if(!fields.includes(key as typeof fields[number])||!text(value,4000))throw Error();
  const story=restoreStory({getItem:()=>JSON.stringify(data),setItem(){throw Error();},removeItem(){throw Error();}});
  if(!story||(story.profile.currentQuestion&&Object.keys(p.summaryEdits).length>0)||story.editingId!==data.editingId||(p.completionStatus==='confirmed'&&story.profile.currentQuestion))throw Error();return story;
 }catch{throw Error('질문 작성본 형식이나 내용이 올바르지 않습니다. 기존 질문은 변경하지 않았습니다.');}
}

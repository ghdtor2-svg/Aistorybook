const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const base='http://127.0.0.1:3111';
const output=path.resolve('../../outputs/api-quality-check-2026-11-07');
fs.mkdirSync(output,{recursive:true});

(async()=>{
 const login=await fetch(base+'/api/office',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({action:'login',password:process.env.OFFICE_ADMIN_PASSWORD})});
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 const results=[];
 for(const style of ['soft-clay','watercolor']){
  const issued=await fetch(base+'/api/office/story-codes',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie},body:JSON.stringify({id:randomUUID(),transferConfirmed:true})});
  assert.equal(issued.status,200);
  const {code}=await issued.json();
  const orderId=code.slice(3).split('.')[0];
  const file=path.join(process.cwd(),'.office-data/storybook-orders',orderId+'.json');
  const order=JSON.parse(fs.readFileSync(file,'utf8'));
  const event='노란 멜빵바지를 입은 여섯 살 하루와 청록색 카디건을 입고 둥근 안경을 쓴 할머니가 별빛 정원에서 만났어요. 할머니는 하루의 손을 잡고 작은 화분 속 새싹을 살펴보았어요. 두 사람의 얼굴에는 다정한 미소가 떠올랐어요. 작은 흰 토끼가 둘의 발치에서 꽃잎을 바라보았어요. ';
  const book={id:randomUUID(),title:'하루와 할머니의 별빛 정원',chapters:Array.from({length:5},(_,i)=>({title:'정원의 이야기 '+(i+1),text:event.repeat(7)})),note:'실제 고객 정보가 없는 내부 이미지 품질 검증용 원고',model:'internal-quality-fixture',createdAt:new Date().toISOString(),artStyleId:style,qualityProfile:'seasons-tower-32-v1'};
  fs.writeFileSync(file,JSON.stringify({...order,book}));
  for(let index=0;index<2;index++){
   const started=Date.now();
   const response=await fetch(base+'/api/storybook/illustrations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+code},body:JSON.stringify({action:'next',book}),signal:AbortSignal.timeout(245000)});
   const state=await response.json();
   const receipt={style,index,kind:index===0?'cover':'panorama',httpStatus:response.status,elapsedMs:Date.now()-started,model:'gpt-image-2',quality:'high'};
   results.push(receipt);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
   if(!response.ok){console.log(JSON.stringify({...receipt,error:state.error}));throw Error('Actual platform image API did not complete; see sanitized result');}
   const image=await fetch(base+'/api/storybook/illustrations?asset='+encodeURIComponent(state.base[index]),{headers:{Authorization:'Bearer '+code}});
   assert.equal(image.status,200);
   fs.writeFileSync(path.join(output,style+'-'+receipt.kind+'.jpg'),Buffer.from(await image.arrayBuffer()));
   console.log(JSON.stringify(receipt));
  }
 }
 console.log('Actual platform image requests completed. This verifies only two styles and two images per style, not a whole book or all styles.');
})().catch(error=>{console.error(error.message);process.exitCode=1});

const fs=require('node:fs');
const native=globalThis.fetch;
let storyCalls=0, pictureCalls=0, approvalCalls=0;
globalThis.fetch=async(input,init)=>{
 const url=String(input);
 if(url==='https://api.tosspayments.com/v1/payments/confirm'){
  approvalCalls++;
  const {orderId,paymentKey,amount}=JSON.parse(init.body);
  if(approvalCalls!==1||new Headers(init.headers).get('Idempotency-Key')!==orderId||amount!==5000)throw Error('Unexpected confirmation');
  return Response.json({orderId,paymentKey,status:'DONE',totalAmount:amount,currency:'KRW'});
 }
 if(url==='https://api.openai.com/v1/responses'){
  const brief=JSON.parse(init.body).input.find(item=>item.role==='user').content;
  if(brief.length<=4000||!brief.endsWith('끝까지 보존할 특별한 사연'))throw Error('Long confirmed brief was truncated');
  if(++storyCalls!==1)throw Error('Duplicate story generation');
  await new Promise(resolve=>setTimeout(resolve,180));
  const sentence='가상의 아이가 종이배를 접고 친구들과 함께 다정한 이야기를 나누었어요. ';
  const chapters=Array.from({length:5},(_,index)=>({title:index===0?'비 오는 날':'이야기 '+(index+1),text:sentence.repeat(40).slice(0,1000)}));
  const book={title:'가상 결제 동화',chapters,note:'테스트'};
  return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(book)}]}]});
 }
 if(url.startsWith('https://api.openai.com/v1/images/')){
  pictureCalls++;
  const prompt=typeof init.body==='string'?JSON.parse(init.body).prompt:init.body.get('prompt');
  const size=typeof init.body==='string'?JSON.parse(init.body).size:init.body.get('size');
  const quality=typeof init.body==='string'?JSON.parse(init.body).quality:init.body.get('quality');
  if(quality!=='high')throw Error('Picture-book quality must be high');
  if(pictureCalls===1&&(!prompt.includes('watercolor')||size!=='1024x1536'||init.body.get('image').type!=='image/webp'))throw Error('Selected style reference or cover size missing');
  if(pictureCalls===2&&(size!=='3072x1024'||!prompt.includes('central 8 percent')))throw Error('Panoramic quality standard missing');
  if(pictureCalls===1&&!prompt.includes('signature color'))throw Error('Missing distinct character colors');
  if(pictureCalls>1&&!prompt.includes('reference image is the authority'))throw Error('Missing reference style preservation');
  if(pictureCalls===19)return Response.json({error:'simulated temporary failure'},{status:502});
  if(pictureCalls>20)throw Error('Duplicate revision');
  const asset=pictureCalls===1?process.env.NANGMAN_FIXTURE_JPEG:process.env.NANGMAN_FIXTURE_WIDE;
  return Response.json({data:[{b64_json:fs.readFileSync(asset).toString('base64')}]});
 }
 if(url.startsWith('https://api.tosspayments.com/'))throw Error('Unexpected payment request');
 return native(input,init);
};


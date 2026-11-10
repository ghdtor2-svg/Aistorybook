import {NextResponse} from 'next/server';
import {adminConfigured,adminOrigin,adminSecret,authenticated,clearedCookie,secureRequest,sessionCookie,validPassword,MIN_ADMIN_SECRET} from '../../../lib/storybook/admin-auth';
import {blockedFor,clearFailures,recordFailure} from '../../../lib/storybook/admin-guard';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
// 설정 여부와 로그인 상태만 알려준다. 비밀번호나 그 길이는 돌려주지 않는다.
export async function GET(request:Request){
 if(!adminOrigin(request))return json({error:'허용되지 않은 주소입니다.'},403);
 const secret=adminSecret();
 return json({configured:adminConfigured(),authenticated:!!secret&&authenticated(request,secret),minSecretLength:MIN_ADMIN_SECRET});
}
export async function POST(request:Request){
 if(!adminOrigin(request))return json({error:'허용되지 않은 주소입니다.'},403);
 let body;
 try{const raw=await request.text();if(raw.length>4096)throw Error();body=JSON.parse(raw);}catch{return json({error:'요청 형식을 확인해 주세요.'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'요청 형식을 확인해 주세요.'},400);
 const secret=adminSecret(),secure=secureRequest(request);
 if(body.action==='logout'){
  const response=json({authenticated:false});
  response.headers.set('Set-Cookie',clearedCookie(secure));
  return response;
 }
 if(body.action!=='login')return json({error:'알 수 없는 요청입니다.'},400);
 if(!secret)return json({error:'관리자 비밀번호가 설정되지 않았습니다. 배포 환경에 '+MIN_ADMIN_SECRET+'자 이상으로 넣어 주세요.'},503);
 const wait=await blockedFor(request);
 if(wait>0)return json({error:'로그인 시도가 제한되었습니다. '+Math.ceil(wait/60000)+'분 뒤에 다시 시도해 주세요.'},429);
 if(!validPassword(body.password,secret)){await recordFailure(request);return json({error:'인증에 실패했습니다.'},401);}
 await clearFailures(request);
 const response=json({authenticated:true});
 response.headers.set('Set-Cookie',sessionCookie(secret,secure));
 return response;
}

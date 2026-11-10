// 관리 화면 인증. 공개 사이트에서도 열리므로 비밀번호·출처·세션을 모두 확인한다.
// 받는 호스트는 내 PC 작업장과 정식 사이트뿐이고, 그 밖의 호스트는 거절한다.
import {createHmac,timingSafeEqual} from 'node:crypto';
const COOKIE='nangman_admin_session';
const SESSION_MS=60*60*1000;
const COOKIE_PATH='/api/office';
// 인터넷에 열리는 열쇠이므로 로컬 전용이던 16자보다 길게 받는다.
export const MIN_ADMIN_SECRET=24;
const LOCAL_HOSTS=['localhost','127.0.0.1','[::1]'];
export function adminSecret(){const value=process.env.OFFICE_ADMIN_PASSWORD||'';return value.length>=MIN_ADMIN_SECRET?value:'';}
export function adminConfigured(){return adminSecret()!=='';}
function publicHost(){try{return new URL(process.env.NANGMAN_PUBLIC_URL||'').host.toLowerCase();}catch{return '';}}
export function requestHost(request:Request){return (request.headers.get('host')||new URL(request.url).host).toLowerCase();}
// Netlify 뒤에서는 request.url 의 프로토콜이 내부 http 라서 전달 헤더를 먼저 본다.
export function secureRequest(request:Request){
 const forwarded=request.headers.get('x-forwarded-proto');
 if(forwarded)return forwarded.split(',')[0].trim()==='https';
 return new URL(request.url).protocol==='https:';
}
export function adminOrigin(request:Request){
 const host=requestHost(request),site=publicHost();
 const hostname=host.replace(/:\d{1,5}$/,'');
 if(!LOCAL_HOSTS.includes(hostname)&&!(site&&host===site))return false;
 if(request.method==='GET')return true;
 // 쓰기 요청은 같은 출처에서만 받는다. 다른 사이트가 대신 보내는 요청을 막는다.
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try{return new URL(origin).host.toLowerCase()===host;}catch{return false;}
}
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function validPassword(password:unknown,secret:string){return typeof password==='string'&&secret.length>=MIN_ADMIN_SECRET&&equal(password,secret);}
export function sessionCookie(secret:string,secure:boolean){
 const expiry=String(Date.now()+SESSION_MS),sig=createHmac('sha256',secret).update(expiry).digest('hex');
 return COOKIE+'='+expiry+'.'+sig+'; HttpOnly; SameSite=Strict; Path='+COOKIE_PATH+(secure?'; Secure':'')+'; Max-Age='+SESSION_MS/1000;
}
export function clearedCookie(secure:boolean){return COOKIE+'=; HttpOnly; SameSite=Strict; Path='+COOKIE_PATH+(secure?'; Secure':'')+'; Max-Age=0';}
export function authenticated(request:Request,secret:string){
 if(secret.length<MIN_ADMIN_SECRET||!adminOrigin(request))return false;
 const value=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!value)return false;
 const [expiry,sig]=value.split('.');
 if(!expiry||!sig||!/^\d{1,15}$/.test(expiry))return false;
 const at=Number(expiry);
 if(at<Date.now()||at>Date.now()+SESSION_MS)return false;
 return equal(sig,createHmac('sha256',secret).update(expiry).digest('hex'));
}

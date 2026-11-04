import {createHmac,timingSafeEqual} from 'node:crypto';
const cookieName='office_local_session';
export function localOrigin(request:Request){
 const url=new URL(request.url),host=request.headers.get('host')||url.host;
 let publicUrl:URL;try{publicUrl=new URL(url.protocol+'//'+host);}catch{return false;}
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!['localhost','127.0.0.1','[::1]'].includes(publicUrl.hostname)||publicUrl.host!==host)return false;
 const forwarded=request.headers.get('x-forwarded-for');if(forwarded&&!['127.0.0.1','::1'].includes(forwarded))return false;
 if(request.method!=='GET'&&request.headers.get('origin')!==publicUrl.origin)return false;
 return true;
}
function equal(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function validPassword(password:unknown,secret:string){return typeof password==='string'&&secret.length>=16&&equal(password,secret);}
export function sessionCookie(secret:string){const expiry=String(Date.now()+60*60*1000),sig=createHmac('sha256',secret).update(expiry).digest('hex');return `${cookieName}=${expiry}.${sig}; HttpOnly; SameSite=Strict; Path=/api/office; Max-Age=3600`;}
export function authenticated(request:Request,secret:string){
 if(secret.length<16||!localOrigin(request))return false;
 const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!value)return false;const [expiry,sig]=value.split('.');if(!expiry||!sig||!/^\d+$/.test(expiry)||Number(expiry)<Date.now()||Number(expiry)>Date.now()+3600000)return false;
 return equal(sig,createHmac('sha256',secret).update(expiry).digest('hex'));
}


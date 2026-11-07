export const cloudStorageEnabled=()=>process.env.NANGMAN_STORAGE==='netlify';
export function cloudOrigin(){
 const value=process.env.NANGMAN_PUBLIC_URL||'';
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();return url.origin;}catch{throw Error('Online service URL is not configured');}
}
export function cloudEnabled(){
 if(!cloudStorageEnabled()||process.env.NANGMAN_CLOUD_ENABLED!=='1'||process.env.NETLIFY!=='true'||process.env.CONTEXT!=='production')return false;
 if((process.env.NANGMAN_ADMIN_BRIDGE_SECRET||'').length<32||(process.env.NANGMAN_WORKER_SECRET||'').length<32)return false;
 try{cloudOrigin();return true;}catch{return false;}
}
export function cloudCustomerRequest(request:Request){
 if(!cloudEnabled())return false;
 const origin=cloudOrigin(),url=new URL(request.url),sent=request.headers.get('origin');
 return url.origin===origin&&(!sent||sent===origin);
}

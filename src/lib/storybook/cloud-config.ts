export const cloudStorageEnabled=()=>process.env.NANGMAN_STORAGE==='netlify';
export function cloudOrigin(){
 const value=process.env.NANGMAN_PUBLIC_URL||'';
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();return url.origin;}catch{throw Error('Online service URL is not configured');}
}
export function cloudEnabled(){
 return cloudConfigurationIssue()===null;
}
// Return fixed diagnostic codes only; never expose configuration or secret values.
export function cloudConfigurationIssue(){
 if(!cloudStorageEnabled())return 'storage_configuration';
 if(process.env.NANGMAN_CLOUD_ENABLED!=='1')return 'cloud_disabled';
 if(process.env.NETLIFY!=='true')return 'netlify_runtime';
 if(process.env.CONTEXT!=='production')return 'production_context';
 if((process.env.NANGMAN_ADMIN_BRIDGE_SECRET||'').length<32)return 'admin_secret_configuration';
 if((process.env.NANGMAN_WORKER_SECRET||'').length<32)return 'worker_secret_configuration';
 try{cloudOrigin();return null;}catch{return 'public_url_configuration';}
}
export function cloudCustomerRequest(request:Request){
 if(!cloudEnabled())return false;
 const origin=cloudOrigin(),url=new URL(request.url),sent=request.headers.get('origin');
 return url.origin===origin&&(!sent||sent===origin);
}

/** Minimal server-only Supabase REST client. Never import from client components. */
export type SupabaseConfig={url:string;anonKey:string;serviceRoleKey:string};
export function supabaseConfig(env:NodeJS.ProcessEnv=process.env):SupabaseConfig{
 const url=env.NEXT_PUBLIC_SUPABASE_URL||'',anonKey=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'',serviceRoleKey=env.SUPABASE_SERVICE_ROLE_KEY||'';
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!anonKey||!serviceRoleKey)throw new Error('Supabase 서버 설정이 필요합니다.');
 return {url,anonKey,serviceRoleKey};
}
export async function supabaseUser(accessToken:string,config=supabaseConfig()){
 if(!accessToken||accessToken.length>8192) return null;
 const response=await fetch(`${config.url}/auth/v1/user`,{headers:{apikey:config.anonKey,Authorization:`Bearer ${accessToken}`},cache:'no-store'});
 if(!response.ok)return null;
 const user=await response.json();
 return typeof user?.id==='string'?{id:user.id,email:typeof user.email==='string'?user.email:null}:null;
}
export async function supabaseRequest<T>(table:string,ownerId:string,method:'GET'|'POST'|'PATCH',data?:unknown,config=supabaseConfig()):Promise<T>{
 if(!/^[a-z_]+$/.test(table)||!ownerId)throw new Error('저장 요청이 올바르지 않습니다.');
 const query=new URLSearchParams({owner_id:`eq.${ownerId}`,select:'*'});
 const response=await fetch(`${config.url}/rest/v1/${table}?${query}`,{method,headers:{apikey:config.serviceRoleKey,Authorization:`Bearer ${config.serviceRoleKey}`,'Content-Type':'application/json',Prefer:method==='GET'?'return=representation':'resolution=merge-duplicates,return=representation'},...(data===undefined?{}:{body:JSON.stringify(data)}),cache:'no-store'});
 if(!response.ok)throw new Error('온라인 자료 저장소 요청을 완료하지 못했습니다.');
 return await response.json() as T;
}

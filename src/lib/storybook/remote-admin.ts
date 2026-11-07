import {signedHeaders} from './cloud-signing';

export const remoteAdminConfigured=()=>!!process.env.NANGMAN_REMOTE_URL;
export async function remoteAdmin(body:Record<string,unknown>){
 const target=new URL(process.env.NANGMAN_REMOTE_URL||'');
 if(target.protocol!=='https:'||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw Error('온라인 관리 연결 주소를 확인해 주세요.');
 const raw=JSON.stringify(body);
 const response=await fetch(new URL('/api/storybook/admin-bridge',target),{method:'POST',headers:signedHeaders('admin',raw),body:raw,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
 let data:Record<string,unknown>;try{data=await response.json();}catch{throw Error('온라인 관리 서버에 연결하지 못했어요. 로컬 키는 대신 발급하지 않았습니다.');}
 return {data:{...data,source:'cloud'},status:response.status};
}

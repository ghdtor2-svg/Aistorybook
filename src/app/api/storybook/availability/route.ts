import {NextResponse} from 'next/server';
import {cloudCustomerRequest,cloudConfigurationIssue} from '../../../../lib/storybook/cloud-config';
import {orderStore} from '../../../../lib/storybook/netlify-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 let reason:string|null=cloudConfigurationIssue();
 if(!reason&&!cloudCustomerRequest(request))reason='request_origin';
 if(!reason&&!process.env.OPENAI_API_KEY)reason='ai_key_missing';
 if(!reason){try{await orderStore().get('connection-check',{type:'json'});}catch{reason='storage_unavailable';}}
 return NextResponse.json({ready:reason===null,...(reason?{reason}:{})},{headers:{'Cache-Control':'no-store'}});
}

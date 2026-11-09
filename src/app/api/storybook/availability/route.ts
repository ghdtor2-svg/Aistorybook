import {NextResponse} from 'next/server';
import {cloudCustomerRequest,cloudConfigurationIssue} from '../../../../lib/storybook/cloud-config';
import {storageReadiness} from '../../../../lib/storybook/storage-readiness';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 let reason:string|null=cloudConfigurationIssue();
 if(!reason&&!cloudCustomerRequest(request))reason='request_origin';
 if(!reason&&!process.env.OPENAI_API_KEY)reason='ai_key_missing';
 if(!reason)reason=await storageReadiness();
 return NextResponse.json({ready:reason===null,...(reason?{reason}:{})},{headers:{'Cache-Control':'no-store'}});
}

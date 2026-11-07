import {NextResponse} from 'next/server';
import {cloudCustomerRequest} from '../../../../lib/storybook/cloud-config';
import {orderStore} from '../../../../lib/storybook/netlify-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 let ready=false;
 if(cloudCustomerRequest(request)&&process.env.OPENAI_API_KEY){try{await orderStore().get('connection-check',{type:'json'});ready=true;}catch{}}
 return NextResponse.json({ready},{headers:{'Cache-Control':'no-store'}});
}

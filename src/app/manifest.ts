import type {MetadataRoute} from 'next';
import {SITE_NAME} from '../lib/brand';
import {SEO_DESCRIPTION} from '../lib/seo';
export default function manifest():MetadataRoute.Manifest{
  return {name:SITE_NAME,short_name:SITE_NAME,description:SEO_DESCRIPTION,start_url:'/',display:'standalone',background_color:'#f5f7fb',theme_color:'#f5f7fb',lang:'ko',icons:[{src:'/icon.png',sizes:'512x512',type:'image/png'}]};
}

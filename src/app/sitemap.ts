import type {MetadataRoute} from 'next';
import {SITE_URL} from '../lib/seo';
export default function sitemap():MetadataRoute.Sitemap{
  const now=new Date();
  return [
    {url:SITE_URL+'/',lastModified:now,changeFrequency:'weekly',priority:1,images:[SITE_URL+'/og-image.jpg',SITE_URL+'/storybook/sample/cover.webp']},
    {url:SITE_URL+'/storybook',lastModified:now,changeFrequency:'monthly',priority:0.8},
  ];
}

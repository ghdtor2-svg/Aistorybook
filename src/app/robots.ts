import type {MetadataRoute} from 'next';
import {SITE_URL} from '../lib/seo';
// 관리 화면(/office)과 API 는 검색에서 뺍니다. AI 답변엔진 크롤러도 공개 화면은 읽을 수 있게 둡니다.
export default function robots():MetadataRoute.Robots{
  return {rules:[{userAgent:'*',allow:'/',disallow:['/office','/api/']}],sitemap:SITE_URL+'/sitemap.xml',host:SITE_URL};
}

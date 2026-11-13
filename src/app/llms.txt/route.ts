import {SITE_NAME} from '../../lib/brand';
import {FAQ,SEO_DESCRIPTION,SITE_URL,styleNames} from '../../lib/seo';
import {PURCHASE_CONTACT} from '../../lib/storybook/purchase-info';
// AI 답변엔진(ChatGPT·Perplexity·Claude 등)이 사이트를 요약할 때 읽는 안내문(llms.txt 관례).
// 내용은 화면의 질문·답과 같은 원본(src/lib/seo.ts)에서 만듭니다.
export const dynamic='force-static';
export function GET(){
  const text=[
    '# '+SITE_NAME,
    '',
    '> '+SEO_DESCRIPTION,
    '',
    SITE_NAME+'은 부모님이 들려주는 아이의 정보와 가족의 사연으로 개인화된 디지털 동화를 만드는 한국어 서비스입니다. 고를 수 있는 화풍: '+styleNames.join(', ')+'.',
    '',
    '## 주요 페이지',
    '- ['+SITE_NAME+' 첫 화면]('+SITE_URL+'/): 서비스 소개, 샘플 동화 \'사계의 탑\', 구매 문의 안내, 자주 묻는 질문',
    '- [동화 만들기 · 내 책장]('+SITE_URL+'/storybook): 질문에 답하고 화풍을 골라 동화를 만들고 책장에 보관',
    '- [샘플 동화 PDF]('+SITE_URL+'/nangman-story-spread-preview.pdf): 별도로 편집·검수한 기준 샘플 (자동 생성 결과와 다를 수 있음)',
    '',
    '## 자주 묻는 질문',
    ...FAQ.flatMap(item=>['','### '+item.question,item.answer]),
    '',
    '## 문의',
    '- 인스타그램: '+PURCHASE_CONTACT.instagramUrl,
    '',
  ].join('\n');
  return new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}});
}

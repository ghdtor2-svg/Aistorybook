/**
 * 검색엔진(SEO)과 AI 답변엔진(AEO)에 보여 줄 사이트 정보를 한곳에 모읍니다.
 *
 * - 주소: NEXT_PUBLIC_SITE_URL 이 있으면 그것을 쓰고, 없으면 Netlify 기본 주소를 씁니다.
 *   자체 도메인을 연결하면 Netlify 환경 변수에 NEXT_PUBLIC_SITE_URL=https://새도메인 을 넣고 재배포하세요.
 * - 사이트 소유 확인: 구글 서치콘솔·네이버 서치어드바이저에서 받은 값을
 *   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_NAVER_SITE_VERIFICATION 에 넣으면 meta 태그로 나갑니다.
 *
 * 공개 문구 기준(AGENTS.md): 화면에 이미 공개한 사실(가격·쪽수·화풍·구매 절차)만 씁니다.
 * 확인되지 않은 기능, 인쇄·배송, 제작 단가는 쓰지 않습니다.
 */
import {SITE_NAME} from './brand';
import {STORY_PRICE} from './storybook/product';
import {PURCHASE_CONTACT} from './storybook/purchase-info';
import {offeredStoryArtStyles} from './storybook/art-styles';
import {storyIllustrationCount,storyPageCount} from './storybook/quality';

export const SITE_URL=(process.env.NEXT_PUBLIC_SITE_URL||'https://nangman-hanjul.netlify.app').replace(/\/+$/,'');
export const SEO_TITLE=SITE_NAME+' · 우리 아이 이야기로 만드는 AI 맞춤 동화';
export const SEO_DESCRIPTION='아이의 이름과 가족의 추억을 몇 가지 질문에 답하면 AI가 '+storyPageCount+'쪽 맞춤형 디지털 동화로 만들어 드려요. 그림 '+storyIllustrationCount+'장, '+offeredStoryArtStyles.length+'가지 화풍, 1편 '+STORY_PRICE.toLocaleString('ko-KR')+'원.';
export const SEO_KEYWORDS=['AI 동화','맞춤 동화','맞춤형 동화','개인화 동화','아이 이름 동화','우리 아이 동화 만들기','AI 동화 만들기','디지털 동화','가족 추억 동화','아이 선물','그림 동화',SITE_NAME];
export const OG_IMAGE={url:'/og-image.jpg',width:1200,height:630,alt:SITE_NAME+' 샘플 동화 펼침면'};
export const styleNames=offeredStoryArtStyles.map(style=>style.name);

/** 화면에 보이는 질문과 답. 같은 내용을 FAQPage 구조화 데이터로도 내보냅니다(내용이 서로 같아야 합니다). */
export const FAQ:{question:string;answer:string}[]=[
  {question:SITE_NAME+'은 어떤 서비스인가요?',answer:'부모님이 들려주는 아이의 정보와 가족의 사연을 바탕으로 AI가 세상에 하나뿐인 맞춤형 디지털 동화를 만들어 주는 서비스예요. 몇 가지 질문에 편하게 답하면 이야기와 그림이 함께 있는 동화가 완성돼요.'},
  {question:'동화 한 편의 가격은 얼마인가요?',answer:'맞춤형 디지털 동화 1편에 '+STORY_PRICE.toLocaleString('ko-KR')+'원이에요.'},
  {question:'동화는 몇 쪽이고 그림은 몇 장인가요?',answer:'표지를 포함해 '+storyPageCount+'쪽이고, 표지 1장과 본문 삽화를 합쳐 그림 '+storyIllustrationCount+'장이 들어가요. 본문은 약 2,500자로 아이가 읽기 편한 큰 글씨로 보여 드려요.'},
  {question:'어떤 화풍을 고를 수 있나요?',answer:styleNames.join(', ')+' 중에서 고를 수 있어요. 고르기 전에 화풍별 예시 그림을 볼 수 있고, 고른 화풍은 표지부터 마지막 그림까지 동화 전체에 적용돼요.'},
  {question:'어떻게 구매하고 만드나요?',answer:'인스타그램 @'+PURCHASE_CONTACT.instagramHandle+'로 "동화 구매 문의합니다"라고 DM을 보내 안내를 받은 뒤 계좌이체하면, 담당자가 입금을 확인하고 제작 코드를 알려 드려요. 동화 만들기 화면에서 질문에 답하고 제작 코드를 입력하면 동화가 만들어져요.'},
  {question:'완성된 동화는 어떻게 받나요?',answer:'완성된 동화는 화면에서 바로 펼쳐 읽을 수 있고, 그림이 모두 완성되면 PDF로 내려받을 수 있어요.'},
  {question:'입력한 이야기와 동화는 어디에 저장되나요?',answer:'질문에 적은 답과 완성한 동화는 사용하는 브라우저의 내 책장에 저장돼요. AI 동화 생성은 제작 코드를 입력하고 보낼 내용을 확인해 동의한 뒤에만 시작해요.'},
];

const id=(name:string)=>SITE_URL+'/#'+name;
/** 첫 화면에 넣는 구조화 데이터(JSON-LD). 검색 결과와 AI 답변이 사이트를 정확히 설명하도록 돕습니다. */
export function homeJsonLd(){
  return {
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'Organization','@id':id('organization'),name:SITE_NAME,url:SITE_URL,logo:SITE_URL+'/icon.png',sameAs:[PURCHASE_CONTACT.instagramUrl]},
      {'@type':'WebSite','@id':id('website'),name:SITE_NAME,alternateName:'낭만 한줄',url:SITE_URL,inLanguage:'ko-KR',description:SEO_DESCRIPTION,publisher:{'@id':id('organization')}},
      {'@type':'Service','@id':id('service'),name:'AI 맞춤형 디지털 동화 제작',serviceType:'개인화 동화 제작',provider:{'@id':id('organization')},areaServed:'KR',availableLanguage:'ko',
        description:SEO_DESCRIPTION,
        offers:{'@type':'Offer',price:String(STORY_PRICE),priceCurrency:'KRW',url:SITE_URL+'/#purchase-guide',description:'맞춤형 디지털 동화 1편 ('+storyPageCount+'쪽, 그림 '+storyIllustrationCount+'장)'}},
      {'@type':'FAQPage','@id':id('faq'),mainEntity:FAQ.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))},
    ],
  };
}
/** HTML 안의 <script> 에 넣어도 안전하게 직렬화합니다. */
export const jsonLdText=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');

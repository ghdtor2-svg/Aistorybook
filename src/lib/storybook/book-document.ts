import type {Book} from './books';
import {bookLook, coverVarText, BOOK_CSS} from './book-design';
import {ART_DEFS} from './book-art';
import {SITE_NAME} from '../brand';
/**
 * 내려받는 동화 파일 — 한 장짜리 HTML.
 *
 * 겉 표지(전면 그림 + 제목)와 내지(장 표제화 · 장 번호 · 본문 · 장 끝 장식)가
 * 들어갑니다. 생김새는 book-design.ts 의 BOOK_CSS 하나에서 오고, 그림은
 * book-art.ts 에서 책 아이디로 뽑습니다. 화면에서 읽는 동화와 같은 책으로 보입니다.
 *
 * 외부 요청이 없습니다. 그림은 인라인 SVG, 글꼴은 기기에 있는 것만 씁니다.
 * CSP 가 default-src 'none' 이라 파일을 열어도 바깥으로 아무것도 나가지 않습니다.
 * 그래서 비행기에서도, 인터넷이 끊겨도 열립니다.
 *
 * 삽화를 넣으면서 img-src 에 data: 만 더했습니다. 그림이 파일 안에 글자로
 * 박혀 들어간다는 뜻이고, 바깥 주소는 여전히 하나도 허용하지 않습니다.
 * data: 외의 주소는 아래 isDataImage 가 걸러 내므로 문서에 들어가지 못합니다.
 *
 * 그림은 이 파일에 글자로 박혀 들어가므로, 사용자 글(제목·본문·메모)은
 * 반드시 escape 를 거칩니다. 그림 쪽 문자열에는 사용자 글이 섞이지 않습니다.
 */
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
/** 보관된 삽화만 넣습니다. 바깥 주소가 섞이면 파일을 열 때 요청이 나갑니다. */
const isDataImage=(value:unknown):value is string=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
/** 그림 한 장을 감싼다. art 는 book-art.ts 의 상수뿐이라 바깥 입력이 섞이지 않는다. */
const plate=(kind:string,viewBox:string,art:string,fit='')=>'<div class="'+kind+'" aria-hidden="true"><svg viewBox="'+viewBox+'"'+fit+'>'+art+'</svg></div>';
export function bookDocument(book:Book,images:string[]=[]){
 const look=bookLook(book.id);
 /** 장 그림 한 장. 보관된 그림이 없으면 아무것도 넣지 않습니다. */
 const picture=(index:number)=>isDataImage(images[index])?'<figure class="book-figure"><img alt="" src="'+images[index]+'"></figure>':'';
 // 대화 질문은 나중에 더한 항목입니다. 이 함수는 책장을 거치지 않은 책 객체도
 // 받습니다(백업 복원·검사·예전 기록). 없다고 내려받기가 통째로 실패하면 안 됩니다.
 const points=Array.isArray(book.talkingPoints)?book.talkingPoints.filter(point=>typeof point==='string'&&point.trim()):[];
 const talking=points.length>0
  ? '<section class="book-talk" aria-labelledby="talk-heading"><h2 id="talk-heading">읽고 나서 함께 나눌 이야기</h2><ul>'
    +points.map(point=>'<li>'+escape(point)+'</li>').join('')
    +'</ul><p class="book-talk-note">정답이 있는 질문이 아니에요. 아이의 대답을 그대로 들어 주세요.</p></section>'
  : '';
 const contents=book.chapters.length>1?'<nav aria-label="동화 목차"><h2>목차</h2><ol>'+book.chapters.map((chapter,index)=>'<li><a href="#chapter-'+(index+1)+'">'+(index+1)+'. '+escape(chapter.title)+'</a></li>').join('')+'</ol></nav>':'';
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><title>'+escape(book.title)+'</title><style>'+
 '*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#EFE9DD;color:#3F342C;font:1.25rem/1.9 system-ui,sans-serif;overflow-wrap:anywhere}main{max-width:856px;margin:40px auto;padding:0 20px}h1{font-size:2em}h2{line-height:1.5}p{white-space:pre-wrap}nav{margin:2em 0;padding:clamp(12px,4vw,20px);background:#F7F2E6;border:1px solid #E2DAD0;border-radius:12px}nav h2{margin:0;font-size:.74em;letter-spacing:.34em;color:#9C8F82;font-weight:400;text-align:center}nav ol{list-style:none;padding:0;margin:8px 0}nav a{display:block;min-height:44px;padding:6px 0;color:#5E4B33;text-decoration:underline;text-underline-offset:3px}a:focus-visible{outline:3px solid #5E4B33;outline-offset:3px}section h2{scroll-margin-top:24px}section h2:focus{outline:2px solid #5E4B33;outline-offset:6px}footer{margin-top:2.4em;font-size:.875rem;border-top:1px solid #D5CDBD;padding-top:20px;color:#6E6055}footer .brand{display:block;margin-top:10px;font-size:.8em;letter-spacing:.22em;color:#9C8F82}'+
 '.book-figure{margin:1.6em 0;text-align:center}.book-figure img{max-width:100%;height:auto;border-radius:14px;box-shadow:0 2px 10px rgba(63,52,44,.16)}'+
 '.book-talk{margin:2.4em 0 0;padding:clamp(14px,4vw,22px);background:#F7F2E6;border:1px solid #E2DAD0;border-radius:14px}.book-talk h2{margin:0 0 .4em;font-size:1.05em}.book-talk ul{margin:0;padding-left:1.2em}.book-talk li{margin:.5em 0}.book-talk-note{margin:.8em 0 0;font-size:.82em;color:#6E6055}'+
 '@media(max-width:600px){main{margin:16px auto;padding:0 12px}h1{font-size:1.6em}}@page{margin:18mm}@media print{body{background:white;font-size:13pt}main{max-width:none;margin:0;padding:0;background:white}nav{display:none}footer{font-size:10.5pt}section{break-before:page}h1,h2{break-after:avoid}section h2:focus{outline:none}p{orphans:3;widows:3}.book-figure{break-inside:avoid}.book-figure img{box-shadow:none}.book-talk{break-before:page;background:white}}'+
 BOOK_CSS+
 '</style></head><body class="book" style="'+coverVarText(look.vars)+'"><main>'+
 '<svg class="bk-defs" aria-hidden="true" focusable="false">'+ART_DEFS+'</svg>'+
 // ── 겉 표지 ──
 '<header class="book-cover">'+plate('book-cover-art','0 0 364 464',look.art.cover,' preserveAspectRatio="xMidYMid slice"')+'<span class="book-cover-bind" aria-hidden="true"></span>'+
 '<p class="book-cover-tag">'+SITE_NAME+' · 나만의 동화</p>'+
 '<div class="book-cover-plate"><h1>'+escape(book.title)+'</h1><p class="book-cover-meta">'+book.chapters.length+'장으로 엮은 이야기</p></div>'+
 '<p class="book-cover-foot">나의 답변에서 시작되었습니다</p></header>'+
 contents+
 // ── 내지 ──
 '<div class="book-pages">'+book.chapters.map((chapter,index)=>'<section aria-labelledby="chapter-'+(index+1)+'">'+
  plate('book-band','0 0 242 72',look.art.band(index))+
  '<span class="book-chapter-no">제 '+(index+1)+' 장</span>'+
  '<h2 id="chapter-'+(index+1)+'" tabindex="-1">'+escape(chapter.title)+'</h2>'+
  '<div class="book-rule" aria-hidden="true"></div>'+
  picture(index)+
  '<p>'+escape(chapter.text)+'</p>'+
  plate('book-spot','0 0 60 16',look.art.spot(index))+
 '</section>').join('')+'</div>'+
 talking+
 '<footer>'+escape(book.note)+'<span class="brand">'+SITE_NAME+'</span></footer></main></body></html>';
}

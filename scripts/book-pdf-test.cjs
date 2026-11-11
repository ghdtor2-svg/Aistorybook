const assert=require('assert/strict');
const {jpegPdf,pdfFileName}=require('../.test-build/storybook/book-pdf');

// 실제 JPEG 내용은 PDF 뷰어가 해석한다. 여기서는 파일 구조(목차 위치·쪽 수·크기)를 확인한다.
const fakeJpeg=size=>{const bytes=new Uint8Array(size);bytes[0]=0xFF;bytes[1]=0xD8;bytes[size-2]=0xFF;bytes[size-1]=0xD9;return bytes;};
const pages=[
  {jpeg:fakeJpeg(300),pixelWidth:1200,pixelHeight:1800,width:576,height:864},
  ...Array.from({length:16},()=>({jpeg:fakeJpeg(500),pixelWidth:2400,pixelHeight:1600,width:864,height:576})),
];
const pdf=jpegPdf(pages,'지우의 용기 자전거');
const text=Buffer.from(pdf).toString('latin1');
assert.ok(text.startsWith('%PDF-1.4\n'));
assert.ok(text.endsWith('%%EOF\n'));
assert.match(text,/\/Count 17>>/);
assert.equal(text.match(/\/Type\/Page\//g).length,17);
assert.equal(text.match(/\/Filter\/DCTDecode/g).length,17);
assert.match(text,/MediaBox\[0 0 576 864\]/);
assert.match(text,/MediaBox\[0 0 864 576\]/);
// 목차(xref)의 위치가 정확해야 뷰어가 연다.
const startxref=Number(text.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
assert.ok(text.slice(startxref).startsWith('xref\n0 '));
const size=Number(text.slice(startxref).match(/^xref\n0 (\d+)/)[1]);
assert.equal(size,4+17*3);
const entries=text.slice(startxref).split('\n').slice(3,3+size-1);
entries.forEach((entry,index)=>{
  const offset=Number(entry.slice(0,10));
  assert.ok(text.slice(offset).startsWith((index+1)+' 0 obj\n'),'xref entry '+(index+1));
});
// 스트림 길이가 실제 바이트 수와 같아야 한다.
for(const match of text.matchAll(/\/Length (\d+)>>\nstream\n/g)){
  const start=match.index+match[0].length;
  assert.equal(text.slice(start+Number(match[1]),start+Number(match[1])+10),'\nendstream');
}
// 한국어 제목은 UTF-16으로 들어간다.
assert.match(text,/\/Title <FEFFC9C0C6B0C758/);
assert.throws(()=>jpegPdf([]));
assert.throws(()=>jpegPdf([{jpeg:new Uint8Array([1,2,3]),pixelWidth:1,pixelHeight:1,width:1,height:1}]));
assert.equal(pdfFileName('하루의 별빛: 정원/모험?'),'하루의 별빛 정원 모험.pdf');
assert.equal(pdfFileName('   '),'나의 동화.pdf');
console.log('PASS pdf: 17 pages (cover + 16 spreads), page sizes, exact xref offsets and stream lengths, Korean title, safe file name');

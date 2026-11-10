import type {Metadata} from 'next';
// 관리 화면은 공개 사이트에 있지만 검색에 올라가면 안 된다. 주소를 광고하지 않는다.
export const metadata:Metadata={robots:{index:false,follow:false,nocache:true},title:'주문과 제작 키 관리'};
export default function OfficeLayout({children}:{children:React.ReactNode}){return children;}

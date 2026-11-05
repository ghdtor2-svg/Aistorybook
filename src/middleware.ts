import {NextResponse, type NextRequest} from 'next/server';
import {closedPage, siteClosed, CLOSED_HEADERS} from './lib/storybook/site-gate';
/**
 * 공개 사이트의 문. 모든 주소가 여기를 먼저 지나갑니다.
 *
 * 닫혀 있으면 어떤 주소든 안내문 한 장(503)을 돌려줍니다. 화면도 API 도 함께
 * 막히므로 닫혀 있는 동안 유료 생성이 일어나지 않습니다.
 * 여는 방법과 판단 근거는 lib/storybook/site-gate.ts 에 적어 두었습니다.
 *
 * 내 PC 작업장은 .env.local 의 NEXT_PUBLIC_OFFICE_LOCAL=1 때문에 늘 열립니다.
 * 이 값은 next.config.mjs 가 빌드할 때 '1' 또는 '0' 으로 못 박습니다.
 */
export function middleware(request: NextRequest) {
 if (!siteClosed({officeLocal: process.env.NEXT_PUBLIC_OFFICE_LOCAL, siteOpen: process.env.SITE_OPEN})) return NextResponse.next();
 // HEAD·GET 이 아니어도 같은 503 을 돌려줍니다. 닫힌 문은 두드리는 방법과 무관합니다.
 return new NextResponse(request.method === 'HEAD' ? null : closedPage(), {status: 503, headers: CLOSED_HEADERS});
}
// 정적 파일(_next/static)은 지나가게 둡니다. 안내문은 바깥 요청이 없어 그것만으로 완성됩니다.
export const config = {matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']};

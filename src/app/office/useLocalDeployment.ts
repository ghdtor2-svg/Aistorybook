'use client';
import {useEffect,useState} from 'react';
/**
 * 로컬 PC에서만 동작하는 사무실 기능을 가립니다.
 *
 * /api/office, /api/office/subscription, /api/office/development,
 * /api/office/owner-actions, /api/office/autonomous-status 는 서버의
 * localOrigin() 검사로 로컬 호스트가 아니면 403을 돌려줍니다. 이 기능들은
 * .office-data 로컬 파일을 읽거나 로컬 Codex 프로세스를 띄우기 때문에
 * 온라인 배포에서는 동작할 수 없습니다. 오류 문구를 보여주는 대신 숨깁니다.
 *
 * 대표 결정 요청(owner-actions)에는 내부 운영 정보가 들어 있어 공개 사이트에
 * 노출되면 안 됩니다. 숨기는 것은 표시 정책이며, 실제 차단은 서버가 합니다.
 *
 * 서버 렌더와 첫 클라이언트 렌더가 모두 undefined라서 hydration 불일치가 없습니다.
 * 마운트 뒤에야 실제 호스트를 알 수 있으므로 세 가지 상태를 돌려줍니다.
 *
 *   undefined … 아직 모름. 호출부는 아무것도 그리지 않아야 합니다.
 *   true      … 로컬. 전체 기능을 보여 줍니다.
 *   false     … 온라인. 숨기거나 안내로 바꿉니다.
 *
 * undefined를 false와 합치면 로컬에서도 첫 프레임에 온라인용 안내가
 * 잠깐 보였다 사라집니다. 그래서 '모름'을 따로 둡니다.
 */
export const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];
export function isLocalHostname(hostname: string) {
 return LOCAL_HOSTS.includes(hostname);
}
export function useLocalDeployment(): boolean | undefined {
 const [local, setLocal] = useState<boolean | undefined>(undefined);
 useEffect(() => {
  setLocal(isLocalHostname(window.location.hostname));
 }, []);
 return local;
}

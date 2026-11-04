export type SubscriptionReadiness={localAuthAvailable:boolean;authenticated:boolean;firstRunApproved:boolean;restartRequired?:boolean};
// Local login is a prerequisite, never proof of provider connection or remaining quota.
export function readinessLabel(status:SubscriptionReadiness|null|undefined){if(!status)return '연결 상태 미확인';if(status.restartRequired)return '설정 반영 필요';if(!status.localAuthAvailable)return '관리자 설정 필요';if(!status.authenticated)return '로컬 로그인 필요';if(!status.firstRunApproved)return '최초 실행 승인 필요';return '로컬 로그인됨 · 실행 전 검사';}

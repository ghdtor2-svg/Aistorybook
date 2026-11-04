// Separately billed APIs stay off regardless of legacy environment flags.
export function assertPaidApiDisabled():void {throw new Error('유료 API 호출은 6-1단계 정책으로 비활성화되어 있습니다.');}

// 데모 tenant 데이터는 더 이상 사용하지 않습니다. 모든 공개 사이트는 백엔드 API를 통해 동적으로 조회됩니다.
// 기존 import 호환을 위해 KNOWN_TENANT_SLUGS는 빈 배열을 유지합니다 (proxy.ts 의 redirect 로직 호환).
export const KNOWN_TENANT_SLUGS: string[] = [];

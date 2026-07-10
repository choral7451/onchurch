import Link from "next/link";
import { Icon } from "@/components/icons";

// 문의하기(카카오) 스티키 위에 겹쳐 두는 상시 노출 가입 CTA.
export function StartSticky() {
  return (
    <Link href="/signup" className="start-sticky" aria-label="무료로 시작하기">
      <Icon.arrow style={{ width: 15, height: 15 }} />
      <span>시작하기</span>
    </Link>
  );
}

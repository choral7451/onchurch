"use client";

import { useEffect, useState } from "react";

// 랜딩의 "운영 중인 교회" 데모 링크에는 ?from=landing 이 붙는다.
// 그렇게 넘어온 방문자에게만 우하단에 "무료 체험 시작하기" 스티키를 보여준다.
// (교회 실제 성도/일반 방문자에겐 표시하지 않음)
const FLAG_KEY = "onchurch.fromLanding";
const SIGNUP_URL = "https://everychurch.co.kr/signup?ref=demo";

export function DemoCtaSticky() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let fromLanding = false;
    try {
      if (new URLSearchParams(window.location.search).get("from") === "landing") {
        // 최초 진입 시 세션에 기록 → 교회 사이트 내부를 돌아다녀도 계속 유지
        sessionStorage.setItem(FLAG_KEY, "1");
        fromLanding = true;
      } else if (sessionStorage.getItem(FLAG_KEY) === "1") {
        fromLanding = true;
      }
    } catch {
      // sessionStorage 접근 불가(시크릿/프라이버시 모드 등)면 조용히 무시
    }
    setShow(fromLanding);
  }, []);

  if (!show) return null;

  return (
    <a href={SIGNUP_URL} className="demo-cta-sticky" aria-label="온교회 무료 체험 시작하기">
      <span className="demo-cta-sticky-icon" aria-hidden="true">✨</span>
      <span>무료체험 시작하기</span>
    </a>
  );
}

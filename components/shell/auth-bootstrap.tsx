"use client";

import { useEffect } from "react";
import { getAccessToken, getRefreshToken, refreshTokens } from "@/lib/api-client";

const REFRESH_INTERVAL_MS = 1000 * 60 * 20;

// 토큰이 있을 때만 갱신 시도. 실패 처리(401→로그아웃, 일시 오류→유지)는 refreshTokens가 담당.
function tryRefresh(): void {
  if (!getAccessToken() || !getRefreshToken()) return;
  void refreshTokens();
}

export function AuthBootstrap() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    tryRefresh();
    timer = setInterval(() => {
      tryRefresh();
    }, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryRefresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}

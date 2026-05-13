"use client";

import { useEffect } from "react";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onchurchAuth,
  saveTokens,
} from "@/lib/api-client";

const REFRESH_INTERVAL_MS = 1000 * 60 * 20;

async function tryRefresh(): Promise<boolean> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) return false;
  try {
    const tokens = await onchurchAuth.refresh(accessToken, refreshToken);
    saveTokens(tokens);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export function AuthBootstrap() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    void tryRefresh();
    timer = setInterval(() => {
      void tryRefresh();
    }, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void tryRefresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}

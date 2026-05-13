"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const ok = await tryRefresh();
      if (cancelled) return;
      if (ok && pathname === "/") {
        router.replace("/admin");
      }
    };

    run();
    timer = setInterval(() => {
      void tryRefresh();
    }, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void tryRefresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, router]);

  return null;
}

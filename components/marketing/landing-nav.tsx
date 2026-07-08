"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT, isLoggedIn, onchurchChurch } from "@/lib/api-client";
import { buildAdminUrl } from "@/lib/site-host";

export function LandingNav() {
  // 오너/관리자로 로그인한 경우에만 헤더에 '관리자 페이지' 버튼을 노출한다.
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (!isLoggedIn()) {
        setIsManager(false);
        return;
      }
      onchurchChurch
        .getMine()
        .then((res) => {
          if (cancelled) return;
          setIsManager(res?.churchRole === "owner" || res?.churchRole === "admin");
        })
        .catch(() => {
          if (!cancelled) setIsManager(false);
        });
    };
    sync();
    // 로그인/로그아웃(같은 탭) 및 다른 탭 변경 시 다시 판별.
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("onchurch.")) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/everychurch-logo.jpeg" alt="온교회" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-name">온교회</div>
            <div className="brand-eng">ONCHURCH BUILDER</div>
          </div>
        </Link>
        <div className="landing-nav-right">
          <div className="landing-nav-links">
            <a href="/#demo">실제 사례</a>
            <a href="/#features">기능</a>
            <a href="/#pricing">가격</a>
          </div>
          {isManager && (
            <a href={buildAdminUrl()} className="btn btn-secondary landing-nav-admin">
              관리자 페이지
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/api-client";

export function LandingNav() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!getAccessToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("onchurch.")) setAuthed(!!getAccessToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
        <div className="landing-nav-links">
          <a href="/#demo">실제 사례</a>
          <a href="/#features">기능</a>
          <a href="/#pricing">가격</a>
        </div>
        <div className="nav-cta">
          {authed ? (
            <Link href="/admin" className="btn btn-secondary">
              관리자 페이지
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

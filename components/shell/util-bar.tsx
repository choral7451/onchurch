"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_CHANGE_EVENT, clearTokens, isLoggedIn, onchurchChurch } from "@/lib/api-client";
import { buildAdminUrl } from "@/lib/site-host";

type Props = {
  tagline: string;
  pathPrefix: string;
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--ink)",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

export function UtilBar({ tagline, pathPrefix }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loginHref = `${pathPrefix}/login` || "/login";
  const mypageHref = `${pathPrefix}/mypage` || "/mypage";

  // 로그인/로그아웃(같은 탭), 다른 탭(storage), 페이지 이동 시 모두 로그인 상태를 다시 읽는다.
  useEffect(() => {
    const sync = () => setAuthed(isLoggedIn());
    sync();
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("onchurch.")) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  useEffect(() => {
    if (!authed) { setIsAdmin(false); return; }
    let cancelled = false;
    onchurchChurch
      .getMine()
      .then((res) => { if (!cancelled) setIsAdmin(!!res?.church); })
      .catch(() => { /* 멤버이거나 미인증 — 관리자 아님 */ });
    return () => { cancelled = true; };
  }, [authed]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function logout() {
    clearTokens();
    setAuthed(false);
    setIsAdmin(false);
    setMenuOpen(false);
    router.refresh();
  }

  return (
    <div className="utilbar">
      <div className="utilbar-inner">
        <div className="utilbar-left">
          <span>{tagline}</span>
        </div>
        <div className="utilbar-right">
          {authed === null ? null : authed ? (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                style={{ background: "transparent", border: 0, color: "inherit", font: "inherit", cursor: "pointer", padding: 0 }}
              >
                내 계정 ▾
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 160,
                    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.14)", padding: 6, zIndex: 60, display: "flex", flexDirection: "column",
                  }}
                >
                  {isAdmin && (
                    <a href={buildAdminUrl()} className="utilbar-menu-item" role="menuitem" style={menuItemStyle}>관리자 페이지</a>
                  )}
                  <Link href={mypageHref} className="utilbar-menu-item" role="menuitem" style={menuItemStyle} onClick={() => setMenuOpen(false)}>마이페이지</Link>
                  <button type="button" className="utilbar-menu-item" role="menuitem" style={{ ...menuItemStyle, textAlign: "left", width: "100%" }} onClick={logout}>로그아웃</button>
                </div>
              )}
            </div>
          ) : (
            <Link href={loginHref}>로그인</Link>
          )}
        </div>
      </div>
    </div>
  );
}

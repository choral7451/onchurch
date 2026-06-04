"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { clearTokens, isLoggedIn, onchurchChurch } from "@/lib/api-client";
import type { Brand, NavItem } from "@/lib/types";

const ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"];

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--ink)",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "inherit",
};

// 현재 호스트(서브도메인)에서 루트 도메인의 관리자 콘솔(/admin) URL을 만든다.
function buildAdminUrl(): string {
  if (typeof window === "undefined") return "/admin";
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(":");
  const portSuffix = port ? `:${port}` : "";
  for (const root of ROOT_DOMAINS) {
    if (hostname === root) return "/admin";
    if (hostname.endsWith(`.${root}`)) return `${protocol}//${root}${portSuffix}/admin`;
  }
  if (hostname.endsWith(".localhost")) return `${protocol}//localhost${portSuffix}/admin`;
  return "/admin";
}

type Props = {
  tenant: string;
  brand: Brand;
  nav: NavItem[];
  pathPrefix: string;
  enabledPages?: string[];
};

export function Nav({ tenant, brand, nav, pathPrefix, enabledPages }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ok = isLoggedIn();
    setLoggedIn(ok);
    if (!ok) return;
    // 교회 소유자(관리자)인지 확인 — 소유 교회가 있으면 관리자.
    let cancelled = false;
    onchurchChurch
      .getMine()
      .then((res) => { if (!cancelled) setIsAdmin(!!res?.church); })
      .catch(() => { /* 멤버이거나 미인증 — 관리자 아님 */ });
    return () => { cancelled = true; };
  }, []);

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
    setLoggedIn(false);
    setIsAdmin(false);
    setMenuOpen(false);
    router.refresh();
  }

  const link = (href: string) => (href === "/" ? pathPrefix || "/" : `${pathPrefix}${href}`);
  const base = `/${tenant}`;
  const isActive = (href: string) => {
    if (href === "/") return pathname === base || pathname === `${base}/` || pathname === "/" || pathname === "";
    const target = `${base}${href}`;
    const localTarget = href;
    return (
      pathname === target ||
      pathname.startsWith(`${target}/`) ||
      pathname === localTarget ||
      pathname.startsWith(`${localTarget}/`)
    );
  };

  const visibleNav = (enabledPages && enabledPages.length > 0
    ? nav.filter((item) => item.id === "directions" || enabledPages.includes(item.id))
    : nav
  ).filter((item) => item.id !== "prayer"); // 기도 요청은 우측 CTA 버튼으로만 노출
  const prayerEnabled = !enabledPages || enabledPages.length === 0 || enabledPages.includes("prayer");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <>
    <nav className="nav">
      <div className="nav-inner">
        <Link href={link("/")} className="brand">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="brand-logo" />
          )}
          <div className="brand-text">
            <div className="brand-name">{brand.name}</div>
            <div className="brand-eng">{brand.eng}</div>
          </div>
        </Link>
        <div className="nav-links">
          {visibleNav.map((item) => (
            <Link key={item.id} href={link(item.href)} className={`nav-link ${isActive(item.href) ? "active" : ""}`}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-cta" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {loggedIn ? (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                내 계정 ▾
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 180,
                    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.12)", padding: 6, zIndex: 50, display: "flex", flexDirection: "column",
                  }}
                >
                  {isAdmin && (
                    <a href={buildAdminUrl()} className="nav-menu-item" role="menuitem" style={menuItemStyle}>관리자 페이지</a>
                  )}
                  <Link href={link("/mypage")} className="nav-menu-item" role="menuitem" style={menuItemStyle} onClick={() => setMenuOpen(false)}>마이페이지</Link>
                  <button type="button" className="nav-menu-item" role="menuitem" style={{ ...menuItemStyle, textAlign: "left", width: "100%" }} onClick={logout}>로그아웃</button>
                </div>
              )}
            </div>
          ) : (
            <Link href={link("/login")} className="btn btn-secondary">로그인</Link>
          )}
          {prayerEnabled && (
            <Link href={link("/prayer")} className="btn btn-primary">
              <Icon.pray style={{ width: 16, height: 16 }} />
              기도 요청
            </Link>
          )}
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </nav>

    {open && (
      <>
        <button
          type="button"
          className="nav-overlay"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
        />
        <aside className="nav-drawer" role="dialog" aria-label="모바일 메뉴">
          <header className="nav-drawer-head">
            <span>메뉴</span>
            <button
              type="button"
              className="nav-drawer-close"
              aria-label="닫기"
              onClick={() => setOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div className="nav-drawer-links">
            {visibleNav.map((item) => (
              <Link
                key={item.id}
                href={link(item.href)}
                className={`nav-drawer-link ${isActive(item.href) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="nav-drawer-links" style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}>
            {loggedIn ? (
              <>
                {isAdmin && <a href={buildAdminUrl()} className="nav-drawer-link">관리자 페이지</a>}
                <Link href={link("/mypage")} className="nav-drawer-link">마이페이지</Link>
                <button type="button" className="nav-drawer-link" style={{ textAlign: "left", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }} onClick={logout}>로그아웃</button>
              </>
            ) : (
              <Link href={link("/login")} className="nav-drawer-link">로그인 / 성도 가입</Link>
            )}
          </div>
          {prayerEnabled && (
            <div className="nav-drawer-cta">
              <Link href={link("/prayer")} className="btn btn-primary">
                <Icon.pray style={{ width: 16, height: 16 }} />
                기도 요청
              </Link>
            </div>
          )}
        </aside>
      </>
    )}
    </>
  );
}

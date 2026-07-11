"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { Brand, NavItem } from "@/lib/types";
import { type Lang, pick, SHELL } from "@/lib/i18n";
import { AUTH_CHANGE_EVENT, isLoggedIn, onchurchChurch } from "@/lib/api-client";
import { buildAdminUrl } from "@/lib/site-host";

type Props = {
  tenant: string;
  brand: Brand;
  nav: NavItem[];
  pathPrefix: string;
  enabledPages?: string[];
  lang?: Lang;
};

export function Nav({ tenant, brand, nav, pathPrefix, enabledPages, lang = "ko" }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // 오너/관리자로 로그인한 경우에만 관리자 페이지 이동 버튼을 노출한다.
  const [isManager, setIsManager] = useState(false);

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

  const visibleNav = enabledPages && enabledPages.length > 0
    ? nav.filter((item) => item.id === "directions" || enabledPages.includes(item.id))
    : nav;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 로그인/로그아웃(같은 탭) 및 다른 탭 변경 시 오너/관리자 여부를 다시 판별.
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
        <Link
          href={link("/")}
          className="brand"
          onClick={() => {
            // 이미 루트 페이지에 있으면 네비게이션이 일어나지 않아 스크롤이 그대로 멈춤 → 맨 위로 올림
            if (isActive("/")) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
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
        {isManager && (
          <div className="nav-cta">
            <a href={buildAdminUrl()} className="btn btn-primary">
              <Icon.gear style={{ width: 16, height: 16 }} />
              {pick(lang, SHELL.adminPage)}
            </a>
          </div>
        )}
        <button
          type="button"
          className="nav-toggle"
          aria-label={pick(lang, SHELL.openMenu)}
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
          aria-label={pick(lang, SHELL.closeMenu)}
          onClick={() => setOpen(false)}
        />
        <aside className="nav-drawer" role="dialog" aria-label={pick(lang, SHELL.mobileMenu)}>
          <header className="nav-drawer-head">
            <span>{pick(lang, SHELL.menu)}</span>
            <button
              type="button"
              className="nav-drawer-close"
              aria-label={pick(lang, SHELL.close)}
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
          {isManager && (
            <div className="nav-drawer-cta">
              <a href={buildAdminUrl()} className="btn btn-primary">
                <Icon.gear style={{ width: 16, height: 16 }} />
                {pick(lang, SHELL.adminPage)}
              </a>
            </div>
          )}
        </aside>
      </>
    )}
    </>
  );
}

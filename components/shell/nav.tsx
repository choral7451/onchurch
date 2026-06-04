"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { Brand, NavItem } from "@/lib/types";

type Props = {
  tenant: string;
  brand: Brand;
  nav: NavItem[];
  pathPrefix: string;
  enabledPages?: string[];
};

export function Nav({ tenant, brand, nav, pathPrefix, enabledPages }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        {prayerEnabled && (
          <div className="nav-cta">
            <Link href={link("/prayer")} className="btn btn-primary">
              <Icon.pray style={{ width: 16, height: 16 }} />
              기도 요청
            </Link>
          </div>
        )}
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

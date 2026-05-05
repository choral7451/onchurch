"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { Brand, NavItem } from "@/lib/types";

type Props = {
  tenant: string;
  brand: Brand;
  nav: NavItem[];
};

function tenantHref(tenant: string, href: string) {
  return href === "/" ? `/${tenant}` : `/${tenant}${href}`;
}

export function Nav({ tenant, brand, nav }: Props) {
  const pathname = usePathname();
  const base = `/${tenant}`;
  const isActive = (href: string) => {
    const target = tenantHref(tenant, href);
    if (href === "/") return pathname === base || pathname === `${base}/`;
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={`/${tenant}`} className="brand">
          <div className="brand-mark" />
          <div className="brand-text">
            <div className="brand-name">{brand.name}</div>
            <div className="brand-eng">{brand.eng}</div>
          </div>
        </Link>
        <div className="nav-links">
          {nav.map((item) => (
            <Link key={item.id} href={tenantHref(tenant, item.href)} className={`nav-link ${isActive(item.href) ? "active" : ""}`}>
              {item.label}
              {item.children && <Icon.arrowDown />}
            </Link>
          ))}
        </div>
        <div className="nav-cta">
          <button className="icon-btn" title="검색" aria-label="검색"><Icon.search /></button>
          <Link href={`/${tenant}/prayer`} className="btn btn-primary">
            <Icon.pray style={{ width: 16, height: 16 }} />
            기도 요청
          </Link>
        </div>
      </div>
    </nav>
  );
}

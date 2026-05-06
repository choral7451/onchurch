"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { Brand, NavItem } from "@/lib/types";

type Props = {
  tenant: string;
  brand: Brand;
  nav: NavItem[];
  pathPrefix: string;
};

export function Nav({ tenant, brand, nav, pathPrefix }: Props) {
  const pathname = usePathname();
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

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={link("/")} className="brand">
          <div className="brand-mark" />
          <div className="brand-text">
            <div className="brand-name">{brand.name}</div>
            <div className="brand-eng">{brand.eng}</div>
          </div>
        </Link>
        <div className="nav-links">
          {nav.map((item) => (
            <Link key={item.id} href={link(item.href)} className={`nav-link ${isActive(item.href) ? "active" : ""}`}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-cta">
          <Link href={link("/prayer")} className="btn btn-primary">
            <Icon.pray style={{ width: 16, height: 16 }} />
            기도 요청
          </Link>
        </div>
      </div>
    </nav>
  );
}

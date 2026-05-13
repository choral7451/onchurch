import Link from "next/link";
import { Icon } from "@/components/icons";
import type { Brand, NavItem } from "@/lib/types";

type FooterNavGroup = { heading: string; ids: string[] };

type Props = {
  brand: Brand;
  nav: NavItem[];
  footerNav: FooterNavGroup[];
  pathPrefix: string;
  enabledPages?: string[];
};

export function Footer({ brand, nav, footerNav, pathPrefix, enabledPages }: Props) {
  const link = (href: string) => (href === "/" ? pathPrefix || "/" : `${pathPrefix}${href}`);
  const navById = new Map(nav.map((n) => [n.id, n] as const));
  const isEnabled = (id: string) =>
    !enabledPages || enabledPages.length === 0 || enabledPages.includes(id);

  const groups = footerNav
    .map((g) => ({
      heading: g.heading,
      items: g.ids.map((id) => navById.get(id)).filter((n): n is NavItem => !!n && isEnabled(n.id)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-head">
              {brand.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt="" className="brand-logo" />
              )}
              <div>
                <div className="footer-brand-name">{brand.name}</div>
                {brand.eng && <div className="footer-brand-eng">{brand.eng}</div>}
              </div>
            </div>
            {(brand.tagline || brand.address) && (
              <p className="footer-brand-desc">
                {brand.tagline && <>{brand.tagline}.<br /></>}
                {brand.address}
              </p>
            )}
            {(brand.phone || brand.email) && (
              <div className="footer-contacts">
                {brand.phone && (
                  <a href={`tel:${brand.phone.replace(/[^0-9+]/g, "")}`} className="footer-contact">
                    <Icon.phone /> {brand.phone}
                  </a>
                )}
                {brand.email && (
                  <a href={`mailto:${brand.email}`} className="footer-contact">
                    <Icon.mail /> {brand.email}
                  </a>
                )}
              </div>
            )}
          </div>
          {groups.map((g) => (
            <div key={g.heading} className="footer-col">
              <h4>{g.heading}</h4>
              <ul>
                {g.items.map((item) => (
                  <li key={item.id}>
                    <Link href={link(item.href)}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-meta">
          <div>© {new Date().getFullYear()} {brand.name}. All rights reserved.</div>
          {(brand.representative || brand.businessNo) && (
            <div>
              {brand.representative}
              {brand.representative && brand.businessNo ? " · " : ""}
              {brand.businessNo && `사업자등록번호 ${brand.businessNo}`}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

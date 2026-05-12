import { Icon } from "@/components/icons";
import type { Brand } from "@/lib/types";

type Props = {
  brand: Brand;
  footerNav: Record<string, string[]>;
};

export function Footer({ brand, footerNav }: Props) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {brand.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt="" className="brand-logo" />
              )}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{brand.name}</div>
                <div style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.6, marginTop: 2 }}>{brand.eng}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.7, maxWidth: 320, margin: 0 }}>
              {brand.tagline}.<br />
              {brand.address}
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 20, fontSize: 13, opacity: 0.7 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon.phone /> {brand.phone}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon.mail /> {brand.email}</span>
            </div>
          </div>
          {Object.entries(footerNav).map(([heading, items]) => (
            <div key={heading}>
              <h4>{heading}</h4>
              <ul>
                {items.map((item) => (
                  <li key={item}><a href="#">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-meta">
          <div>© {new Date().getFullYear()} {brand.name}. All rights reserved.</div>
          <div>{brand.representative} · 사업자등록번호 {brand.businessNo}</div>
        </div>
      </div>
    </footer>
  );
}

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { Icon } from "@/components/icons";

const MAP_LABELS = [
  { x: "12%", y: "30%", l: "왕십리역" },
  { x: "78%", y: "20%", l: "한양대" },
  { x: "85%", y: "80%", l: "성수동" },
  { x: "20%", y: "75%", l: "마장동" },
];

type PublicTransportation = {
  id: number;
  icon: string | null;
  tag: string;
  title: string;
  description: string | null;
};

async function fetchTransportations(slug: string): Promise<PublicTransportation[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/transportations`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body?.item?.transportations ?? []) as PublicTransportation[];
  } catch {
    return [];
  }
}

export default async function DirectionsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();

  const items = await fetchTransportations(tenant);
  const address = church.address ?? "";
  const phone = church.phone ?? "";
  const email = church.email ?? "";
  const churchName = church.name;

  return (
    <div>
      <PageHeader
        eyebrow="DIRECTIONS"
        title="찾아오시는 길"
        sub="처음 오시는 분도 어렵지 않게 안내해드립니다."
      />
      <section className="section">
        <div className="container">
          <div className="map-placeholder">
            <div className="map-grid" />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              {MAP_LABELS.map((p) => (
                <div key={p.l} style={{ position: "absolute", left: p.x, top: p.y, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  ○ {p.l}
                </div>
              ))}
            </div>
            <div className="map-pin">
              <div className="map-pin-dot" />
              <div className="map-pin-label">{churchName}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 40 }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)", marginBottom: 10 }}>
                <Icon.mapPin />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>주소</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.5 }}>
                {address.split(" ").slice(0, 2).join(" ")}<br />
                {address.split(" ").slice(2).join(" ")}
              </div>
            </div>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)", marginBottom: 10 }}>
                <Icon.phone />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>연락처</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.5 }}>
                {phone}
                <br />
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>{email}</span>
              </div>
            </div>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)", marginBottom: 10 }}>
                <Icon.clock />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>사무실</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.5 }}>
                평일 09:00 — 18:00
                <br />
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>토요일 09:00 — 14:00</span>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div style={{ marginTop: 64 }}>
              <div className="section-head">
                <div>
                  <span className="eyebrow">Transportation</span>
                  <h2>대중교통 안내</h2>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {items.map((t) => (
                  <div key={t.id} className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      {t.icon && <span style={{ fontSize: 14 }}>{t.icon}</span>}
                      <span>{t.tag}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--primary-deep)", letterSpacing: "-0.02em", margin: "4px 0 8px" }}>
                      {t.title}
                    </div>
                    {t.description && <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{t.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

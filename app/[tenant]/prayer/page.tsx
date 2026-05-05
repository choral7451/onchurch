import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";
import { PrayerForm } from "./form";

export default async function PrayerPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="PRAYER REQUEST"
        title="기도 요청"
        sub="혼자 감당하기 어려운 일들이 있으신가요? 우리 교회 성도와 목회진이 함께 마음을 모아 기도해드립니다."
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 880 }}>
          <PrayerForm categories={D.prayerCategories} scopes={D.prayerScopes} />

          <div style={{ marginTop: 64 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--primary-deep)", margin: "0 0 20px" }}>
              이번 주 함께 기도해주세요
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {D.prayerSamples.map((p, i) => (
                <div key={i} className="card" style={{ borderLeft: "3px solid var(--accent)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.05em", marginBottom: 6 }}>{p.who}</div>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)" }}>{p.topic}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

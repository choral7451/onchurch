import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";

export default async function PrayerPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="PRAYER REQUEST"
        title="기도 요청"
        sub="혼자 감당하기 어려운 일들이 있으신가요? 함께 마음을 모아 기도해드립니다."
      />
      <section className="section">
        <div className="container">
          <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
            <p style={{ fontSize: 16 }}>이 섹션은 곧 제공됩니다.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

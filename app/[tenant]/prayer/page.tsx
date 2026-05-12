import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "기도 요청", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "기도 요청",
    path: "/prayer",
    pageDescription: `${church.name}에 기도 제목을 보내주시면 함께 마음을 모아 기도해드립니다.`,
    extraKeywords: ["기도 요청", "중보기도", "기도 제목"],
  });
}

export default function PrayerPage() {
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

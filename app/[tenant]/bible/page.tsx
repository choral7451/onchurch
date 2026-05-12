import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "성경 통독 · 큐티", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "성경 통독 · 큐티",
    path: "/bible",
    pageDescription: `${church.name}과 함께하는 성경 통독과 매일 큐티 가이드.`,
    extraKeywords: ["성경 통독", "큐티", "QT", "매일 묵상", "성경 읽기"],
  });
}

export default function BiblePage() {
  return (
    <div>
      <PageHeader
        eyebrow="BIBLE READING & QT"
        title="성경 통독 · 큐티"
        sub="매일 말씀과 함께하세요."
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

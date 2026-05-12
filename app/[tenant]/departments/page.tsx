import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "교회학교 · 부서", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "교회학교 · 부서",
    path: "/departments",
    pageDescription: `${church.name}의 유아부·아동부·청소년부·청년부 등 다음 세대 사역과 소그룹을 안내합니다.`,
    extraKeywords: ["교회학교", "주일학교", "유아부", "아동부", "청소년부", "청년부", "다음 세대"],
  });
}

export default function DepartmentsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="DEPARTMENTS"
        title="교회학교 · 부서"
        sub="유아부터 청년까지, 다음 세대를 위한 사역과 소그룹을 안내합니다."
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

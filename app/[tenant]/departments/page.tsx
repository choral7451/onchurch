import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { normalizeLang, pick } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "교회학교 · 부서", robots: { index: false, follow: false } };
  const lang = normalizeLang(church.siteLang);
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: pick(lang, { ko: "교회학교 · 부서", en: "Church School & Departments" }),
    path: "/departments",
    pageDescription: pick(lang, {
      ko: `${church.name}의 유아부·아동부·청소년부·청년부 등 다음 세대 사역과 소그룹을 안내합니다.`,
      en: `Next-generation ministries and small groups at ${church.name}, from preschool to young adults.`,
    }),
    extraKeywords: pick(lang, {
      ko: ["교회학교", "주일학교", "유아부", "아동부", "청소년부", "청년부", "다음 세대"],
      en: ["church school", "Sunday school", "preschool ministry", "children's ministry", "youth ministry", "young adult ministry", "next generation"],
    }),
  });
}

export default async function DepartmentsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return (
    <div>
      <PageHeader
        eyebrow="DEPARTMENTS"
        title={pick(lang, { ko: "교회학교 · 부서", en: "Church School & Departments" })}
        sub={pick(lang, {
          ko: "유아부터 청년까지, 다음 세대를 위한 사역과 소그룹을 안내합니다.",
          en: "Ministries and small groups for the next generation, from preschoolers to young adults.",
        })}
      />
      <section className="section">
        <div className="container">
          <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
            <p style={{ fontSize: 16 }}>{pick(lang, { ko: "이 섹션은 곧 제공됩니다.", en: "This section is coming soon." })}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

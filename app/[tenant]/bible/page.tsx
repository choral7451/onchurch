import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { normalizeLang, pick } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "성경 통독 · 큐티", robots: { index: false, follow: false } };
  const lang = normalizeLang(church.siteLang);
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: pick(lang, { ko: "성경 통독 · 큐티", en: "Bible Reading & QT" }),
    path: "/bible",
    pageDescription: pick(lang, {
      ko: `${church.name}과 함께하는 성경 통독과 매일 큐티 가이드.`,
      en: `A Bible reading plan and daily QT guide with ${church.name}.`,
    }),
    extraKeywords: pick(lang, {
      ko: ["성경 통독", "큐티", "QT", "매일 묵상", "성경 읽기"],
      en: ["Bible reading", "QT", "quiet time", "daily devotion", "Bible study"],
    }),
  });
}

export default async function BiblePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return (
    <div>
      <PageHeader
        eyebrow="BIBLE READING & QT"
        title={pick(lang, { ko: "성경 통독 · 큐티", en: "Bible Reading & QT" })}
        sub={pick(lang, { ko: "매일 말씀과 함께하세요.", en: "Spend each day with the Word." })}
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

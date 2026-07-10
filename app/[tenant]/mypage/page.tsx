import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";
import { normalizeLang, pick } from "@/lib/i18n";
import { MyPageClient } from "./client";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return {
    title: pick(lang, { ko: "마이페이지", en: "My Page" }),
    robots: { index: false, follow: false },
  };
}

export default async function MyPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  const prefix = await getPathPrefix(tenant);
  const lang = normalizeLang(church.siteLang);

  return (
    <div>
      <PageHeader
        eyebrow="MY PAGE"
        title={pick(lang, { ko: "마이페이지", en: "My Page" })}
        sub={pick(lang, {
          ko: `${church.name}에서의 내 활동을 확인합니다.`,
          en: `Check your activity at ${church.name}.`,
        })}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <MyPageClient slug={tenant} loginHref={`${prefix}/login`} communityHref={`${prefix}/community`} lang={lang} />
        </div>
      </section>
    </div>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";
import { normalizeLang, pick } from "@/lib/i18n";
import { MemberAuth } from "@/components/shell/member-auth";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  return {
    title: pick(lang, { ko: "로그인 · 성도 가입", en: "Log in · Sign up" }),
    robots: { index: false, follow: false },
  };
}

export default async function MemberLoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  const prefix = await getPathPrefix(tenant);
  const lang = normalizeLang(church.siteLang);

  return (
    <div>
      <PageHeader
        eyebrow="MEMBER"
        title={pick(lang, { ko: "로그인", en: "Log in" })}
        sub={pick(lang, {
          ko: `${church.name} 성도로 로그인하거나 가입하면 교제 게시판에 글을 남길 수 있습니다.`,
          en: `Log in or sign up as a member of ${church.name} to post on the community board.`,
        })}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <MemberAuth slug={tenant} churchName={church.name} redirectTo={prefix || "/"} lang={lang} />
        </div>
      </section>
    </div>
  );
}

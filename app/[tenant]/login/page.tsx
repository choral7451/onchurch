import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";
import { MemberAuth } from "@/components/shell/member-auth";

export const metadata: Metadata = {
  title: "로그인 · 성도 가입",
  robots: { index: false, follow: false },
};

export default async function MemberLoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  const prefix = await getPathPrefix(tenant);

  return (
    <div>
      <PageHeader
        eyebrow="MEMBER"
        title="로그인"
        sub={`${church.name} 성도로 로그인하거나 가입하면 교제 게시판에 글을 남길 수 있습니다.`}
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <MemberAuth slug={tenant} churchName={church.name} redirectTo={prefix || "/"} />
        </div>
      </section>
    </div>
  );
}

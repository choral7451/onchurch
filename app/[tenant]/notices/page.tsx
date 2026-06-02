import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { NoticesList } from "./list";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "교회 소식", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "교회 소식",
    path: "/notices",
    pageDescription: `${church.name}의 공지사항과 새소식, 행사 안내를 확인하세요.`,
    extraKeywords: ["교회 소식", "공지사항", "새소식", "교회 행사"],
  });
}

type Notice = {
  id: number;
  category: string | null;
  title: string;
  content: string | null;
  author: string | null;
  isPinned: boolean;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
};

async function fetchNotices(slug: string): Promise<{ notices: Notice[]; totalCount: number }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/notices?size=100`, {
      cache: "no-store",
    });
    if (!res.ok) return { notices: [], totalCount: 0 };
    const body = await res.json();
    return {
      notices: (body?.item?.notices ?? []) as Notice[],
      totalCount: (body?.item?.totalCount ?? 0) as number,
    };
  } catch {
    return { notices: [], totalCount: 0 };
  }
}

async function NoticesContent({ tenant }: { tenant: string }) {
  const [{ notices }, church] = await Promise.all([fetchNotices(tenant), fetchPublicChurch(tenant)]);
  const categories = Array.from(new Set(notices.map((n) => n.category ?? "일반")));
  categories.unshift("전체");
  return <NoticesList notices={notices} categories={categories} churchName={church?.name ?? ""} />;
}

function NoticesSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="skel" style={{ width: 280, height: 32, marginBottom: 8 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
      <span className="skel" style={{ width: "100%", height: 60 }} />
    </div>
  );
}

export default async function NoticesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader
        eyebrow="NOTICES"
        title="공지사항 · 교회 소식"
        sub="교회의 공지와 새 소식을 한 곳에서 확인하세요."
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<NoticesSkeleton />}>
            <NoticesContent tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

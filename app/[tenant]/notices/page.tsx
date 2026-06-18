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
  seqNo: number | null;
  category: string | null;
  title: string;
  content: string | null;
  imageUrls: string[];
  author: string | null;
  isPinned: boolean;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

async function fetchNoticesFirstPage(slug: string): Promise<{ notices: Notice[]; totalCount: number; categories: string[] }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const [listRes, catsRes] = await Promise.all([
      fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/notices?page=1&size=${PAGE_SIZE}`, { cache: "no-store" }),
      fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/notice-categories`, { cache: "no-store" }),
    ]);
    const listBody = listRes.ok ? await listRes.json() : null;
    const catsBody = catsRes.ok ? await catsRes.json() : null;
    const categories = ((catsBody?.item?.categories ?? []) as { name: string }[]).map((c) => c.name);
    return {
      notices: (listBody?.item?.notices ?? []) as Notice[],
      totalCount: (listBody?.item?.totalCount ?? 0) as number,
      categories,
    };
  } catch {
    return { notices: [], totalCount: 0, categories: [] };
  }
}

async function NoticesContent({ tenant }: { tenant: string }) {
  const [{ notices, totalCount, categories }, church] = await Promise.all([
    fetchNoticesFirstPage(tenant),
    fetchPublicChurch(tenant),
  ]);
  return (
    <NoticesList
      slug={tenant}
      initialNotices={notices}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
      categories={categories}
      churchName={church?.name ?? ""}
    />
  );
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

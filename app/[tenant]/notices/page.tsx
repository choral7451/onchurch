import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { NoticesList } from "./list";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { type Lang, pick, normalizeLang } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "교회 소식", robots: { index: false, follow: false } };
  const lang = normalizeLang(church.siteLang);
  const pastor = await fetchPublicPastor(tenant);
  const t = pick(lang, {
    ko: {
      pageTitle: "교회 소식",
      pageDescription: `${church.name}의 공지사항과 새소식, 행사 안내를 확인하세요.`,
      extraKeywords: ["교회 소식", "공지사항", "새소식", "교회 행사"],
    },
    en: {
      pageTitle: "News",
      pageDescription: `Check the latest notices, news, and event announcements from ${church.name}.`,
      extraKeywords: ["church news", "notices", "announcements", "church events"],
    },
  });
  return buildChurchMetadata(church, pastor, {
    pageTitle: t.pageTitle,
    path: "/notices",
    pageDescription: t.pageDescription,
    extraKeywords: t.extraKeywords,
  });
}

type Notice = {
  id: number;
  seqNo: number | null;
  category: string | null;
  title: string;
  content: string | null;
  imageUrls: string[];
  attachments: { url: string; name: string; size: number; mimeType: string }[];
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
    // 카테고리를 먼저 받아 기본 선택 카테고리(첫번째)를 정한다.
    // '전체'가 있으면 isAll 정렬로 첫번째가 '전체'이고, 백엔드는 '전체'를 필터 없음으로 처리한다.
    // '전체'가 없으면 첫번째 실제 카테고리로 첫 페이지를 필터한다.
    const catsRes = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/notice-categories`, { cache: "no-store" });
    const catsBody = catsRes.ok ? await catsRes.json() : null;
    const categories = ((catsBody?.item?.categories ?? []) as { name: string }[]).map((c) => c.name);

    const defaultCategory = categories[0];
    const categoryQuery = defaultCategory ? `&category=${encodeURIComponent(defaultCategory)}` : "";
    const listRes = await fetch(
      `${base}/onchurch/sites/${encodeURIComponent(slug)}/notices?page=1&size=${PAGE_SIZE}${categoryQuery}`,
      { cache: "no-store" },
    );
    const listBody = listRes.ok ? await listRes.json() : null;
    return {
      notices: (listBody?.item?.notices ?? []) as Notice[],
      totalCount: (listBody?.item?.totalCount ?? 0) as number,
      categories,
    };
  } catch {
    return { notices: [], totalCount: 0, categories: [] };
  }
}

async function NoticesContent({ tenant, lang }: { tenant: string; lang: Lang }) {
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
      lang={lang}
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
  const church = await fetchPublicChurch(tenant);
  const lang = normalizeLang(church?.siteLang);
  const t = pick(lang, {
    ko: { title: "공지사항 · 교회 소식", sub: "교회의 공지와 새 소식을 한 곳에서 확인하세요." },
    en: { title: "Notices · Church News", sub: "Find all church notices and news in one place." },
  });
  return (
    <div>
      <PageHeader
        eyebrow="NOTICES"
        title={t.title}
        sub={t.sub}
      />
      <section className="section">
        <div className="container">
          <Suspense fallback={<NoticesSkeleton />}>
            <NoticesContent tenant={tenant} lang={lang} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

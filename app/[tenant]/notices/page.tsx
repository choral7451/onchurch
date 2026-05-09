import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { NoticesList } from "./list";

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

export default async function NoticesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();

  const { notices } = await fetchNotices(tenant);
  const categories = Array.from(new Set(notices.map((n) => n.category).filter((c): c is string => !!c)));
  categories.unshift("전체");

  return (
    <div>
      <PageHeader
        eyebrow="NOTICES"
        title="공지사항 · 교회 소식"
        sub="교회의 공지와 새 소식을 한 곳에서 확인하세요."
      />
      <section className="section">
        <div className="container">
          <NoticesList notices={notices} categories={categories} />
        </div>
      </section>
    </div>
  );
}

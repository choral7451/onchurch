import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { GalleryView } from "./view";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "갤러리", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "갤러리",
    path: "/gallery",
    pageDescription: `${church.name}의 공동체 사진과 행사 기록을 갤러리로 만나보세요.`,
    extraKeywords: ["갤러리", "교회 사진", "행사 사진", "공동체"],
  });
}

const LAYOUT = [
  { col: 6, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 1 },
  { col: 3, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 1 },
  { col: 4, row: 1 }, { col: 4, row: 1 }, { col: 4, row: 1 },
];

type ApiCategory = { id: number; name: string; isActive: boolean; isAll: boolean };
type ApiGallery = {
  id: number;
  categoryId: number | null;
  title: string;
  date: string | null;
  photoUrl: string | null;
  grad: string | null;
};

const PAGE_SIZE = 12;

async function fetchGalleryFirstPage(
  slug: string,
): Promise<{ categories: ApiCategory[]; galleries: ApiGallery[]; totalCount: number }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/galleries?page=1&size=${PAGE_SIZE}`, {
      cache: "no-store",
    });
    if (!res.ok) return { categories: [], galleries: [], totalCount: 0 };
    const body = await res.json();
    return {
      categories: (body?.item?.categories ?? []) as ApiCategory[],
      galleries: (body?.item?.galleries ?? []) as ApiGallery[],
      totalCount: (body?.item?.totalCount ?? 0) as number,
    };
  } catch {
    return { categories: [], galleries: [], totalCount: 0 };
  }
}

async function GalleryContent({ tenant }: { tenant: string }) {
  const data = await fetchGalleryFirstPage(tenant);
  return (
    <GalleryView
      slug={tenant}
      categories={data.categories}
      initialGalleries={data.galleries}
      totalCount={data.totalCount}
      pageSize={PAGE_SIZE}
      layout={LAYOUT}
    />
  );
}

function GallerySkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
      <span className="skel" style={{ gridColumn: "span 6", height: 320 }} />
      <span className="skel" style={{ gridColumn: "span 3", height: 320 }} />
      <span className="skel" style={{ gridColumn: "span 3", height: 150 }} />
      <span className="skel" style={{ gridColumn: "span 3", height: 150 }} />
      <span className="skel" style={{ gridColumn: "span 4", height: 320 }} />
      <span className="skel" style={{ gridColumn: "span 4", height: 150 }} />
      <span className="skel" style={{ gridColumn: "span 4", height: 150 }} />
    </div>
  );
}

export default async function GalleryPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div>
      <PageHeader eyebrow="GALLERY" title="갤러리" sub="우리 공동체의 사진과 추억을 모아 두는 곳입니다." />
      <section className="section">
        <div className="container">
          <Suspense fallback={<GallerySkeleton />}>
            <GalleryContent tenant={tenant} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

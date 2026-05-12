import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { GalleryView } from "./view";

const LAYOUT = [
  { col: 6, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 1 },
  { col: 3, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 1 },
  { col: 4, row: 1 }, { col: 4, row: 1 }, { col: 4, row: 1 },
];

type ApiCategory = { id: number; name: string; isActive: boolean };
type ApiGallery = {
  id: number;
  categoryId: number | null;
  title: string;
  date: string | null;
  photoUrl: string | null;
  grad: string | null;
};

async function fetchGallery(slug: string): Promise<{ categories: ApiCategory[]; galleries: ApiGallery[] }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";
  try {
    const res = await fetch(`${base}/onchurch/sites/${encodeURIComponent(slug)}/galleries`, {
      cache: "no-store",
    });
    if (!res.ok) return { categories: [], galleries: [] };
    const body = await res.json();
    return {
      categories: (body?.item?.categories ?? []) as ApiCategory[],
      galleries: (body?.item?.galleries ?? []) as ApiGallery[],
    };
  } catch {
    return { categories: [], galleries: [] };
  }
}

async function GalleryContent({ tenant }: { tenant: string }) {
  const data = await fetchGallery(tenant);
  return <GalleryView categories={data.categories} galleries={data.galleries} layout={LAYOUT} />;
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

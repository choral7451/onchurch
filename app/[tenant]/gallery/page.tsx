import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { getTenant } from "@/lib/tenants";
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

export default async function GalleryPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const D = getTenant(tenant);
  if (!D) notFound();

  const data = await fetchGallery(tenant);

  let galleries: ApiGallery[];
  let categories: ApiCategory[];

  if (data.galleries.length > 0 || data.categories.length > 0) {
    galleries = data.galleries;
    categories = data.categories;
  } else {
    galleries = D.galleries.map((g, i) => ({
      id: i,
      categoryId: null,
      title: g.title,
      date: g.date,
      photoUrl: g.photo ?? null,
      grad: g.grad,
    }));
    categories = D.galleryCategories
      .filter((c) => c !== "전체")
      .map((c, i) => ({ id: i, name: c, isActive: true }));
  }

  return (
    <div>
      <PageHeader eyebrow="GALLERY" title="갤러리" sub="우리 공동체의 사진과 추억을 모아 두는 곳입니다." />
      <section className="section">
        <div className="container">
          <GalleryView categories={categories} galleries={galleries} layout={LAYOUT} />
        </div>
      </section>
    </div>
  );
}

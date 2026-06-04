import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { fetchPublicChurch } from "@/lib/public-site";
import { getPathPrefix } from "@/lib/path-prefix";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import type { CommunityPost, CommunityCategoryItem } from "@/lib/api-client";
import { DEFAULT_COMMUNITY_CATEGORIES } from "@/lib/community-defaults";
import { CommunityBoard } from "./board";

function isCommunityEnabled(enabledPages: string[] | undefined | null): boolean {
  if (!enabledPages || enabledPages.length === 0) return true;
  return enabledPages.includes("community");
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "교제", robots: { index: false, follow: false } };
  if (!isCommunityEnabled(church.enabledPages)) {
    return { title: "교제", robots: { index: false, follow: false } };
  }
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, {
    pageTitle: "교제",
    path: "/community",
    pageDescription: `${church.name} 성도들이 글과 사진, 영상으로 일상과 은혜를 나누는 공간입니다.`,
    extraKeywords: ["교제", "나눔", "성도 게시판", "교회 커뮤니티"],
  });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

async function fetchInitial(slug: string): Promise<{ posts: CommunityPost[]; totalCount: number; categories: CommunityCategoryItem[] }> {
  try {
    const [postsRes, catsRes] = await Promise.all([
      fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/community-posts?size=100`, { cache: "no-store" }),
      fetch(`${API_BASE}/onchurch/sites/${encodeURIComponent(slug)}/community-categories`, { cache: "no-store" }),
    ]);
    const postsBody = postsRes.ok ? await postsRes.json() : null;
    const catsBody = catsRes.ok ? await catsRes.json() : null;
    return {
      posts: (postsBody?.item?.posts ?? []) as CommunityPost[],
      totalCount: (postsBody?.item?.totalCount ?? 0) as number,
      categories: (catsBody?.item?.categories ?? []) as CommunityCategoryItem[],
    };
  } catch {
    return { posts: [], totalCount: 0, categories: [] };
  }
}

export default async function CommunityPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();
  if (!isCommunityEnabled(church.enabledPages)) notFound();

  const { posts, categories } = await fetchInitial(tenant);
  const prefix = await getPathPrefix(tenant);
  // 교회가 카테고리를 정의하지 않았으면 기본 카테고리를 노출한다.
  const categoryNames = categories.length > 0 ? categories.map((c) => c.name) : [...DEFAULT_COMMUNITY_CATEGORIES];

  return (
    <div>
      <PageHeader
        eyebrow="COMMUNITY"
        title="교제"
        sub="성도들이 글과 사진, 영상으로 일상과 은혜를 나누는 공간입니다."
      />
      <section className="section">
        <div className="container">
          <CommunityBoard
            slug={tenant}
            initialPosts={posts}
            categories={categoryNames}
            loginHref={`${prefix}/login`}
          />
        </div>
      </section>
    </div>
  );
}

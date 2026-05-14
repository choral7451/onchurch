import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicChurch } from "@/lib/public-site";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { getPathPrefix } from "@/lib/path-prefix";
import { Icon, type IconKey } from "@/components/icons";
import { LightRays, Mesh, Rings } from "@/components/decorative";
import { SermonFeatureGrid } from "@/components/sermon-feature-grid";
import { Calendar } from "@/components/calendar";
import { TopBanner } from "@/components/top-banner";
import type { Sermon } from "@/lib/types";

const QUICK_LINKS: { ic: IconKey; title: string; desc: string; path: string }[] = [
  { ic: "calendar", title: "예배 안내", desc: "주일/수요/새벽 모든 예배 시간을 확인하세요", path: "/worship" },
  { ic: "video", title: "설교 영상", desc: "지난 설교를 언제든 다시 듣고 묵상하세요", path: "/sermons" },
  { ic: "image", title: "갤러리", desc: "공동체의 사진과 추억을 모아두는 곳", path: "/gallery" },
  { ic: "mapPin", title: "찾아오시는 길", desc: "처음 오시는 분도 어렵지 않게 안내합니다", path: "/directions" },
];

const GRAD_CYCLE: Sermon["grad"][] = ["ph-grad-1", "ph-grad-2", "ph-grad-3", "ph-grad-4"];

type PublicBanner = {
  id: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isDefault: boolean;
};

type PublicNotice = {
  id: number;
  category: string | null;
  title: string;
  publishedAt: string | null;
  createdAt: string;
};

type PublicEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  isActive: boolean;
};

type PublicWorshipService = {
  id: number;
  tag: "WEEK" | "DAILY";
  name: string;
  time: string;
  meta: string | null;
  isFeatured: boolean;
};

type PublicSermon = {
  id: number;
  seriesId: number | null;
  title: string;
  pastor: string | null;
  date: string | null;
  duration: string | null;
  videoUrl: string | null;
  isFeatured: boolean;
};

type PublicSermonSeries = { id: number; name: string };

type PublicPastor = {
  id: number;
  name: string;
  role: string | null;
  eng: string | null;
  message: string | null;
  photoUrl: string | null;
} | null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    const body = await res.json();
    return (body?.item ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function dateParts(iso: string | null, fallbackIso: string): { day: string; mon: string } {
  const d = new Date(iso ?? fallbackIso);
  if (Number.isNaN(d.getTime())) return { day: "—", mon: "—" };
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return { day: String(d.getDate()).padStart(2, "0"), mon: months[d.getMonth()] };
}

// ------ Streaming sections ------

async function TopBannerSection({ slug }: { slug: string }) {
  const data = await fetchJson<{ banners: PublicBanner[] }>(`/onchurch/sites/${slug}/banners`, { banners: [] });
  return <TopBanner banners={data.banners} />;
}

async function RecentNoticesSection({ slug, url }: { slug: string; url: (p: string) => string }) {
  const data = await fetchJson<{ notices: PublicNotice[] }>(`/onchurch/sites/${slug}/notices?size=5`, { notices: [] });
  const recentNotices = data.notices;
  return (
    <ul className="news-list">
      {recentNotices.length === 0 ? (
        <li className="news-item" style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
          등록된 공지가 없습니다.
        </li>
      ) : (
        recentNotices.map((item) => {
          const { day, mon } = dateParts(item.publishedAt, item.createdAt);
          return (
            <li key={item.id} className="news-item">
              <Link href={url("/notices")} style={{ display: "contents" }}>
                <div className="news-item-date">
                  <span className="day">{day}</span>
                  <span className="mon">{mon}</span>
                </div>
                <div className="news-item-body">
                  <div className="news-item-title">{item.title}</div>
                  <div className="news-item-cat">{item.category ?? "공지"}</div>
                </div>
                <div className="news-item-pin"><Icon.arrow style={{ width: 12, height: 12 }} /></div>
              </Link>
            </li>
          );
        })
      )}
    </ul>
  );
}

function NoticesListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <span className="skel" style={{ height: 56 }} />
      <span className="skel" style={{ height: 56 }} />
      <span className="skel" style={{ height: 56 }} />
    </div>
  );
}

async function WorshipScheduleSection({ slug, url }: { slug: string; url: (p: string) => string }) {
  const data = await fetchJson<{ services: PublicWorshipService[] }>(`/onchurch/sites/${slug}/worship`, { services: [] });
  const worshipServices = data.services.slice(0, 6);
  if (worshipServices.length === 0) return null;
  return (
    <section className="section section-tinted">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Worship Schedule</span>
            <h2>예배는 우리 공동체의<br />가장 중요한 시간입니다</h2>
          </div>
          <div className="section-head-action">
            <Link href={url("/worship")}>전체 예배 안내 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
          </div>
        </div>
        <div className="worship-grid">
          {worshipServices.map((w) => (
            <div key={w.id} className={`worship-card ${w.isFeatured ? "feat" : ""}`}>
              <span className="worship-cat">{w.tag}</span>
              <div className="worship-name">{w.name}</div>
              <div className="worship-time">{w.time}</div>
              {w.meta && <div className="worship-meta">{w.meta}</div>}
              {w.isFeatured && <span className="worship-pill">대표 예배</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionSkeleton({ tinted = false, height = 220 }: { tinted?: boolean; height?: number }) {
  return (
    <section className={`section ${tinted ? "section-tinted" : ""}`}>
      <div className="container">
        <span className="skel" style={{ width: 200, height: 14, marginBottom: 12 }} />
        <span className="skel" style={{ width: 360, height: 32, marginBottom: 24 }} />
        <span className="skel" style={{ width: "100%", height }} />
      </div>
    </section>
  );
}

async function HomeSermonsSection({ slug, url }: { slug: string; url: (p: string) => string }) {
  const data = await fetchJson<{ series: PublicSermonSeries[]; sermons: PublicSermon[] }>(
    `/onchurch/sites/${slug}/sermons`,
    { series: [], sermons: [] },
  );
  const seriesById = new Map(data.series.map((s) => [s.id, s.name] as const));
  const sermons: Sermon[] = data.sermons.slice(0, 3).map((s, i) => ({
    series: s.seriesId != null ? seriesById.get(s.seriesId) ?? "미분류" : "미분류",
    title: s.title,
    pastor: s.pastor ?? "",
    date: s.date ?? "",
    duration: s.duration ?? "",
    videoUrl: s.videoUrl,
    grad: GRAD_CYCLE[i % GRAD_CYCLE.length],
  }));
  if (sermons.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Sermons</span>
            <h2>이번 주 말씀</h2>
          </div>
          <div className="section-head-action">
            <Link href={url("/sermons")}>설교 아카이브 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
          </div>
        </div>
        <SermonFeatureGrid sermons={sermons} />
      </div>
    </section>
  );
}

async function HomeEventsSection({ slug, url }: { slug: string; url: (p: string) => string }) {
  const data = await fetchJson<{ events: PublicEvent[] }>(`/onchurch/sites/${slug}/events`, { events: [] });
  if (data.events.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Calendar & Events</span>
            <h2>이번 달 교회 일정</h2>
          </div>
          <div className="section-head-action">
            <Link href={url("/schedule")}>전체 일정 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
          </div>
        </div>
        <Calendar events={data.events} />
      </div>
    </section>
  );
}

async function PastorSection({ slug, url }: { slug: string; url: (p: string) => string }) {
  const data = await fetchJson<{ pastor: PublicPastor }>(`/onchurch/sites/${slug}/about`, { pastor: null });
  const pastor = data.pastor;
  if (!pastor || (!pastor.message?.trim() && !pastor.name)) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="pastor-section">
          <div className="pastor-photo">
            {pastor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pastor.photoUrl} alt={pastor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="pastor-photo-label">담임목사</div>
            )}
          </div>
          <div className="pastor-block">
            <span className="eyebrow">Greetings from Pastor</span>
            <h2 className="pastor-name">
              {pastor.name}
              {(pastor.role || pastor.eng) && (
                <span> {pastor.role}{pastor.role && pastor.eng ? " / " : ""}{pastor.eng}</span>
              )}
            </h2>
            {pastor.message && (
              <p className="pastor-msg">
                {pastor.message.split("\n\n").map((para, i, arr) => (
                  <span key={i}>
                    {para}
                    {i < arr.length - 1 && <><br /><br /></>}
                  </span>
                ))}
              </p>
            )}
            <div className="pastor-sign">담임목사 <strong>{pastor.name.replace(/\s/g, "")}</strong></div>
            <div style={{ marginTop: 28 }}>
              <Link href={url("/about")} className="btn btn-secondary">
                교회 소개 자세히 <Icon.arrow style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------ Page ------

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) return { title: "Not Found", robots: { index: false, follow: false } };
  const pastor = await fetchPublicPastor(tenant);
  return buildChurchMetadata(church, pastor, { path: "" });
}

export default async function TenantHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const church = await fetchPublicChurch(tenant);
  if (!church) notFound();

  const pathPrefix = await getPathPrefix(tenant);
  const url = (path: string) => `${pathPrefix}${path}`;
  const slug = encodeURIComponent(tenant);
  const enabled = church.enabledPages ?? [];
  const isPageEnabled = (id: string) => enabled.length === 0 || enabled.includes(id);
  const showHomeNews = isPageEnabled("notices");
  const visibleQuickLinks = QUICK_LINKS.filter((q) => isPageEnabled(q.path.replace(/^\//, "")));

  return (
    <div>
      <Suspense fallback={null}>
        <TopBannerSection slug={slug} />
      </Suspense>

      <section className="hero">
        <div className="hero-bg">
          <Mesh style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
        </div>
        {showHomeNews && (
        <div className="hero-inner">
          <div className="news-feature">
            <LightRays className="news-feature-bg" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, color: "white" }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <div className="news-feature-tag">
                  <span className="pulse" />
                  {church.tagline ?? "환영합니다"}
                </div>
                <h2 className="news-feature-title">{church.name}</h2>
                {church.eng && <p className="news-feature-desc">{church.eng}</p>}
              </div>
              <div>
                <Link href={url("/about")} className="news-feature-cta">
                  교회 소개 보기 <Icon.arrow style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            </div>
          </div>

          <div className="news-list-card">
            <div className="news-list-head">
              <h3>최근 소식</h3>
              <Link href={url("/notices")}>전체보기 →</Link>
            </div>
            <Suspense fallback={<NoticesListSkeleton />}>
              <RecentNoticesSection slug={slug} url={url} />
            </Suspense>
          </div>
        </div>
        )}

        {visibleQuickLinks.length > 0 && (
        <div className="container">
          <div className="quick-strip">
            {visibleQuickLinks.map((q) => {
              const QuickIcon = Icon[q.ic];
              return (
                <Link key={q.title} href={url(q.path)} className="quick-card">
                  <div className="quick-card-icon"><QuickIcon width={22} height={22} /></div>
                  <div className="quick-card-title">{q.title}</div>
                  <div className="quick-card-desc">{q.desc}</div>
                  <div className="quick-card-arrow">바로가기 <Icon.arrow style={{ width: 12, height: 12 }} /></div>
                </Link>
              );
            })}
          </div>
        </div>
        )}
      </section>

      <Suspense fallback={<SectionSkeleton tinted height={200} />}>
        <WorshipScheduleSection slug={slug} url={url} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height={320} />}>
        <HomeSermonsSection slug={slug} url={url} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height={420} />}>
        <HomeEventsSection slug={slug} url={url} />
      </Suspense>

      <section className="section section-tinted">
        <div className="container">
          <div className="pray-cta">
            <Rings className="pray-cta-bg" style={{ color: "var(--primary)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="eyebrow">Visit</span>
              <h3>처음 오시는 분들을 환영합니다</h3>
              <p>예배 시간과 오시는 길을 확인하시고, 언제든 편하게 방문해주세요.</p>
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <Link href={url("/directions")} className="btn btn-primary btn-lg">
                <Icon.mapPin style={{ width: 16, height: 16 }} />
                찾아오시는 길
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<SectionSkeleton height={280} />}>
        <PastorSection slug={slug} url={url} />
      </Suspense>
    </div>
  );
}

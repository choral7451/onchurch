import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicChurch, fetchLiveStatus } from "@/lib/public-site";
import { LiveBadge } from "@/components/live-badge";
import { fetchPublicPastor, buildChurchMetadata } from "@/lib/seo";
import { getPathPrefix } from "@/lib/path-prefix";
import { Icon, type IconKey } from "@/components/icons";
import { LightRays, Mesh, Rings } from "@/components/decorative";
import { SermonFeatureGrid } from "@/components/sermon-feature-grid";
import { TopBanner } from "@/components/top-banner";
import type { Sermon } from "@/lib/types";
import { normalizeHomeSectionOrder, type HomeSectionKey } from "@/lib/home-sections";

const QUICK_LINKS: { ic: IconKey; title: string; desc: string; path: string }[] = [
  { ic: "calendar", title: "예배 안내", desc: "주일/수요/새벽 모든 예배 시간을 확인하세요", path: "/worship" },
  { ic: "video", title: "설교 영상", desc: "지난 설교를 언제든 다시 듣고 묵상하세요", path: "/sermons" },
  { ic: "image", title: "갤러리", desc: "공동체의 사진과 추억을 모아두는 곳", path: "/gallery" },
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

function pickUpcoming(events: PublicEvent[]): PublicEvent[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = startOfToday.getTime();
  return events
    .filter((e) => e.isActive !== false)
    .filter((e) => {
      // "오늘로부터 가장 가까운 일정" = 시작일이 오늘 이후(오늘 포함)인 일정만.
      // (이미 시작해서 진행 중인 다일 일정은 hero 후보에서 제외)
      const ref = new Date(e.startAt);
      if (Number.isNaN(ref.getTime())) return false;
      if (e.isAllDay) ref.setHours(23, 59, 59, 999);
      return ref.getTime() >= cutoff;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

async function HeroFeaturedEventSection({ slug, url, churchName }: { slug: string; url: (p: string) => string; churchName: string }) {
  const data = await fetchJson<{ events: PublicEvent[] }>(`/onchurch/sites/${slug}/events`, { events: [] });
  const upcoming = pickUpcoming(data.events);
  const head = upcoming[0];

  if (!head) {
    return (
      <div className="news-feature">
        <LightRays className="news-feature-bg" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, color: "white" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
          <div>
            <div className="news-feature-tag"><span className="pulse" />다가오는 일정</div>
            <h2 className="news-feature-title">예정된 일정이 없습니다</h2>
            <p className="news-feature-desc">{churchName}의 새로운 일정을 곧 알려드릴게요.</p>
          </div>
          <div>
            <Link href={url("/schedule")} className="news-feature-cta">
              전체 일정 보기 <Icon.arrow style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const start = new Date(head.startAt);
  const { day, mon } = dateParts(head.startAt, head.startAt);
  const dateStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, "0")}.${String(start.getDate()).padStart(2, "0")}`;
  const timeStr = head.isAllDay
    ? "종일"
    : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="news-feature">
      <LightRays className="news-feature-bg" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, color: "white" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div>
          <div className="news-feature-tag"><span className="pulse" />다가오는 일정 · {mon} {day}</div>
          <h2 className="news-feature-title">{head.title}</h2>
          <p className="news-feature-meta-line">
            {dateStr} · {timeStr}
            {head.location ? ` · ${head.location}` : ""}
          </p>
          {head.description && (
            <p className="news-feature-desc">{head.description}</p>
          )}
        </div>
        <div>
          <Link href={url("/schedule")} className="news-feature-cta">
            전체 일정 보기 <Icon.arrow style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}

async function UpcomingEventsListSection({ slug, url }: { slug: string; url: (p: string) => string }) {
  const data = await fetchJson<{ events: PublicEvent[] }>(`/onchurch/sites/${slug}/events`, { events: [] });
  // 왼쪽 hero 카드가 첫 번째(가장 가까운) 일정을 보여주므로, 리스트는 그 이후 5개만.
  const upcoming = pickUpcoming(data.events).slice(1, 6);
  return (
    <ul className="news-list">
      {upcoming.length === 0 ? (
        <li style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
          이후 예정된 일정이 없습니다.
        </li>
      ) : (
        upcoming.map((item) => {
          const { day, mon } = dateParts(item.startAt, item.startAt);
          const start = new Date(item.startAt);
          const timeStr = item.isAllDay
            ? "종일"
            : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
          return (
            <li key={item.id} className="news-item">
              <Link href={url("/schedule")} style={{ display: "contents" }}>
                <div className="news-item-date">
                  <span className="day">{day}</span>
                  <span className="mon">{mon}</span>
                </div>
                <div className="news-item-body">
                  <div className="news-item-title">{item.title}</div>
                  <div className="news-item-cat">{timeStr}{item.location ? ` · ${item.location}` : ""}</div>
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

function FeaturedEventSkeleton() {
  return (
    <div className="news-feature" aria-hidden>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", gap: 16 }}>
        <span className="skel" style={{ width: 160, height: 18 }} />
        <span className="skel" style={{ width: "80%", height: 36 }} />
        <span className="skel" style={{ width: "60%", height: 16 }} />
      </div>
    </div>
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
  const allServices = data.services;
  if (allServices.length === 0) return null;
  // 대표 예배를 중심으로 최대 3개만 노출 (대표 앞뒤로 채우되 목록 범위 안에서 클램프).
  // 대표가 없으면 앞에서 3개.
  const featuredIndex = allServices.findIndex((w) => w.isFeatured);
  let start = featuredIndex < 0 ? 0 : featuredIndex - 1;
  start = Math.max(0, Math.min(start, allServices.length - 3));
  const worshipServices = allServices.slice(start, start + 3);
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
            <h2>함께 드리는 예배</h2>
          </div>
          <div className="section-head-action">
            <Link href={url("/sermons")}>설교 전체 보기 <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
          </div>
        </div>
        <SermonFeatureGrid sermons={sermons} />
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
              <div className="pastor-msg-wrap">
                <p className="pastor-msg pastor-msg-clamp">
                  {pastor.message.split("\n\n").map((para, i, arr) => (
                    <span key={i}>
                      {para}
                      {i < arr.length - 1 && <><br /><br /></>}
                    </span>
                  ))}
                </p>
              </div>
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
  const isPageEnabled = (id: string) => id === "directions" || enabled.length === 0 || enabled.includes(id);
  const showHomeEvents = isPageEnabled("schedule");
  const visibleQuickLinks = QUICK_LINKS.filter((q) => isPageEnabled(q.path.replace(/^\//, "")));
  const youtubeUrl = church.youtubeUrl?.trim() || null;
  const sectionOrder = normalizeHomeSectionOrder(church.homeSectionOrder);
  const sermonsEnabled = isPageEnabled("sermons");
  const initialLive = sermonsEnabled ? (await fetchLiveStatus(tenant)).isLive : false;

  const sections: Record<HomeSectionKey, React.ReactNode> = {
    banner: (
      <Suspense fallback={null}>
        <TopBannerSection slug={slug} />
      </Suspense>
    ),
    events: showHomeEvents ? (
      <section className="hero">
        <div className="hero-bg">
          <Mesh style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
        </div>
        <div className="hero-inner">
          <Suspense fallback={<FeaturedEventSkeleton />}>
            <HeroFeaturedEventSection slug={slug} url={url} churchName={church.name} />
          </Suspense>

          <div className="news-list-card">
            <div className="news-list-head">
              <h3>다가오는 일정</h3>
              <Link href={url("/schedule")}>전체보기 →</Link>
            </div>
            <Suspense fallback={<NoticesListSkeleton />}>
              <UpcomingEventsListSection slug={slug} url={url} />
            </Suspense>
          </div>
        </div>
      </section>
    ) : null,
    quick: (visibleQuickLinks.length > 0 || youtubeUrl) ? (
      <section className="hero hero-quick-only">
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
            {youtubeUrl && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="quick-card">
                <div className="quick-card-icon"><Icon.play width={22} height={22} /></div>
                <div className="quick-card-title">유튜브</div>
                <div className="quick-card-desc">예배와 설교 영상을 유튜브 채널에서 만나보세요</div>
                <div className="quick-card-arrow">바로가기 <Icon.arrow style={{ width: 12, height: 12 }} /></div>
              </a>
            )}
          </div>
        </div>
      </section>
    ) : null,
    worship: isPageEnabled("worship") ? (
      <Suspense fallback={<SectionSkeleton tinted height={200} />}>
        <WorshipScheduleSection slug={slug} url={url} />
      </Suspense>
    ) : null,
    sermons: isPageEnabled("sermons") ? (
      <Suspense fallback={<SectionSkeleton height={320} />}>
        <HomeSermonsSection slug={slug} url={url} />
      </Suspense>
    ) : null,
    visit: (
      <section className="section section-tinted section-compact">
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
    ),
    pastor: (
      <Suspense fallback={<SectionSkeleton height={280} />}>
        <PastorSection slug={slug} url={url} />
      </Suspense>
    ),
  };

  return (
    <div>
      {sermonsEnabled && <LiveBadge slug={tenant} sermonsHref={url("/sermons")} initialLive={initialLive} />}
      {sectionOrder.map((key) => <div key={key}>{sections[key]}</div>)}
    </div>
  );
}

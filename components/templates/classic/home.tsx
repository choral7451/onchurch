import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { Icon, type IconKey } from "@/components/icons";
import { LiveBadge } from "@/components/live-badge";
import { ClassicHero, type ClassicHeroSlide } from "@/components/templates/classic/hero";
import { ClassicLiveLink } from "@/components/templates/classic/live-link";
import type { PublicChurch } from "@/lib/public-site";
import { fetchLiveStatus } from "@/lib/public-site";
import { QUICK_LINK_DEFS, quickLinkLabels, isCustomLinkReady, normalizeCustomLinkUrl } from "@/lib/quick-links";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import { type Lang, pick } from "@/lib/i18n";
import { normalizeHomeSectionOrder, type HomeSectionKey } from "@/lib/home-sections";

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

// ------ Types ------
type PublicBanner = { id: number | null; title: string; description: string | null; imageUrl: string | null; videoUrl: string | null; linkUrl: string | null; isDefault: boolean };
type PublicWorshipService = { id: number; tag: "WEEK" | "DAILY"; name: string; time: string; meta: string | null; isFeatured: boolean };
type PublicSermon = { id: number; seriesId: number | null; title: string; pastor: string | null; date: string | null; videoUrl: string | null; isFeatured: boolean };
type PublicSermonSeries = { id: number; name: string };
type PublicNotice = { id: number; category: string | null; title: string; imageUrls: string[]; publishedAt: string | null; createdAt: string };
type GalleryGroup = { groupKey: string; title: string; date: string | null; coverUrl: string | null; grad: string | null; count: number };
type GuideItem = { key: string; ic: IconKey; label: string; href: string; external: boolean };
type PublicEvent = { id: number; title: string; description: string | null; location: string | null; startAt: string; endAt: string | null; isAllDay: boolean };
type PublicPastor = { id: number; name: string; role: string | null; eng: string | null; message: string | null; photoUrl: string | null } | null;

const SEOUL_TZ = "Asia/Seoul";
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: SEOUL_TZ, month: "2-digit", day: "2-digit" })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return `${parts.month}.${parts.day}`;
}

function seoulParts(iso: string): { year: number; month: number; day: number; hours: number; minutes: number; weekday: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: SEOUL_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hours: Number(parts.hour) % 24, minutes: Number(parts.minute), weekday: parts.weekday };
}
const WEEKDAY_KO: Record<string, string> = { Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토" };

// 지금 이후로 가장 가까운 일정부터. 종일 일정은 그 날 하루 동안 계속 노출.
function pickUpcoming(events: PublicEvent[]): PublicEvent[] {
  const cutoff = Date.now();
  return events
    .filter((e) => {
      const ref = new Date(e.startAt);
      if (Number.isNaN(ref.getTime())) return false;
      if (e.isAllDay) ref.setHours(23, 59, 59, 999);
      return ref.getTime() >= cutoff;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

const GRADS = ["chc-grad-1", "chc-grad-2", "chc-grad-3", "chc-grad-4"];

// 섹션 공통 머리말: 영문 eyebrow + 명조 제목 + 짧은 금색 괘선. 우측에 '전체 보기' 링크를 붙일 수 있다.
function SectionHead({ eyebrow, title, more }: { eyebrow: string; title: string; more?: { href: string; label: string } }) {
  return (
    <div className="chc-head">
      <span className="chc-eyebrow">{eyebrow}</span>
      <h2 className="chc-heading">{title}</h2>
      <span className="chc-rule" aria-hidden="true" />
      {more && (
        <Link href={more.href} className="chc-more chc-head-more">
          {more.label} <Icon.arrow style={{ width: 12, height: 12 }} />
        </Link>
      )}
    </div>
  );
}

// ============ Sections ============

async function HeroSection({ slug, church }: { slug: string; church: PublicChurch }) {
  const data = await fetchJson<{ banners: PublicBanner[] }>(`/onchurch/sites/${slug}/banners`, { banners: [] });
  const slides: ClassicHeroSlide[] = data.banners.map((b) => ({
    id: b.id, title: b.title, description: b.description, imageUrl: b.imageUrl, videoUrl: b.videoUrl, linkUrl: b.linkUrl,
  }));
  if (slides.length === 0) {
    slides.push({ id: null, title: church.name, description: church.tagline, imageUrl: null, videoUrl: null, linkUrl: null });
  }
  return <ClassicHero slides={slides} churchName={church.name} />;
}

// 히어로 바로 아래 겹쳐 올라오는 바로가기 카드. 방문자가 가장 자주 찾는 메뉴를 첫 화면에서 바로 잡을 수 있게 한다.
function GuideStrip({ items, overlap }: { items: GuideItem[]; overlap: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className={`chc-container ${overlap ? "" : "chc-guide-wrap"}`}>
      <nav className={`chc-guide ${overlap ? "is-overlap" : ""}`} aria-label="바로가기" data-count={items.length}>
        {items.map((it) => {
          const GuideIcon = Icon[it.ic];
          const inner = (
            <>
              <span className="chc-guide-icon"><GuideIcon width={24} height={24} /></span>
              <span className="chc-guide-label">{it.label}</span>
            </>
          );
          return it.external
            ? <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" className="chc-guide-item">{inner}</a>
            : <Link key={it.key} href={it.href} className="chc-guide-item">{inner}</Link>;
        })}
      </nav>
    </div>
  );
}

// 예배 안내. 왼쪽에 제목·링크, 오른쪽에 괘선 표(예배명 / 시간 / 장소). 대표 예배를 맨 위에 둔다.
type WorshipProps = {
  slug: string; tenant: string; url: (p: string) => string; lang: Lang; enabled: boolean;
  initialLive: boolean; sermonsHref: string | null; youtubeUrl: string | null;
};
async function WorshipSection({ slug, tenant, url, lang, enabled, initialLive, sermonsHref, youtubeUrl }: WorshipProps) {
  const data = enabled
    ? await fetchJson<{ services: PublicWorshipService[] }>(`/onchurch/sites/${slug}/worship`, { services: [] })
    : { services: [] as PublicWorshipService[] };
  const featured = data.services.filter((w) => w.isFeatured);
  const others = data.services.filter((w) => !w.isFeatured);
  const services = [...featured, ...others].slice(0, 5);
  if (services.length === 0) return null;

  return (
    <section className="chc-section chc-worship">
      <div className="chc-container chc-worship-grid">
        <div className="chc-worship-intro">
          <span className="chc-eyebrow">Worship</span>
          <h2 className="chc-heading">{pick(lang, { ko: "예배 안내", en: "Worship Times" })}</h2>
          <span className="chc-rule" aria-hidden="true" />
          <div className="chc-worship-links">
            <Link href={url("/worship")} className="chc-more">
              {pick(lang, { ko: "전체 예배 안내", en: "All services" })} <Icon.arrow style={{ width: 12, height: 12 }} />
            </Link>
            <ClassicLiveLink slug={tenant} initialLive={initialLive} sermonsHref={sermonsHref} youtubeUrl={youtubeUrl} lang={lang} />
          </div>
        </div>
        <ul className="chc-worship-list">
          {services.map((w) => (
            <li key={w.id} className={`chc-worship-row ${w.isFeatured ? "feat" : ""}`}>
              <span className="chc-worship-name">
                {w.name}
                {w.isFeatured && <span className="chc-worship-feat">{pick(lang, { ko: "대표 예배", en: "Main" })}</span>}
              </span>
              <span className="chc-worship-time">{w.time}</span>
              <span className="chc-worship-meta">{w.meta ?? ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// 다가오는 일정. 날짜 칸 + 제목 + 시간·장소를 괘선으로. 없으면 섹션 자체를 숨긴다.
async function EventsSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ events: PublicEvent[] }>(`/onchurch/sites/${slug}/events`, { events: [] });
  const upcoming = pickUpcoming(data.events).slice(0, 5);
  if (upcoming.length === 0) return null;
  const schedulePath = (iso: string) => {
    const p = seoulParts(iso);
    return p ? url(`/schedule?ym=${p.year}-${String(p.month).padStart(2, "0")}`) : url("/schedule");
  };
  return (
    <section className="chc-section chc-tinted">
      <div className="chc-container">
        <SectionHead eyebrow="Upcoming" title={pick(lang, { ko: "다가오는 일정", en: "Upcoming Events" })} more={{ href: url("/schedule"), label: pick(lang, { ko: "전체 일정 보기", en: "Full calendar" }) }} />
        <ul className="chc-events">
          {upcoming.map((e) => {
            const p = seoulParts(e.startAt);
            const time = e.isAllDay
              ? pick(lang, { ko: "종일", en: "All day" })
              : p ? `${String(p.hours).padStart(2, "0")}:${String(p.minutes).padStart(2, "0")}` : "";
            const weekday = p ? (lang === "ko" ? WEEKDAY_KO[p.weekday] ?? p.weekday : p.weekday) : "";
            return (
              <li key={e.id}>
                <Link href={schedulePath(e.startAt)} className="chc-event">
                  <time className="chc-event-date" dateTime={e.startAt}>
                    <b>{p ? String(p.day).padStart(2, "0") : "--"}</b>
                    <span>{p ? `${p.month}${pick(lang, { ko: "월", en: "" })} ${weekday}` : ""}</span>
                  </time>
                  <span className="chc-event-body">
                    <span className="chc-event-title">{e.title}</span>
                    {(time || e.location) && (
                      <span className="chc-event-meta">
                        {time && <span>{time}</span>}
                        {e.location && <span>{e.location}</span>}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// 방문 안내. 와인색 띠에 환영 문구와 찾아오시는 길 버튼. 주소가 있으면 함께 보여준다.
function VisitSection({ church, url, lang }: { church: PublicChurch; url: (p: string) => string; lang: Lang }) {
  const address = church.address?.trim() || null;
  return (
    <section className="chc-visit">
      <div className="chc-container chc-visit-inner">
        <div className="chc-visit-text">
          <span className="chc-eyebrow">Visit</span>
          <h2 className="chc-visit-title">{pick(lang, { ko: "처음 오시는 분을 환영합니다", en: "Welcome, first-time visitors" })}</h2>
          <p className="chc-visit-desc">
            {pick(lang, { ko: "예배 시간과 오시는 길을 확인하시고 언제든 편하게 방문해 주세요.", en: "Check our service times and directions, and feel free to visit anytime." })}
          </p>
          {address && <p className="chc-visit-address"><Icon.mapPin style={{ width: 14, height: 14 }} /><span>{address}</span></p>}
        </div>
        <Link href={url("/directions")} className="chc-visit-btn">
          {pick(lang, { ko: "찾아오시는 길", en: "Directions" })} <Icon.arrow style={{ width: 13, height: 13 }} />
        </Link>
      </div>
    </section>
  );
}

// 담임목사 인사. 사진 + 명조 인사말(5줄까지) + 교회 소개 링크.
async function PastorSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ pastor: PublicPastor }>(`/onchurch/sites/${slug}/about`, { pastor: null });
  const pastor = data.pastor;
  if (!pastor || (!pastor.message?.trim() && !pastor.name)) return null;
  const roleLine = [pastor.role, pastor.eng].filter(Boolean).join(" / ");
  return (
    <section className="chc-section">
      <div className="chc-container chc-pastor">
        <div className="chc-pastor-photo">
          {pastor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pastor.photoUrl} alt={pastor.name} width={480} height={600} loading="lazy" />
          ) : (
            <div className="chc-pastor-photo-empty">{pick(lang, { ko: "담임목사", en: "Senior Pastor" })}</div>
          )}
        </div>
        <div className="chc-pastor-body">
          <span className="chc-eyebrow">Greetings</span>
          <h2 className="chc-heading">{pick(lang, { ko: "담임목사 인사", en: "From the Pastor" })}</h2>
          <span className="chc-rule" aria-hidden="true" />
          {pastor.message && <p className="chc-pastor-msg">{pastor.message}</p>}
          <p className="chc-pastor-sign">
            <span>{pick(lang, { ko: "담임목사", en: "Senior Pastor" })}</span>
            <b>{pastor.name}</b>
            {roleLine && <span className="chc-pastor-role">{roleLine}</span>}
          </p>
          <Link href={url("/about")} className="chc-more">{pick(lang, { ko: "교회 소개 보기", en: "About us" })} <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
        </div>
      </div>
    </section>
  );
}

async function SermonsSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ series: PublicSermonSeries[]; sermons: PublicSermon[] }>(
    `/onchurch/sites/${slug}/sermons`, { series: [], sermons: [] },
  );
  if (data.sermons.length === 0) return null;
  const seriesById = new Map(data.series.map((s) => [s.id, s.name] as const));
  const label = (s: PublicSermon) => (s.seriesId != null ? seriesById.get(s.seriesId) : null) ?? pick(lang, { ko: "설교", en: "Sermon" });
  const thumb = (s: PublicSermon) => { const id = parseYouTubeId(s.videoUrl); return id ? youtubeThumbnail(id) : null; };
  const href = (s: PublicSermon) => s.videoUrl || url("/sermons");
  const Meta = ({ s, className }: { s: PublicSermon; className: string }) =>
    s.pastor || s.date ? (
      <p className={className}>
        {s.pastor && <span>{s.pastor}</span>}
        {s.date && <time dateTime={s.date}>{s.date}</time>}
      </p>
    ) : null;
  const featured = data.sermons.slice(0, 2);
  const rest = data.sermons.slice(2, 6);

  return (
    <section className="chc-section">
      <div className="chc-container">
        <SectionHead eyebrow="Sermons" title={pick(lang, { ko: "말씀", en: "Sermons" })} more={{ href: url("/sermons"), label: pick(lang, { ko: "설교 전체 보기", en: "All sermons" }) }} />
        <div className="chc-sermon-feature">
          {featured.map((s, i) => {
            const t = thumb(s);
            return (
              <a key={s.id} href={href(s)} target={s.videoUrl ? "_blank" : undefined} rel={s.videoUrl ? "noopener noreferrer" : undefined} className="chc-sermon-hero">
                <div className={`chc-sermon-hero-media ${t ? "" : GRADS[i % GRADS.length]}`} style={t ? { backgroundImage: `url("${t}")` } : undefined}>
                  <span className="chc-sermon-hero-scrim" aria-hidden="true" />
                  <span className="chc-play"><Icon.play style={{ width: 22, height: 22 }} /></span>
                  <div className="chc-sermon-hero-cap">
                    <span className="chc-sermon-tag">{label(s)}</span>
                    <h3 className="chc-sermon-hero-title">{s.title}</h3>
                    <Meta s={s} className="chc-sermon-hero-sub" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
        {rest.length > 0 && (
          <div className="chc-sermon-grid">
            {rest.map((s, i) => {
              const t = thumb(s);
              return (
                <a key={s.id} href={href(s)} target={s.videoUrl ? "_blank" : undefined} rel={s.videoUrl ? "noopener noreferrer" : undefined} className="chc-sermon-mini">
                  <div className={`chc-sermon-mini-media ${t ? "" : GRADS[i % GRADS.length]}`} style={t ? { backgroundImage: `url("${t}")` } : undefined}>
                    <span className="chc-play sm"><Icon.play style={{ width: 16, height: 16 }} /></span>
                  </div>
                  <div className="chc-sermon-mini-body">
                    <span className="chc-sermon-mini-tag">{label(s)}</span>
                    <div className="chc-sermon-mini-title">{s.title}</div>
                    <Meta s={s} className="chc-sermon-mini-meta" />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

async function NewsSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ notices: PublicNotice[] }>(`/onchurch/sites/${slug}/notices?page=1&size=40`, { notices: [] });
  if (data.notices.length === 0) return null;

  // 카테고리별로 묶어 최대 3개 카드. 카테고리가 없으면 '교회 소식' 한 묶음.
  const buckets = new Map<string, PublicNotice[]>();
  const fallbackCat = pick(lang, { ko: "교회 소식", en: "Church News" });
  for (const n of data.notices) {
    const key = n.category?.trim() || fallbackCat;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(n);
  }
  const cards = Array.from(buckets.entries()).slice(0, 3);

  return (
    <section className="chc-section chc-tinted">
      <div className="chc-container">
        <SectionHead eyebrow="Church News" title={pick(lang, { ko: "교회 소식", en: "Church News" })} more={{ href: url("/notices"), label: pick(lang, { ko: "소식 전체 보기", en: "All news" }) }} />
        <div className="chc-news-grid" style={{ "--news-cols": cards.length } as CSSProperties}>
          {cards.map(([cat, items]) => (
            <div key={cat} className="chc-news-card">
              <Link href={url("/notices")} className="chc-news-head">
                <span className="chc-news-head-title">{cat}</span>
                <span className="chc-news-head-count">{pick(lang, { ko: `${items.length}건`, en: `${items.length} posts` })}</span>
              </Link>
              <ul className="chc-news-list">
                {items.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <Link href={url("/notices")}>
                      <span className="chc-news-title">{n.title}</span>
                      <span className="chc-news-date">{shortDate(n.publishedAt ?? n.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

async function GallerySection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ groups: GalleryGroup[] }>(`/onchurch/sites/${slug}/galleries?page=1&size=8`, { groups: [] });
  const tiles = data.groups.slice(0, 5);
  if (tiles.length === 0) return null;
  return (
    <section className="chc-section">
      <div className="chc-container">
        <SectionHead eyebrow="Photo Gallery" title={pick(lang, { ko: "교회 앨범", en: "Photo Gallery" })} more={{ href: url("/gallery"), label: pick(lang, { ko: "갤러리 전체 보기", en: "View gallery" }) }} />
        <div className={`chc-gallery-grid count-${tiles.length}`}>
          {tiles.map((g, i) => (
            <Link key={g.groupKey} href={url("/gallery")} className="chc-gallery-tile">
              <div className={`chc-gallery-media ${g.coverUrl ? "" : GRADS[i % GRADS.length]}`} style={g.coverUrl ? { backgroundImage: `url("${g.coverUrl}")` } : undefined}>
                <span className="chc-gallery-scrim" aria-hidden="true" />
                <span className="chc-gallery-cap">
                  <span className="chc-gallery-cap-title">{g.title}</span>
                  {g.count > 0 && <span className="chc-gallery-cap-count">{g.count}</span>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ Page ============

type Props = { church: PublicChurch; tenant: string; lang: Lang; pathPrefix: string };

export async function ClassicHome({ church, tenant, lang, pathPrefix }: Props) {
  const slug = encodeURIComponent(tenant);
  const url = (path: string) => `${pathPrefix}${path}`;
  const enabled = church.enabledPages ?? [];
  const isPageEnabled = (id: string) => id === "directions" || enabled.length === 0 || enabled.includes(id);
  const youtubeUrl = church.youtubeUrl?.trim() || null;
  const instagramUrl = church.instagramUrl?.trim() || null;

  // 바로가기 항목: 관리자가 고른 항목이 있으면 그것, 없으면 사용 가능한 전체 퀵링크 정의.
  const guideKeys = church.homeQuickLinks?.length ? church.homeQuickLinks : QUICK_LINK_DEFS.map((d) => d.key);
  const guideItems = guideKeys
    .map((k) => QUICK_LINK_DEFS.find((d) => d.key === k))
    .filter((d): d is (typeof QUICK_LINK_DEFS)[number] => !!d)
    .map((d): GuideItem | null => {
      if (d.kind === "custom") {
        const custom = church.homeCustomLink;
        return isCustomLinkReady(custom)
          ? { key: d.key as string, ic: d.ic, label: custom.title, href: normalizeCustomLinkUrl(custom.url), external: true }
          : null;
      }
      if (d.kind === "external") {
        const href = d.external === "youtube" ? youtubeUrl : instagramUrl;
        return href ? { key: d.key as string, ic: d.ic, label: quickLinkLabels(d, lang).title, href, external: true } : null;
      }
      return d.pageId && isPageEnabled(d.pageId)
        ? { key: d.key as string, ic: d.ic, label: quickLinkLabels(d, lang).title, href: url(`/${d.pageId}`), external: false }
        : null;
    })
    .filter((x): x is GuideItem => !!x);

  const sermonsEnabled = isPageEnabled("sermons");
  const initialLive = sermonsEnabled ? (await fetchLiveStatus(tenant)).isLive : false;

  // 관리자 '홈화면 구성'에서 정한 섹션 순서를 따른다(기본 템플릿과 같은 키).
  // 클래식 전용 섹션인 소식·앨범은 관리자 목록에 없으므로 말씀 뒤(소식)와 맨 끝(앨범)에 고정으로 붙인다.
  const order = normalizeHomeSectionOrder(church.homeSectionOrder);
  const quickOverlapsHero = order.indexOf("quick") === order.indexOf("banner") + 1 && guideItems.length > 0;

  const sections: Record<HomeSectionKey, React.ReactNode> = {
    banner: (
      <Suspense fallback={<div className="chc-hero-skel" aria-hidden />}>
        <HeroSection slug={slug} church={church} />
      </Suspense>
    ),
    quick: <GuideStrip items={guideItems} overlap={quickOverlapsHero} />,
    events: isPageEnabled("schedule") ? (
      <Suspense fallback={null}>
        <EventsSection slug={slug} url={url} lang={lang} />
      </Suspense>
    ) : null,
    worship: (
      <Suspense fallback={null}>
        <WorshipSection
          slug={slug}
          tenant={tenant}
          url={url}
          lang={lang}
          enabled={isPageEnabled("worship")}
          initialLive={initialLive}
          sermonsHref={sermonsEnabled ? url("/sermons") : null}
          youtubeUrl={youtubeUrl}
        />
      </Suspense>
    ),
    sermons: sermonsEnabled ? (
      <Suspense fallback={null}>
        <SermonsSection slug={slug} url={url} lang={lang} />
      </Suspense>
    ) : null,
    visit: <VisitSection church={church} url={url} lang={lang} />,
    pastor: (
      <Suspense fallback={null}>
        <PastorSection slug={slug} url={url} lang={lang} />
      </Suspense>
    ),
  };
  const news = isPageEnabled("notices") ? (
    <Suspense fallback={null}>
      <NewsSection slug={slug} url={url} lang={lang} />
    </Suspense>
  ) : null;
  const gallery = isPageEnabled("gallery") ? (
    <Suspense fallback={null}>
      <GallerySection slug={slug} url={url} lang={lang} />
    </Suspense>
  ) : null;

  return (
    <div className="chc-root">
      {sermonsEnabled && <LiveBadge slug={tenant} sermonsHref={url("/sermons")} initialLive={initialLive} />}
      {order.map((key) => (
        <div key={key} style={{ display: "contents" }}>
          {sections[key]}
          {key === "sermons" && news}
        </div>
      ))}
      {gallery}
    </div>
  );
}

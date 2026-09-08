import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { Icon, type IconKey } from "@/components/icons";
import { LiveBadge } from "@/components/live-badge";
import { ClassicHero, type ClassicHeroSlide } from "@/components/templates/classic/hero";
import type { PublicChurch } from "@/lib/public-site";
import { fetchLiveStatus } from "@/lib/public-site";
import { QUICK_LINK_DEFS, quickLinkLabels, isCustomLinkReady, normalizeCustomLinkUrl } from "@/lib/quick-links";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import { type Lang, pick } from "@/lib/i18n";

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
function GuideStrip({ items }: { items: GuideItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="chc-container">
      <nav className="chc-guide" aria-label="바로가기">
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

// 예배 시간 띠. 대표 예배를 앞세워 최대 4개를 한 줄로 보여주고, 유튜브 채널이 있으면 실시간 예배 버튼을 같이 둔다.
async function WorshipBand({ slug, url, lang, liveHref, enabled }: { slug: string; url: (p: string) => string; lang: Lang; liveHref: string | null; enabled: boolean }) {
  const data = enabled
    ? await fetchJson<{ services: PublicWorshipService[] }>(`/onchurch/sites/${slug}/worship`, { services: [] })
    : { services: [] as PublicWorshipService[] };
  const featured = data.services.filter((w) => w.isFeatured);
  const others = data.services.filter((w) => !w.isFeatured);
  const services = [...featured, ...others].slice(0, 4);
  if (services.length === 0 && !liveHref) return null;

  return (
    <section className="chc-band" aria-label={pick(lang, { ko: "예배 시간", en: "Worship times" })}>
      <div className="chc-container chc-band-inner">
        {services.length > 0 && (
          <div className="chc-band-main">
            <div className="chc-band-title">
              <span className="chc-band-eyebrow">Worship</span>
              <strong>{pick(lang, { ko: "예배 안내", en: "Worship Times" })}</strong>
            </div>
            <ul className="chc-band-list">
              {services.map((w) => (
                <li key={w.id} className={`chc-band-item ${w.isFeatured ? "feat" : ""}`}>
                  <span className="chc-band-name">{w.name}</span>
                  <span className="chc-band-time">{w.time}</span>
                  {w.meta && <span className="chc-band-meta">{w.meta}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="chc-band-actions">
          {liveHref && (
            <a href={liveHref} target="_blank" rel="noopener noreferrer" className="chc-band-live">
              <Icon.play style={{ width: 16, height: 16 }} />
              <span>{pick(lang, { ko: "실시간 예배", en: "Live Worship" })}</span>
            </a>
          )}
          {services.length > 0 && enabled && (
            <Link href={url("/worship")} className="chc-band-more">
              {pick(lang, { ko: "전체 예배 안내", en: "All services" })} <Icon.arrow style={{ width: 12, height: 12 }} />
            </Link>
          )}
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

  return (
    <div className="chc-root">
      {sermonsEnabled && <LiveBadge slug={tenant} sermonsHref={url("/sermons")} initialLive={initialLive} />}

      <Suspense fallback={<div className="chc-hero-skel" aria-hidden />}>
        <HeroSection slug={slug} church={church} />
      </Suspense>

      <GuideStrip items={guideItems} />

      <Suspense fallback={null}>
        <WorshipBand slug={slug} url={url} lang={lang} liveHref={youtubeUrl || church.liveUrl?.trim() || null} enabled={isPageEnabled("worship")} />
      </Suspense>

      {sermonsEnabled && (
        <Suspense fallback={null}>
          <SermonsSection slug={slug} url={url} lang={lang} />
        </Suspense>
      )}

      {isPageEnabled("notices") && (
        <Suspense fallback={null}>
          <NewsSection slug={slug} url={url} lang={lang} />
        </Suspense>
      )}

      {isPageEnabled("gallery") && (
        <Suspense fallback={null}>
          <GallerySection slug={slug} url={url} lang={lang} />
        </Suspense>
      )}
    </div>
  );
}

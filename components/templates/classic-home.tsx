import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { Icon, type IconKey } from "@/components/icons";
import { LiveBadge } from "@/components/live-badge";
import { ClassicHero, type ClassicHeroSlide } from "@/components/templates/classic-hero";
import type { PublicChurch } from "@/lib/public-site";
import { fetchLiveStatus } from "@/lib/public-site";
import { QUICK_LINK_DEFS, quickLinkLabels } from "@/lib/quick-links";
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
type PublicBanner = { id: number | null; title: string; description: string | null; imageUrl: string | null; linkUrl: string | null; isDefault: boolean };
type PublicSermon = { id: number; seriesId: number | null; title: string; pastor: string | null; date: string | null; videoUrl: string | null; isFeatured: boolean };
type PublicSermonSeries = { id: number; name: string };
type PublicNotice = { id: number; category: string | null; title: string; imageUrls: string[]; publishedAt: string | null; createdAt: string };
type GalleryGroup = { groupKey: string; title: string; date: string | null; coverUrl: string | null; grad: string | null; count: number };

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

const GRADS = ["ph-grad-1", "ph-grad-2", "ph-grad-3", "ph-grad-4"];

// ============ Sections ============

async function HeroSection({ slug, church }: { slug: string; church: PublicChurch }) {
  const data = await fetchJson<{ banners: PublicBanner[] }>(`/onchurch/sites/${slug}/banners`, { banners: [] });
  const slides: ClassicHeroSlide[] = data.banners.map((b) => ({
    id: b.id, title: b.title, description: b.description, imageUrl: b.imageUrl, linkUrl: b.linkUrl,
  }));
  if (slides.length === 0) {
    slides.push({ id: null, title: church.name, description: church.tagline, imageUrl: null, linkUrl: null });
  }
  return <ClassicHero slides={slides} />;
}

function LiveWorshipSection({ youtubeUrl, liveUrl, lang }: { youtubeUrl: string | null; liveUrl: string | null; lang: Lang }) {
  const href = youtubeUrl || liveUrl;
  if (!href) return null;
  return (
    <section className="chc-section chc-live">
      <span className="chc-eyebrow">YouTube Live Worship</span>
      <h2 className="chc-heading">{pick(lang, { ko: "실시간 예배영상 바로가기", en: "Watch Live Worship" })}</h2>
      <a href={href} target="_blank" rel="noopener noreferrer" className="chc-yt-btn">
        <Icon.play style={{ width: 18, height: 18 }} />
        <span>YouTube</span>
      </a>
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
  const featured = data.sermons.slice(0, 2);
  const rest = data.sermons.slice(2, 6);

  return (
    <section className="chc-section">
      <span className="chc-eyebrow">Sermons</span>
      <h2 className="chc-heading">{pick(lang, { ko: "말씀", en: "Sermons" })}</h2>
      <div className="chc-container">
        <div className="chc-sermon-feature">
          {featured.map((s, i) => {
            const t = thumb(s);
            return (
              <a key={s.id} href={href(s)} target={s.videoUrl ? "_blank" : undefined} rel={s.videoUrl ? "noopener noreferrer" : undefined} className="chc-sermon-hero">
                <div className={`chc-sermon-hero-media ${t ? "" : GRADS[i % GRADS.length]}`} style={t ? { backgroundImage: `url("${t}")` } : undefined}>
                  <span className="chc-sermon-hero-scrim" aria-hidden="true" />
                  <span className="chc-play"><Icon.play style={{ width: 22, height: 22 }} /></span>
                  <div className="chc-sermon-hero-cap">
                    <span className="chc-sermon-tag">[{label(s)}]</span>
                    <h3 className="chc-sermon-hero-title">{s.title}</h3>
                    {s.pastor && <p className="chc-sermon-hero-sub">{s.pastor}</p>}
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
                  <div className="chc-sermon-mini-title">{s.title}</div>
                </a>
              );
            })}
          </div>
        )}
        <div className="chc-more-row">
          <Link href={url("/sermons")} className="chc-more">{pick(lang, { ko: "설교 전체 보기", en: "All sermons" })} <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
        </div>
      </div>
    </section>
  );
}

async function NewsSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ notices: PublicNotice[] }>(`/onchurch/sites/${slug}/notices?page=1&size=40`, { notices: [] });
  if (data.notices.length === 0) return null;

  // 카테고리별로 묶어 최대 4개 카드. 카테고리가 없으면 '교회 소식' 한 묶음.
  const buckets = new Map<string, PublicNotice[]>();
  const fallbackCat = pick(lang, { ko: "교회 소식", en: "Church News" });
  for (const n of data.notices) {
    const key = n.category?.trim() || fallbackCat;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(n);
  }
  const cards = Array.from(buckets.entries()).slice(0, 4);

  return (
    <section className="chc-section chc-tinted">
      <span className="chc-eyebrow">Church News</span>
      <h2 className="chc-heading">{pick(lang, { ko: "교회 소식", en: "Church News" })}</h2>
      <div className="chc-container">
        <div className="chc-news-grid" style={{ "--news-cols": Math.min(cards.length, 4) } as CSSProperties}>
          {cards.map(([cat, items], i) => {
            const cover = items.find((n) => n.imageUrls?.length)?.imageUrls[0] ?? null;
            return (
              <div key={cat} className="chc-news-card">
                <Link href={url("/notices")} className={`chc-news-head ${cover ? "" : GRADS[i % GRADS.length]}`} style={cover ? { backgroundImage: `url("${cover}")` } : undefined}>
                  <span className="chc-news-head-scrim" aria-hidden="true" />
                  <span className="chc-news-head-title">{cat}</span>
                </Link>
                <ul className="chc-news-list">
                  {items.slice(0, 5).map((n) => (
                    <li key={n.id}>
                      <Link href={url("/notices")}>
                        <span className="chc-news-date">{shortDate(n.publishedAt ?? n.createdAt)}</span>
                        <span className="chc-news-title">{n.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GuideSection({ items, lang }: { items: { key: string; ic: IconKey; label: string; href: string; external: boolean }[]; lang: Lang }) {
  if (items.length === 0) return null;
  return (
    <section className="chc-section">
      <span className="chc-eyebrow">Church Guide</span>
      <h2 className="chc-heading">{pick(lang, { ko: "교회 안내", en: "Church Guide" })}</h2>
      <div className="chc-container">
        <div className="chc-guide-row">
          {items.map((it) => {
            const GuideIcon = Icon[it.ic];
            const inner = (
              <>
                <span className="chc-guide-icon"><GuideIcon width={26} height={26} /></span>
                <span className="chc-guide-label">{it.label}</span>
              </>
            );
            return it.external
              ? <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" className="chc-guide-item">{inner}</a>
              : <Link key={it.key} href={it.href} className="chc-guide-item">{inner}</Link>;
          })}
        </div>
      </div>
    </section>
  );
}

async function GallerySection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ groups: GalleryGroup[] }>(`/onchurch/sites/${slug}/galleries?page=1&size=8`, { groups: [] });
  const tiles = data.groups.slice(0, 4);
  if (tiles.length === 0) return null;
  return (
    <section className="chc-section chc-tinted">
      <span className="chc-eyebrow">Church Photo Gallery</span>
      <h2 className="chc-heading">{pick(lang, { ko: "교회 행사 사진 모음", en: "Photo Gallery" })}</h2>
      <div className="chc-container">
        <div className="chc-gallery-grid">
          {tiles.map((g, i) => (
            <Link key={g.groupKey} href={url("/gallery")} className="chc-gallery-tile">
              <div className={`chc-gallery-media ${g.coverUrl ? "" : (g.grad || GRADS[i % GRADS.length])}`} style={g.coverUrl ? { backgroundImage: `url("${g.coverUrl}")` } : undefined}>
                <span className="chc-gallery-scrim" aria-hidden="true" />
                <span className="chc-gallery-cap">{g.title}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="chc-more-row">
          <Link href={url("/gallery")} className="chc-more">{pick(lang, { ko: "갤러리 전체 보기", en: "View gallery" })} <Icon.arrow style={{ width: 12, height: 12 }} /></Link>
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

  // 교회 안내(가이드) 항목: 관리자가 고른 항목이 있으면 그것, 없으면 사용 가능한 전체 퀵링크 정의.
  const guideKeys = church.homeQuickLinks?.length ? church.homeQuickLinks : QUICK_LINK_DEFS.map((d) => d.key);
  const guideItems = guideKeys
    .map((k) => QUICK_LINK_DEFS.find((d) => d.key === k))
    .filter((d): d is (typeof QUICK_LINK_DEFS)[number] => !!d)
    .map((d) => {
      if (d.kind === "external") {
        const href = d.external === "youtube" ? youtubeUrl : instagramUrl;
        return href ? { key: d.key as string, ic: d.ic, label: quickLinkLabels(d, lang).title, href, external: true } : null;
      }
      return d.pageId && isPageEnabled(d.pageId)
        ? { key: d.key as string, ic: d.ic, label: quickLinkLabels(d, lang).title, href: url(`/${d.pageId}`), external: false }
        : null;
    })
    .filter((x): x is { key: string; ic: IconKey; label: string; href: string; external: boolean } => !!x);

  const sermonsEnabled = isPageEnabled("sermons");
  const initialLive = sermonsEnabled ? (await fetchLiveStatus(tenant)).isLive : false;

  return (
    <div className="chc-root">
      {sermonsEnabled && <LiveBadge slug={tenant} sermonsHref={url("/sermons")} initialLive={initialLive} />}

      <Suspense fallback={<div className="chc-hero-skel" aria-hidden />}>
        <HeroSection slug={slug} church={church} />
      </Suspense>

      <LiveWorshipSection youtubeUrl={youtubeUrl} liveUrl={church.liveUrl?.trim() || null} lang={lang} />

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

      <GuideSection items={guideItems} lang={lang} />

      {isPageEnabled("gallery") && (
        <Suspense fallback={null}>
          <GallerySection slug={slug} url={url} lang={lang} />
        </Suspense>
      )}
    </div>
  );
}

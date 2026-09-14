import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import type { IconKey } from "@/components/icons";
import { GoogleMap } from "@/components/google-map";
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
type PublicNoticeCategory = { id: number; name: string; sortOrder: number; isActive: boolean; isAll: boolean };
type PublicNotice = { id: number; category: string | null; title: string; imageUrls: string[]; publishedAt: string | null; createdAt: string };
type GalleryGroup = { groupKey: string; title: string; date: string | null; coverUrl: string | null; grad: string | null; count: number };
type GuideItem = { key: string; ic: IconKey; label: string; desc: string; href: string; external: boolean };
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

// 섹션 공통 머리말: 영문 eyebrow + 명조 제목(왼쪽), '전체 보기 →' 링크(오른쪽 아래 정렬).
function SectionHead({ eyebrow, title, more, aside }: { eyebrow: string; title: string; more?: { href: string; label: string }; aside?: React.ReactNode }) {
  return (
    <div className="chc-head">
      <div>
        <span className="chc-eyebrow">{eyebrow}</span>
        <h2 className="chc-heading">{title}</h2>
      </div>
      {(more || aside) && (
        <div className="chc-head-aside">
          {aside}
          {more && <Link href={more.href} className="chc-more">{more.label} →</Link>}
        </div>
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

// 히어로 바로 아래 괘선으로 나뉜 바로가기 띠(제목 + 한 줄 설명). 방문자가 가장 자주 찾는 메뉴를 첫 화면에서 바로 잡을 수 있게 한다.
function GuideStrip({ items }: { items: GuideItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="chc-guide-band">
      <nav className="chc-container chc-guide" aria-label="바로가기">
        {items.map((it) => {
          const inner = (
            <>
              <span className="chc-guide-label">{it.label}</span>
              {it.desc && <span className="chc-guide-desc">{it.desc}</span>}
            </>
          );
          return it.external
            ? <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" className="chc-guide-item">{inner}</a>
            : <Link key={it.key} href={it.href} className="chc-guide-item">{inner}</Link>;
        })}
      </nav>
    </section>
  );
}

// 예배 안내. 제목 줄 아래 예배별 카드(예배명 / 시간 / 장소). 대표 예배는 짙은 네이비 카드로 강조한다.
type WorshipProps = {
  slug: string; tenant: string; url: (p: string) => string; lang: Lang; enabled: boolean;
  initialLive: boolean; sermonsHref: string | null; youtubeUrl: string | null;
};
async function WorshipSection({ slug, tenant, url, lang, enabled, initialLive, sermonsHref, youtubeUrl }: WorshipProps) {
  const data = enabled
    ? await fetchJson<{ services: PublicWorshipService[] }>(`/onchurch/sites/${slug}/worship`, { services: [] })
    : { services: [] as PublicWorshipService[] };
  // 대표 예배는 반드시 포함해 5개까지 고르되, 카드는 관리자가 정한 원래 순서(시간순)대로 보여준다.
  const featured = data.services.filter((w) => w.isFeatured);
  const others = data.services.filter((w) => !w.isFeatured);
  const picked = new Set([...featured, ...others].slice(0, 5));
  const services = data.services.filter((w) => picked.has(w));
  if (services.length === 0) return null;

  return (
    <section className="chc-section chc-tinted">
      <div className="chc-container">
        <SectionHead
          eyebrow="Worship"
          title={pick(lang, { ko: "예배 안내", en: "Worship Times" })}
          more={enabled ? { href: url("/worship"), label: pick(lang, { ko: "전체 예배 안내", en: "All services" }) } : undefined}
          aside={<ClassicLiveLink slug={tenant} initialLive={initialLive} sermonsHref={sermonsHref} youtubeUrl={youtubeUrl} lang={lang} />}
        />
        <ul className="chc-worship-list">
          {services.map((w) => (
            <li key={w.id} className={`chc-worship-card ${w.isFeatured ? "feat" : ""}`}>
              <span className="chc-worship-name">
                {w.name}
                {w.isFeatured && ` · ${pick(lang, { ko: "대표 예배", en: "Main" })}`}
              </span>
              <span className="chc-worship-time">{w.time}</span>
              {w.meta && <span className="chc-worship-meta">{w.meta}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// 다가오는 일정. 날짜(큰 숫자) + 제목·설명 + 시간·장소 카드. 없으면 섹션 자체를 숨긴다.
async function EventsSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ events: PublicEvent[] }>(`/onchurch/sites/${slug}/events`, { events: [] });
  const upcoming = pickUpcoming(data.events).slice(0, 5);
  if (upcoming.length === 0) return null;
  const schedulePath = (iso: string) => {
    const p = seoulParts(iso);
    return p ? url(`/schedule?ym=${p.year}-${String(p.month).padStart(2, "0")}`) : url("/schedule");
  };
  return (
    <section className="chc-section">
      <div className="chc-container">
        <SectionHead eyebrow="Calendar" title={pick(lang, { ko: "다가오는 일정", en: "Upcoming Events" })} more={{ href: url("/schedule"), label: pick(lang, { ko: "전체 일정 보기", en: "Full calendar" }) }} />
        <ul className="chc-events">
          {upcoming.map((e) => {
            const p = seoulParts(e.startAt);
            const time = e.isAllDay
              ? pick(lang, { ko: "종일", en: "All day" })
              : p ? `${String(p.hours).padStart(2, "0")}:${String(p.minutes).padStart(2, "0")}` : "";
            const weekday = p ? (lang === "ko" ? WEEKDAY_KO[p.weekday] ?? p.weekday : p.weekday) : "";
            const meta = [time, e.location].filter(Boolean).join(" · ");
            return (
              <li key={e.id}>
                <Link href={schedulePath(e.startAt)} className="chc-event">
                  <time className="chc-event-date" dateTime={e.startAt}>
                    <b>{p ? p.day : "--"}</b>
                    <span>{p ? `${p.month}${pick(lang, { ko: "월", en: "" })} · ${weekday}` : ""}</span>
                  </time>
                  <span className="chc-event-body">
                    <span className="chc-event-title">{e.title}</span>
                    {e.description?.trim() && <span className="chc-event-desc">{e.description.trim()}</span>}
                  </span>
                  {meta && <span className="chc-event-meta">{meta}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// 방문 안내. 짙은 네이비 띠에 환영 문구·연락처·버튼(왼쪽)과 지도(오른쪽). 주소가 없으면 지도 없이 한 단.
function VisitSection({ church, url, lang, worshipEnabled }: { church: PublicChurch; url: (p: string) => string; lang: Lang; worshipEnabled: boolean }) {
  const address = church.address?.trim() || null;
  const phone = church.phone?.trim() || null;
  const email = church.email?.trim() || null;
  return (
    <section className="chc-visit">
      <div className={`chc-container chc-visit-inner ${address ? "" : "no-map"}`}>
        <div className="chc-visit-text">
          <span className="chc-eyebrow">Visit</span>
          <h2 className="chc-visit-title">{pick(lang, { ko: <>처음 오시는 분을<br />환영합니다</>, en: <>Welcome,<br />first-time visitors</> })}</h2>
          <p className="chc-visit-desc">
            {pick(lang, { ko: "예배 시간과 오시는 길을 확인하시고 언제든 편하게 방문해 주세요.", en: "Check our service times and directions, and feel free to visit anytime." })}
          </p>
          {(address || phone || email) && (
            <div className="chc-visit-contact">
              {address && <span>{address}</span>}
              {phone && <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a>}
              {email && <a href={`mailto:${email}`}>{email}</a>}
            </div>
          )}
          <div className="chc-visit-actions">
            <Link href={url("/directions")} className="chc-btn chc-btn-light">{pick(lang, { ko: "찾아오시는 길", en: "Directions" })}</Link>
            {worshipEnabled && <Link href={url("/worship")} className="chc-btn chc-btn-ghost">{pick(lang, { ko: "예배 안내", en: "Worship" })}</Link>}
          </div>
        </div>
        {address && (
          <div className="chc-visit-map">
            <GoogleMap address={address} name={church.name} />
          </div>
        )}
      </div>
    </section>
  );
}

// 담임목사 인사. 인사말(왼쪽) + 사진(오른쪽), 서명 줄에 교회 소개 버튼.
async function PastorSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const data = await fetchJson<{ pastor: PublicPastor }>(`/onchurch/sites/${slug}/about`, { pastor: null });
  const pastor = data.pastor;
  if (!pastor || (!pastor.message?.trim() && !pastor.name)) return null;
  const roleLine = [pastor.role, pastor.eng].filter(Boolean).join(" / ");
  return (
    <section className="chc-section">
      <div className="chc-container chc-pastor">
        <div className="chc-pastor-body">
          <span className="chc-eyebrow">Greetings</span>
          <h2 className="chc-heading">{pick(lang, { ko: "담임목사 인사", en: "From the Pastor" })}</h2>
          {pastor.message && <p className="chc-pastor-msg">{pastor.message}</p>}
          <div className="chc-pastor-sign">
            <div>
              <b>{pastor.name}</b>
              <span>{[pick(lang, { ko: "담임목사", en: "Senior Pastor" }), roleLine].filter(Boolean).join(" · ")}</span>
            </div>
            <Link href={url("/about")} className="chc-btn chc-btn-outline">{pick(lang, { ko: "교회 소개 보기", en: "About us" })}</Link>
          </div>
        </div>
        <figure className="chc-pastor-photo">
          {pastor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pastor.photoUrl} alt={pastor.name} width={480} height={600} loading="lazy" />
          ) : (
            <div className="chc-pastor-photo-empty">{pick(lang, { ko: "담임목사", en: "Senior Pastor" })}</div>
          )}
          <figcaption>{pick(lang, { ko: `담임목사 ${pastor.name}`, en: `Senior Pastor ${pastor.name}` })}</figcaption>
        </figure>
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
  // 썸네일 위에 분류 태그(왼쪽 위)와 재생 버튼(오른쪽 아래), 아래에 제목·설교자·날짜. 앞 2편은 크게, 나머지 4편은 작게.
  const Card = ({ s, i, size }: { s: PublicSermon; i: number; size: "lg" | "sm" }) => {
    const t = thumb(s);
    return (
      <a href={href(s)} target={s.videoUrl ? "_blank" : undefined} rel={s.videoUrl ? "noopener noreferrer" : undefined} className={`chc-sermon ${size}`}>
        <div className={`chc-sermon-media ${t ? "" : GRADS[i % GRADS.length]}`} style={t ? { backgroundImage: `url("${t}")` } : undefined}>
          <span className="chc-sermon-tag">{label(s)}</span>
          <span className="chc-play" aria-hidden="true">▶</span>
        </div>
        <h3 className="chc-sermon-title">{s.title}</h3>
        <Meta s={s} className="chc-sermon-meta" />
      </a>
    );
  };
  const featured = data.sermons.slice(0, 2);
  const rest = data.sermons.slice(2, 6);

  return (
    <section className="chc-section">
      <div className="chc-container">
        <SectionHead eyebrow="Sermons" title={pick(lang, { ko: "말씀", en: "Sermons" })} more={{ href: url("/sermons"), label: pick(lang, { ko: "설교 영상 더 보기", en: "More sermons" }) }} />
        <div className="chc-sermon-feature">
          {featured.map((s, i) => <Card key={s.id} s={s} i={i} size="lg" />)}
        </div>
        {rest.length > 0 && (
          <div className="chc-sermon-grid">
            {rest.map((s, i) => <Card key={s.id} s={s} i={i + 2} size="sm" />)}
          </div>
        )}
      </div>
    </section>
  );
}

async function NewsSection({ slug, url, lang }: { slug: string; url: (p: string) => string; lang: Lang }) {
  const [data, catData] = await Promise.all([
    fetchJson<{ notices: PublicNotice[] }>(`/onchurch/sites/${slug}/notices?page=1&size=40`, { notices: [] }),
    fetchJson<{ categories: PublicNoticeCategory[] }>(`/onchurch/sites/${slug}/notice-categories`, { categories: [] }),
  ]);
  if (data.notices.length === 0) return null;

  // 관리자가 설정한 공지 카테고리(소식 페이지 탭과 같은 순서)로 카드를 만든다. '전체' 카테고리는 모든 글.
  // 글에 남아 있는 옛 카테고리 값으로 묶으면 소식 페이지에 없는 카테고리가 홈에 보이므로 쓰지 않는다.
  // 설정된 카테고리가 없으면 '교회 소식' 한 묶음. 글이 없는 카테고리 카드는 숨기고 최대 3개.
  const configured = catData.categories.filter((c) => c.isActive);
  const cards: [string, PublicNotice[]][] = configured.length
    ? configured
        .map((c): [string, PublicNotice[]] => [c.name, c.isAll ? data.notices : data.notices.filter((n) => n.category?.trim() === c.name)])
        .filter(([, items]) => items.length > 0)
        .slice(0, 3)
    : [[pick(lang, { ko: "교회 소식", en: "Church News" }), data.notices]];
  if (cards.length === 0) return null;

  return (
    <section className="chc-section chc-tinted">
      <div className="chc-container">
        <div className="chc-news-grid" style={{ "--news-cols": cards.length } as CSSProperties}>
          {cards.map(([cat, items]) => (
            <div key={cat} className="chc-news-card">
              <div className="chc-news-head">
                <h2 className="chc-news-head-title">
                  {cat} <span className="chc-news-head-count">{pick(lang, { ko: `${items.length}건`, en: `${items.length} posts` })}</span>
                </h2>
                <Link href={url("/notices")} className="chc-more">{pick(lang, { ko: "더 보기", en: "More" })} →</Link>
              </div>
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
  const tiles = data.groups.slice(0, 3);
  if (tiles.length === 0) return null;
  return (
    <section className="chc-section">
      <div className="chc-container">
        <SectionHead eyebrow="Gallery" title={pick(lang, { ko: "갤러리", en: "Gallery" })} more={{ href: url("/gallery"), label: pick(lang, { ko: "갤러리 더 보기", en: "View gallery" }) }} />
        <div className="chc-gallery-grid">
          {tiles.map((g, i) => (
            <Link key={g.groupKey} href={url("/gallery")} className="chc-gallery-tile">
              <div className={`chc-gallery-media ${g.coverUrl ? "" : GRADS[i % GRADS.length]}`} style={g.coverUrl ? { backgroundImage: `url("${g.coverUrl}")` } : undefined} />
              <span className="chc-gallery-title">{g.title}</span>
              {g.count > 0 && <span className="chc-gallery-count">{pick(lang, { ko: `사진 ${g.count}장`, en: `${g.count} photos` })}</span>}
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
          ? { key: d.key as string, ic: d.ic, label: custom.title, desc: custom.desc, href: normalizeCustomLinkUrl(custom.url), external: true }
          : null;
      }
      if (d.kind === "external") {
        const href = d.external === "youtube" ? youtubeUrl : instagramUrl;
        return href ? { key: d.key as string, ic: d.ic, label: quickLinkLabels(d, lang).title, desc: quickLinkLabels(d, lang).desc, href, external: true } : null;
      }
      return d.pageId && isPageEnabled(d.pageId)
        ? { key: d.key as string, ic: d.ic, label: quickLinkLabels(d, lang).title, desc: quickLinkLabels(d, lang).desc, href: url(`/${d.pageId}`), external: false }
        : null;
    })
    .filter((x): x is GuideItem => !!x);

  const sermonsEnabled = isPageEnabled("sermons");
  const initialLive = sermonsEnabled ? (await fetchLiveStatus(tenant)).isLive : false;

  // 관리자 '홈화면 구성'에서 정한 섹션 순서를 따른다(기본 템플릿과 같은 키).
  // 클래식 전용 섹션인 소식·앨범은 관리자 목록에 없으므로 말씀 뒤(소식)와 맨 끝(앨범)에 고정으로 붙인다.
  const order = normalizeHomeSectionOrder(church.homeSectionOrder);

  const sections: Record<HomeSectionKey, React.ReactNode> = {
    banner: (
      <Suspense fallback={<div className="chc-hero-band"><div className="chc-hero-skel" aria-hidden /></div>}>
        <HeroSection slug={slug} church={church} />
      </Suspense>
    ),
    quick: <GuideStrip items={guideItems} />,
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
    visit: <VisitSection church={church} url={url} lang={lang} worshipEnabled={isPageEnabled("worship")} />,
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onchurchGallery } from "@/lib/api-client";

type Category = { id: number; name: string };
type Gallery = {
  id: number;
  categoryId: number | null;
  title: string;
  date: string | null;
  photoUrl: string | null;
  grad: string | null;
};
type Layout = { col: number; row: number };

type Props = {
  slug: string;
  categories: Category[];
  initialGalleries: Gallery[];
  totalCount: number;
  pageSize: number;
  layout: Layout[];
};

const ALL_KEY = -1 as const;

export function GalleryView({ slug, categories, initialGalleries, totalCount, pageSize, layout }: Props) {
  const [items, setItems] = useState<Gallery[]>(initialGalleries);
  const [total, setTotal] = useState<number>(totalCount);
  const [page, setPage] = useState<number>(1);
  const [filter, setFilter] = useState<number>(ALL_KEY);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasMore = items.length < total;

  // 카테고리 칩 클릭 → 서버에서 해당 카테고리 1페이지부터 다시 조회.
  const selectFilter = useCallback(
    async (cat: number) => {
      if (cat === filter || loading) return;
      setFilter(cat);
      setLoading(true);
      try {
        const res = await onchurchGallery.listPublic(slug, {
          categoryId: cat === ALL_KEY ? null : cat,
          page: 1,
          size: pageSize,
        });
        setItems(res.galleries ?? []);
        setTotal(res.totalCount ?? 0);
        setPage(1);
      } catch {
        // 네트워크 오류 시 현재 목록 유지
      } finally {
        setLoading(false);
      }
    },
    [filter, loading, slug, pageSize],
  );

  // 무한스크롤 → 다음 페이지를 이어서 append.
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await onchurchGallery.listPublic(slug, {
        categoryId: filter === ALL_KEY ? null : filter,
        page: nextPage,
        size: pageSize,
      });
      setItems((prev) => [...prev, ...(res.galleries ?? [])]);
      setTotal(res.totalCount ?? total);
      setPage(nextPage);
    } catch {
      // 실패 시 다음 교차 시점에 재시도됨
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, filter, slug, pageSize, total]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const lightboxItems = useMemo(
    () => items.filter((g): g is Gallery & { photoUrl: string } => !!g.photoUrl),
    [items],
  );

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(
    () => setActiveIndex((i) => (i == null ? i : (i - 1 + lightboxItems.length) % lightboxItems.length)),
    [lightboxItems.length],
  );
  const next = useCallback(
    () => setActiveIndex((i) => (i == null ? i : (i + 1) % lightboxItems.length)),
    [lightboxItems.length],
  );

  useEffect(() => {
    if (activeIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, close, prev, next]);

  function openFor(g: Gallery) {
    if (!g.photoUrl) return;
    const idx = lightboxItems.findIndex((x) => x.id === g.id);
    if (idx >= 0) setActiveIndex(idx);
  }

  const active = activeIndex != null ? lightboxItems[activeIndex] : null;

  return (
    <>
      {categories.length > 0 && (
        <div className="chips">
          <div
            className={`chip ${filter === ALL_KEY ? "active" : ""}`}
            onClick={() => selectFilter(ALL_KEY)}
          >
            전체
          </div>
          {categories.map((c) => (
            <div
              key={c.id}
              className={`chip ${filter === c.id ? "active" : ""}`}
              onClick={() => selectFilter(c.id)}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div className="gallery-grid">
        {items.map((g, i) => {
          const l = layout[i % layout.length] ?? { col: 4, row: 1 };
          const clickable = !!g.photoUrl;
          return (
            <div
              key={g.id}
              className="gallery-item"
              style={{ gridColumn: `span ${l.col}`, gridRow: `span ${l.row}`, cursor: clickable ? "pointer" : "default" }}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => openFor(g) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openFor(g);
                      }
                    }
                  : undefined
              }
            >
              {g.photoUrl ? (
                <div
                  className="placeholder-img"
                  style={{
                    backgroundImage: `url(${g.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {g.date && <span className="placeholder-img-tag">PHOTO · {g.date}</span>}
                </div>
              ) : (
                <div className={`placeholder-img ${g.grad ?? "ph-grad-1"}`}>
                  {g.date && <span className="placeholder-img-tag">PHOTO · {g.date}</span>}
                </div>
              )}
              <div className="gallery-overlay">
                <div className="gallery-cap-title">{g.title}</div>
                {g.date && <div className="gallery-cap-meta">{g.date}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && !loading && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          이 카테고리에 사진이 없습니다.
        </div>
      )}

      {/* 무한스크롤 감지 지점 */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />}

      {loading && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 24, fontSize: 13 }}>
          불러오는 중...
        </div>
      )}

      {active && (
        <div
          className="gallery-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={close}
        >
          <button
            type="button"
            className="gallery-lightbox-close"
            aria-label="닫기"
            onClick={(e) => { e.stopPropagation(); close(); }}
          >
            ×
          </button>
          {lightboxItems.length > 1 && (
            <button
              type="button"
              className="gallery-lightbox-nav prev"
              aria-label="이전"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              ‹
            </button>
          )}
          <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.photoUrl} alt={active.title} className="gallery-lightbox-img" />
            <div className="gallery-lightbox-meta">
              <div className="gallery-lightbox-title">{active.title}</div>
              {lightboxItems.length > 1 && (
                <div className="gallery-lightbox-count">
                  {activeIndex! + 1} / {lightboxItems.length}
                </div>
              )}
            </div>
          </div>
          {lightboxItems.length > 1 && (
            <button
              type="button"
              className="gallery-lightbox-nav next"
              aria-label="다음"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}

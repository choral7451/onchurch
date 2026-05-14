"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  categories: Category[];
  galleries: Gallery[];
  layout: Layout[];
};

const ALL_KEY = -1 as const;

export function GalleryView({ categories, galleries, layout }: Props) {
  const [filter, setFilter] = useState<number>(ALL_KEY);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === ALL_KEY ? galleries : galleries.filter((g) => g.categoryId === filter)),
    [filter, galleries],
  );

  const lightboxItems = useMemo(
    () => filtered.filter((g): g is Gallery & { photoUrl: string } => !!g.photoUrl),
    [filtered],
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
            onClick={() => setFilter(ALL_KEY)}
          >
            전체
          </div>
          {categories.map((c) => (
            <div
              key={c.id}
              className={`chip ${filter === c.id ? "active" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div className="gallery-grid">
        {filtered.map((g, i) => {
          const l = layout[i] ?? { col: 4, row: 1 };
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
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          이 카테고리에 사진이 없습니다.
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

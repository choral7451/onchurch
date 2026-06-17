"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onchurchGallery } from "@/lib/api-client";

type Category = { id: number; name: string; isAll: boolean };
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

export function GalleryView({ slug, categories, initialGalleries, totalCount, pageSize, layout }: Props) {
  // '전체'(isAll) 카테고리가 있으면 그것을, 없으면(삭제한 교회) 첫 카테고리를 기본 선택.
  const allCat = useMemo(() => categories.find((c) => c.isAll) ?? null, [categories]);
  const initialFilter = allCat ? allCat.id : categories[0]?.id ?? null;

  const [items, setItems] = useState<Gallery[]>(initialGalleries);
  const [total, setTotal] = useState<number>(totalCount);
  const [page, setPage] = useState<number>(1);
  const [filterId, setFilterId] = useState<number | null>(initialFilter);
  const [loading, setLoading] = useState(false);
  // 카테고리 전환 중 표시 — 클릭 즉시 스켈레톤으로 바꿔 "바로 넘어간 것처럼" 보이게 한다.
  const [switching, setSwitching] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // 카테고리를 빠르게 연속 클릭할 때, 가장 마지막 요청의 응답만 반영하도록 하는 가드.
  const reqIdRef = useRef(0);

  const hasMore = items.length < total;

  // 선택된 카테고리를 조회용 categoryId로 변환. '전체'(isAll)는 필터 없이 전부 조회(null).
  const queryCategoryId = useCallback(
    (id: number | null): number | null => {
      if (id == null) return null;
      const c = categories.find((x) => x.id === id);
      return c && !c.isAll ? id : null;
    },
    [categories],
  );

  const fetchPage1 = useCallback(
    async (id: number | null) => {
      const myId = ++reqIdRef.current;
      setSwitching(true);
      setLoading(true);
      try {
        const res = await onchurchGallery.listPublic(slug, {
          categoryId: queryCategoryId(id),
          page: 1,
          size: pageSize,
        });
        if (myId !== reqIdRef.current) return; // 더 최신 클릭이 있으면 이 응답은 버린다.
        setItems(res.galleries ?? []);
        setTotal(res.totalCount ?? 0);
        setPage(1);
      } catch {
        // 네트워크 오류 시 현재 목록 유지
      } finally {
        if (myId === reqIdRef.current) {
          setLoading(false);
          setSwitching(false);
        }
      }
    },
    [slug, pageSize, queryCategoryId],
  );

  // 카테고리 칩 클릭 → 즉시 칩 활성화 + 스켈레톤 전환, 데이터는 뒤이어 갱신.
  const selectFilter = useCallback(
    (id: number) => {
      if (id === filterId) return;
      setFilterId(id);
      void fetchPage1(id);
    },
    [filterId, fetchPage1],
  );

  // '전체'가 없어 기본값이 특정 카테고리인 경우, 서버가 내려준 전체 목록을 기본 카테고리로 좁힌다.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (initialFilter != null && queryCategoryId(initialFilter) != null) {
      void fetchPage1(initialFilter);
    }
  }, [initialFilter, queryCategoryId, fetchPage1]);

  // 무한스크롤 → 다음 페이지를 이어서 append.
  const loadMore = useCallback(async () => {
    if (loading || switching || !hasMore) return;
    const myId = reqIdRef.current;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await onchurchGallery.listPublic(slug, {
        categoryId: queryCategoryId(filterId),
        page: nextPage,
        size: pageSize,
      });
      if (myId !== reqIdRef.current) return; // 그 사이 카테고리가 바뀌었으면 버린다.
      setItems((prev) => [...prev, ...(res.galleries ?? [])]);
      setTotal(res.totalCount ?? total);
      setPage(nextPage);
    } catch {
      // 실패 시 다음 교차 시점에 재시도됨
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }, [loading, switching, hasMore, page, filterId, slug, pageSize, total, queryCategoryId]);

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
          {categories.map((c) => (
            <div
              key={c.id}
              className={`chip ${filterId === c.id ? "active" : ""}`}
              onClick={() => selectFilter(c.id)}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div className="gallery-grid">
        {switching
          ? Array.from({ length: pageSize }).map((_, i) => {
              const l = layout[i % layout.length] ?? { col: 4, row: 1 };
              return (
                <span
                  key={`skel-${i}`}
                  className="skel"
                  aria-hidden="true"
                  style={{ gridColumn: `span ${l.col}`, gridRow: `span ${l.row}`, borderRadius: "var(--r-lg)" }}
                />
              );
            })
          : items.map((g, i) => {
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

      {!switching && items.length === 0 && !loading && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          이 카테고리에 사진이 없습니다.
        </div>
      )}

      {/* 무한스크롤 감지 지점 */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />}

      {loading && !switching && (
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

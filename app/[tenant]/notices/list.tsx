"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { onchurchNotice, type Notice } from "@/lib/api-client";

const ALL = "전체";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  slug: string;
  initialNotices: Notice[];
  totalCount: number;
  pageSize: number;
  categories: string[];
  churchName: string;
};

export function NoticesList({ slug, initialNotices, totalCount, pageSize, categories, churchName }: Props) {
  const [items, setItems] = useState<Notice[]>(initialNotices);
  const [total, setTotal] = useState<number>(totalCount);
  const [page, setPage] = useState<number>(1);
  const [cat, setCat] = useState<string>(categories[0] ?? ALL);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState(false);
  // 카테고리/검색 전환 중 표시 — 즉시 스켈레톤으로 바꿔 '바로 넘어간 것처럼' 보이게 한다.
  const [switching, setSwitching] = useState(false);
  const [active, setActive] = useState<Notice | null>(null);

  const hasMore = items.length < total;

  // 카테고리/검색어 변경 → 서버에서 1페이지부터 다시 조회 (교체).
  // 최초 마운트 시에는 서버에서 받은 initialNotices를 그대로 쓰고 재조회하지 않는다.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      setSwitching(true);
      onchurchNotice
        .listPublic(slug, { category: cat, keyword: query, page: 1, size: pageSize })
        .then((res) => {
          if (cancelled) return;
          setItems(res.notices ?? []);
          setTotal(res.totalCount ?? 0);
          setPage(1);
        })
        .catch(() => {
          /* 네트워크 오류 시 현재 목록 유지 */
        })
        .finally(() => {
          if (!cancelled) { setLoading(false); setSwitching(false); }
        });
    }, query ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cat, query, slug, pageSize]);

  // 무한스크롤 → 다음 페이지를 이어서 append.
  const loadMore = useCallback(async () => {
    if (loading || switching || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await onchurchNotice.listPublic(slug, { category: cat, keyword: query, page: nextPage, size: pageSize });
      setItems((prev) => [...prev, ...(res.notices ?? [])]);
      setTotal(res.totalCount ?? total);
      setPage(nextPage);
    } catch {
      /* 실패 시 다음 교차 시점에 재시도됨 */
    } finally {
      setLoading(false);
    }
  }, [loading, switching, hasMore, page, cat, query, slug, pageSize, total]);

  // 옵저버 콜백이 항상 최신 loadMore를 참조하도록 ref로 보관한다.
  // (loadMore를 의존성에 직접 넣으면 매 페이지 로드마다 옵저버가 재생성되고,
  //  새 옵저버가 '교차 중' 상태를 즉시 다시 보고해 끝 페이지까지 연쇄 호출되는 버그가 생긴다.)
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <>
      <div className="notices-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div className="chips" style={{ marginBottom: 0 }}>
          {categories.map((c) => (
            <div
              key={c}
              className={`chip ${cat === c ? "active" : ""}`}
              onClick={() => { if (c !== cat) { setSwitching(true); setCat(c); } }}
            >
              {c}
            </div>
          ))}
        </div>
        <div className="notices-search-wrap" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색..."
              style={{
                padding: "9px 14px 9px 36px",
                fontSize: 13,
                border: "1px solid var(--line)",
                borderRadius: 999,
                background: "var(--surface)",
                width: 220,
                fontFamily: "inherit",
              }}
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
              <Icon.search />
            </span>
          </div>
        </div>
      </div>

      {switching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={`skel-${i}`} className="skel" aria-hidden="true" style={{ height: 48, width: "100%", borderRadius: 8 }} />
          ))}
        </div>
      ) : items.length === 0 && !loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
          {query.trim() ? "검색 결과가 없습니다." : "등록된 공지가 없습니다."}
        </div>
      ) : (
        <div className="notice-list">
          <div className="notice-row head">
            <div style={{ textAlign: "center" }}>번호</div>
            <div className="notice-col-cat">분류</div>
            <div style={{ textAlign: "center" }}>제목</div>
            <div>작성자</div>
            <div style={{ textAlign: "right" }}>작성일</div>
          </div>
          {items.map((n) => (
            <div
              key={n.id}
              className="notice-row clickable"
              role="button"
              tabIndex={0}
              onClick={() => setActive(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(n); }
              }}
            >
              {/* 전역 id 대신 교회별 게시판 순번(seqNo) 표시. 고정글은 📌 */}
              <div className="notice-num">{n.isPinned ? "📌" : n.seqNo ?? n.id}</div>
              <div className="notice-col-cat"><span className="notice-cat">{n.category ?? "일반"}</span></div>
              <div className="notice-title">{n.title}</div>
              <div className="notice-author">{n.author ?? churchName}</div>
              <div className="notice-date">{formatDate(n.publishedAt ?? n.createdAt)}</div>
            </div>
          ))}
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
          className="notice-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
          <div className="notice-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="notice-modal-close"
              aria-label="닫기"
              onClick={() => setActive(null)}
            >
              ×
            </button>
            <div className="notice-modal-body">
              <div className="notice-modal-head">
                {active.isPinned && <span className="notice-modal-pin">📌 고정</span>}
                <span className="notice-modal-cat">{active.category ?? "일반"}</span>
              </div>
              <h3 className="notice-modal-title">{active.title}</h3>
              <div className="notice-modal-meta">
                <span>{active.author ?? churchName}</span>
                <span className="dot" />
                <span>{formatDate(active.publishedAt ?? active.createdAt)}</span>
              </div>
              {active.content ? (
                <div className="notice-modal-content">{active.content}</div>
              ) : (
                !active.imageUrls?.length && <div className="notice-modal-content empty">내용이 없습니다.</div>
              )}
              {active.imageUrls?.length > 0 && (
                <div className="notice-modal-images" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                  {active.imageUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" style={{ width: "100%", borderRadius: 8 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

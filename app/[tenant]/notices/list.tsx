"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";

type Notice = {
  id: number;
  category: string | null;
  title: string;
  content: string | null;
  author: string | null;
  isPinned: boolean;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function NoticesList({ notices, categories }: { notices: Notice[]; categories: string[] }) {
  const [cat, setCat] = useState<string>(categories[0] ?? "전체");
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const filtered = useMemo(() => {
    let list = cat === "전체" ? notices : notices.filter((n) => n.category === cat);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        (n.content ?? "").toLowerCase().includes(q) ||
        (n.author ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [notices, cat, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div className="chips" style={{ marginBottom: 0 }}>
          {categories.map((c) => (
            <div
              key={c}
              className={`chip ${cat === c ? "active" : ""}`}
              onClick={() => {
                setCat(c);
                setPage(1);
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
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

      {visible.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>등록된 공지가 없습니다.</div>
      ) : (
        <div className="notice-list">
          <div className="notice-row head">
            <div>번호</div>
            <div>분류</div>
            <div>제목</div>
            <div>작성자</div>
            <div style={{ textAlign: "right" }}>작성일</div>
          </div>
          {visible.map((n) => (
            <div key={n.id} className="notice-row">
              <div className="notice-num">{n.isPinned ? "📌" : n.id}</div>
              <div>{n.category ? <span className="notice-cat">{n.category}</span> : null}</div>
              <div className="notice-title">{n.title}</div>
              <div className="notice-author">{n.author ?? "—"}</div>
              <div className="notice-date">{formatDate(n.publishedAt ?? n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32, gap: 4 }}>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 36, height: 36, border: "1px solid var(--line)", borderRadius: 8 }}
            aria-label="이전 페이지"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <Icon.chevL />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              style={{
                width: 36,
                height: 36,
                border: "1px solid",
                borderRadius: 8,
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                background: p === safePage ? "var(--primary)" : "var(--surface)",
                color: p === safePage ? "white" : "var(--ink)",
                borderColor: p === safePage ? "var(--primary)" : "var(--line)",
              }}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="icon-btn"
            style={{ width: 36, height: 36, border: "1px solid var(--line)", borderRadius: 8 }}
            aria-label="다음 페이지"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            <Icon.chevR />
          </button>
        </div>
      )}
    </>
  );
}

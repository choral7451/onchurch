"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { Notice } from "@/lib/types";

type Props = {
  notices: Notice[];
  categories: string[];
};

export function NoticesList({ notices, categories }: Props) {
  const [cat, setCat] = useState<string>(categories[0] ?? "전체");
  const [page, setPage] = useState<number>(1);
  const filtered = cat === "전체" ? notices : notices.filter((n) => n.cat === cat);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div className="chips" style={{ marginBottom: 0 }}>
          {categories.map((c) => (
            <div key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
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

      <div className="notice-list">
        <div className="notice-row head">
          <div>번호</div>
          <div>분류</div>
          <div>제목</div>
          <div>작성자</div>
          <div style={{ textAlign: "right" }}>작성일</div>
        </div>
        {filtered.map((n) => (
          <div key={n.num} className="notice-row">
            <div className="notice-num">{n.pinned ? "📌" : n.num}</div>
            <div><span className="notice-cat">{n.cat}</span></div>
            <div className="notice-title">{n.title}</div>
            <div className="notice-author">{n.author}</div>
            <div className="notice-date">{n.date}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 32, gap: 4 }}>
        <button className="icon-btn" style={{ width: 36, height: 36, border: "1px solid var(--line)", borderRadius: 8 }} aria-label="이전 페이지">
          <Icon.chevL />
        </button>
        {[1, 2, 3, 4, 5].map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              width: 36,
              height: 36,
              border: "1px solid",
              borderRadius: 8,
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              background: p === page ? "var(--primary)" : "var(--surface)",
              color: p === page ? "white" : "var(--ink)",
              borderColor: p === page ? "var(--primary)" : "var(--line)",
            }}
          >
            {p}
          </button>
        ))}
        <button className="icon-btn" style={{ width: 36, height: 36, border: "1px solid var(--line)", borderRadius: 8 }} aria-label="다음 페이지">
          <Icon.chevR />
        </button>
      </div>
    </>
  );
}

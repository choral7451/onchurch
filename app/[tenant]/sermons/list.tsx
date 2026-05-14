"use client";

import { useEffect, useState } from "react";
import { SermonCard } from "@/components/sermon-card";
import type { Sermon } from "@/lib/types";
import { parseYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";

type Props = {
  sermons: Sermon[];
  filters: string[];
};

export function SermonsList({ sermons, filters }: Props) {
  const [filter, setFilter] = useState<string>(filters[0] ?? "전체");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Sermon | null>(null);
  const q = query.trim().toLowerCase();
  const filtered = sermons.filter((s) => {
    if (filter !== "전체" && s.series !== filter) return false;
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.pastor.toLowerCase().includes(q) ||
      s.series.toLowerCase().includes(q)
    );
  });
  const activeId = parseYouTubeId(active?.videoUrl);

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
      <div className="sermon-grid" style={{ marginBottom: 56 }}>
        {sermons[0] && <SermonCard sermon={sermons[0]} feat onPlay={setActive} />}
        {sermons[1] && <SermonCard sermon={sermons[1]} onPlay={setActive} />}
        {sermons[2] && <SermonCard sermon={sermons[2]} onPlay={setActive} />}
      </div>

      <div className="sermon-toolbar">
        <div className="chips" style={{ marginBottom: 0 }}>
          {filters.map((f) => (
            <div key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>
        <input
          type="search"
          className="sermon-search"
          placeholder="제목·설교자·카테고리 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="설교 검색"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {filtered.length === 0 ? (
          <p style={{ gridColumn: "1 / -1", color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>
            검색 결과가 없습니다.
          </p>
        ) : (
          filtered.map((s, i) => <SermonCard key={`${s.title}-${i}`} sermon={s} onPlay={setActive} />)
        )}
      </div>

      {active && activeId && (
        <div
          className="sermon-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
          <div className="sermon-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sermon-modal-close"
              aria-label="닫기"
              onClick={() => setActive(null)}
            >
              ×
            </button>
            <div className="sermon-modal-video">
              <iframe
                src={youtubeEmbedUrl(activeId)}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="sermon-modal-meta">
              <div className="sermon-series">{active.series}</div>
              <div className="sermon-modal-title">{active.title}</div>
              <div className="sermon-meta">
                {active.pastor && <span>{active.pastor}</span>}
                {active.pastor && active.date && <span className="dot" />}
                {active.date && <span>{active.date}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

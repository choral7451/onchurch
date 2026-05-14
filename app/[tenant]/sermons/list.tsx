"use client";

import { useEffect, useState } from "react";
import { SermonCard } from "@/components/sermon-card";
import { Icon } from "@/components/icons";
import type { Sermon } from "@/lib/types";
import { parseYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";

type Props = {
  sermons: Sermon[];
  filters: string[];
};

export function SermonsList({ sermons, filters }: Props) {
  const [filter, setFilter] = useState<string>(filters[0] ?? "전체");
  const [active, setActive] = useState<Sermon | null>(null);
  const filtered = filter === "전체" ? sermons : sermons.filter((s) => s.series === filter);
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="chips" style={{ marginBottom: 0 }}>
          {filters.map((f) => (
            <div key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>
        <button className="btn btn-secondary"><Icon.download /> 주보 PDF</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {filtered.map((s) => <SermonCard key={s.title} sermon={s} onPlay={setActive} />)}
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

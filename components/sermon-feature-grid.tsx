"use client";

import { useEffect, useState } from "react";
import { SermonCard } from "@/components/sermon-card";
import type { Sermon } from "@/lib/types";
import { parseYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";

type Props = {
  sermons: Sermon[];
};

export function SermonFeatureGrid({ sermons }: Props) {
  const [active, setActive] = useState<Sermon | null>(null);
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
      <div className="sermon-grid">
        {sermons[0] && <SermonCard sermon={sermons[0]} feat onPlay={setActive} />}
        {sermons[1] && <SermonCard sermon={sermons[1]} onPlay={setActive} />}
        {sermons[2] && <SermonCard sermon={sermons[2]} onPlay={setActive} />}
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

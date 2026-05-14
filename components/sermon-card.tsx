import { Icon } from "@/components/icons";
import type { Sermon } from "@/lib/types";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";

type Props = {
  sermon: Sermon;
  feat?: boolean;
  onPlay?: (sermon: Sermon) => void;
};

export function SermonCard({ sermon, feat, onPlay }: Props) {
  const ytId = parseYouTubeId(sermon.videoUrl);
  const thumb = ytId ? youtubeThumbnail(ytId) : null;
  const clickable = !!ytId && !!onPlay;

  return (
    <div
      className={`sermon-card ${feat ? "feat" : ""}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onPlay!(sermon) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPlay!(sermon);
              }
            }
          : undefined
      }
    >
      <div className={`sermon-thumb ${sermon.grad}`}>
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="sermon-thumb-img" />
        )}
        <div className="sermon-thumb-overlay">
          <span />
          {sermon.duration && <span className="sermon-duration">{sermon.duration}</span>}
        </div>
        {ytId && <div className="play-btn"><Icon.play /></div>}
      </div>
      <div className="sermon-body">
        <div className="sermon-series">{sermon.series}</div>
        <div className="sermon-title">{sermon.title}</div>
        <div className="sermon-meta">
          <span>{sermon.pastor}</span>
          <span className="dot" />
          <span>{sermon.date}</span>
        </div>
      </div>
    </div>
  );
}

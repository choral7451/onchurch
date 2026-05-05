import { Icon } from "@/components/icons";
import type { Sermon } from "@/lib/types";

type Props = {
  sermon: Sermon;
  feat?: boolean;
};

export function SermonCard({ sermon, feat }: Props) {
  return (
    <div className={`sermon-card ${feat ? "feat" : ""}`}>
      <div className={`sermon-thumb ${sermon.grad}`}>
        <div className="sermon-thumb-overlay">
          <span />
          <span className="sermon-duration">{sermon.duration}</span>
        </div>
        <div className="play-btn"><Icon.play /></div>
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

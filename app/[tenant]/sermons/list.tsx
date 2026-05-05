"use client";

import { useState } from "react";
import { SermonCard } from "@/components/sermon-card";
import { Icon } from "@/components/icons";
import type { Sermon } from "@/lib/types";

type Props = {
  sermons: Sermon[];
  filters: string[];
};

export function SermonsList({ sermons, filters }: Props) {
  const [filter, setFilter] = useState<string>(filters[0] ?? "전체");
  const filtered = filter === "전체" ? sermons : sermons.filter((s) => s.series === filter);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="chips" style={{ marginBottom: 0 }}>
          {filters.map((f) => (
            <div key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>
        <button className="btn btn-secondary"><Icon.download /> 주보 PDF</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {filtered.map((s) => <SermonCard key={s.title} sermon={s} />)}
      </div>
    </>
  );
}

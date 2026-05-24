"use client";

import { DragHandle } from "@/components/admin/drag-handle";
import { useDragSort } from "@/lib/use-drag-sort";
import {
  HOME_SECTION_LABELS,
  normalizeHomeSectionOrder,
  type HomeSectionKey,
} from "@/lib/home-sections";

type Props = {
  order: string[];
  onChange: (next: HomeSectionKey[]) => void;
};

export function HomeOrderEditor({ order, onChange }: Props) {
  const normalized = normalizeHomeSectionOrder(order);
  const { getItemProps } = useDragSort(normalized.length, (from, to) => {
    if (from === to) return;
    const next = normalized.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  });

  function reset() {
    onChange(normalizeHomeSectionOrder([]));
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">HOME ORDER</div>
        <h2>홈 섹션 순서</h2>
        <p>교회 홈페이지 메인에 노출되는 섹션의 순서를 드래그하여 바꿀 수 있습니다. 저장 버튼을 눌러야 변경이 반영됩니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            기본 순서로 복원
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {normalized.map((key, idx) => {
            const meta = HOME_SECTION_LABELS[key];
            return (
              <div key={key} className="admin-banner-card" {...getItemProps(idx)}>
                <DragHandle />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--surface-2)", color: "var(--muted)", fontSize: 12, fontWeight: 600, display: "grid", placeItems: "center" }}>
                      {idx + 1}
                    </span>
                    <strong>{meta.title}</strong>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>{meta.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

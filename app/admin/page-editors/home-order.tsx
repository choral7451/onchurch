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
  activeKeys: HomeSectionKey[];
  onChange: (next: HomeSectionKey[]) => void;
};

export function HomeOrderEditor({ order, activeKeys, onChange }: Props) {
  const normalized = normalizeHomeSectionOrder(order);
  const activeSet = new Set(activeKeys);
  const visible = normalized.filter((k) => activeSet.has(k));

  const { getItemProps } = useDragSort(visible.length, (from, to) => {
    if (from === to) return;
    const newVisible = visible.slice();
    const [moved] = newVisible.splice(from, 1);
    newVisible.splice(to, 0, moved);
    // 비활성 섹션의 절대 위치는 유지하고, 활성 슬롯에만 새 순서를 채워 넣는다
    let i = 0;
    const next = normalized.map((k) => (activeSet.has(k) ? newVisible[i++] : k));
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
        <p>교회 홈페이지 메인에 노출되는 섹션의 순서를 드래그하여 바꿀 수 있습니다. 사이드바에서 OFF로 꺼둔 섹션은 여기 표시되지 않습니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            기본 순서로 복원
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>활성화된 섹션이 없습니다. 좌측에서 페이지를 켜면 여기에 나타납니다.</p>
          ) : (
            visible.map((key, idx) => {
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
            })
          )}
        </div>
      </div>
    </section>
  );
}

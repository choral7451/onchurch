"use client";

import type { WorshipService } from "@/lib/types";

type Props = {
  services: WorshipService[];
  setServices: (next: WorshipService[]) => void;
  order: [string, string, string][];
  setOrder: (next: [string, string, string][]) => void;
};

const TAGS: WorshipService["tag"][] = ["MAIN", "WEEK", "DAILY"];

export function WorshipEditor({ services, setServices, order, setOrder }: Props) {
  function updateService(idx: number, patch: Partial<WorshipService>) {
    setServices(services.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeService(idx: number) {
    setServices(services.filter((_, i) => i !== idx));
  }
  function addService() {
    setServices([...services, { tag: "MAIN", name: "", time: "", meta: "" }]);
  }

  function updateOrderRow(idx: number, col: 0 | 1 | 2, value: string) {
    setOrder(
      order.map((row, i) => {
        if (i !== idx) return row;
        const next: [string, string, string] = [row[0], row[1], row[2]];
        next[col] = value;
        return next;
      }),
    );
  }
  function removeOrderRow(idx: number) {
    setOrder(order.filter((_, i) => i !== idx));
  }
  function addOrderRow() {
    const nextNum = String(order.length + 1).padStart(2, "0");
    setOrder([...order, [nextNum, "", ""]]);
  }

  return (
    <>
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">WORSHIP</div>
          <h2>예배 시간표</h2>
          <p>주일·수요·새벽 등 예배의 시간과 장소 정보입니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {services.map((s, i) => (
              <div key={i} className="editor-row editor-row-worship">
                <select
                  value={s.tag}
                  onChange={(e) => updateService(i, { tag: e.target.value as WorshipService["tag"] })}
                  aria-label="구분"
                >
                  {TAGS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateService(i, { name: e.target.value })}
                  placeholder="예배 이름"
                />
                <input
                  type="text"
                  value={s.time}
                  onChange={(e) => updateService(i, { time: e.target.value })}
                  placeholder="오전 09:00"
                />
                <input
                  type="text"
                  value={s.meta}
                  onChange={(e) => updateService(i, { meta: e.target.value })}
                  placeholder="본당 · 1시간 30분"
                />
                <label className="editor-feat">
                  <input
                    type="checkbox"
                    checked={!!s.feat}
                    onChange={(e) => updateService(i, { feat: e.target.checked })}
                  />
                  <span>대표</span>
                </label>
                <button type="button" className="editor-row-remove" onClick={() => removeService(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addService}>
              + 예배 추가
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">ORDER</div>
          <h2>예배 순서</h2>
          <p>주보에 인쇄되는 예배 순서입니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {order.map((row, i) => (
              <div key={i} className="editor-row editor-row-order">
                <input
                  type="text"
                  value={row[0]}
                  onChange={(e) => updateOrderRow(i, 0, e.target.value)}
                  placeholder="01"
                />
                <input
                  type="text"
                  value={row[1]}
                  onChange={(e) => updateOrderRow(i, 1, e.target.value)}
                  placeholder="항목"
                />
                <input
                  type="text"
                  value={row[2]}
                  onChange={(e) => updateOrderRow(i, 2, e.target.value)}
                  placeholder="담당"
                />
                <button type="button" className="editor-row-remove" onClick={() => removeOrderRow(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addOrderRow}>
              + 순서 추가
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

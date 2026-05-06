"use client";

import type { Transportation } from "@/lib/types";

type Props = {
  transportation: Transportation[];
  setTransportation: (next: Transportation[]) => void;
};

export function DirectionsEditor({ transportation, setTransportation }: Props) {
  function update(idx: number, patch: Partial<Transportation>) {
    setTransportation(transportation.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function remove(idx: number) {
    setTransportation(transportation.filter((_, i) => i !== idx));
  }
  function add() {
    setTransportation([...transportation, { tag: "", icon: "🚌", title: "", desc: "" }]);
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">TRANSPORT</div>
        <h2>대중교통 안내</h2>
        <p>지하철·버스·셔틀 등 교회까지 오는 방법을 카드로 소개합니다. 주소·연락처는 사이드바의 &quot;연락처&quot;에서 관리합니다.</p>
      </div>
      <div className="admin-section-body">
        <div className="editor-list">
          {transportation.map((t, i) => (
            <div key={i} className="editor-row editor-row-transport">
              <input
                type="text"
                value={t.icon}
                onChange={(e) => update(i, { icon: e.target.value })}
                placeholder="🚇"
                aria-label="아이콘"
              />
              <input
                type="text"
                value={t.tag}
                onChange={(e) => update(i, { tag: e.target.value })}
                placeholder="구분 (예: 지하철)"
              />
              <input
                type="text"
                value={t.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="제목 (예: 왕십리역 5번 출구)"
              />
              <input
                type="text"
                value={t.desc}
                onChange={(e) => update(i, { desc: e.target.value })}
                placeholder="설명"
              />
              <button type="button" className="editor-row-remove" onClick={() => remove(i)} aria-label="삭제">
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="editor-add-btn" onClick={add}>
            + 교통수단 추가
          </button>
        </div>
      </div>
    </section>
  );
}

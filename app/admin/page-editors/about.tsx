"use client";

import type { HistoryItem, Pastor, StaffMember, VisionItem } from "@/lib/types";

type Props = {
  pastor: Pastor;
  setPastor: (next: Pastor) => void;
  vision: VisionItem[];
  setVision: (next: VisionItem[]) => void;
  history: HistoryItem[];
  setHistory: (next: HistoryItem[]) => void;
  staff: StaffMember[];
  setStaff: (next: StaffMember[]) => void;
};

export function AboutEditor({
  pastor,
  setPastor,
  vision,
  setVision,
  history,
  setHistory,
  staff,
  setStaff,
}: Props) {
  function patchPastor(patch: Partial<Pastor>) {
    setPastor({ ...pastor, ...patch });
  }

  function updateVision(idx: number, patch: Partial<VisionItem>) {
    setVision(vision.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function removeVision(idx: number) {
    setVision(vision.filter((_, i) => i !== idx));
  }
  function addVision() {
    setVision([...vision, { ko: "", en: "", desc: "" }]);
  }

  function updateHistory(idx: number, patch: Partial<HistoryItem>) {
    setHistory(history.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }
  function removeHistory(idx: number) {
    setHistory(history.filter((_, i) => i !== idx));
  }
  function addHistory() {
    setHistory([...history, { y: "", t: "", d: "" }]);
  }

  function updateStaff(idx: number, patch: Partial<StaffMember>) {
    setStaff(staff.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeStaff(idx: number) {
    setStaff(staff.filter((_, i) => i !== idx));
  }
  function addStaff() {
    setStaff([...staff, { name: "", role: "", area: "" }]);
  }

  return (
    <>
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">PASTOR</div>
          <h2>담임목사 인사</h2>
          <p>인사말과 담임목사 프로필 정보를 입력합니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="ad-pastor-name">이름</label>
              <input
                id="ad-pastor-name"
                type="text"
                value={pastor.name}
                onChange={(e) => patchPastor({ name: e.target.value })}
                placeholder="김 주 은"
              />
            </div>
            <div className="form-row">
              <label htmlFor="ad-pastor-role">직함</label>
              <input
                id="ad-pastor-role"
                type="text"
                value={pastor.role}
                onChange={(e) => patchPastor({ role: e.target.value })}
                placeholder="담임목사"
              />
            </div>
            <div className="form-row full">
              <label htmlFor="ad-pastor-eng">영문 이름</label>
              <input
                id="ad-pastor-eng"
                type="text"
                value={pastor.eng}
                onChange={(e) => patchPastor({ eng: e.target.value })}
                placeholder="KIM JU-EUN"
              />
            </div>
            <div className="form-row full">
              <label htmlFor="ad-pastor-message">짧은 인사말</label>
              <textarea
                id="ad-pastor-message"
                rows={4}
                value={pastor.message}
                onChange={(e) => patchPastor({ message: e.target.value })}
                placeholder="홈페이지 메인 등에 노출되는 짧은 인사말"
              />
              <span className="form-hint">단락 사이는 빈 줄(엔터 두 번)로 구분합니다.</span>
            </div>
            <div className="form-row full">
              <label htmlFor="ad-pastor-long">전체 인사말</label>
              <textarea
                id="ad-pastor-long"
                rows={8}
                value={pastor.longMessage}
                onChange={(e) => patchPastor({ longMessage: e.target.value })}
                placeholder="교회 소개 페이지의 담임목사 인사 전문"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">VISION</div>
          <h2>비전과 사명</h2>
          <p>교회의 핵심 가치 카드입니다. 보통 3개 항목으로 구성합니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {vision.map((v, i) => (
              <div key={i} className="editor-row editor-row-vision">
                <input
                  type="text"
                  value={v.ko}
                  onChange={(e) => updateVision(i, { ko: e.target.value })}
                  placeholder="한글 (예: 예배하는)"
                />
                <input
                  type="text"
                  value={v.en}
                  onChange={(e) => updateVision(i, { en: e.target.value })}
                  placeholder="ENGLISH"
                />
                <input
                  type="text"
                  value={v.desc}
                  onChange={(e) => updateVision(i, { desc: e.target.value })}
                  placeholder="설명"
                />
                <button type="button" className="editor-row-remove" onClick={() => removeVision(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addVision}>
              + 비전 추가
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">HISTORY</div>
          <h2>교회 연혁</h2>
          <p>교회의 주요 사건을 시간 순서대로 기록합니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {history.map((h, i) => (
              <div key={i} className="editor-row editor-row-history">
                <input
                  type="text"
                  value={h.y}
                  onChange={(e) => updateHistory(i, { y: e.target.value })}
                  placeholder="1979"
                />
                <input
                  type="text"
                  value={h.t}
                  onChange={(e) => updateHistory(i, { t: e.target.value })}
                  placeholder="제목"
                />
                <input
                  type="text"
                  value={h.d}
                  onChange={(e) => updateHistory(i, { d: e.target.value })}
                  placeholder="상세 설명"
                />
                <button type="button" className="editor-row-remove" onClick={() => removeHistory(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addHistory}>
              + 연혁 추가
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-eyebrow">STAFF</div>
          <h2>교역자 소개</h2>
          <p>담임목사를 포함한 교역자 명단입니다.</p>
        </div>
        <div className="admin-section-body">
          <div className="editor-list">
            {staff.map((s, i) => (
              <div key={i} className="editor-row editor-row-staff">
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateStaff(i, { name: e.target.value })}
                  placeholder="이름"
                />
                <input
                  type="text"
                  value={s.role}
                  onChange={(e) => updateStaff(i, { role: e.target.value })}
                  placeholder="직함"
                />
                <input
                  type="text"
                  value={s.area}
                  onChange={(e) => updateStaff(i, { area: e.target.value })}
                  placeholder="담당 사역"
                />
                <button type="button" className="editor-row-remove" onClick={() => removeStaff(i)} aria-label="삭제">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="editor-add-btn" onClick={addStaff}>
              + 교역자 추가
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

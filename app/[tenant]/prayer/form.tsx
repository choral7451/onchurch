"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

type Props = {
  categories: string[];
  scopes: string[];
};

export function PrayerForm({ categories, scopes }: Props) {
  const [anon, setAnon] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "64px 32px" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 24px", borderRadius: "50%", background: "oklch(0.62 0.14 245 / 0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <Icon.pray style={{ width: 32, height: 32 }} />
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--primary-deep)", margin: "0 0 12px" }}>
          기도제목이 접수되었습니다
        </h2>
        <p style={{ color: "var(--muted)", margin: "0 0 28px" }}>
          중보기도팀이 함께 기도하기 시작합니다. 평안하시기를 기도합니다.
        </p>
        <button className="btn btn-primary" onClick={() => setSubmitted(false)}>또 다른 기도 요청하기</button>
      </div>
    );
  }

  return (
    <form
      className="card"
      style={{ padding: 40 }}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="form-grid">
        <div className="form-row">
          <label>이름 {!anon && <span className="req">*</span>}</label>
          <input type="text" placeholder={anon ? "익명으로 진행됩니다" : "성함을 입력해주세요"} disabled={anon} required={!anon} />
        </div>
        <div className="form-row">
          <label>연락처 (선택)</label>
          <input type="text" placeholder="응답 받기를 원하시면 입력해주세요" />
        </div>
        <div className="form-row">
          <label>기도 분야 <span className="req">*</span></label>
          <select required>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>공개 범위 <span className="req">*</span></label>
          <select required>
            {scopes.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row full">
          <label>기도 제목 <span className="req">*</span></label>
          <textarea rows={6} placeholder="마음에 있는 것을 자유롭게 적어주세요. 짧아도 괜찮습니다." required />
        </div>
        <div className="form-row full">
          <label className="checkbox-row" style={{ fontWeight: 500, cursor: "pointer" }}>
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            익명으로 요청합니다
          </label>
        </div>
        <div className="form-row full">
          <label className="checkbox-row" style={{ fontWeight: 500, cursor: "pointer" }}>
            <input type="checkbox" required />
            개인정보 수집 및 이용에 동의합니다 (기도 요청 처리 목적, 1년간 보관)
          </label>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        <button type="button" className="btn btn-secondary">취소</button>
        <button type="submit" className="btn btn-primary">
          <Icon.pray style={{ width: 14, height: 14 }} />
          기도 요청 보내기
        </button>
      </div>
    </form>
  );
}

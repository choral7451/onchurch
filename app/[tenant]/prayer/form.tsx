"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { type Lang, pick } from "@/lib/i18n";
import { ApiError, onchurchPrayer } from "@/lib/api-client";

type Props = {
  slug: string;
  categories: string[];
  scopes: string[];
  lang?: Lang;
};

// 선택 값(category/scope)은 서버로 전송되는 데이터라 값은 유지하고 표시 라벨만 번역한다.
const CATEGORY_LABELS: Record<string, string> = {
  "가정": "Family",
  "건강": "Health",
  "직장/학업": "Work/Study",
  "신앙": "Faith",
  "관계": "Relationships",
  "기타": "Other",
};
const SCOPE_LABELS: Record<string, string> = {
  "중보기도팀": "Intercessory Prayer Team",
  "담임 목사님": "Senior Pastor",
  "전체 공개": "Public",
};

export function PrayerForm({ slug, categories, scopes, lang = "ko" }: Props) {
  const t = pick(lang, {
    ko: {
      nameRequired: "이름을 입력해주세요. 익명으로 보내려면 아래 체크박스를 선택해주세요.",
      contentRequired: "기도 제목 본문을 입력해주세요.",
      consentRequired: "개인정보 수집 및 이용에 동의해주세요.",
      submitError: "전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      successTitle: "기도제목이 접수되었습니다",
      successBody: "중보기도팀이 함께 기도하기 시작합니다. 평안하시기를 기도합니다.",
      another: "또 다른 기도 요청하기",
      name: "이름",
      namePhAnon: "익명으로 진행됩니다",
      namePh: "성함을 입력해주세요",
      contact: "연락처 (선택)",
      contactPh: "응답 받기를 원하시면 입력해주세요",
      field: "기도 분야",
      scopeLabel: "공개 범위",
      prayerTitle: "기도 제목",
      prayerPh: "마음에 있는 것을 자유롭게 적어주세요. 짧아도 괜찮습니다.",
      anonLabel: "익명으로 요청합니다",
      consentLabel: "개인정보 수집 및 이용에 동의합니다 (기도 요청 처리 목적, 1년간 보관)",
      reset: "초기화",
      sending: "보내는 중...",
      send: "기도 요청 보내기",
    },
    en: {
      nameRequired: "Please enter your name. To send anonymously, check the box below.",
      contentRequired: "Please enter your prayer request.",
      consentRequired: "Please agree to the collection and use of your personal information.",
      submitError: "An error occurred while sending. Please try again in a moment.",
      successTitle: "Your prayer request has been received",
      successBody: "Our intercessory prayer team will begin praying with you. We pray for your peace.",
      another: "Send another prayer request",
      name: "Name",
      namePhAnon: "Submitted anonymously",
      namePh: "Enter your name",
      contact: "Phone (optional)",
      contactPh: "Enter it if you'd like to receive a reply",
      field: "Prayer Category",
      scopeLabel: "Visibility",
      prayerTitle: "Prayer Request",
      prayerPh: "Feel free to write what's on your heart. It's okay to keep it brief.",
      anonLabel: "Request anonymously",
      consentLabel: "I agree to the collection and use of my personal information (for processing the prayer request; retained for 1 year).",
      reset: "Reset",
      sending: "Sending...",
      send: "Send Prayer Request",
    },
  });
  const catLabel = (c: string) => pick(lang, { ko: c, en: CATEGORY_LABELS[c] ?? c });
  const scopeLabel = (s: string) => pick(lang, { ko: s, en: SCOPE_LABELS[s] ?? s });
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [scope, setScope] = useState(scopes[0] ?? "");
  const [content, setContent] = useState("");
  const [anon, setAnon] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setName(""); setContact(""); setCategory(categories[0] ?? ""); setScope(scopes[0] ?? "");
    setContent(""); setAnon(false); setConsent(false); setErrMsg("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!anon && !name.trim()) { setErrMsg(t.nameRequired); return; }
    if (!content.trim()) { setErrMsg(t.contentRequired); return; }
    if (!consent) { setErrMsg(t.consentRequired); return; }
    setErrMsg(""); setSubmitting(true);
    try {
      await onchurchPrayer.submitPublic(slug, {
        name: anon ? null : name.trim() || null,
        contact: contact.trim() || null,
        category,
        scope,
        content: content.trim(),
        isAnonymous: anon,
      });
      reset();
      setSubmitted(true);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "64px 32px" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 24px", borderRadius: "50%", background: "oklch(0.62 0.14 245 / 0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <Icon.pray style={{ width: 32, height: 32 }} />
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--primary-deep)", margin: "0 0 12px" }}>
          {t.successTitle}
        </h2>
        <p style={{ color: "var(--muted)", margin: "0 0 28px" }}>
          {t.successBody}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setSubmitted(false)}>{t.another}</button>
      </div>
    );
  }

  return (
    <form className="card" style={{ padding: 40 }} onSubmit={onSubmit}>
      {errMsg && (
        <div className="phone-msg phone-msg-error" style={{ marginBottom: 20 }}>{errMsg}</div>
      )}
      <div className="form-grid">
        <div className="form-row">
          <label>{t.name} {!anon && <span className="req">*</span>}</label>
          <input
            type="text"
            value={anon ? "" : name}
            onChange={(e) => setName(e.target.value)}
            placeholder={anon ? t.namePhAnon : t.namePh}
            disabled={anon}
            required={!anon}
          />
        </div>
        <div className="form-row">
          <label>{t.contact}</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t.contactPh}
          />
        </div>
        <div className="form-row">
          <label>{t.field} <span className="req">*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            {categories.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>{t.scopeLabel} <span className="req">*</span></label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} required>
            {scopes.map((s) => <option key={s} value={s}>{scopeLabel(s)}</option>)}
          </select>
        </div>
        <div className="form-row full">
          <label>{t.prayerTitle} <span className="req">*</span></label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.prayerPh}
            required
          />
        </div>
        <div className="form-row full">
          <label className="checkbox-row" style={{ fontWeight: 500, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => { setAnon(e.target.checked); if (e.target.checked) setName(""); }}
            />
            {t.anonLabel}
          </label>
        </div>
        <div className="form-row full">
          <label className="checkbox-row" style={{ fontWeight: 500, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            {t.consentLabel}
          </label>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        <button type="button" className="btn btn-secondary" onClick={reset} disabled={submitting}>{t.reset}</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <Icon.pray style={{ width: 14, height: 14 }} />
          {submitting ? t.sending : t.send}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ApiError, onchurchInquiry, type InquiryItem } from "@/lib/api-client";

type Status = "idle" | "loading" | "submitting";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function InquiryEditor() {
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [question, setQuestion] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus("loading"); setErrMsg("");
    try { setItems(await onchurchInquiry.listMine()); }
    catch (err) { setErrMsg(err instanceof ApiError ? err.message : "문의 목록을 불러오지 못했습니다."); }
    finally { setStatus("idle"); }
  }

  async function submit() {
    const q = question.trim();
    if (!q) { setErrMsg("문의 내용을 입력해주세요."); return; }
    setStatus("submitting"); setErrMsg(""); setOkMsg("");
    try {
      const created = await onchurchInquiry.create(q);
      setItems((cur) => [created, ...cur]);
      setQuestion("");
      setOkMsg("문의가 접수되었습니다. 답변이 등록되면 이 페이지에 표시됩니다.");
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "문의 등록에 실패했습니다.");
    } finally { setStatus("idle"); }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div className="admin-section-eyebrow">SUPPORT</div>
        <h2>문의</h2>
        <p>서비스 이용 중 궁금한 점이나 요청사항을 보내주세요. 답변이 등록되면 아래 목록에 함께 표시됩니다.</p>
      </div>

      <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {errMsg && <div className="phone-msg phone-msg-error">{errMsg}</div>}
        {okMsg && <div className="phone-msg phone-msg-success">{okMsg}</div>}

        <div className="admin-banner-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <label style={{ fontWeight: 600 }}>새 문의 작성</label>
          <textarea
            rows={5}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="궁금한 점이나 요청사항을 자유롭게 적어주세요."
            disabled={status === "submitting"}
            style={{ width: "100%", resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submit()}
              disabled={status === "submitting" || !question.trim()}
            >
              {status === "submitting" ? "보내는 중..." : "문의 보내기"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>이전 문의 ({items.length})</div>
          {status === "loading" && <p style={{ color: "var(--muted)" }}>불러오는 중...</p>}
          {status !== "loading" && items.length === 0 && (
            <p style={{ color: "var(--muted)" }}>아직 보낸 문의가 없습니다.</p>
          )}
          {items.map((it) => (
            <div key={it.id} className="admin-banner-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className={`admin-sidebar-pill ${it.status === "answered" ? "complete" : "optional"}`} style={{ fontSize: 10 }}>
                  {it.status === "answered" ? "답변 완료" : "답변 대기"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>접수 {formatDate(it.createdAt)}</span>
                {it.answeredAt && (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>· 답변 {formatDate(it.answeredAt)}</span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>Q</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-line", color: "var(--ink)" }}>{it.question}</div>
              </div>

              {it.answer && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>A</div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-line", color: "var(--ink)" }}>{it.answer}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, FoundAccount, onchurchAuth } from "@/lib/api-client";

type Mode = "find-id" | "reset-pw";
type PhoneStatus = "idle" | "code-sent" | "verifying" | "verified";
const CODE_TTL_SECONDS = 300;

function formatPhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

const digitsOnly = (s: string) => s.replace(/[^0-9]/g, "");

/**
 * 아이디/비밀번호 찾기 모달. 랜딩 로그인과 교회 성도 로그인에서 공용으로 사용한다.
 * 연락처 인증(sendVerification → verifyCode) 후
 *  - 아이디 찾기: 해당 연락처의 모든 아이디 표시 (연락처 중복 허용)
 *  - 비밀번호 찾기: 아이디+연락처 일치 확인 후 새 비밀번호로 변경
 */
export function AccountRecoveryModal({ initialMode = "find-id", onClose }: { initialMode?: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="recovery-modal-backdrop" role="dialog" aria-modal="true" aria-label="아이디 · 비밀번호 찾기" onClick={onClose}>
      <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="recovery-modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>
        <div className="chips" style={{ marginBottom: 24 }}>
          <div className={`chip ${mode === "find-id" ? "active" : ""}`} onClick={() => setMode("find-id")}>
            아이디 찾기
          </div>
          <div className={`chip ${mode === "reset-pw" ? "active" : ""}`} onClick={() => setMode("reset-pw")}>
            비밀번호 찾기
          </div>
        </div>
        {mode === "find-id" ? <FindIdPane /> : <ResetPwPane onClose={onClose} />}
      </div>
    </div>
  );
}

/** 연락처 입력 + 인증번호 발송/검증. 인증 완료 시 onVerified(phone) 호출. */
function PhoneVerifyField({ verified, onVerified }: { verified: boolean; onVerified: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<PhoneStatus>("idle");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status !== "code-sent" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [status, secondsLeft]);

  async function sendCode() {
    if (digitsOnly(phone).length < 10) {
      setMsg({ kind: "error", text: "올바른 휴대전화 번호를 입력해주세요." });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      await onchurchAuth.sendVerification(phone);
      setStatus("code-sent");
      setSecondsLeft(CODE_TTL_SECONDS);
      setMsg({ kind: "info", text: "인증번호가 발송되었습니다. 5분 안에 입력해주세요." });
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof ApiError ? err.message : "인증번호 발송에 실패했습니다." });
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      setMsg({ kind: "error", text: "6자리 숫자 인증번호를 입력해주세요." });
      return;
    }
    if (secondsLeft <= 0) {
      setMsg({ kind: "error", text: "인증번호가 만료되었습니다. 다시 발송해주세요." });
      return;
    }
    setStatus("verifying");
    setMsg(null);
    try {
      await onchurchAuth.verifyCode(phone, code);
      setStatus("verified");
      setMsg({ kind: "success", text: "연락처 인증이 완료되었습니다." });
      onVerified(phone);
    } catch (err) {
      setStatus("code-sent");
      setMsg({ kind: "error", text: err instanceof ApiError ? err.message : "인증번호 검증에 실패했습니다." });
    }
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="form-row full">
      <label htmlFor="ar-phone">
        연락처
        {verified && <span style={{ marginLeft: 8, color: "oklch(0.5 0.13 145)", fontWeight: 600 }}>· 인증 완료</span>}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <input
          id="ar-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          disabled={verified}
          required
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={sendCode}
          disabled={verified || sending || digitsOnly(phone).length < 10}
          style={{ whiteSpace: "nowrap" }}
        >
          {sending ? "발송 중..." : status === "idle" ? "인증번호 발송" : "재발송"}
        </button>
      </div>
      {(status === "code-sent" || status === "verifying") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="6자리 인증번호"
              style={{ paddingRight: 64, width: "100%", letterSpacing: "0.2em" }}
            />
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: secondsLeft <= 30 ? "oklch(0.55 0.15 28)" : "var(--muted)",
              }}
            >
              {mmss}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={verify}
            disabled={code.length < 6 || secondsLeft <= 0 || status === "verifying"}
            style={{ whiteSpace: "nowrap" }}
          >
            {status === "verifying" ? "확인 중..." : "확인"}
          </button>
        </div>
      )}
      {msg && (
        <div className={`phone-msg phone-msg-${msg.kind}`} style={{ marginTop: 8 }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

function FindIdPane() {
  const [accounts, setAccounts] = useState<FoundAccount[] | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onVerified(phone: string) {
    setLoading(true);
    setErrMsg("");
    try {
      const { accounts } = await onchurchAuth.findLoginIds(phone);
      setAccounts(accounts);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "아이디 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (accounts) {
    return (
      <div className="auth-form">
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          입력하신 연락처로 가입된 아이디입니다.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accounts.map((acc) => (
            <div
              key={acc.loginId}
              className="card"
              style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
            >
              <div>
                <strong style={{ fontSize: 15 }}>{acc.loginId}</strong>
                <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>{acc.name}</span>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {new Date(acc.createdAt).toLocaleDateString("ko-KR")} 가입
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
        가입 시 등록한 연락처로 인증하면 아이디를 확인할 수 있습니다.
      </p>
      <PhoneVerifyField verified={false} onVerified={onVerified} />
      {loading && <div className="phone-msg phone-msg-info">아이디를 조회하고 있습니다...</div>}
      {errMsg && <div className="auth-error">{errMsg}</div>}
    </div>
  );
}

function ResetPwPane({ onClose }: { onClose: () => void }) {
  const [loginId, setLoginId] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verifiedPhone) {
      setErrMsg("연락처 인증을 먼저 완료해주세요.");
      return;
    }
    if (pw.length < 8) {
      setErrMsg("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (pw !== pwConfirm) {
      setErrMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    setErrMsg("");
    try {
      await onchurchAuth.resetPassword(loginId.trim(), verifiedPhone, pw);
      setDone(true);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-form">
        <div className="phone-msg phone-msg-success">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</div>
        <button type="button" className="btn btn-primary btn-lg" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
          로그인하기
        </button>
      </div>
    );
  }

  const canSubmit = !!verifiedPhone && loginId.trim().length > 0 && pw.length >= 8 && pw === pwConfirm && !submitting;

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
        아이디와 가입 시 등록한 연락처로 인증한 뒤 새 비밀번호를 설정합니다.
      </p>
      <div className="form-row full">
        <label htmlFor="ar-loginid">아이디</label>
        <input
          id="ar-loginid"
          type="text"
          autoComplete="username"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="아이디"
          required
        />
      </div>
      <PhoneVerifyField verified={!!verifiedPhone} onVerified={(phone) => setVerifiedPhone(phone)} />
      {verifiedPhone && (
        <>
          <div className="form-row full">
            <label htmlFor="ar-newpw">새 비밀번호</label>
            <input
              id="ar-newpw"
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="8자 이상"
              minLength={8}
              required
            />
          </div>
          <div className="form-row full">
            <label htmlFor="ar-newpw2">새 비밀번호 확인</label>
            <input
              id="ar-newpw2"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력해주세요"
              minLength={8}
              required
            />
            {pwConfirm.length > 0 && pw !== pwConfirm && (
              <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>
                비밀번호가 일치하지 않습니다.
              </span>
            )}
          </div>
        </>
      )}
      {errMsg && <div className="auth-error">{errMsg}</div>}
      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={!canSubmit}
        style={{ width: "100%", justifyContent: "center", opacity: canSubmit ? 1 : 0.6 }}
      >
        {submitting ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}

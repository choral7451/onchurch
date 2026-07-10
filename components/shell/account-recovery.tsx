"use client";

import { useEffect, useRef, useState } from "react";
import { type Lang, pick } from "@/lib/i18n";
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
 * churchSlug를 넘기면(교회 홈페이지) 해당 교회 소속 계정만 찾을 수 있다.
 */
export function AccountRecoveryModal({
  initialMode = "find-id",
  churchSlug = null,
  onClose,
  lang = "ko",
}: {
  initialMode?: Mode;
  churchSlug?: string | null;
  onClose: () => void;
  lang?: Lang;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="recovery-modal-backdrop" role="dialog" aria-modal="true" aria-label={pick(lang, { ko: "아이디 · 비밀번호 찾기", en: "Find ID · Reset password" })} onClick={onClose}>
      <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="recovery-modal-close" onClick={onClose} aria-label={pick(lang, { ko: "닫기", en: "Close" })}>
          ×
        </button>
        <div className="chips" style={{ marginBottom: 24 }}>
          <div className={`chip ${mode === "find-id" ? "active" : ""}`} onClick={() => setMode("find-id")}>
            {pick(lang, { ko: "아이디 찾기", en: "Find ID" })}
          </div>
          <div className={`chip ${mode === "reset-pw" ? "active" : ""}`} onClick={() => setMode("reset-pw")}>
            {pick(lang, { ko: "비밀번호 찾기", en: "Reset password" })}
          </div>
        </div>
        {mode === "find-id" ? <FindIdPane churchSlug={churchSlug} lang={lang} /> : <ResetPwPane churchSlug={churchSlug} onClose={onClose} lang={lang} />}
      </div>
    </div>
  );
}

/** 연락처 입력 + 인증번호 발송/검증. 인증 완료 시 onVerified(phone) 호출. */
function PhoneVerifyField({ verified, onVerified, lang }: { verified: boolean; onVerified: (phone: string) => void; lang: Lang }) {
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
      setMsg({ kind: "error", text: pick(lang, { ko: "올바른 휴대전화 번호를 입력해주세요.", en: "Please enter a valid mobile phone number." }) });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      await onchurchAuth.sendVerification(phone);
      setStatus("code-sent");
      setSecondsLeft(CODE_TTL_SECONDS);
      setMsg({ kind: "info", text: pick(lang, { ko: "인증번호가 발송되었습니다. 5분 안에 입력해주세요.", en: "A verification code has been sent. Please enter it within 5 minutes." }) });
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof ApiError ? err.message : pick(lang, { ko: "인증번호 발송에 실패했습니다.", en: "Failed to send the verification code." }) });
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      setMsg({ kind: "error", text: pick(lang, { ko: "6자리 숫자 인증번호를 입력해주세요.", en: "Please enter the 6-digit verification code." }) });
      return;
    }
    if (secondsLeft <= 0) {
      setMsg({ kind: "error", text: pick(lang, { ko: "인증번호가 만료되었습니다. 다시 발송해주세요.", en: "The verification code has expired. Please send a new one." }) });
      return;
    }
    setStatus("verifying");
    setMsg(null);
    try {
      await onchurchAuth.verifyCode(phone, code);
      setStatus("verified");
      setMsg({ kind: "success", text: pick(lang, { ko: "연락처 인증이 완료되었습니다.", en: "Phone verification complete." }) });
      onVerified(phone);
    } catch (err) {
      setStatus("code-sent");
      setMsg({ kind: "error", text: err instanceof ApiError ? err.message : pick(lang, { ko: "인증번호 검증에 실패했습니다.", en: "Failed to verify the code." }) });
    }
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="form-row full">
      <label htmlFor="ar-phone">
        {pick(lang, { ko: "연락처", en: "Phone" })}
        {verified && <span style={{ marginLeft: 8, color: "oklch(0.5 0.13 145)", fontWeight: 600 }}>{pick(lang, { ko: "· 인증 완료", en: "· Verified" })}</span>}
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
          {sending ? pick(lang, { ko: "발송 중...", en: "Sending..." }) : status === "idle" ? pick(lang, { ko: "인증번호 발송", en: "Send code" }) : pick(lang, { ko: "재발송", en: "Resend" })}
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
              placeholder={pick(lang, { ko: "6자리 인증번호", en: "6-digit code" })}
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
            {status === "verifying" ? pick(lang, { ko: "확인 중...", en: "Verifying..." }) : pick(lang, { ko: "확인", en: "Verify" })}
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

function FindIdPane({ churchSlug, lang }: { churchSlug: string | null; lang: Lang }) {
  const [accounts, setAccounts] = useState<FoundAccount[] | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onVerified(phone: string) {
    setLoading(true);
    setErrMsg("");
    try {
      const { accounts } = await onchurchAuth.findLoginIds(phone, churchSlug);
      setAccounts(accounts);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : pick(lang, { ko: "아이디 조회에 실패했습니다.", en: "Failed to look up your ID." }));
    } finally {
      setLoading(false);
    }
  }

  if (accounts) {
    return (
      <div className="auth-form">
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {pick(lang, { ko: "입력하신 연락처로 가입된 아이디입니다.", en: "IDs registered with the phone number you entered." })}
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
                {pick(lang, {
                  ko: `${new Date(acc.createdAt).toLocaleDateString("ko-KR")} 가입`,
                  en: `Joined ${new Date(acc.createdAt).toLocaleDateString("en-US")}`,
                })}
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
        {pick(lang, { ko: "가입 시 등록한 연락처로 인증하면 아이디를 확인할 수 있습니다.", en: "Verify the phone number you registered with to see your ID." })}
      </p>
      <PhoneVerifyField verified={false} onVerified={onVerified} lang={lang} />
      {loading && <div className="phone-msg phone-msg-info">{pick(lang, { ko: "아이디를 조회하고 있습니다...", en: "Looking up your ID..." })}</div>}
      {errMsg && <div className="auth-error">{errMsg}</div>}
    </div>
  );
}

function ResetPwPane({ churchSlug, onClose, lang }: { churchSlug: string | null; onClose: () => void; lang: Lang }) {
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
      setErrMsg(pick(lang, { ko: "연락처 인증을 먼저 완료해주세요.", en: "Please verify your phone number first." }));
      return;
    }
    if (pw.length < 8) {
      setErrMsg(pick(lang, { ko: "비밀번호는 8자 이상이어야 합니다.", en: "The password must be at least 8 characters." }));
      return;
    }
    if (pw !== pwConfirm) {
      setErrMsg(pick(lang, { ko: "비밀번호가 일치하지 않습니다.", en: "The passwords do not match." }));
      return;
    }
    setSubmitting(true);
    setErrMsg("");
    try {
      await onchurchAuth.resetPassword(loginId.trim(), verifiedPhone, pw, churchSlug);
      setDone(true);
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : pick(lang, { ko: "비밀번호 변경에 실패했습니다.", en: "Failed to reset the password." }));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-form">
        <div className="phone-msg phone-msg-success">{pick(lang, { ko: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.", en: "Your password has been changed. Please log in with your new password." })}</div>
        <button type="button" className="btn btn-primary btn-lg" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
          {pick(lang, { ko: "로그인하기", en: "Log in" })}
        </button>
      </div>
    );
  }

  const canSubmit = !!verifiedPhone && loginId.trim().length > 0 && pw.length >= 8 && pw === pwConfirm && !submitting;

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
        {pick(lang, { ko: "아이디와 가입 시 등록한 연락처로 인증한 뒤 새 비밀번호를 설정합니다.", en: "Verify your ID and registered phone number, then set a new password." })}
      </p>
      <div className="form-row full">
        <label htmlFor="ar-loginid">{pick(lang, { ko: "아이디", en: "ID" })}</label>
        <input
          id="ar-loginid"
          type="text"
          autoComplete="username"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder={pick(lang, { ko: "아이디", en: "ID" })}
          required
        />
      </div>
      <PhoneVerifyField verified={!!verifiedPhone} onVerified={(phone) => setVerifiedPhone(phone)} lang={lang} />
      {verifiedPhone && (
        <>
          <div className="form-row full">
            <label htmlFor="ar-newpw">{pick(lang, { ko: "새 비밀번호", en: "New password" })}</label>
            <input
              id="ar-newpw"
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={pick(lang, { ko: "8자 이상", en: "8+ characters" })}
              minLength={8}
              required
            />
          </div>
          <div className="form-row full">
            <label htmlFor="ar-newpw2">{pick(lang, { ko: "새 비밀번호 확인", en: "Confirm new password" })}</label>
            <input
              id="ar-newpw2"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder={pick(lang, { ko: "비밀번호를 다시 입력해주세요", en: "Re-enter your password" })}
              minLength={8}
              required
            />
            {pwConfirm.length > 0 && pw !== pwConfirm && (
              <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>
                {pick(lang, { ko: "비밀번호가 일치하지 않습니다.", en: "The passwords do not match." })}
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
        {submitting ? pick(lang, { ko: "변경 중...", en: "Changing..." }) : pick(lang, { ko: "비밀번호 변경", en: "Reset password" })}
      </button>
    </form>
  );
}

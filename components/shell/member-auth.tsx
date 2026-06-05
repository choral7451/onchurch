"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountRecoveryModal } from "@/components/shell/account-recovery";
import { ApiError, onchurchAuth, saveSessionChurch, saveTokens } from "@/lib/api-client";

type Tab = "login" | "join";
type PhoneStatus = "idle" | "code-sent" | "verifying" | "verified";
const CODE_TTL_SECONDS = 300;

function formatPhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/**
 * 교회 공개 사이트의 성도 로그인/가입 UI.
 * slug 종속 가입(churchId 자동 연결). 완료 후 redirectTo로 이동.
 */
export function MemberAuth({ slug, churchName, redirectTo }: { slug: string; churchName: string; redirectTo: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const done = () => {
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="card" style={{ padding: 32 }}>
      <div className="chips" style={{ marginBottom: 24 }}>
        <div className={`chip ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>로그인</div>
        <div className={`chip ${tab === "join" ? "active" : ""}`} onClick={() => setTab("join")}>성도 가입</div>
      </div>
      {tab === "login" ? (
        <LoginPane slug={slug} onDone={done} />
      ) : (
        <JoinPane slug={slug} churchName={churchName} onDone={done} />
      )}
    </div>
  );
}

function LoginPane({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [recovery, setRecovery] = useState<"find-id" | "reset-pw" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !pw) { setErrMsg("아이디와 비밀번호를 입력해주세요."); return; }
    setSubmitting(true);
    setErrMsg("");
    try {
      const tokens = await onchurchAuth.login(userId, pw, slug);
      saveTokens(tokens);
      saveSessionChurch(slug);
      onDone();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="form-row full">
        <label htmlFor="cm-id">아이디</label>
        <input id="cm-id" type="text" autoComplete="username" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="아이디" required />
      </div>
      <div className="form-row full">
        <label htmlFor="cm-pw">비밀번호</label>
        <input id="cm-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required />
      </div>
      {errMsg && <div className="auth-error">{errMsg}</div>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || !userId || !pw} style={{ width: "100%", justifyContent: "center" }}>
        {submitting ? "로그인 중..." : "로그인"}
      </button>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
        <button type="button" className="auth-link" onClick={() => setRecovery("find-id")}>아이디 찾기</button>
        <span style={{ color: "var(--line)" }}>|</span>
        <button type="button" className="auth-link" onClick={() => setRecovery("reset-pw")}>비밀번호 찾기</button>
      </div>
      {recovery && <AccountRecoveryModal initialMode={recovery} churchSlug={slug} onClose={() => setRecovery(null)} />}
    </form>
  );
}

function JoinPane({ slug, churchName, onDone }: { slug: string; churchName: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phoneStatus !== "code-sent" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phoneStatus, secondsLeft]);

  const digitsOnly = (s: string) => s.replace(/[^0-9]/g, "");

  async function sendCode() {
    if (digitsOnly(phone).length < 10) { setPhoneMsg({ kind: "error", text: "올바른 휴대전화 번호를 입력해주세요." }); return; }
    setPhoneSending(true);
    setPhoneMsg(null);
    try {
      await onchurchAuth.sendVerification(phone);
      setPhoneStatus("code-sent");
      setSecondsLeft(CODE_TTL_SECONDS);
      setPhoneMsg({ kind: "info", text: "인증번호가 발송되었습니다. 5분 안에 입력해주세요." });
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setPhoneMsg({ kind: "error", text: err instanceof ApiError ? err.message : "인증번호 발송에 실패했습니다." });
    } finally {
      setPhoneSending(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) { setPhoneMsg({ kind: "error", text: "6자리 숫자 인증번호를 입력해주세요." }); return; }
    if (secondsLeft <= 0) { setPhoneMsg({ kind: "error", text: "인증번호가 만료되었습니다. 다시 발송해주세요." }); return; }
    setPhoneStatus("verifying");
    setPhoneMsg(null);
    try {
      await onchurchAuth.verifyCode(phone, code);
      setPhoneStatus("verified");
      setPhoneMsg({ kind: "success", text: "연락처 인증이 완료되었습니다." });
    } catch (err) {
      setPhoneStatus("code-sent");
      setPhoneMsg({ kind: "error", text: err instanceof ApiError ? err.message : "인증번호 검증에 실패했습니다." });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phoneStatus !== "verified") { setErrMsg("연락처 인증을 먼저 완료해주세요."); return; }
    if (pw !== pwConfirm) { setErrMsg("비밀번호가 일치하지 않습니다."); return; }
    setSubmitting(true);
    setErrMsg("");
    try {
      const tokens = await onchurchAuth.signup({ userId, password: pw, name, phone, marketingConsent: false, churchSlug: slug });
      saveTokens(tokens);
      saveSessionChurch(slug);
      onDone();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !!name.trim() && userId.length >= 4 && pw.length >= 8 && pwConfirm.length >= 8 &&
    pw === pwConfirm && phoneStatus === "verified" && agree && !submitting;
  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 8px" }}>
        <strong style={{ color: "var(--ink)" }}>{churchName}</strong> 성도로 가입합니다.
      </p>
      <div className="form-row full">
        <label htmlFor="cj-name">이름</label>
        <input id="cj-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required />
      </div>
      <div className="form-row full">
        <label htmlFor="cj-id">아이디</label>
        <input id="cj-id" type="text" autoComplete="username" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="영문/숫자 4자 이상" minLength={4} required />
      </div>
      <div className="form-row full">
        <label htmlFor="cj-pw">비밀번호</label>
        <input id="cj-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8자 이상" minLength={8} required />
      </div>
      <div className="form-row full">
        <label htmlFor="cj-pw2">비밀번호 확인</label>
        <input id="cj-pw2" type="password" autoComplete="new-password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="비밀번호를 다시 입력해주세요" minLength={8} required />
        {pwConfirm.length > 0 && pw !== pwConfirm && (
          <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>비밀번호가 일치하지 않습니다.</span>
        )}
      </div>
      <div className="form-row full">
        <label htmlFor="cj-phone">
          연락처
          {phoneStatus === "verified" && <span style={{ marginLeft: 8, color: "oklch(0.5 0.13 145)", fontWeight: 600 }}>· 인증 완료</span>}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input id="cj-phone" type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" disabled={phoneStatus === "verified"} required />
          <button type="button" className="btn btn-secondary" onClick={sendCode} disabled={phoneStatus === "verified" || phoneSending || digitsOnly(phone).length < 10} style={{ whiteSpace: "nowrap" }}>
            {phoneSending ? "발송 중..." : phoneStatus === "idle" ? "인증번호 발송" : "재발송"}
          </button>
        </div>
        {(phoneStatus === "code-sent" || phoneStatus === "verifying") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
            <div style={{ position: "relative" }}>
              <input ref={codeInputRef} type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="6자리 인증번호" style={{ paddingRight: 64, width: "100%", letterSpacing: "0.2em" }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-mono)", fontSize: 12, color: secondsLeft <= 30 ? "oklch(0.55 0.15 28)" : "var(--muted)" }}>{mmss}</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={verifyCode} disabled={code.length < 6 || secondsLeft <= 0 || phoneStatus === "verifying"} style={{ whiteSpace: "nowrap" }}>
              {phoneStatus === "verifying" ? "확인 중..." : "확인"}
            </button>
          </div>
        )}
        {phoneMsg && <div className={`phone-msg phone-msg-${phoneMsg.kind}`} style={{ marginTop: 8 }}>{phoneMsg.text}</div>}
      </div>
      <label className="checkbox-row" style={{ cursor: "pointer", justifyContent: "space-between" }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>이용약관 · 개인정보 처리방침 동의</span>
      </label>
      {errMsg && <div className="auth-error">{errMsg}</div>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={!canSubmit} style={{ width: "100%", justifyContent: "center", opacity: canSubmit ? 1 : 0.6 }}>
        {submitting ? "가입 중..." : "가입하고 시작하기"}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, onchurchAuth, saveTokens } from "@/lib/api-client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type PhoneStatus = "idle" | "code-sent" | "verifying" | "verified";
type FormStatus = "idle" | "submitting" | "error" | "success";

const CODE_TTL_SECONDS = 300;

// 스텝 순서 — 한 화면에 한 가지(논리적으로 묶인) 입력만 노출한다.
// 마지막 단계(연락처 인증)에서 약관 동의까지 함께 처리한다.
const STEPS = ["이름", "아이디", "비밀번호", "연락처 인증"] as const;
const LAST_STEP = STEPS.length - 1;

// GA4 가입 퍼널용 단계 식별자(step_index와 1:1). gtag는 랜딩 도메인에서만 로드되므로
// 없으면 조용히 무시된다. GA 탐색에서 signup_step(step_id 순서) → sign_up 으로 이탈 단계를 본다.
const SIGNUP_STEP_IDS = ["name", "userid", "password", "phone"] as const;

function formatPhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
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
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [idError, setIdError] = useState("");

  const codeInputRef = useRef<HTMLInputElement>(null);

  // 각 가입 단계가 화면에 뜰 때 signup_step 이벤트 전송 → 어느 단계에서 이탈하는지 측정.
  useEffect(() => {
    window.gtag?.("event", "signup_step", {
      step_id: SIGNUP_STEP_IDS[step] ?? String(step),
      step_index: step,
    });
  }, [step]);

  useEffect(() => {
    if (phoneStatus !== "code-sent" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phoneStatus, secondsLeft]);

  function digitsOnly(s: string) {
    return s.replace(/[^0-9]/g, "");
  }

  async function sendCode() {
    if (digitsOnly(phone).length < 10) {
      setPhoneMsg({ kind: "error", text: "올바른 휴대전화 번호를 입력해주세요." });
      return;
    }
    setPhoneSending(true);
    setPhoneMsg(null);
    try {
      await onchurchAuth.sendVerification(phone);
      setPhoneStatus("code-sent");
      setSecondsLeft(CODE_TTL_SECONDS);
      setPhoneMsg({ kind: "info", text: "인증번호가 발송되었습니다. 5분 안에 입력해주세요." });
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setPhoneMsg({
        kind: "error",
        text: err instanceof ApiError ? err.message : "인증번호 발송에 실패했습니다.",
      });
    } finally {
      setPhoneSending(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) {
      setPhoneMsg({ kind: "error", text: "6자리 숫자 인증번호를 입력해주세요." });
      return;
    }
    if (secondsLeft <= 0) {
      setPhoneMsg({ kind: "error", text: "인증번호가 만료되었습니다. 다시 발송해주세요." });
      return;
    }
    setPhoneStatus("verifying");
    setPhoneMsg(null);
    try {
      await onchurchAuth.verifyCode(phone, code);
      setPhoneStatus("verified");
      setPhoneMsg(null);
    } catch (err) {
      setPhoneStatus("code-sent");
      setPhoneMsg({
        kind: "error",
        text: err instanceof ApiError ? err.message : "인증번호 검증에 실패했습니다.",
      });
    }
  }

  // 현재 스텝의 입력이 유효한지 — '다음' 버튼 활성화 및 진행 조건.
  function stepValid(s: number): boolean {
    switch (s) {
      case 0:
        return !!name.trim();
      case 1:
        return userId.length >= 4;
      case 2:
        return pw.length >= 8 && pwConfirm.length >= 8 && pw === pwConfirm;
      case 3:
        return phoneStatus === "verified" && agree;
      default:
        return false;
    }
  }

  async function goNext() {
    if (!stepValid(step) || idChecking) return;
    // 아이디 단계: 다음으로 넘어가기 전에 중복 확인.
    if (step === 1) {
      setIdChecking(true);
      setIdError("");
      try {
        const res = await onchurchAuth.checkLoginId(userId.trim());
        if (!res.available) {
          setIdError("이미 사용 중인 아이디입니다.");
          return;
        }
      } catch (err) {
        setIdError(err instanceof ApiError ? err.message : "아이디 확인에 실패했습니다.");
        return;
      } finally {
        setIdChecking(false);
      }
    }
    setErrorMsg("");
    setStatus("idle");
    setStep((s) => Math.min(LAST_STEP, s + 1));
  }

  async function doSignup() {
    if (phoneStatus !== "verified") {
      setStep(3);
      return;
    }
    if (pw !== pwConfirm) {
      setStep(2);
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const tokens = await onchurchAuth.signup({
        userId,
        password: pw,
        name,
        phone,
        marketingConsent: false,
      });
      saveTokens(tokens);
      setStatus("success");
      // GA4 전환 이벤트 — 가입 완료. 퍼널의 마지막 단계이자 광고 전환 최적화 기준.
      window.gtag?.("event", "sign_up", { method: "onchurch" });
      router.push("/admin");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
    }
  }

  // Enter / 버튼: 마지막 스텝이면 제출, 아니면 다음 스텝.
  function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < LAST_STEP) {
      void goNext();
      return;
    }
    void doSignup();
  }

  const nextDisabled = !stepValid(step) || status === "submitting" || idChecking;
  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form className="auth-form" onSubmit={onFormSubmit} noValidate>
      <div key={step} className="signup-step">
      {step === 0 && (
        <div className="form-row full">
          <label htmlFor="signup-name">이름</label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
      )}

      {step === 1 && (
        <div className="form-row full">
          <label htmlFor="signup-id">아이디</label>
          <input
            id="signup-id"
            type="text"
            autoComplete="username"
            placeholder="영문/숫자 4자 이상"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setIdError("");
            }}
            minLength={4}
            autoFocus
            required
          />
          {idError && (
            <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>
              {idError}
            </span>
          )}
        </div>
      )}

      {step === 2 && (
        <>
          <div className="form-row full">
            <label htmlFor="signup-pw">비밀번호</label>
            <input
              id="signup-pw"
              type="password"
              autoComplete="new-password"
              placeholder="8자 이상"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={8}
              autoFocus
              required
            />
          </div>
          <div className="form-row full">
            <label htmlFor="signup-pw-confirm">비밀번호 확인</label>
            <input
              id="signup-pw-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호를 다시 입력해주세요"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
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

      {step === 3 && (
        <>
        <div className="form-row full">
          <label htmlFor="signup-phone">
            연락처
            {phoneStatus === "verified" && (
              <span style={{ marginLeft: 8, color: "oklch(0.5 0.13 145)", fontWeight: 600 }}>· 인증 완료</span>
            )}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              id="signup-phone"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              required
              disabled={phoneStatus === "verified"}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={sendCode}
              disabled={phoneStatus === "verified" || phoneSending || digitsOnly(phone).length < 10}
              style={{ whiteSpace: "nowrap", width: 96, paddingLeft: 0, paddingRight: 0, justifyContent: "center" }}
            >
              {phoneSending ? "발송 중" : phoneStatus === "idle" ? "인증 발송" : "재발송"}
            </button>
          </div>

          <div className={`signup-otp${phoneStatus === "verified" ? " is-hidden" : ""}`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <div style={{ position: "relative", display: "flex" }}>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="인증번호"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                disabled={phoneStatus === "idle" || phoneStatus === "verified"}
                style={{ paddingRight: secondsLeft > 0 ? 48 : 14, width: "100%", letterSpacing: "0.15em", fontVariantNumeric: "tabular-nums" }}
              />
              {secondsLeft > 0 && (
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
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={verifyCode}
              disabled={code.length < 6 || secondsLeft <= 0 || phoneStatus === "verifying" || phoneStatus === "verified"}
              style={{ whiteSpace: "nowrap", width: 96, paddingLeft: 0, paddingRight: 0, justifyContent: "center" }}
            >
              {phoneStatus === "verified" ? "인증됨" : phoneStatus === "verifying" ? "확인 중" : "확인"}
            </button>
          </div>
          </div>

          {phoneMsg && (
            <div className={`phone-msg phone-msg-${phoneMsg.kind}`} style={{ marginTop: 8 }}>
              {phoneMsg.text}
            </div>
          )}
        </div>

        <label className="checkbox-row" style={{ cursor: "pointer", justifyContent: "space-between" }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
              이용약관
            </a>{" "}
            ·{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
              개인정보 처리방침
            </a>{" "}
            동의
          </span>
        </label>
        </>
      )}
      </div>

      {status === "error" && errorMsg && <div className="auth-error">{errorMsg}</div>}

      <div className="signup-actions">
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={nextDisabled}
          style={{ flex: 1, justifyContent: "center", opacity: nextDisabled ? 0.6 : 1, cursor: nextDisabled ? "not-allowed" : "pointer" }}
        >
          {step < LAST_STEP
            ? idChecking && step === 1
              ? "확인 중..."
              : "다음"
            : status === "submitting"
              ? "신청 중..."
              : "시작하기"}
        </button>
      </div>
    </form>
  );
}

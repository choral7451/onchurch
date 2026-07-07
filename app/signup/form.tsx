"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, onchurchAuth, saveSessionChurch, saveTokens } from "@/lib/api-client";
import { AddressPicker } from "@/components/address-picker";
import { buildChurchSiteUrl } from "@/lib/site-host";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type PhoneStatus = "idle" | "code-sent" | "verifying" | "verified";
type FormStatus = "idle" | "submitting" | "error" | "success";

const CODE_TTL_SECONDS = 300;

// 회원가입 절차를 없애고, 가입 후 나오던 '시작 가이드' 4단계를 앞으로 당긴 통합 위저드.
// 4단계(기본정보·연락처·담임목사·예배)를 채운 뒤 휴대폰 인증 + 약관 동의만 받아
// 그 정보로 계정을 자동 생성한다(아이디=서브도메인, 이름=교회이름, 비밀번호=임시비번은 문자 발송).
// 진행 표시는 교회 정보 4단계만. 마지막 인증+약관은 '가입 마무리' 별도 절차로 보여준다.
const STEPS = ["기본 정보", "연락처", "담임목사", "예배 안내"] as const;
const VERIFY_STEP = STEPS.length; // 4 — 본인 인증 및 약관 동의 단계
const LAST_STEP = VERIFY_STEP;

// GA4 가입 퍼널용 단계 식별자(step_index와 1:1). gtag는 랜딩 도메인에서만 로드되므로
// 없으면 조용히 무시된다. GA 탐색에서 signup_step(step_id 순서) → sign_up 으로 이탈 단계를 본다.
const SIGNUP_STEP_IDS = ["basic", "contact", "pastor", "worship", "verify"] as const;

function formatPhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function digitsOnly(s: string) {
  return s.replace(/[^0-9]/g, "");
}

// 서브도메인 = 로그인 아이디. 소문자/숫자/하이픈, 4자 이상(처음·끝은 하이픈 불가).
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupForm() {
  const [step, setStep] = useState(0);

  // 4단계 입력값
  const [slug, setSlug] = useState("");
  const [churchName, setChurchName] = useState("");
  const [churchPhone, setChurchPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [worshipName, setWorshipName] = useState("주일예배");
  const [worshipTime, setWorshipTime] = useState("");

  // 서브도메인 중복확인
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState("");

  // 휴대폰 인증
  const [code, setCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [agree, setAgree] = useState(false);

  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

  // 연락처(전화)가 바뀌면 인증 상태를 초기화한다.
  useEffect(() => {
    setPhoneStatus("idle");
    setPhoneMsg(null);
    setSecondsLeft(0);
    setCode("");
  }, [phone]);

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
      setPhoneMsg({ kind: "error", text: err instanceof ApiError ? err.message : "인증번호 발송에 실패했습니다." });
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
      setPhoneMsg({ kind: "error", text: err instanceof ApiError ? err.message : "인증번호 검증에 실패했습니다." });
    }
  }

  // 현재 스텝 입력이 유효한지 — '다음' 버튼 활성화 및 진행 조건.
  function stepValid(s: number): boolean {
    switch (s) {
      case 0:
        return slug.length >= 4 && SLUG_RE.test(slug) && !!churchName.trim();
      case 1:
        return !!churchPhone.trim() && EMAIL_RE.test(email.trim()) && !!address.trim();
      case 2:
        return !!pastorName.trim();
      case 3:
        return !!worshipName.trim() && !!worshipTime.trim();
      case 4:
        return phoneStatus === "verified" && agree;
      default:
        return false;
    }
  }

  async function goNext() {
    if (!stepValid(step) || slugChecking) return;
    // 서브도메인 단계: 다음으로 넘어가기 전에 아이디(=서브도메인) 중복 확인.
    if (step === 0) {
      setSlugChecking(true);
      setSlugError("");
      try {
        const res = await onchurchAuth.checkLoginId(slug);
        if (!res.available) {
          setSlugError("이미 사용 중인 서브도메인입니다.");
          return;
        }
      } catch (err) {
        setSlugError(err instanceof ApiError ? err.message : "서브도메인 확인에 실패했습니다.");
        return;
      } finally {
        setSlugChecking(false);
      }
    }
    setErrorMsg("");
    setStatus("idle");
    setStep((s) => Math.min(LAST_STEP, s + 1));
  }

  async function doSignup() {
    if (phoneStatus !== "verified" || !agree) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const tokens = await onchurchAuth.signupWithChurch({
        slug,
        churchName: churchName.trim(),
        phone,
        churchPhone: churchPhone.trim(),
        email: email.trim(),
        address: address.trim(),
        pastorName: pastorName.trim(),
        worshipName: worshipName.trim(),
        worshipTime: worshipTime.trim(),
        agree,
      });
      saveTokens(tokens);
      // 방금 만든 교회에 로그인된 상태로 세션 스코프를 지정한다(서브도메인 이동 후에도 로그인 유지).
      saveSessionChurch(slug);
      setStatus("success");
      // GA4 전환 이벤트 — 가입 완료. 퍼널의 마지막 단계이자 광고 전환 최적화 기준.
      window.gtag?.("event", "sign_up", { method: "onchurch" });
      // 가입 직후 사이트는 자동 공개되므로, 방금 만든 교회 홈페이지(서브도메인)로 이동한다.
      window.location.href = buildChurchSiteUrl(slug);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof ApiError ? err.message : "가입에 실패했습니다.");
    }
  }

  function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < LAST_STEP) {
      void goNext();
      return;
    }
    void doSignup();
  }

  const nextDisabled = !stepValid(step) || status === "submitting" || slugChecking;
  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form className="auth-form" onSubmit={onFormSubmit} noValidate>
      {step < VERIFY_STEP ? (
        <div className="signup-progress">
          <div className="signup-progress-dots" aria-hidden="true">
            {STEPS.map((label, i) => (
              <span key={label} className={`signup-progress-dot${i <= step ? " is-active" : ""}`} title={label} />
            ))}
          </div>
          <span className="signup-progress-label">
            {step + 1} / {STEPS.length} · {STEPS[step]}
          </span>
        </div>
      ) : (
        <div className="signup-final-head">
          <span className="signup-final-eyebrow">가입 마무리</span>
          <h2 className="signup-final-title">본인 인증 및 약관 동의</h2>
          <p className="signup-final-sub">교회 정보 입력이 끝났어요. 마지막으로 본인 인증만 하면 가입이 완료됩니다.</p>
        </div>
      )}

      <div key={step} className="signup-step">
        {step === 0 && (
          <>
            <div className="form-row full">
              <label htmlFor="signup-slug">서브도메인</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  id="signup-slug"
                  type="text"
                  autoComplete="off"
                  placeholder="onchurch"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    setSlugError("");
                  }}
                  minLength={4}
                  autoFocus
                  required
                  style={{ flex: 1 }}
                />
                <span style={{ color: "var(--muted)", whiteSpace: "nowrap", fontSize: 14 }}>.everychurch.co.kr</span>
              </div>
              <span className="form-hint">소문자·숫자·하이픈, 4자 이상. 이 주소가 로그인 아이디가 됩니다.</span>
              {slugError && (
                <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>{slugError}</span>
              )}
            </div>
            <div className="form-row full">
              <label htmlFor="signup-church-name">교회 이름</label>
              <input
                id="signup-church-name"
                type="text"
                placeholder="온교회"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="form-row full">
              <label htmlFor="signup-church-phone">교회 연락처</label>
              <input
                id="signup-church-phone"
                type="text"
                autoComplete="tel"
                placeholder="02-1234-5678"
                value={churchPhone}
                onChange={(e) => setChurchPhone(e.target.value)}
                autoFocus
                required
              />
              <span className="form-hint">홈페이지에 노출되는 교회 대표 연락처입니다.</span>
            </div>
            <div className="form-row full">
              <label htmlFor="signup-email">이메일</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="hello@church.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-row full">
              <label htmlFor="signup-address">주소</label>
              <AddressPicker
                id="signup-address"
                value={address}
                onChange={setAddress}
                placeholder="서울특별시 성동구 ..."
                churchName={churchName}
                required
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="form-row full">
            <label htmlFor="signup-pastor">담임목사 성함</label>
            <input
              id="signup-pastor"
              type="text"
              placeholder="홍길동"
              value={pastorName}
              onChange={(e) => setPastorName(e.target.value)}
              autoFocus
              required
            />
            <span className="form-hint">인사말·사진 등 나머지는 가입 후 관리자에서 추가할 수 있습니다.</span>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="form-row full">
              <label htmlFor="signup-worship-name">예배 이름</label>
              <input
                id="signup-worship-name"
                type="text"
                placeholder="주일예배"
                value={worshipName}
                onChange={(e) => setWorshipName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="form-row full">
              <label htmlFor="signup-worship-time">예배 시간</label>
              <input
                id="signup-worship-time"
                type="text"
                placeholder="오전 11:00"
                value={worshipTime}
                onChange={(e) => setWorshipTime(e.target.value)}
                required
              />
              <span className="form-hint">대표 예배 하나만 입력하세요. 다른 예배는 가입 후 추가할 수 있습니다.</span>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="form-row full">
              <label htmlFor="signup-verify-phone">
                가입자 휴대폰
                {phoneStatus === "verified" && (
                  <span style={{ marginLeft: 8, color: "oklch(0.5 0.13 145)", fontWeight: 600 }}>· 인증 완료</span>
                )}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  id="signup-verify-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
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

            <p className="form-hint" style={{ marginTop: 4 }}>
              가입을 완료하면 <b>아이디와 임시 비밀번호</b>를 문자로 보내드립니다. 사이트는 즉시 공개되고 7일 무료 체험이 시작됩니다.
            </p>
          </>
        )}
      </div>

      {status === "error" && errorMsg && <div className="auth-error">{errorMsg}</div>}

      <div className="signup-actions" style={{ display: "flex", gap: 8 }}>
        {step > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={status === "submitting"}
            style={{ justifyContent: "center" }}
          >
            이전
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={nextDisabled}
          style={{ flex: 1, justifyContent: "center", opacity: nextDisabled ? 0.6 : 1, cursor: nextDisabled ? "not-allowed" : "pointer" }}
        >
          {step < LAST_STEP
            ? slugChecking && step === 0
              ? "확인 중..."
              : "다음"
            : status === "submitting"
              ? "가입 중..."
              : "가입하고 시작하기"}
        </button>
      </div>
    </form>
  );
}

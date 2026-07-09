"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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

// 회원가입 절차를 없애고, 가입 후 나오던 '시작 가이드'를 앞으로 당긴 통합 위저드.
// 기본정보[교회명·담임목사·서브도메인]·연락처를 채운 뒤 휴대폰 인증 + 약관 동의를 받아
// 그 정보로 계정을 자동 생성한다(아이디=서브도메인, 이름=교회이름, 비밀번호=임시비번은 문자 발송).
// 예배는 주일예배/오전 11:00 기본값으로 자동 전송하고 입력 단계는 두지 않는다.
// 진행 표시는 인증까지 포함해 STEP n/3 하나의 스텝퍼로 보여준다(유저는 3단계로 인지).
const STEPS = ["기본 정보", "연락처"] as const;
const VERIFY_STEP = STEPS.length; // 2 — 본인 인증 및 약관 동의 단계
const LAST_STEP = VERIFY_STEP;
const TOTAL_STEPS = LAST_STEP + 1; // 3 — 인증 포함 전체 단계 수

// 각 단계 상단 헤더(제목 + 한 줄 설명). index 0~2가 3단계와 1:1.
const STEP_HEAD: { title: string; sub: string }[] = [
  { title: "교회 기본 정보", sub: "교회 이름·담임목사님 성함과 사용할 인터넷 주소를 입력해주세요." },
  { title: "교회 연락처", sub: "홈페이지에 표시할 대표 연락처와 주소예요." },
  { title: "본인 인증 및 약관 동의", sub: "마지막이에요! 휴대폰 인증만 하면 가입이 완료됩니다." },
];

// GA4 가입 퍼널용 단계 식별자(step_index와 1:1). gtag는 랜딩 도메인에서만 로드되므로
// 없으면 조용히 무시된다. GA 탐색에서 signup_step(step_id 순서) → sign_up 으로 이탈 단계를 본다.
const SIGNUP_STEP_IDS = ["basic", "contact", "verify"] as const;

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
  // 예배는 입력 단계 없이 기본값으로 자동 전송한다.
  const [worshipName] = useState("주일예배");
  const [worshipTime] = useState("오전 11:00");

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
  // '다음/가입' 클릭 시 충족 안 된 조건 목록 — 비어 있지 않으면 안내 모달을 띄운다.
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // 한 번에 한 단계만 렌더되므로, 각 단계 첫 입력란에 이 ref를 달아 현재 단계 입력란을 가리킨다.
  const firstInputRef = useRef<HTMLInputElement>(null);
  // 서브도메인 중복 확인 결과 캐시(slug → 사용 가능 여부). '다음' 클릭 시 await 없이 동기로
  // 읽어 넘어가기 위함 — iOS Safari는 탭 제스처의 동기 흐름 안에서만 keyboard/caret을 띄운다.
  const slugCheckCacheRef = useRef<Map<string, boolean>>(new Map());

  // flushSync로 단계 전환을 탭 핸들러 안에서 동기 커밋한 뒤, 곧바로 그 단계 첫 입력란에
  // 포커스한다. iOS Safari는 사용자 제스처의 동기 호출 스택 안에서 focus()가 실행돼야만
  // 키보드/커서를 띄우므로, setStep(비동기 렌더)+autoFocus로는 커서가 안 뜬다.
  function advanceTo(next: number) {
    flushSync(() => setStep(next));
    firstInputRef.current?.focus();
  }

  // 각 가입 단계가 화면에 뜰 때 signup_step 이벤트 전송 → 어느 단계에서 이탈하는지 측정.
  useEffect(() => {
    window.gtag?.("event", "signup_step", {
      step_id: SIGNUP_STEP_IDS[step] ?? String(step),
      step_index: step,
    });
  }, [step]);

  // 단계 전환 시 포커스는 advanceTo(flushSync + focus)가 탭 제스처 동기 흐름 안에서 처리한다.
  // step 0 첫 입력란만 초기 페이지 로드 시(데스크톱) 포커스되도록 autoFocus를 유지한다
  // — iOS는 제스처 없는 초기 로드에서 어차피 키보드를 안 띄운다.

  // 서브도메인을 입력하는 동안 미리 중복 확인해 결과를 캐시한다. 그래야 '다음' 클릭 시
  // await 없이 넘어가 모바일에서 교회 연락처 입력란에 커서가 바로 뜬다(1→2단계).
  useEffect(() => {
    const s = slug.trim();
    if (s.length < 4 || slugCheckCacheRef.current.has(s)) return;
    const t = setTimeout(async () => {
      try {
        const res = await onchurchAuth.checkLoginId(s);
        slugCheckCacheRef.current.set(s, res.available);
        if (!res.available) setSlugError("이미 사용 중인 서브도메인입니다.");
      } catch {
        // 사전 확인 실패는 캐시하지 않는다 → goNext에서 다시 확인한다.
      }
    }, 500);
    return () => clearTimeout(t);
  }, [slug]);

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

  type StepValues = {
    slug: string;
    churchName: string;
    pastorName: string;
    churchPhone: string;
    email: string;
    address: string;
  };

  // in-app 브라우저(인스타그램 등)의 자동완성/구글 주소 위젯은 DOM input 에만 값을 쓰고
  // React onChange 를 발생시키지 않는 경우가 있다. 그러면 화면엔 값이 보여도 state 는 비어
  // 검증이 막혀 '다음' 버튼이 안 켜진다. → 검증·진행 직전(및 blur)에 실제 input 값을 읽어 동기화.
  const readInput = (id: string): string | null => {
    const el = formRef.current?.querySelector<HTMLInputElement>(`#${id}`);
    return el ? el.value : null;
  };

  // 현재 렌더된 input 의 DOM 값을 읽어 state 에 반영하고, 반영된 값 묶음을 반환한다.
  // (렌더되지 않은 단계의 필드는 querySelector 가 null → 기존 state 값을 유지)
  function syncFromDom(): StepValues {
    const rawSlug = readInput("signup-slug");
    const v: StepValues = {
      churchName: readInput("signup-church-name") ?? churchName,
      pastorName: readInput("signup-pastor") ?? pastorName,
      slug: rawSlug == null ? slug : rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      churchPhone: readInput("signup-church-phone") ?? churchPhone,
      email: readInput("signup-email") ?? email,
      address: readInput("signup-address") ?? address,
    };
    if (v.churchName !== churchName) setChurchName(v.churchName);
    if (v.pastorName !== pastorName) setPastorName(v.pastorName);
    if (v.slug !== slug) setSlug(v.slug);
    if (v.churchPhone !== churchPhone) setChurchPhone(v.churchPhone);
    if (v.email !== email) setEmail(v.email);
    if (v.address !== address) setAddress(v.address);
    return v;
  }

  // 값 묶음 기준으로 충족 안 된 조건 메시지를 모은다. 비어 있으면 통과.
  // '다음'을 눌렀을 때 무엇이 빠졌는지 모달로 그대로 안내하는 데 쓴다.
  function stepErrors(s: number, v: StepValues): string[] {
    const errs: string[] = [];
    if (s === 0) {
      if (!v.churchName.trim()) errs.push("교회 이름을 입력해 주세요.");
      if (!v.pastorName.trim()) errs.push("담임목사 성함을 입력해 주세요.");
      if (!(v.slug.length >= 4 && SLUG_RE.test(v.slug)))
        errs.push("서브도메인은 소문자·숫자·하이픈 4자 이상으로 입력해 주세요.");
    } else if (s === 1) {
      if (!v.churchPhone.trim()) errs.push("교회 연락처를 입력해 주세요.");
      if (!v.email.trim()) errs.push("이메일을 입력해 주세요.");
      else if (!EMAIL_RE.test(v.email.trim())) errs.push("이메일 형식이 올바르지 않습니다.");
      if (!v.address.trim()) errs.push("주소를 입력해 주세요.");
    } else if (s === 2) {
      if (phoneStatus !== "verified") errs.push("휴대폰 본인 인증을 완료해 주세요.");
      if (!agree) errs.push("이용약관·개인정보 처리방침에 동의해 주세요.");
    }
    return errs;
  }

  async function goNext() {
    if (slugChecking) return;
    // 클릭 직전 실제 DOM 값으로 재동기화하고(자동완성 대비), 그 값 기준으로 검증한다.
    const v = syncFromDom();
    const errs = stepErrors(step, v);
    if (errs.length) {
      setValidationErrors(errs);
      return;
    }
    // 서브도메인 단계: 아이디(=서브도메인) 중복 확인. iOS Safari는 focus()가 탭 제스처의
    // 동기 흐름 안에서 실행돼야 키보드를 띄우므로, 여기서 절대 await하지 않는다(await는 제스처를
    // 끊는다). 이미 사용 중임이 확인된 값이면 막고, 아직 모르면 백그라운드로 확인만 하고 바로
    // 진행한다 — 사용 중이면 에러를 표시해 되돌아가 수정하게 하고, 최종 제출 시 서버가 재검증한다.
    if (step === 0) {
      const cached = slugCheckCacheRef.current.get(v.slug);
      if (cached === false) {
        setSlugError("이미 사용 중인 서브도메인입니다.");
        return;
      }
      if (cached === undefined) {
        void onchurchAuth
          .checkLoginId(v.slug)
          .then((res) => {
            slugCheckCacheRef.current.set(v.slug, res.available);
            if (!res.available) setSlugError("이미 사용 중인 서브도메인입니다.");
          })
          .catch(() => {
            /* 확인 실패는 무시 — 최종 제출 시 서버가 검증한다. */
          });
      }
    }
    setErrorMsg("");
    setStatus("idle");
    // 여기까지 탭 제스처 동기 흐름이 유지되므로 advanceTo의 focus()가 iOS 키보드를 띄운다.
    advanceTo(Math.min(LAST_STEP, step + 1));
  }

  async function doSignup() {
    const errs = stepErrors(LAST_STEP, syncFromDom());
    if (errs.length) {
      setValidationErrors(errs);
      return;
    }
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

  // 버튼은 입력 조건으로 비활성/흐림 처리하지 않는다(항상 눌리는 상태). 조건 미충족은
  // 클릭 시 goNext/doSignup 이 DOM 값으로 검증해 안내 모달로 알려준다. 처리 중일 때만 잠근다.
  const nextDisabled = status === "submitting" || slugChecking;
  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form className="auth-form" onSubmit={onFormSubmit} noValidate ref={formRef}>
      <div className="signup-head">
        <div className="signup-track" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className={`signup-track-seg${i <= step ? " is-active" : ""}`} />
          ))}
        </div>
        <span className="signup-step-count">STEP {step + 1} / {TOTAL_STEPS}</span>
        <h2 className="signup-step-title">{STEP_HEAD[step].title}</h2>
        <p className="signup-step-sub">{STEP_HEAD[step].sub}</p>
      </div>

      <div key={step} className="signup-step">
        {step === 0 && (
          <>
            <div className="form-row full">
              <input
                id="signup-church-name"
                ref={firstInputRef}
                type="text"
                placeholder="교회 이름"
                aria-label="교회 이름"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                onBlur={syncFromDom}
                autoFocus
                required
              />
            </div>
            <div className="form-row full">
              <input
                id="signup-pastor"
                type="text"
                placeholder="담임목사 성함"
                aria-label="담임목사 성함"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                onBlur={syncFromDom}
                required
              />
              <span className="form-hint">인사말·사진 등 나머지는 가입 후 관리자에서 추가할 수 있습니다.</span>
            </div>
            <div className="form-row full">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  id="signup-slug"
                  type="text"
                  autoComplete="off"
                  placeholder="서브도메인"
                  aria-label="서브도메인"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    setSlugError("");
                  }}
                  onBlur={syncFromDom}
                  minLength={4}
                  required
                  style={{ flex: 1 }}
                />
                <span style={{ color: "var(--muted)", whiteSpace: "nowrap", fontSize: 14 }}>.everychurch.co.kr</span>
              </div>
              <span className="form-hint">소문자·숫자·하이픈, 4자 이상.</span>
              {slugError && (
                <span className="form-hint" style={{ color: "oklch(0.55 0.15 28)" }}>{slugError}</span>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="form-row full">
              <input
                id="signup-church-phone"
                ref={firstInputRef}
                type="text"
                autoComplete="tel"
                placeholder="교회 연락처"
                aria-label="교회 연락처"
                value={churchPhone}
                onChange={(e) => setChurchPhone(e.target.value)}
                onBlur={syncFromDom}
                required
              />
              <span className="form-hint">홈페이지에 노출되는 교회 대표 연락처입니다.</span>
            </div>
            <div className="form-row full">
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="이메일"
                aria-label="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={syncFromDom}
                required
              />
            </div>
            <div className="form-row full">
              <AddressPicker
                id="signup-address"
                value={address}
                onChange={setAddress}
                onBlur={syncFromDom}
                placeholder="주소"
                aria-label="주소"
                churchName={churchName}
                required
              />
            </div>
          </>
        )}

        {step === 2 && (
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
                  ref={firstInputRef}
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  disabled={phoneStatus === "verified"}
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

      {validationErrors.length > 0 && (
        <div
          className="recovery-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setValidationErrors([])}
        >
          <div className="recovery-modal signup-validate-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="recovery-modal-close"
              aria-label="닫기"
              onClick={() => setValidationErrors([])}
            >
              ×
            </button>
            <h3 className="signup-validate-title">입력을 확인해 주세요</h3>
            <ul className="signup-validate-list">
              {validationErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setValidationErrors([])}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

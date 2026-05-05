"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

type PhoneStatus = "idle" | "code-sent" | "verified";
type FormStatus = "idle" | "submitting" | "error" | "success";

const CODE_TTL_SECONDS = 180;

function formatPhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  const [phoneMsg, setPhoneMsg] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phoneStatus !== "code-sent" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phoneStatus, secondsLeft]);

  function digitsOnly(s: string) {
    return s.replace(/[^0-9]/g, "");
  }

  function sendCode() {
    if (digitsOnly(phone).length < 10) {
      setPhoneMsg({ kind: "error", text: "올바른 휴대전화 번호를 입력해주세요." });
      return;
    }
    setPhoneStatus("code-sent");
    setSecondsLeft(CODE_TTL_SECONDS);
    setPhoneMsg({ kind: "info", text: "인증번호가 발송되었습니다. 3분 안에 입력해주세요. (데모: 아무 6자리 숫자)" });
    setTimeout(() => codeInputRef.current?.focus(), 50);
  }

  function verifyCode() {
    if (!/^\d{6}$/.test(code)) {
      setPhoneMsg({ kind: "error", text: "6자리 숫자 인증번호를 입력해주세요." });
      return;
    }
    if (secondsLeft <= 0) {
      setPhoneMsg({ kind: "error", text: "인증번호가 만료되었습니다. 다시 발송해주세요." });
      return;
    }
    setPhoneStatus("verified");
    setPhoneMsg({ kind: "success", text: "연락처 인증이 완료되었습니다." });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phoneStatus !== "verified") {
      setStatus("error");
      setErrorMsg("연락처 인증을 먼저 완료해주세요.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    await new Promise((r) => setTimeout(r, 800));
    setStatus("error");
    setErrorMsg("아직 백엔드가 연결되지 않았습니다. API 연결 후 정상 동작합니다.");
  }

  const canSubmit =
    !!name.trim() && userId.length >= 4 && pw.length >= 8 && phoneStatus === "verified" && agree && status !== "submitting";

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="form-row full">
        <label htmlFor="signup-name">이름</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="홍길동"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-row full">
        <label htmlFor="signup-id">아이디</label>
        <input
          id="signup-id"
          type="text"
          autoComplete="username"
          placeholder="영문/숫자 4자 이상"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          minLength={4}
          required
        />
      </div>

      <div className="form-row full">
        <label htmlFor="signup-pw">비밀번호</label>
        <div style={{ position: "relative" }}>
          <input
            id="signup-pw"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="8자 이상"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            minLength={8}
            required
            style={{ paddingRight: 44, width: "100%" }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              color: "var(--muted)",
            }}
          >
            <Icon.search style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

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
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={sendCode}
            disabled={phoneStatus === "verified" || digitsOnly(phone).length < 10}
            style={{ whiteSpace: "nowrap" }}
          >
            {phoneStatus === "idle" ? "인증번호 발송" : "재발송"}
          </button>
        </div>

        {phoneStatus === "code-sent" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
            <div style={{ position: "relative" }}>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 인증번호"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                style={{ paddingRight: 64, width: "100%", letterSpacing: "0.2em", fontVariantNumeric: "tabular-nums" }}
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
              onClick={verifyCode}
              disabled={code.length < 6 || secondsLeft <= 0}
              style={{ whiteSpace: "nowrap" }}
            >
              확인
            </button>
          </div>
        )}

        {phoneMsg && (
          <div className={`phone-msg phone-msg-${phoneMsg.kind}`} style={{ marginTop: 8 }}>
            {phoneMsg.text}
          </div>
        )}
      </div>

      <label className="checkbox-row" style={{ cursor: "pointer", justifyContent: "space-between" }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>이용약관 · 개인정보 처리방침 동의</span>
      </label>

      {status === "error" && errorMsg && <div className="auth-error">{errorMsg}</div>}

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={!canSubmit}
        style={{
          width: "100%",
          justifyContent: "center",
          opacity: canSubmit ? 1 : 0.6,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {status === "submitting" ? "신청 중..." : "14일 무료로 시작하기"}
      </button>
    </form>
  );
}

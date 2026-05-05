"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

type Status = "idle" | "submitting" | "error";

export function LoginForm() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    await new Promise((r) => setTimeout(r, 500));

    if (!userId || !pw) {
      setStatus("error");
      setErrorMsg("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    router.push("/admin");
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="form-row full">
        <label htmlFor="auth-id">아이디</label>
        <input
          id="auth-id"
          type="text"
          autoComplete="username"
          inputMode="text"
          placeholder="아이디를 입력해주세요"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
      </div>

      <div className="form-row full">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label htmlFor="auth-pw">비밀번호</label>
          <a href="#" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>비밀번호 찾기</a>
        </div>
        <div style={{ position: "relative" }}>
          <input
            id="auth-pw"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
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

      {status === "error" && errorMsg && (
        <div className="auth-error">{errorMsg}</div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={status === "submitting" || !userId || !pw}
        style={{
          width: "100%",
          justifyContent: "center",
          opacity: status === "submitting" || !userId || !pw ? 0.6 : 1,
          cursor: status === "submitting" || !userId || !pw ? "not-allowed" : "pointer",
        }}
      >
        {status === "submitting" ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}

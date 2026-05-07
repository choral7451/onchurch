const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresIn: string;
  refreshToken: string;
  refreshTokenExpiresIn: string;
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type CommonResponse<T> = {
  code: string;
  message: string | null;
  item: T | null;
};

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("네트워크 오류가 발생했습니다.", "NETWORK_ERROR", 0);
  }

  let body: CommonResponse<T> | { code?: string; message?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const code = body && "code" in body && body.code ? body.code : "ERROR";
    const message =
      body && "message" in body && body.message
        ? Array.isArray(body.message)
          ? body.message.join("\n")
          : body.message
        : "요청 처리 중 오류가 발생했습니다.";
    throw new ApiError(message, code, res.status);
  }

  return (body as CommonResponse<T>)?.item as T;
}

export const onchurchAuth = {
  sendVerification: (phone: string) =>
    request<{ sent: boolean }>("/onchurch/auths/verifications/mobile", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyCode: (phone: string, code: string) =>
    request<{ verified: boolean }>("/onchurch/auths/verifications/mobile", {
      method: "PUT",
      body: JSON.stringify({ phone, code }),
    }),
  signup: (params: {
    userId: string;
    password: string;
    name: string;
    phone: string;
    marketingConsent?: boolean;
  }) =>
    request<AuthTokens>("/onchurch/auths/sign-up", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  login: (userId: string, password: string) =>
    request<AuthTokens>("/onchurch/auths/login", {
      method: "POST",
      body: JSON.stringify({ userId, password }),
    }),
  refresh: (accessToken: string, refreshToken: string) =>
    request<AuthTokens>("/onchurch/auths/refresh", {
      method: "POST",
      body: JSON.stringify({ accessToken, refreshToken }),
    }),
};

const TOKEN_KEYS = {
  accessToken: "onchurch.accessToken",
  accessTokenExpiresIn: "onchurch.accessTokenExpiresIn",
  refreshToken: "onchurch.refreshToken",
  refreshTokenExpiresIn: "onchurch.refreshTokenExpiresIn",
} as const;

export function saveTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(TOKEN_KEYS.accessTokenExpiresIn, tokens.accessTokenExpiresIn);
  localStorage.setItem(TOKEN_KEYS.refreshToken, tokens.refreshToken);
  localStorage.setItem(TOKEN_KEYS.refreshTokenExpiresIn, tokens.refreshTokenExpiresIn);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.accessToken);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api-artinfokorea.com";

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresIn: string;
  refreshToken: string;
  refreshTokenExpiresIn: string;
};

export type Church = {
  id: number;
  slug: string;
  name: string;
  eng: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  representative: string | null;
  businessNo: string | null;
  logoUrl: string | null;
  enabledPages: string[];
};

export type UpsertChurchInput = {
  slug: string;
  name: string;
  eng?: string | null;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  representative?: string | null;
  businessNo?: string | null;
  logoUrl?: string | null;
  enabledPages: string[];
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

type RequestOpts = RequestInit & { auth?: boolean };

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

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.refreshToken);
}

async function rawRequest<T>(path: string, opts: RequestOpts, accessToken: string | null): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  if (opts.auth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR", message: "네트워크 오류가 발생했습니다." };
  }

  let body: CommonResponse<T> | { code?: string; message?: string | string[] } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const code = body && "code" in body && body.code ? body.code : "ERROR";
    const rawMessage = body && "message" in body ? body.message : null;
    const message = Array.isArray(rawMessage) ? rawMessage.join("\n") : rawMessage ?? "요청 처리 중 오류가 발생했습니다.";
    return { ok: false, status: res.status, code, message };
  }

  return { ok: true, data: (body as CommonResponse<T>)?.item as T };
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const accessToken = opts.auth ? getAccessToken() : null;
  const result = await rawRequest<T>(path, opts, accessToken);

  if (result.ok) return result.data;

  // 401 + auth 요청이면 refresh 한 번 시도
  if (result.status === 401 && opts.auth) {
    const refreshToken = getRefreshToken();
    if (accessToken && refreshToken) {
      const refreshResult = await rawRequest<AuthTokens>(
        "/onchurch/auths/refresh",
        { method: "POST", body: JSON.stringify({ accessToken, refreshToken }) },
        null,
      );
      if (refreshResult.ok) {
        saveTokens(refreshResult.data);
        const retry = await rawRequest<T>(path, opts, refreshResult.data.accessToken);
        if (retry.ok) return retry.data;
        throw new ApiError(retry.message, retry.code, retry.status);
      }
      // refresh 실패 → 토큰 무효, 로그인 화면으로
      clearTokens();
    }
  }

  throw new ApiError(result.message, result.code, result.status);
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

export const onchurchChurch = {
  getMine: () =>
    request<{ church: Church | null }>("/onchurch/churches/me", {
      method: "GET",
      auth: true,
    }),
  upsertMine: (input: UpsertChurchInput) =>
    request<Church>("/onchurch/churches/me", {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        eng: input.eng ?? null,
        tagline: input.tagline ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        representative: input.representative ?? null,
        businessNo: input.businessNo ?? null,
        logoUrl: input.logoUrl ?? null,
        enabledPages: input.enabledPages,
      }),
    }),
};

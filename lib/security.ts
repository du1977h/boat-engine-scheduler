import { headers } from "next/headers";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export class SecurityError extends Error {}

function normalizeOrigin(input: string) {
  try {
    const url = new URL(input);
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeLoopbackHost(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "0.0.0.0" ? "localhost" : hostname;
}

function originsMatch(originA: string, originB: string) {
  const left = new URL(originA);
  const right = new URL(originB);

  return (
    left.protocol === right.protocol &&
    normalizeLoopbackHost(left.hostname) === normalizeLoopbackHost(right.hostname) &&
    left.port === right.port
  );
}

export async function verifySameOriginRequest(request: Request) {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "") ??
    "http";
  const expectedOrigin = host ? normalizeOrigin(`${proto}://${host}`) : normalizeOrigin(request.url);

  if (!origin || !expectedOrigin || !originsMatch(origin, expectedOrigin)) {
    throw new SecurityError("不正な送信元からの操作は許可されていません。再読み込みしてから再度お試しください。");
  }
}

export function applyRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  };
}

export async function getRequestClientIp() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

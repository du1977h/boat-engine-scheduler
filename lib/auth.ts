import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_TTL_DAYS } from "@/lib/constants";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が設定されていません。`);
  }
  return value;
}

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || "boat_engine_session";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createSession(userId: number) {
  getEnv("SESSION_SECRET");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt
    }
  });

  const store = await cookies();
  store.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });
  }
  store.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  return getUserBySessionToken(token);
}

export async function getUserBySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token)
    },
    include: {
      user: true
    }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getApiCurrentUser() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  return getUserBySessionToken(token);
}

export async function requireApiUser() {
  return getApiCurrentUser();
}

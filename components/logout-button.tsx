"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin"
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(data?.message ?? "ログアウトに失敗しました。");
      }

      window.location.replace("/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "ログアウトに失敗しました。通信状況を確認して再度お試しください。");
      setLoading(false);
    }
  }

  return (
    <>
      <button className="ghost-button logout-button" type="button" onClick={onLogout} disabled={loading}>
        {loading ? "ログアウト中..." : "ログアウト"}
      </button>
      {error ? <p className="message error">{error}</p> : null}
    </>
  );
}

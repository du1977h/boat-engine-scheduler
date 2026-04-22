"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId: formData.get("loginId"),
        password: formData.get("password")
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.message ?? "ログインに失敗しました。");
      setLoading(false);
      return;
    }

    window.location.href = "/calendar";
  }

  return (
    <form className="card form-card" onSubmit={onSubmit}>
      <label>
        ログインID
        <input name="loginId" autoComplete="username" />
      </label>
      <label>
        パスワード
        <input name="password" type="password" autoComplete="current-password" />
      </label>
      {error ? <p className="message error">{error}</p> : null}
      <button type="submit" className="primary-button" disabled={loading}>
        {loading ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}

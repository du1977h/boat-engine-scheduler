import { redirect } from "next/navigation";
import { BoatBadge } from "@/components/boat-badge";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/calendar");
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="login-header">
          <div className="login-badge-wrap">
            <BoatBadge size={88} className="brand-badge" />
          </div>
          <p className="eyebrow">琉球大学医学部ボードセイリング部</p>
          <h1 className="login-title">
            <span>ボート運搬担当者</span>
            <span>記録アプリ</span>
          </h1>
        </div>
        <LoginForm />
      </section>
    </div>
  );
}

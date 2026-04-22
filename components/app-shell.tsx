import Link from "next/link";
import { User } from "@prisma/client";
import { BoatBadge } from "@/components/boat-badge";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({
  user,
  children
}: {
  user: Pick<User, "displayName" | "role">;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-copy">
            <p className="eyebrow">琉球大学医学部ボードセイリング部</p>
            <div className="topbar-title-row">
              <div className="topbar-title-main">
                <h1>ボート運搬担当表</h1>
                <BoatBadge size={36} className="brand-badge topbar-badge" />
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="page-container">{children}</main>
      <nav className="bottom-nav">
        <Link href="/calendar">カレンダー</Link>
        <Link href="/reports">集計</Link>
        <Link href="/exports">CSV出力</Link>
      </nav>
    </div>
  );
}

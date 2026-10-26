import { Link } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import NotificationsBell from "@/components/NotificationsBell";

/** Topo das telas do casal. No computador o logo fica no menu lateral (classe .ca-logo-topo some). */
export default function DashboardHeader() {
  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{ background: "var(--ca-top-blur, rgba(255,255,255,.95))", borderColor: "var(--ca-line, hsl(var(--border)))" }}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-7">
        <Link to="/" className="ca-logo-topo text-[20px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "#1f1d1b" }}>
          casamenteiro<span style={{ color: "#d9905a" }}>.</span>
        </Link>
        <span className="flex-1" />
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

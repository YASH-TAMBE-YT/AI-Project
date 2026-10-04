import { Activity, BookOpen, Gauge, History, Info, Stethoscope } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Route } from "@/App";

const LINKS: { route: Route; label: string; icon: typeof Activity }[] = [
  { route: "diagnose", label: "Diagnose", icon: Stethoscope },
  { route: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { route: "dashboard", label: "Dashboard", icon: Gauge },
  { route: "history", label: "History", icon: History },
  { route: "about", label: "About", icon: Info },
];

export function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-3">
      <span className="pulse-ring relative flex h-9 w-9 items-center justify-center rounded-xl border border-pulse-400/40 bg-pulse-400/10">
        <Activity className="h-4.5 w-4.5 text-pulse-400" strokeWidth={2.4} />
      </span>
      <span className="display text-left leading-none">
        <span className="block text-[15px] font-bold tracking-wide text-mist-100">
          MediLogic <span className="text-pulse-400">X</span>
        </span>
        <span className="mono mt-1 block text-[8.5px] font-medium uppercase tracking-[0.24em] text-mist-500">
          Expert System
        </span>
      </span>
    </button>
  );
}

export default function Navbar({ route, navigate }: { route: Route; navigate: (r: Route) => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="glass-deep mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
        <Logo onClick={() => navigate("landing")} />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ route: r, label }) => (
            <button
              key={r}
              onClick={() => navigate(r)}
              className={cn("navlink rounded-lg px-3.5 py-2 text-[13px] font-medium", route === r && "active")}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => navigate("diagnose")}
          className="hidden items-center gap-2 rounded-xl bg-pulse-400/12 px-4 py-2 text-[13px] font-semibold text-pulse-300 ring-1 ring-pulse-400/30 transition-all hover:bg-pulse-400/20 hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.5)] sm:inline-flex"
        >
          Start Reasoning
        </button>
        {/* mobile nav */}
        <nav className="flex items-center gap-0.5 md:hidden">
          {LINKS.map(({ route: r, icon: Icon, label }) => (
            <button
              key={r}
              aria-label={label}
              onClick={() => navigate(r)}
              className={cn("navlink rounded-lg p-2.5", route === r && "active bg-white/6")}
            >
              <Icon className="h-4.5 w-4.5" />
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

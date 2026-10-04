import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import type { BackwardReport } from "@/engine/types";

/* ---------- labels & section headers ---------- */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mono text-[10px] font-semibold uppercase tracking-[0.28em] text-mist-500", className)}>
      {children}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

/* ---------- badges ---------- */
const verdictStyles: Record<BackwardReport["verdict"], string> = {
  verified: "text-vit-400 border-vit-400/40 bg-vit-400/10",
  partially_supported: "text-pulse-300 border-pulse-400/40 bg-pulse-400/10",
  insufficient_data: "text-mist-400 border-white/10 bg-white/5",
  weakened: "text-alert-400 border-alert-400/40 bg-alert-400/10",
};
const verdictText: Record<BackwardReport["verdict"], string> = {
  verified: "Verified",
  partially_supported: "Partially Supported",
  insufficient_data: "Insufficient Data",
  weakened: "Weakened",
};

export function VerdictBadge({ verdict }: { verdict: BackwardReport["verdict"] }) {
  return (
    <span className={cn("mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", verdictStyles[verdict])}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {verdictText[verdict]}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("mono inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-mist-300", className)}>
      {children}
    </span>
  );
}

/* ---------- score bar ---------- */
export function ScoreBar({ value, delay = 0, tone = "auto" }: { value: number; delay?: number; tone?: "auto" | "cyan" | "amber" | "rose" }) {
  const color =
    tone === "cyan" ? "from-cyan-500 to-teal-400"
    : tone === "amber" ? "from-amber-500 to-amber-400"
    : tone === "rose" ? "from-rose-500 to-rose-400"
    : value >= 66 ? "from-cyan-500 to-teal-400" : value >= 40 ? "from-indigo-500 to-cyan-400" : "from-slate-500 to-slate-400";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <motion.div
        className={cn("h-full rounded-full bg-linear-to-r", color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/* ---------- evidence list rows ---------- */
export function EvidenceRow({ tone, label, mono }: { tone: "ok" | "miss" | "contra" | "unmet"; label: string; mono?: string }) {
  const styles = {
    ok: "border-vit-400/25 bg-vit-400/6 text-mist-200",
    miss: "border-white/10 bg-white/4 text-mist-400",
    unmet: "border-slate-400/20 bg-slate-400/5 text-mist-500",
    contra: "border-crit-400/30 bg-crit-400/8 text-rose-200",
  }[tone];
  const iconStyles = {
    ok: "text-vit-400", miss: "text-mist-500", unmet: "text-mist-600", contra: "text-crit-400",
  }[tone];
  const icon = { ok: "✓", miss: "?", unmet: "–", contra: "✗" }[tone];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-sm", styles)}>
      <span className={cn("mono w-4 text-center font-bold", iconStyles)}>{icon}</span>
      <span className="flex-1">{label}</span>
      {mono && <span className="mono text-[10px] text-mist-500">{mono}</span>}
    </div>
  );
}

/* ---------- global disclaimer ---------- */
export function MedicalDisclaimer({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-alert-400/20 bg-alert-400/6 text-mist-300", compact ? "px-4 py-2.5 text-[11px]" : "px-5 py-4 text-xs leading-relaxed")}>
      <span className="font-semibold text-alert-400">Educational decision-support system. </span>
      Results are rule-based matches produced only by programmed knowledge and must not be considered a medical diagnosis.
      MediLogic X does not provide treatment or medication advice. {" "}
      <span className="text-mist-100 font-medium">If symptoms are severe, worsening, or concerning, seek professional medical attention.</span>
    </div>
  );
}

/* ---------- page transition wrapper ---------- */
export function PageTransition({ children, k }: { children: ReactNode; k: string }) {
  return (
    <motion.div
      key={k}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- buttons ---------- */
export function PrimaryButton({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 px-6 py-3 text-sm font-semibold text-ink-950 transition-all",
        "hover:shadow-[0_0_36px_-6px_rgba(34,211,238,0.65)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled, className, active }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 px-5 py-3 text-sm font-medium text-mist-200 transition-all hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40",
        active && "border-pulse-400/50 bg-pulse-400/10 text-pulse-300",
        className,
      )}
    >
      {children}
    </button>
  );
}

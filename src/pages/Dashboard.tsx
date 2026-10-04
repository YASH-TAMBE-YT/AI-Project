import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowLeftRight, BookOpen, BrainCircuit, CircleHelp,
  Gauge, GitBranch, Layers, Route as RouteIcon, ScanSearch, Sparkles, Target,
} from "lucide-react";
import type { Route } from "@/App";
import { CONDITIONS, RULES, SYMPTOMS } from "@/data/knowledgeBase";
import { loadActiveRules, loadHistory, loadMetrics } from "@/services/storage";
import { PageTransition, Panel, SectionLabel } from "@/components/ui";
import { cn } from "@/utils/cn";

export default function Dashboard({ navigate }: { navigate: (r: Route) => void }) {
  const m = loadMetrics();
  const history = loadHistory();
  const activeRules = loadActiveRules();
  const customCount = activeRules.length - RULES.filter((r) => activeRules.some((a) => a.id === r.id)).length;

  const avgSteps = m.inferenceRuns > 0 ? Math.round(m.totalReasoningSteps / m.inferenceRuns) : 0;

  const cards = [
    { label: "Total Rules", value: activeRules.length, icon: BookOpen, tone: "text-pulse-300", note: customCount > 0 ? `+${customCount} custom` : "seeded KB" },
    { label: "Conditions", value: CONDITIONS.length, icon: Target, tone: "text-iris-400", note: "deliberately limited scope" },
    { label: "Symptoms", value: SYMPTOMS.length, icon: Layers, tone: "text-vit-400", note: "tri-state evidence" },
    { label: "Inference Runs", value: m.inferenceRuns, icon: BrainCircuit, tone: "text-pulse-300", note: "full reasoning cycles" },
    { label: "Forward-Chain Runs", value: m.forwardRuns, icon: ScanSearch, tone: "text-pulse-300", note: "Mode A" },
    { label: "Backward-Chain Runs", value: m.backwardRuns, icon: GitBranch, tone: "text-iris-400", note: "Mode B" },
    { label: "Contradictions Found", value: m.contradictionsDetected, icon: AlertTriangle, tone: "text-alert-400", note: "never auto-resolved" },
    { label: "Questions Asked", value: m.questionsAsked, icon: CircleHelp, tone: "text-alert-400", note: "adaptive interview" },
    { label: "Avg Reasoning Steps", value: avgSteps, icon: RouteIcon, tone: "text-vit-400", note: "rule evaluations / cycle" },
  ];

  const topCounts = new Map<string, number>();
  for (const h of history) topCounts.set(h.topMatch, (topCounts.get(h.topMatch) ?? 0) + 1);
  const topList = [...topCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTop = Math.max(1, ...topList.map(([, v]) => v));

  const modeTotal = m.forwardRuns + m.backwardRuns;
  const fwdPct = modeTotal ? Math.round((100 * m.forwardRuns) / modeTotal) : 50;

  return (
    <PageTransition k="dashboard">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>System Metrics · Demo Telemetry</SectionLabel>
          <h1 className="display mt-2 text-3xl font-bold text-mist-100 sm:text-4xl">Engine Dashboard</h1>
          <p className="mt-2 max-w-xl text-[13px] text-mist-400">
            Operational metrics of the expert system itself — rules, runs and reasoning effort.
            These are demonstration metrics, not medical analytics.
          </p>
        </div>
        <Gauge className="h-6 w-6 text-pulse-400/60" />
      </div>

      {/* metric grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-2xl p-5"
          >
            <c.icon className={cn("h-4.5 w-4.5", c.tone)} />
            <p className="display mt-3 text-3xl font-bold text-mist-100">{c.value}</p>
            <p className="mt-1 text-[12px] font-medium text-mist-300">{c.label}</p>
            <p className="mono mt-0.5 text-[9px] uppercase tracking-widest text-mist-600">{c.note}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* mode split */}
        <Panel className="p-6">
          <SectionLabel>Reasoning Mode Split</SectionLabel>
          <div className="mt-4">
            <div className="flex h-3.5 overflow-hidden rounded-full bg-white/6">
              <motion.div className="h-full bg-linear-to-r from-cyan-500 to-teal-400" initial={{ width: 0 }} animate={{ width: `${fwdPct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
              <motion.div className="h-full bg-linear-to-r from-indigo-500 to-iris-400" initial={{ width: 0 }} animate={{ width: `${100 - fwdPct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <div className="mt-3 flex justify-between text-[12px]">
              <span className="flex items-center gap-2 text-mist-300"><span className="h-2 w-2 rounded-full bg-pulse-400" /> Forward discovery · {m.forwardRuns}</span>
              <span className="flex items-center gap-2 text-mist-300"><span className="h-2 w-2 rounded-full bg-iris-400" /> Backward verification · {m.backwardRuns}</span>
            </div>
          </div>

          <SectionLabel className="mt-7">Most Frequent Top Matches</SectionLabel>
          <div className="mt-3 space-y-2.5">
            {topList.length === 0 && <p className="text-xs text-mist-500">No sessions recorded yet — run the demo scenario.</p>}
            {topList.map(([label, count]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-36 truncate text-[12px] text-mist-300">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
                  <motion.div className="h-full rounded-full bg-linear-to-r from-cyan-500 to-teal-400" initial={{ width: 0 }} animate={{ width: `${(100 * count) / maxTop}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                </div>
                <span className="mono w-6 text-right text-[11px] text-mist-400">{count}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* architecture card */}
        <Panel className="relative overflow-hidden p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-pulse-400/6 blur-3xl" />
          <SectionLabel>Architecture</SectionLabel>
          <div className="mono mt-4 space-y-1 text-[11px] leading-relaxed">
            {[
              ["React UI", "presentation only — no diagnosis logic"],
              ["REST API", "POST /api/diagnosis/forward · backward"],
              ["FastAPI", "request validation + orchestration"],
              ["Inference Engine", "forward · backward · arena · NBQ · contradictions"],
              ["Knowledge Base", "46 production rules · AND/OR/NOT operators"],
              ["SQLite", "rules · symptoms · conditions · session history"],
            ].map(([k, v], i) => (
              <div key={k} className="flex items-center gap-3">
                <span className={cn("rounded-md border px-2 py-1 font-semibold", i === 0 ? "border-iris-400/30 bg-iris-400/10 text-iris-400" : i === 3 ? "border-pulse-400/30 bg-pulse-400/10 text-pulse-300" : "border-white/10 bg-white/4 text-mist-300")}>{k}</span>
                <span className="text-mist-500">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => navigate("diagnose")} className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-ink-950 transition hover:shadow-[0_0_28px_-4px_rgba(34,211,238,0.6)]">
              <Activity className="h-3.5 w-3.5" /> Run a Session
            </button>
            <button onClick={() => navigate("about")} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-semibold text-mist-200 transition hover:bg-white/10">
              <Sparkles className="h-3.5 w-3.5" /> Method & Algorithms
            </button>
            <button onClick={() => navigate("history")} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-semibold text-mist-200 transition hover:bg-white/10">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Session History
            </button>
          </div>
        </Panel>
      </div>
    </PageTransition>
  );
}

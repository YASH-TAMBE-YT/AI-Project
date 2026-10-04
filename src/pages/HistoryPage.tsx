import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, GitBranch, History, ScanSearch, Trash2 } from "lucide-react";
import type { Route } from "@/App";
import { clearHistory, loadHistory, saveHistory } from "@/services/storage";
import { Badge, GhostButton, PageTransition, Panel, SectionLabel, VerdictBadge } from "@/components/ui";
import { cn } from "@/utils/cn";
import type { BackwardReport } from "@/engine/types";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage({ navigate }: { navigate: (r: Route) => void }) {
  const [entries, setEntries] = useState(() => loadHistory());
  const [confirm, setConfirm] = useState(false);

  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveHistory(next);
  };

  return (
    <PageTransition k="history">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Local Session Log</SectionLabel>
          <h1 className="display mt-2 text-3xl font-bold text-mist-100 sm:text-4xl">Diagnosis History</h1>
          <p className="mt-2 max-w-xl text-[13px] text-mist-400">
            Previous reasoning sessions stored locally on this device. No names or sensitive
            medical details are recorded — only reasoning outcomes.
          </p>
        </div>
        {entries.length > 0 && (
          confirm ? (
            <div className="flex items-center gap-2 rounded-xl border border-alert-400/30 bg-alert-400/8 p-1.5 pl-3">
              <span className="text-xs text-alert-300">Delete all sessions?</span>
              <button onClick={() => { clearHistory(); setEntries([]); setConfirm(false); }} className="rounded-lg bg-alert-400/20 px-3 py-1.5 text-xs font-bold text-alert-300">Confirm</button>
              <button onClick={() => setConfirm(false)} className="rounded-lg px-2 py-1.5 text-xs text-mist-400">Cancel</button>
            </div>
          ) : (
            <GhostButton onClick={() => setConfirm(true)} className="py-2.5 text-xs"><Trash2 className="h-3.5 w-3.5" /> Clear History</GhostButton>
          )
        )}
      </div>

      {entries.length === 0 ? (
        <Panel className="mt-10 p-14 text-center">
          <History className="mx-auto h-8 w-8 text-mist-600" />
          <p className="display mt-4 text-lg font-semibold text-mist-200">No sessions yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-mist-400">Run the guided demo or start a consultation — each completed reasoning cycle is logged here.</p>
          <button onClick={() => navigate("diagnose")} className="mt-6 rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 px-6 py-3 text-sm font-bold text-ink-950 transition hover:shadow-[0_0_34px_-6px_rgba(34,211,238,0.65)]">
            Start Diagnosis
          </button>
        </Panel>
      ) : (
        <div className="mt-8 space-y-3">
          {entries.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="glass group rounded-2xl px-5 py-4"
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", e.mode === "forward" ? "border-pulse-400/30 bg-pulse-400/10" : "border-iris-400/30 bg-iris-400/10")}>
                  {e.mode === "forward" ? <ScanSearch className="h-4.5 w-4.5 text-pulse-300" /> : <GitBranch className="h-4.5 w-4.5 text-iris-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="display text-[15px] font-bold text-mist-100">
                      {e.mode === "forward" ? "Top match: " : "Hypothesis: "}{e.topMatch}
                    </p>
                    <VerdictBadge verdict={e.verdict as BackwardReport["verdict"]} />
                    {e.demo && <Badge className="border-vit-400/30 bg-vit-400/8 text-vit-400"><FlaskConical className="mr-1 h-3 w-3" /> demo</Badge>}
                  </div>
                  <p className="mono mt-1.5 text-[10.5px] uppercase tracking-wider text-mist-500">
                    {fmtDate(e.date)} · {e.mode === "forward" ? "Forward Chaining" : "Backward Chaining"} · match {e.scoreText}
                  </p>
                </div>
                <div className="hidden items-center gap-4 sm:flex">
                  <div className="text-center">
                    <p className="display text-lg font-bold text-mist-100">{e.factsKnown}</p>
                    <p className="mono text-[8.5px] uppercase tracking-widest text-mist-600">facts</p>
                  </div>
                  <div className="text-center">
                    <p className="display text-lg font-bold text-mist-100">{e.questionsAsked}</p>
                    <p className="mono text-[8.5px] uppercase tracking-widest text-mist-600">questions</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("display text-lg font-bold", e.contradictions > 0 ? "text-alert-400" : "text-mist-100")}>{e.contradictions}</p>
                    <p className="mono text-[8.5px] uppercase tracking-widest text-mist-600">conflicts</p>
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="rounded-lg border border-white/10 bg-white/4 p-2 text-mist-500 opacity-0 transition hover:border-crit-400/40 hover:text-rose-300 group-hover:opacity-100" title="Remove entry">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {(e.ageBand || e.gender) && (
                <p className="mono mt-2 pl-15 text-[9.5px] uppercase tracking-widest text-mist-600">
                  cohort: {e.ageBand ?? "age n/a"}{e.gender ? ` · ${e.gender}` : ""}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}

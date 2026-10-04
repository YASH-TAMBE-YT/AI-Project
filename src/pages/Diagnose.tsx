import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Beaker, Check, FlaskConical, Minus, Play, ScanSearch,
  Search, Sparkles, Target, User, X,
} from "lucide-react";
import type { Route } from "@/App";
import type { SymptomState } from "@/engine/types";
import { CONDITIONS, DEMO_FACTS, EMPTY_FACTS, SYMPTOMS, conditionLabel } from "@/data/knowledgeBase";
import { useConsultation } from "@/hooks/useConsultation";
import ResultsView, { ThinkingOverlay } from "@/components/ResultsView";
import { GhostButton, MedicalDisclaimer, PageTransition, Panel, PrimaryButton, SectionLabel } from "@/components/ui";
import { loadHistory, saveHistory } from "@/services/storage";
import { cn } from "@/utils/cn";

/* ---------------- tri-state chip ---------------- */

const STATE_META: Record<SymptomState, { label: string; icon: typeof Check }> = {
  present: { label: "YES", icon: Check },
  absent: { label: "NO", icon: X },
  unknown: { label: "?", icon: Minus },
};

function SymptomChip({ id, label, state, onChange, serious }: { id: string; label: string; state: SymptomState; onChange: (v: SymptomState) => void; serious?: boolean }) {
  const next: SymptomState = state === "unknown" ? "present" : state === "present" ? "absent" : "unknown";
  const Icon = STATE_META[state].icon;
  return (
    <button
      onClick={() => onChange(next)}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-all duration-200",
        state === "present" && "chip-present",
        state === "absent" && "chip-absent",
        state === "unknown" && "chip-unknown hover:border-white/20 hover:text-mist-200",
      )}
      title={`${label} — currently ${state.toUpperCase()}. Click to cycle: Unknown → Present → Absent.`}
    >
      <span className={cn(
        "mono flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
        state === "present" && "bg-vit-400/20 text-vit-400",
        state === "absent" && "bg-crit-400/15 text-rose-300",
        state === "unknown" && "bg-white/6 text-mist-500",
      )}>
        <Icon className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="flex-1">{label}</span>
      {serious && <span className="h-1.5 w-1.5 rounded-full bg-alert-400/70" title="Potentially serious symptom" />}
      <span className="mono text-[9px] uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-60">{id}</span>
    </button>
  );
}

/* ---------------- step indicator ---------------- */

function Steps({ stage }: { stage: string }) {
  const steps = ["Patient", "Symptoms", "Reasoning"];
  const idx = stage === "intake" ? 0 : stage === "symptoms" ? 1 : 2;
  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className={cn(
            "mono flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold transition-colors",
            i < idx && "bg-vit-400/15 text-vit-400",
            i === idx && "bg-pulse-400/15 text-pulse-300 ring-1 ring-pulse-400/40",
            i > idx && "bg-white/4 text-mist-600",
          )}>
            {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={cn("text-[12px] font-medium", i === idx ? "text-mist-100" : "text-mist-500")}>{s}</span>
          {i < steps.length - 1 && <div className="mx-1 h-px w-8 bg-white/10 sm:w-14" />}
        </div>
      ))}
    </div>
  );
}

/* ================= page ================= */

export default function Diagnose({ navigate }: { navigate: (r: Route) => void }) {
  const api = useConsultation();
  const { state } = api;
  const [search, setSearch] = useState("");
  const [focusPick, setFocusPick] = useState(CONDITIONS[1].id);
  const savedSigRef = useRef<string>("");

  const knownCount = useMemo(
    () => Object.values(state.facts).filter((v) => v !== "unknown").length,
    [state.facts],
  );
  const presentCount = useMemo(
    () => Object.values(state.facts).filter((v) => v === "present").length,
    [state.facts],
  );

  // persist completed (non-simulated) sessions to history
  useEffect(() => {
    if (!state.result || state.stage !== "results") return;
    const top = state.result.hypotheses[0];
    if (!top) return;
    const sig = `${state.result.stats.factsKnown}-${top.condition}-${top.score}-${state.questionsAnswered}`;
    if (savedSigRef.current === sig) return;
    savedSigRef.current = sig;
    const ageNum = parseInt(state.patient.age, 10);
    const ageBand = isNaN(ageNum) ? undefined : ageNum <= 17 ? "0–17" : ageNum <= 30 ? "18–30" : ageNum <= 45 ? "31–45" : ageNum <= 60 ? "46–60" : "60+";
    const entries = loadHistory();
    entries.unshift({
      id: `s-${Date.now()}`,
      date: new Date().toISOString(),
      mode: state.mode,
      topMatch: top.label,
      scoreText: top.ruleMatchFraction,
      verdict: top.verdict,
      factsKnown: state.result.stats.factsKnown,
      questionsAsked: state.questionsAnswered,
      contradictions: state.result.contradictions.length,
      ageBand,
      gender: state.patient.gender || undefined,
    });
    saveHistory(entries);
  }, [state.result, state.stage, state.mode, state.questionsAnswered, state.patient]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = SYMPTOMS.filter((s) => !q || s.label.toLowerCase().includes(q) || s.id.includes(q));
    const map = new Map<string, typeof list>();
    for (const s of list) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return [...map.entries()];
  }, [search]);

  return (
    <PageTransition k="diagnose">
      <Steps stage={state.stage} />

      <AnimatePresence mode="wait">
        {/* ============ STEP 1 — intake ============ */}
        {state.stage === "intake" && (
          <motion.div key="intake" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              <Panel className="p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-pulse-400/30 bg-pulse-400/10">
                    <User className="h-4.5 w-4.5 text-pulse-300" />
                  </span>
                  <div>
                    <h2 className="display text-xl font-bold text-mist-100">Patient Information</h2>
                    <p className="text-[12px] text-mist-500">Minimum detail required — nothing personal is stored.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <SectionLabel className="mb-2">Age</SectionLabel>
                    <input
                      value={state.patient.age}
                      onChange={(e) => api.setPatient({ age: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })}
                      placeholder="e.g. 24"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-white/12 bg-ink-800 px-4 py-2.5 text-sm text-mist-100 outline-none transition focus:border-pulse-400/50"
                    />
                  </div>
                  <div>
                    <SectionLabel className="mb-2">Gender</SectionLabel>
                    <select
                      value={state.patient.gender}
                      onChange={(e) => api.setPatient({ gender: e.target.value })}
                      className="w-full rounded-xl border border-white/12 bg-ink-800 px-4 py-2.5 text-sm text-mist-100 outline-none transition focus:border-pulse-400/50"
                    >
                      <option value="">Select…</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                      <option value="na">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <SectionLabel className="mb-2">Identifier (optional)</SectionLabel>
                    <input
                      value={state.patient.identifier}
                      onChange={(e) => api.setPatient({ identifier: e.target.value.slice(0, 24) })}
                      placeholder="Case label"
                      className="w-full rounded-xl border border-white/12 bg-ink-800 px-4 py-2.5 text-sm text-mist-100 outline-none transition focus:border-pulse-400/50"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <SectionLabel className="mb-3">Reasoning Mode</SectionLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => api.toSymptoms("forward", null)}
                      className="group rounded-2xl border border-pulse-400/25 bg-pulse-400/6 p-5 text-left transition-all hover:border-pulse-400/50 hover:shadow-[0_0_30px_-8px_rgba(34,211,238,0.5)]"
                    >
                      <ScanSearch className="h-5 w-5 text-pulse-300" />
                      <p className="display mt-3 text-[14px] font-bold text-mist-100">Mode A — Forward Diagnosis</p>
                      <p className="mt-1.5 text-[12px] italic leading-relaxed text-mist-400">“What conditions could explain these symptoms?”</p>
                      <p className="mono mt-3 text-[9px] uppercase tracking-widest text-pulse-300/70">Facts → rules → hypotheses</p>
                    </button>
                    <div className={cn("rounded-2xl border border-iris-400/25 bg-iris-400/6 p-5 text-left transition-all hover:border-iris-400/50")}>
                      <Target className="h-5 w-5 text-iris-400" />
                      <p className="display mt-3 text-[14px] font-bold text-mist-100">Mode B — Backward Verification</p>
                      <p className="mt-1.5 text-[12px] italic leading-relaxed text-mist-400">“Could this condition explain my symptoms?”</p>
                      <div className="mt-3 flex gap-2">
                        <select
                          value={focusPick}
                          onChange={(e) => setFocusPick(e.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-ink-800 px-3 py-2 text-xs text-mist-100 outline-none focus:border-iris-400/50"
                        >
                          {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <button onClick={() => api.toSymptoms("backward", focusPick)} className="rounded-lg bg-iris-400/20 px-3 py-2 text-iris-300 transition hover:bg-iris-400/30">
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              <div className="space-y-5">
                <Panel className="border-vit-400/20 p-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-vit-400" />
                    <div>
                      <h3 className="display text-[15px] font-bold text-mist-100">Guided Demo Scenario</h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist-400">
                        Loads the reference case: fever, cough, sore throat and fatigue present; runny nose and itchy eyes absent;
                        body ache unknown. Watch forward chaining rank <span className="text-mist-200">Influenza</span>, then the engine ask
                        <span className="text-mist-200"> “Are you experiencing body ache?”</span>
                      </p>
                      <GhostButton
                        className="mt-4 w-full border-vit-400/30 text-vit-400 hover:bg-vit-400/10"
                        onClick={() => { api.setFacts({ ...DEMO_FACTS }); api.toSymptoms("forward", null); }}
                      >
                        <Beaker className="h-4 w-4" /> Load Demo Patient
                      </GhostButton>
                    </div>
                  </div>
                </Panel>
                <MedicalDisclaimer compact />
                <Panel className="p-5">
                  <SectionLabel className="mb-2">How Evidence Works</SectionLabel>
                  <ul className="space-y-2 text-[12.5px] leading-relaxed text-mist-400">
                    <li className="flex gap-2.5"><span className="mono mt-0.5 text-vit-400">✓ PRESENT</span> confirms a fact for the engine.</li>
                    <li className="flex gap-2.5"><span className="mono mt-0.5 text-rose-300">✗ ABSENT</span> actively contradicts rules that require it.</li>
                    <li className="flex gap-2.5"><span className="mono mt-0.5 text-mist-500">? UNKNOWN</span> is never assumed absent — it becomes a candidate for the Next Best Question.</li>
                  </ul>
                </Panel>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ STEP 2 — symptoms ============ */}
        {state.stage === "symptoms" && (
          <motion.div key="symptoms" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <Panel className="p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="display text-xl font-bold text-mist-100">
                    {state.mode === "forward" ? "What are you experiencing?" : "Evidence for verification"}
                  </h2>
                  <p className="mt-1 text-[12.5px] text-mist-500">
                    Click a symptom to cycle <span className="mono text-vit-400">PRESENT</span> → <span className="mono text-rose-300">ABSENT</span> → <span className="mono">UNKNOWN</span>. Leave anything unsure as unknown.
                  </p>
                  {state.mode === "backward" && state.focusHypothesis && (
                    <p className="mono mt-2 text-[11px] uppercase tracking-widest text-iris-400">
                      Target hypothesis: {conditionLabel(state.focusHypothesis)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter symptoms…"
                      className="w-48 rounded-xl border border-white/12 bg-ink-800 py-2.5 pl-9 pr-3 text-sm text-mist-100 outline-none focus:border-pulse-400/50"
                    />
                  </div>
                  <button onClick={() => api.setFacts({ ...EMPTY_FACTS })} className="mono rounded-xl border border-white/10 bg-white/4 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-mist-400 transition hover:bg-white/8">
                    Reset all
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {grouped.map(([cat, list]) => (
                  <div key={cat}>
                    <SectionLabel className="mb-2.5">{cat}</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {list.map((s) => (
                        <SymptomChip key={s.id} id={s.id} label={s.label} serious={s.seriousFlag} state={state.facts[s.id] ?? "unknown"} onChange={(v) => api.setFact(s.id, v)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-6">
                <div className="mono text-[11px] uppercase tracking-wider text-mist-500">
                  {presentCount} present · {knownCount - presentCount} absent · {SYMPTOMS.length - knownCount} unknown
                </div>
                <div className="flex gap-3">
                  <GhostButton onClick={api.backToIntake}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </GhostButton>
                  <PrimaryButton disabled={presentCount === 0} onClick={() => void api.reason()}>
                    <Play className="h-4 w-4" /> Run Inference Engine
                  </PrimaryButton>
                </div>
              </div>
              {presentCount === 0 && (
                <p className="mono mt-3 text-right text-[10px] uppercase tracking-wider text-mist-600">
                  Mark at least one symptom PRESENT to run forward chaining
                </p>
              )}
            </Panel>
          </motion.div>
        )}

        {/* ============ STEP 3 — results ============ */}
        {state.stage === "results" && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div className="mb-5 flex items-center justify-between">
              <GhostButton onClick={() => api.restart()} className="px-4 py-2.5 text-xs">
                <ArrowLeft className="h-4 w-4" /> New Consultation
              </GhostButton>
              <GhostButton onClick={() => navigate("about")} className="px-4 py-2.5 text-xs">
                <FlaskConical className="h-4 w-4" /> Explain the Method
              </GhostButton>
            </div>
            {state.running && !state.result && <ThinkingOverlay />}
            {state.result && (
              <ResultsView
                result={state.result}
                facts={state.facts}
                running={state.running}
                questionsAnswered={state.questionsAnswered}
                mode={state.mode}
                focusHypothesis={state.focusHypothesis}
                onAnswer={(sym, v) => void api.answerQuestion(sym, v)}
                onReRunAll={() => void api.reason()}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

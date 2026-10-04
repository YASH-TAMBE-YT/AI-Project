import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Beaker, BrainCircuit, Check, ChevronDown, CircleHelp,
  FlaskConical, GitBranch, HelpCircle, ListTree, Network, RotateCcw, Target, X,
} from "lucide-react";
import type {
  Contradiction, EngineResponse, FactBase, Hypothesis, PipelineEvent, ProofNode, SymptomState,
} from "@/engine/types";
import { CONDITIONS, SYMPTOMS, conditionLabel, symptomLabel } from "@/data/knowledgeBase";
import { requestInference } from "@/services/api";
import ReasoningGraphView, { GraphEmpty } from "./ReasoningGraph";
import { Badge, EvidenceRow, MedicalDisclaimer, Panel, ScoreBar, SectionLabel, VerdictBadge } from "./ui";
import { cn } from "@/utils/cn";

/* ================= pipeline running overlay ================= */

const RUN_STAGES = ["FACTS", "RULE MATCHING", "RULES FIRED", "HYPOTHESES", "BACKWARD VERIFICATION", "QUESTION SELECTION"];

export function ThinkingOverlay({ label }: { label?: string }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(RUN_STAGES.length - 1, s + 1)), 240);
    return () => clearInterval(t);
  }, []);
  return (
    <Panel className="relative overflow-hidden p-8">
      <div className="scanline absolute left-0 h-16 w-full bg-linear-to-b from-transparent via-pulse-400/8 to-transparent" />
      <div className="flex flex-col items-center gap-5">
        <span className="pulse-ring relative flex h-14 w-14 items-center justify-center rounded-2xl border border-pulse-400/40 bg-pulse-400/10">
          <BrainCircuit className="h-6 w-6 text-pulse-300" />
        </span>
        <p className="display text-sm font-semibold text-mist-100">{label ?? "Inference engine reasoning…"}</p>
        <div className="mono flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] tracking-wider">
          {RUN_STAGES.map((s, i) => (
            <span key={s} className={cn("transition-colors duration-300", i < stage ? "text-vit-400" : i === stage ? "text-pulse-300" : "text-mist-600")}>
              {i < stage ? "✓ " : ""}{s}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ================= contradiction alerts ================= */

function ContradictionAlerts({ items }: { items: Contradiction[] }) {
  if (items.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
      {items.map((c) => (
        <div key={c.id} className="rounded-xl border border-alert-400/30 bg-alert-400/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-alert-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-alert-300">
                Contradictory Evidence Detected
                <span className="mono ml-2 text-[9px] font-normal uppercase tracking-widest text-mist-500">{c.type.replace(/_/g, " ")}</span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-mist-300">{c.detail}</p>
              <div className="mono mt-2.5 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-md border border-vit-400/30 bg-vit-400/8 px-2 py-1 text-vit-400">✓ {c.evidenceFor}</span>
                <span className="rounded-md border border-crit-400/30 bg-crit-400/8 px-2 py-1 text-rose-300">✗ {c.evidenceAgainst}</span>
              </div>
              <p className="mono mt-2 text-[10px] uppercase tracking-wider text-mist-500">Not auto-resolved — please verify this evidence.</p>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ================= proof tree (backward chaining) ================= */

function ProofNodeRow({ node, depth }: { node: ProofNode; depth: number }) {
  const icon =
    node.status === "satisfied" ? <Check className="h-3.5 w-3.5 text-vit-400" />
    : node.status === "failed" ? <X className="h-3.5 w-3.5 text-crit-400" />
    : <HelpCircle className="h-3.5 w-3.5 text-mist-500" />;
  const textTone =
    node.status === "satisfied" ? "text-mist-200"
    : node.status === "failed" ? "text-rose-300/80"
    : "text-mist-400";

  return (
    <div>
      <div className={cn("flex items-start gap-2.5 border-l py-1.5 pl-3", depth === 0 ? "border-transparent" : "border-white/8")} style={{ marginLeft: depth === 0 ? 0 : 14 }}>
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className={cn("text-[12.5px] leading-snug", textTone)}>
            {node.kind === "rule" && <span className="mono mr-1.5 rounded bg-white/6 px-1.5 py-0.5 text-[9.5px] font-bold text-pulse-300">{node.ruleId}</span>}
            {node.kind === "condition" && <span className="mono mr-1.5 rounded bg-iris-400/15 px-1.5 py-0.5 text-[9.5px] font-bold text-iris-400">GOAL</span>}
            {node.detail ?? node.goal}
          </p>
        </div>
      </div>
      {node.children.map((c, i) => <ProofNodeRow key={`${c.goal}-${i}`} node={c} depth={depth + 1} />)}
    </div>
  );
}

/* ================= hypothesis card ================= */

function HypothesisCard({ h, expanded, onToggle, i }: { h: Hypothesis; expanded: boolean; onToggle: () => void; i: number }) {
  const isTop = h.rank === 1;
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass overflow-hidden rounded-2xl transition-colors",
        isTop && "border-pulse-400/30 shadow-[0_0_44px_-14px_rgba(34,211,238,0.45)]",
      )}
    >
      <button onClick={onToggle} className="w-full px-5 py-4 text-left">
        <div className="flex items-center gap-4">
          <span className={cn(
            "display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            isTop ? "bg-pulse-400/15 text-pulse-300 ring-1 ring-pulse-400/40" : "bg-white/5 text-mist-400 ring-1 ring-white/10",
          )}>
            {h.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="display text-[15px] font-bold text-mist-100">{h.label}</h3>
              <VerdictBadge verdict={h.verdict} />
              {h.contradicting.length > 0 && <Badge className="border-crit-400/35 bg-crit-400/10 text-rose-300">{h.contradicting.length} contradiction{h.contradicting.length > 1 ? "s" : ""}</Badge>}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <ScoreBar value={h.score} delay={i * 0.1} />
              <span className="mono shrink-0 text-[11px] font-semibold text-mist-300">{h.ruleMatchFraction}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="mono text-[9px] uppercase tracking-widest text-mist-500">Rule Match</span>
            <span className={cn("display text-xl font-bold", isTop ? "text-pulse-300" : "text-mist-200")}>{h.score}</span>
            <ChevronDown className={cn("h-4 w-4 text-mist-500 transition-transform", expanded && "rotate-180")} />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-t border-white/8 px-5 py-5">
              <p className="mb-4 text-[13px] leading-relaxed text-mist-300">{h.explanation.plainSummary}</p>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <SectionLabel className="text-vit-400/80">Supporting Evidence</SectionLabel>
                  {h.explanation.supportingEvidence.length === 0 && <p className="text-xs text-mist-500">None yet.</p>}
                  {h.explanation.supportingEvidence.map((e) => (
                    <EvidenceRow key={e.fact} tone="ok" label={symptomLabel(e.fact)} mono={`via ${e.via}`} />
                  ))}
                  {h.explanation.missingEvidence.length > 0 && (
                    <>
                      <SectionLabel className="pt-2 text-mist-500">Missing Information</SectionLabel>
                      {h.explanation.missingEvidence.map((e) => (
                        <EvidenceRow key={e.fact} tone="miss" label={symptomLabel(e.fact)} mono={e.asked ? "asked" : "not asked"} />
                      ))}
                    </>
                  )}
                  {h.unmet.length > 0 && (
                    <>
                      <SectionLabel className="pt-2 text-mist-500">Expected but Absent</SectionLabel>
                      {h.unmet.map((u) => <EvidenceRow key={u} tone="unmet" label={symptomLabel(u)} />)}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <SectionLabel className={h.explanation.contradictoryEvidence.length ? "text-crit-400/90" : "text-mist-500"}>
                    Contradictory Evidence
                  </SectionLabel>
                  {h.explanation.contradictoryEvidence.length === 0
                    ? <EvidenceRow tone="ok" label="None detected" />
                    : h.explanation.contradictoryEvidence.map((e) => (
                        <div key={e.fact}>
                          <EvidenceRow tone="contra" label={symptomLabel(e.fact)} />
                          <p className="mt-1 pl-7 text-[11px] leading-relaxed text-mist-500">{e.reason}</p>
                        </div>
                      ))}
                  <SectionLabel className="pt-2 text-pulse-300/80">Fired Rules</SectionLabel>
                  <div className="space-y-1.5">
                    {h.explanation.firedRuleNarratives.length === 0 && <p className="text-xs text-mist-500">No rules fully fired yet.</p>}
                    {h.explanation.firedRuleNarratives.map((n) => (
                      <p key={n} className="mono rounded-lg border border-pulse-400/15 bg-pulse-400/5 px-3 py-2 text-[10.5px] leading-relaxed text-mist-300">{n}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* backward proof tree */}
              <div className="mt-5 rounded-xl border border-white/8 bg-ink-900/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ListTree className="h-4 w-4 text-iris-400" />
                  <SectionLabel>Backward-Chaining Proof Tree</SectionLabel>
                </div>
                <ProofTreeFor conditionId={h.condition} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// tiny context-free lookup: proof trees live on the last engine response
let LAST_RESPONSE: EngineResponse | null = null;
function ProofTreeFor({ conditionId }: { conditionId: string }) {
  const tree = LAST_RESPONSE?.backwardReports.find((r) => r.hypothesis === conditionId)?.proofTree;
  if (!tree) return <p className="text-xs text-mist-500">Proof tree unavailable.</p>;
  return <ProofNodeRow node={tree} depth={0} />;
}

/* ================= next best question ================= */

function NextBestQuestionCard({ result, onAnswer, disabled }: {
  result: EngineResponse;
  onAnswer: (symptom: string, v: SymptomState) => void;
  disabled: boolean;
}) {
  const q = result.nextBestQuestion;
  if (!q || result.hypotheses.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <Panel className="relative overflow-hidden border-alert-400/25 p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-alert-400/8 blur-3xl" />
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-alert-400/35 bg-alert-400/10">
            <CircleHelp className="h-5 w-5 text-alert-400" />
          </span>
          <div className="flex-1">
            <SectionLabel className="text-alert-400/90">Next Best Question · Discrimination Power {q.discriminationPower}</SectionLabel>
            <h3 className="display mt-2 text-xl font-bold text-mist-100 sm:text-2xl">{q.question}</h3>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {(["present", "absent", "unknown"] as SymptomState[]).map((v) => (
                <button
                  key={v}
                  disabled={disabled}
                  onClick={() => onAnswer(q.symptom, v)}
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-sm font-bold tracking-wide transition-all disabled:opacity-40",
                    v === "present" && "bg-vit-400/15 text-vit-400 ring-1 ring-vit-400/45 hover:bg-vit-400/25 hover:shadow-[0_0_22px_-4px_rgba(45,212,191,0.5)]",
                    v === "absent" && "bg-crit-400/10 text-rose-300 ring-1 ring-crit-400/40 hover:bg-crit-400/20",
                    v === "unknown" && "bg-white/5 text-mist-300 ring-1 ring-white/15 hover:bg-white/10",
                  )}
                >
                  {v === "present" ? "YES" : v === "absent" ? "NO" : "NOT SURE"}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-mist-400">{q.whyThisQuestion}</p>
            {q.impacts.length > 0 && (
              <div className="mono mt-3 grid gap-1.5 text-[10.5px] sm:grid-cols-2">
                {q.impacts.map((im) => (
                  <div key={im.condition} className="flex items-center gap-2 rounded-lg border border-white/8 bg-ink-900/60 px-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-mist-300">{im.label}</span>
                    <span className="text-mist-500">{im.current}</span>
                    <ArrowRight className="h-3 w-3 text-mist-600" />
                    <span className="text-vit-400">{im.ifYes} Y</span>
                    <span className="text-mist-600">/</span>
                    <span className="text-rose-300">{im.ifNo} N</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}

/* ================= what-if simulator ================= */

function WhatIfPanel({ facts }: { facts: FactBase }) {
  const [overlay, setOverlay] = useState<FactBase>({});
  const [simResult, setSimResult] = useState<EngineResponse | null>(null);
  const [baseResult, setBaseResult] = useState<EngineResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [picked, setPicked] = useState(SYMPTOMS[0].id);

  const hasOverlay = Object.keys(overlay).length > 0;

  const runSimulation = async (ov: FactBase) => {
    setRunning(true);
    const [base, sim] = await Promise.all([
      requestInference({ facts }, { askedIds: new Set() }),
      requestInference({ facts, simulation: ov }, { askedIds: new Set() }),
    ]);
    setBaseResult(base);
    setSimResult(sim);
    setRunning(false);
  };

  const applyState = (id: string, v: SymptomState) => {
    const next = { ...overlay, [id]: v };
    if (v === "unknown") delete next[id];
    setOverlay(next);
    void runSimulation(next);
  };

  const pairs = useMemo(() => {
    if (!baseResult || !simResult) return [];
    const map = new Map<string, { id: string; label: string; before: number; after: number }>();
    for (const h of baseResult.hypotheses) map.set(h.condition, { id: h.condition, label: h.label, before: h.score, after: 0 });
    for (const h of simResult.hypotheses) {
      const row = map.get(h.condition);
      if (row) row.after = h.score; else map.set(h.condition, { id: h.condition, label: h.label, before: 0, after: h.score });
    }
    return [...map.values()].sort((a, b) => Math.max(b.before, b.after) - Math.max(a.before, a.after)).slice(0, 6);
  }, [baseResult, simResult]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44 flex-1">
          <SectionLabel className="mb-2">Symptom</SectionLabel>
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="w-full rounded-xl border border-white/12 bg-ink-800 px-4 py-2.5 text-sm text-mist-100 outline-none focus:border-pulse-400/50"
          >
            {SYMPTOMS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {(["present", "absent"] as const).map((v) => (
            <button
              key={v}
              onClick={() => applyState(picked, v)}
              className={cn(
                "rounded-xl px-5 py-2.5 text-xs font-bold ring-1 transition-all",
                v === "present" ? "bg-vit-400/12 text-vit-400 ring-vit-400/40 hover:bg-vit-400/22" : "bg-crit-400/10 text-rose-300 ring-crit-400/35 hover:bg-crit-400/20",
              )}
            >
              Simulate {v === "present" ? "YES" : "NO"}
            </button>
          ))}
        </div>
        {hasOverlay && (
          <button onClick={() => { setOverlay({}); setSimResult(null); setBaseResult(null); }} className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-semibold text-mist-300 transition hover:bg-white/10">
            <RotateCcw className="h-3.5 w-3.5" /> Revert
          </button>
        )}
      </div>

      {hasOverlay && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(overlay).map(([id, v]) => (
            <span key={id} className="mono inline-flex items-center gap-2 rounded-full border border-pulse-400/30 bg-pulse-400/8 px-3 py-1.5 text-[10px] font-semibold text-pulse-300">
              SIM · {symptomLabel(id)} = {String(v).toUpperCase()}
              <button onClick={() => applyState(id, "unknown")} className="text-mist-400 hover:text-mist-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {!hasOverlay && (
        <p className="text-[13px] text-mist-500">
          Choose a symptom and simulate an answer. This is a <span className="text-mist-300">rule simulation</span> — recorded patient evidence is never modified, and simulated outputs are not predictions.
        </p>
      )}

      <AnimatePresence>
        {simResult && baseResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-white/8 bg-ink-900/50 p-4">
            <div className="grid grid-cols-[1fr_72px_72px] items-center gap-2 pb-2">
              <SectionLabel>Rule Match Score</SectionLabel>
              <SectionLabel className="text-center">Before</SectionLabel>
              <SectionLabel className="text-center text-pulse-300">After</SectionLabel>
            </div>
            <div className="space-y-2">
              {pairs.map((p) => (
                <div key={p.id} className="grid grid-cols-[1fr_72px_72px] items-center gap-2">
                  <span className="truncate text-[13px] text-mist-200">{p.label}</span>
                  <span className="mono text-center text-sm text-mist-400">{p.before}</span>
                  <span className={cn("mono text-center text-sm font-bold", p.after > p.before ? "text-vit-400" : p.after < p.before ? "text-rose-300" : "text-mist-300")}>
                    {p.after}
                  </span>
                  <div className="col-span-3">
                    <div className="relative h-1 overflow-hidden rounded-full bg-white/6">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-mist-600/60" style={{ width: `${p.before}%` }} />
                      <motion.div
                        className={cn("absolute inset-y-0 left-0 rounded-full", p.after >= p.before ? "bg-vit-400/80" : "bg-rose-400/80")}
                        initial={{ width: `${p.before}%` }}
                        animate={{ width: `${p.after}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {pairs.length === 0 && <p className="py-2 text-center text-xs text-mist-500">No hypotheses before or after simulation.</p>}
            </div>
            {simResult.contradictions.length > 0 && (
              <p className="mono mt-3 rounded-lg border border-alert-400/30 bg-alert-400/8 px-3 py-2 text-[10px] text-alert-300">
                ⚠ {simResult.contradictions.length} contradiction{simResult.contradictions.length > 1 ? "s" : ""} detected under simulation — see alerts above.
              </p>
            )}
            <p className="mono mt-3 text-[9.5px] uppercase tracking-widest text-mist-600">Rule simulation — not a medical prediction · {running ? "recomputing…" : "stable"}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= expert system view (pipeline events) ================= */

const EVENT_ICONS: Record<PipelineEvent["type"], { icon: typeof BrainCircuit; tone: string }> = {
  facts: { icon: FlaskConical, tone: "text-mist-300 border-white/15 bg-white/5" },
  rule_matching: { icon: Network, tone: "text-pulse-300 border-pulse-400/30 bg-pulse-400/10" },
  rule_fired: { icon: Beaker, tone: "text-pulse-300 border-pulse-400/30 bg-pulse-400/10" },
  derived_fact: { icon: GitBranch, tone: "text-vit-400 border-vit-400/30 bg-vit-400/10" },
  hypothesis: { icon: Target, tone: "text-iris-400 border-iris-400/30 bg-iris-400/10" },
  backward: { icon: ListTree, tone: "text-pulse-300 border-pulse-400/30 bg-pulse-400/10" },
  contradiction: { icon: AlertTriangle, tone: "text-alert-400 border-alert-400/30 bg-alert-400/10" },
  question: { icon: CircleHelp, tone: "text-alert-400 border-alert-400/30 bg-alert-400/10" },
  result: { icon: BrainCircuit, tone: "text-vit-400 border-vit-400/30 bg-vit-400/10" },
};

function ExpertSystemView({ events }: { events: PipelineEvent[] }) {
  return (
    <div className="relative">
      <div className="absolute bottom-4 left-[21px] top-2 w-px bg-linear-to-b from-pulse-400/40 via-white/10 to-transparent" />
      <div className="space-y-3">
        {events.map((e, i) => {
          const conf = EVENT_ICONS[e.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.09, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4"
            >
              <span className={cn("z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", conf.tone)}>
                <conf.icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-ink-900/50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="display text-[13px] font-semibold text-mist-100">{e.title}</p>
                  <span className="mono shrink-0 text-[9px] uppercase tracking-widest text-mist-600">T+{String(i).padStart(2, "0")}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-mist-400">{e.detail}</p>
                {e.mono && (
                  <div className="mono mt-2 flex flex-wrap gap-1.5">
                    {e.mono.map((m, j) => (
                      <span key={j} className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-pulse-300/90 ring-1 ring-white/8">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= main results view ================= */

export default function ResultsView({
  result, facts, running, questionsAnswered, mode, focusHypothesis,
  onAnswer, onReRunAll,
}: {
  result: EngineResponse;
  facts: FactBase;
  running: boolean;
  questionsAnswered: number;
  mode: "forward" | "backward";
  focusHypothesis: string | null;
  onAnswer: (symptom: string, v: SymptomState) => void;
  onReRunAll: () => void;
}) {
  LAST_RESPONSE = result;
  const [expanded, setExpanded] = useState<string | null>(result.hypotheses[0]?.condition ?? null);
  const [tab, setTab] = useState<"arena" | "graph" | "expert" | "whatif">("arena");

  useEffect(() => {
    setExpanded(result.hypotheses[0]?.condition ?? null);
    LAST_RESPONSE = result;
  }, [result]);

  const top = result.hypotheses[0];
  const focusReport = focusHypothesis ? result.backwardReports.find((r) => r.hypothesis === focusHypothesis) : undefined;
  const fireOrder = useMemo(() => result.forwardTrace.filter((t) => t.status === "fired").map((t) => t.ruleId), [result]);

  return (
    <div className="space-y-5">
      {/* mode + cycle strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={mode === "forward" ? "border-pulse-400/30 bg-pulse-400/10 text-pulse-300" : "border-iris-400/30 bg-iris-400/10 text-iris-400"}>
          {mode === "forward" ? "Mode A · Forward Discovery" : "Mode B · Backward Verification"}
        </Badge>
        <Badge>{result.stats.factsKnown} facts</Badge>
        <Badge>{result.stats.rulesEvaluated} rules evaluated</Badge>
        <Badge>{result.stats.rulesFired} fired</Badge>
        <Badge>{result.iterations} inference cycles</Badge>
        <Badge>questions answered: {questionsAnswered}</Badge>
        <button onClick={onReRunAll} className="mono ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-mist-300 transition hover:bg-white/8">
          <RotateCcw className="h-3 w-3" /> Re-reason
        </button>
      </div>

      {running && <ThinkingOverlay label="Re-running inference with updated evidence…" />}

      {/* focus verification (mode B) */}
      {focusReport && (
        <Panel className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>Verification Target</SectionLabel>
            <h3 className="display text-xl font-bold text-mist-100">{conditionLabel(focusReport.hypothesis)}</h3>
            <VerdictBadge verdict={focusReport.verdict} />
          </div>
          <p className="mt-2 text-[13px] text-mist-400">{focusReport.summary}</p>
          <div className="mt-4 rounded-xl border border-white/8 bg-ink-900/50 p-4">
            <ProofNodeRow node={focusReport.proofTree} depth={0} />
          </div>
        </Panel>
      )}

      {/* contradictions */}
      <ContradictionAlerts items={result.contradictions} />

      {/* empty arena */}
      {result.hypotheses.length === 0 && (
        <Panel className="p-10 text-center">
          <BrainCircuit className="mx-auto h-8 w-8 text-mist-600" />
          <p className="display mt-4 text-lg font-semibold text-mist-200">No hypotheses generated yet</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-mist-400">
            The engine found no satisfied premise in the knowledge base. Mark at least one symptom as
            <span className="text-vit-400"> PRESENT </span> to start forward chaining — unknown is never assumed absent.
          </p>
        </Panel>
      )}

      {/* top condition card (spec layout) */}
      {top && (
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="glass relative overflow-hidden rounded-2xl border-pulse-400/25 shadow-[0_0_60px_-18px_rgba(34,211,238,0.5)]"
        >
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pulse-400/8 blur-3xl" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel className="text-pulse-300/90">Possible Condition · Rule-Based Match</SectionLabel>
              <VerdictBadge verdict={top.verdict} />
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
              <h2 className="display text-4xl font-bold tracking-tight text-mist-100">{top.label}</h2>
              <div className="pb-1.5">
                <p className="mono text-[10px] uppercase tracking-widest text-mist-500">Rule Match Score — not a medical probability</p>
                <p className="display text-2xl font-bold text-pulse-300">{top.ruleMatchFraction}<span className="ml-2 text-sm font-medium text-mist-400">({top.score}/100)</span></p>
              </div>
            </div>
            <div className="mt-4 max-w-md"><ScoreBar value={top.score} /></div>

            <div className="my-6 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />

            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <SectionLabel className="mb-2.5 text-vit-400/80">Supporting Evidence</SectionLabel>
                <div className="space-y-1.5">
                  {top.explanation.supportingEvidence.slice(0, 5).map((e) => (
                    <EvidenceRow key={e.fact} tone="ok" label={symptomLabel(e.fact)} mono={e.via} />
                  ))}
                  {top.explanation.supportingEvidence.length === 0 && <p className="text-xs text-mist-500">None yet.</p>}
                </div>
              </div>
              <div>
                <SectionLabel className="mb-2.5 text-mist-400">Missing Information</SectionLabel>
                <div className="space-y-1.5">
                  {top.explanation.missingEvidence.slice(0, 5).map((e) => (
                    <EvidenceRow key={e.fact} tone="miss" label={symptomLabel(e.fact)} mono={e.asked ? "asked" : "unknown"} />
                  ))}
                  {top.explanation.missingEvidence.length === 0 && <p className="text-xs text-mist-500">Nothing missing.</p>}
                </div>
              </div>
              <div>
                <SectionLabel className="mb-2.5 text-mist-400">Contradictions</SectionLabel>
                <div className="space-y-1.5">
                  {top.explanation.contradictoryEvidence.length === 0
                    ? <EvidenceRow tone="ok" label="None detected" />
                    : top.explanation.contradictoryEvidence.map((c) => <EvidenceRow key={c.fact} tone="contra" label={symptomLabel(c.fact)} />)}
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <button onClick={() => { setExpanded(top.condition === expanded && tab === "arena" ? null : top.condition); setTab("arena"); }} className="inline-flex items-center gap-2 rounded-xl border border-pulse-400/35 bg-pulse-400/10 px-5 py-2.5 text-xs font-bold text-pulse-300 transition hover:bg-pulse-400/20">
                <HelpCircle className="h-4 w-4" /> WHY?
              </button>
              <button onClick={() => setTab("whatif")} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-xs font-bold text-mist-200 transition hover:bg-white/10">
                <FlaskConical className="h-4 w-4" /> WHAT IF?
              </button>
              <button onClick={() => setTab("graph")} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-xs font-bold text-mist-200 transition hover:bg-white/10">
                <Network className="h-4 w-4" /> REASONING GRAPH
              </button>
              <button onClick={() => setTab("expert")} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-2.5 text-xs font-bold text-mist-200 transition hover:bg-white/10">
                <GitBranch className="h-4 w-4" /> EXPERT SYSTEM VIEW
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* next best question */}
      <NextBestQuestionCard result={result} onAnswer={onAnswer} disabled={running} />

      {/* tabs */}
      {top && (
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-white/8 bg-ink-900/60 p-1.5">
            {([
              ["arena", "Hypothesis Arena"],
              ["graph", "Reasoning Graph"],
              ["expert", "Expert System View"],
              ["whatif", "What-If Simulator"],
            ] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-[12px] font-semibold transition-all",
                  tab === t ? "bg-pulse-400/15 text-pulse-300 ring-1 ring-pulse-400/30" : "text-mist-400 hover:text-mist-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              {tab === "arena" && (
                <div className="space-y-3">
                  <SectionLabel>Hypothesis Arena · Ranked by Rule Match Score</SectionLabel>
                  {result.hypotheses.map((h, i) => (
                    <HypothesisCard key={h.condition} h={h} i={i} expanded={expanded === h.condition} onToggle={() => setExpanded(expanded === h.condition ? null : h.condition)} />
                  ))}
                </div>
              )}
              {tab === "graph" && (result.graph.nodes.length > 0 ? <ReasoningGraphView graph={result.graph} fireOrder={fireOrder} /> : <GraphEmpty />)}
              {tab === "expert" && <ExpertSystemView events={result.events} />}
              {tab === "whatif" && <WhatIfPanel facts={facts} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <MedicalDisclaimer compact />
      <p className="text-center">
        <span className="mono text-[10px] uppercase tracking-widest text-mist-600">
          {CONDITIONS.length} conditions · rules only · no ML · no generative AI
        </span>
      </p>
    </div>
  );
}

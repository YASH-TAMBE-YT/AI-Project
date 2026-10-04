import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, GitBranch, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import type { Rule, RuleKind, RuleOperator } from "@/engine/types";
import { CONDITIONS, DERIVED_FACTS, SYMPTOMS, conditionLabel, symptomLabel } from "@/data/knowledgeBase";
import { deleteRule, isSeededRule, loadActiveRules, nextRuleId, overrideRule, resetKnowledgeBase } from "@/services/storage";
import { Badge, GhostButton, PageTransition, Panel, PrimaryButton, SectionLabel } from "@/components/ui";
import { cn } from "@/utils/cn";

type Tab = "rules" | "conditions" | "symptoms";

const KIND_STYLES: Record<RuleKind, string> = {
  pattern: "border-pulse-400/35 bg-pulse-400/10 text-pulse-300",
  support: "border-iris-400/35 bg-iris-400/10 text-iris-400",
  derived: "border-vit-400/35 bg-vit-400/10 text-vit-400",
};

/* ---------------- rule editor ---------------- */

interface Draft {
  id: string;
  name: string;
  premises: string[];
  notPremises: string[];
  operator: RuleOperator;
  conclusion: string;
  kind: RuleKind;
  note: string;
}

function FactMultiSelect({ selected, onToggle, options, tone }: { selected: string[]; onToggle: (id: string) => void; options: { id: string; label: string }[]; tone: "pos" | "neg" }) {
  return (
    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-white/8 bg-ink-900/50 p-2.5">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all",
              on
                ? tone === "pos" ? "border-vit-400/50 bg-vit-400/15 text-vit-400" : "border-crit-400/50 bg-crit-400/15 text-rose-300"
                : "border-white/8 bg-white/3 text-mist-500 hover:text-mist-200",
            )}
          >
            {tone === "neg" ? "NOT " : ""}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function RuleEditor({ initial, existing, onSave, onCancel }: { initial: Draft; existing: string[]; onSave: (r: Rule) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState("");

  const toggle = (field: "premises" | "notPremises", id: string) => {
    setD((s) => {
      const has = s[field].includes(id);
      const next = has ? s[field].filter((x) => x !== id) : [...s[field], id];
      // a fact cannot be both required-present and required-absent
      const other = field === "premises" ? s.notPremises.filter((x) => x !== id) : s.premises.filter((x) => x !== id);
      return field === "premises" ? { ...s, premises: next, notPremises: other } : { ...s, notPremises: next, premises: other };
    });
  };

  const save = () => {
    if (!d.name.trim()) return setError("Rule name is required.");
    if (d.premises.length === 0 && d.notPremises.length === 0) return setError("A rule needs at least one premise (positive or NOT).");
    if (!initial.id && existing.includes(d.id)) return setError(`Rule ${d.id} already exists.`);
    onSave({ id: d.id, name: d.name.trim(), premises: d.premises, notPremises: d.notPremises, operator: d.operator, conclusion: d.conclusion, kind: d.kind, note: d.note.trim() || undefined });
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border-pulse-400/25 p-6">
      <div className="flex items-center justify-between">
        <SectionLabel className="text-pulse-300">{initial.id.startsWith("R") && existing.includes(initial.id) ? `Edit ${initial.id}` : `Create Rule · ${d.id}`}</SectionLabel>
        <button onClick={onCancel} className="text-mist-500 hover:text-mist-200"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <SectionLabel className="mb-2">Rule Name</SectionLabel>
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Influenza Pattern" className="w-full rounded-xl border border-white/12 bg-ink-800 px-4 py-2.5 text-sm text-mist-100 outline-none focus:border-pulse-400/50" />
        </div>

        <div className="rounded-xl border border-white/8 bg-ink-900/40 p-4">
          <div className="flex items-center gap-2">
            <span className="mono rounded-md bg-pulse-400/15 px-2 py-1 text-[10px] font-bold text-pulse-300">IF</span>
            <div className="flex gap-1 rounded-lg border border-white/10 bg-ink-800 p-1">
              {(["AND", "OR"] as const).map((op) => (
                <button key={op} onClick={() => setD({ ...d, operator: op })} className={cn("mono rounded-md px-3 py-1 text-[10px] font-bold transition", d.operator === op ? "bg-pulse-400/20 text-pulse-300" : "text-mist-500 hover:text-mist-300")}>{op}</button>
              ))}
            </div>
            <span className="text-[11px] text-mist-500">of these are PRESENT:</span>
          </div>
          <div className="mt-3">
            <FactMultiSelect selected={d.premises} onToggle={(id) => toggle("premises", id)} options={[...SYMPTOMS.map((s) => ({ id: s.id, label: s.label })), ...DERIVED_FACTS.map((x) => ({ id: x.id, label: x.label }))]} tone="pos" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="mono rounded-md bg-crit-400/15 px-2 py-1 text-[10px] font-bold text-rose-300">AND NOT</span>
            <span className="text-[11px] text-mist-500">these must be ABSENT:</span>
          </div>
          <div className="mt-3">
            <FactMultiSelect selected={d.notPremises} onToggle={(id) => toggle("notPremises", id)} options={SYMPTOMS.map((s) => ({ id: s.id, label: s.label }))} tone="neg" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mono rounded-md bg-vit-400/15 px-2 py-1 text-[10px] font-bold text-vit-400">THEN</span>
            <select value={d.conclusion} onChange={(e) => setD({ ...d, conclusion: e.target.value, kind: e.target.value.startsWith("x_") ? "derived" : d.kind === "derived" ? "pattern" : d.kind })} className="rounded-lg border border-white/12 bg-ink-800 px-3 py-2 text-xs text-mist-100 outline-none focus:border-vit-400/50">
              <optgroup label="Conditions">
                {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
              <optgroup label="Derived facts">
                {DERIVED_FACTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </optgroup>
            </select>
            <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as RuleKind })} className="rounded-lg border border-white/12 bg-ink-800 px-3 py-2 text-xs text-mist-100 outline-none">
              <option value="pattern">pattern rule</option>
              <option value="support">support rule</option>
              <option value="derived">derivation rule</option>
            </select>
          </div>
        </div>

        <div>
          <SectionLabel className="mb-2">Note (optional)</SectionLabel>
          <input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Clinical rationale shown in explanations" className="w-full rounded-xl border border-white/12 bg-ink-800 px-4 py-2.5 text-sm text-mist-100 outline-none focus:border-pulse-400/50" />
        </div>

        {error && <p className="rounded-lg border border-crit-400/30 bg-crit-400/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

        <div className="flex justify-end gap-3">
          <GhostButton onClick={onCancel} className="py-2.5 text-xs">Cancel</GhostButton>
          <PrimaryButton onClick={save} className="py-2.5 text-xs">Save Rule</PrimaryButton>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- page ---------------- */

export default function KnowledgeBase() {
  const [tab, setTab] = useState<Tab>("rules");
  const [rules, setRules] = useState<Rule[]>(() => loadActiveRules());
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const refresh = () => setRules(loadActiveRules());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) =>
      r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
      || r.conclusion.includes(q) || conditionLabel(r.conclusion).toLowerCase().includes(q)
      || r.premises.some((p) => symptomLabel(p).toLowerCase().includes(q)));
  }, [rules, query]);

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
  };

  const editor = creating || editing ? (
    <RuleEditor
      key={editing?.id ?? "new"}
      initial={editing
        ? { id: editing.id, name: editing.name, premises: editing.premises, notPremises: editing.notPremises, operator: editing.operator, conclusion: editing.conclusion, kind: editing.kind, note: editing.note ?? "" }
        : { id: nextRuleId(rules), name: "", premises: [], notPremises: [], operator: "AND", conclusion: CONDITIONS[0].id, kind: "support", note: "" }}
      existing={rules.map((r) => r.id)}
      onSave={(r) => { overrideRule(r, isSeededRule(r.id)); refresh(); setCreating(false); setEditing(null); }}
      onCancel={() => { setCreating(false); setEditing(null); }}
    />
  ) : null;

  return (
    <PageTransition k="knowledge">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Structured Medical Knowledge</SectionLabel>
          <h1 className="display mt-2 text-3xl font-bold text-mist-100 sm:text-4xl">Knowledge Base</h1>
          <p className="mt-2 max-w-xl text-[13px] text-mist-400">
            The single source of truth for inference: symptoms, conditions and production rules.
            The UI never computes diagnoses — it only reads and edits this knowledge.
          </p>
        </div>
        <div className="flex gap-2.5">
          {confirmReset ? (
            <div className="flex items-center gap-2 rounded-xl border border-alert-400/30 bg-alert-400/8 p-1.5 pl-3">
              <span className="text-xs text-alert-300">Restore seeded knowledge?</span>
              <button onClick={() => { resetKnowledgeBase(); refresh(); setConfirmReset(false); }} className="rounded-lg bg-alert-400/20 px-3 py-1.5 text-xs font-bold text-alert-300">Confirm</button>
              <button onClick={() => setConfirmReset(false)} className="rounded-lg px-2 py-1.5 text-xs text-mist-400">Cancel</button>
            </div>
          ) : (
            <GhostButton onClick={() => setConfirmReset(true)} className="py-2.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Reset KB</GhostButton>
          )}
          <PrimaryButton onClick={startCreate} className="py-2.5 text-xs"><Plus className="h-4 w-4" /> New Rule</PrimaryButton>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-7 flex gap-1.5 rounded-xl border border-white/8 bg-ink-900/60 p-1.5">
        {([["rules", `Rules · ${rules.length}`], ["conditions", `Conditions · ${CONDITIONS.length}`], ["symptoms", `Symptoms · ${SYMPTOMS.length}`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t as Tab)} className={cn("flex-1 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all", tab === t ? "bg-pulse-400/15 text-pulse-300 ring-1 ring-pulse-400/30" : "text-mist-400 hover:text-mist-200")}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <AnimatePresence>{editor}</AnimatePresence>
      </div>

      {/* ---------- rules tab ---------- */}
      {tab === "rules" && (
        <div className={cn(editor && "mt-4")}>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rules by id, name, symptom or condition…" className="w-full rounded-xl border border-white/12 bg-ink-800 py-3 pl-10 pr-4 text-sm text-mist-100 outline-none focus:border-pulse-400/50" />
          </div>

          <div className="space-y-2">
            {filtered.map((r) => (
              <motion.div key={r.id} layout className="glass group rounded-xl px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="mono w-12 text-[12px] font-bold text-pulse-300">{r.id}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-mist-100">{r.name}</p>
                      <Badge className={KIND_STYLES[r.kind]}>{r.kind}</Badge>
                      {!isSeededRule(r.id) && <Badge className="border-vit-400/30 bg-vit-400/8 text-vit-400">custom</Badge>}
                    </div>
                    <div className="mono mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                      <span className="text-mist-600">IF</span>
                      {r.premises.map((p, i) => (
                        <span key={p} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-pulse-400/70">{r.operator}</span>}
                          <span className="rounded-md border border-vit-400/25 bg-vit-400/8 px-1.5 py-0.5 text-vit-400/90">{symptomLabel(p)}</span>
                        </span>
                      ))}
                      {r.notPremises.map((np) => (
                        <span key={np} className="flex items-center gap-1.5">
                          <span className="text-crit-400/70">AND NOT</span>
                          <span className="rounded-md border border-crit-400/25 bg-crit-400/8 px-1.5 py-0.5 text-rose-300/90">{symptomLabel(np)}</span>
                        </span>
                      ))}
                      <span className="text-mist-600">→</span>
                      <span className="rounded-md border border-pulse-400/30 bg-pulse-400/10 px-1.5 py-0.5 font-semibold text-pulse-300">{conditionLabel(r.conclusion)}</span>
                    </div>
                    {r.note && <p className="mt-1.5 text-[11px] italic text-mist-500">{r.note}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                    <span className="mono mr-1 rounded-md bg-vit-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-vit-400">active</span>
                    <button onClick={() => { setCreating(false); setEditing(r); }} className="rounded-lg border border-white/10 bg-white/4 p-2 text-mist-400 transition hover:bg-white/10 hover:text-mist-100" title="Edit rule">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { deleteRule(r.id, isSeededRule(r.id)); refresh(); }} className="rounded-lg border border-white/10 bg-white/4 p-2 text-mist-400 transition hover:border-crit-400/40 hover:bg-crit-400/10 hover:text-rose-300" title="Delete rule">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <Panel className="p-10 text-center">
                <BookOpen className="mx-auto h-6 w-6 text-mist-600" />
                <p className="mt-3 text-sm text-mist-400">No rules match “{query}”.</p>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* ---------- conditions tab ---------- */}
      {tab === "conditions" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONDITIONS.map((c) => {
            const related = rules.filter((r) => r.conclusion === c.id);
            const pattern = related.find((r) => r.kind === "pattern");
            return (
              <div key={c.id} className="glass rounded-2xl p-5 transition-colors hover:border-pulse-400/25">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="display text-[15px] font-bold text-mist-100">{c.label}</h3>
                  <Badge className={cn(
                    c.severity === "mild" && "border-vit-400/30 bg-vit-400/8 text-vit-400",
                    c.severity === "moderate" && "border-alert-400/30 bg-alert-400/8 text-alert-400",
                    c.severity === "attention" && "border-crit-400/30 bg-crit-400/8 text-rose-300",
                  )}>{c.severity}</Badge>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-mist-400">{c.description}</p>
                {pattern && (
                  <div className="mono mt-3 rounded-lg border border-white/8 bg-ink-900/50 px-3 py-2 text-[10px] leading-relaxed text-mist-300">
                    <span className="text-pulse-300">{pattern.id}</span> · {pattern.premises.map(symptomLabel).join(" ∧ ")}
                    {pattern.notPremises.length > 0 && <span className="text-rose-300/90"> ∧ ¬({pattern.notPremises.map(symptomLabel).join(", ")})</span>}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="mono text-[10px] uppercase tracking-widest text-mist-600">{related.length} rules</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-mist-500"><GitBranch className="h-3 w-3" /> {c.care}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- symptoms tab ---------- */}
      {tab === "symptoms" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SYMPTOMS.map((s) => (
            <div key={s.id} className="glass flex items-center gap-3 rounded-xl px-4 py-3">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", s.seriousFlag ? "bg-alert-400" : "bg-pulse-400/60")} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-mist-100">{s.label}</p>
                <p className="mono text-[9.5px] uppercase tracking-widest text-mist-600">{s.category}{s.seriousFlag ? " · potentially serious" : ""}</p>
              </div>
              <span className="mono text-[10px] text-mist-600">{s.id}</span>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}

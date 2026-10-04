import { motion } from "framer-motion";
import {
  ArrowDown, ArrowRight, Beaker, BookOpen, BrainCircuit, CircleHelp, FlaskConical,
  GitCompareArrows, GraduationCap, ListOrdered, ScanSearch, ShieldAlert, Target,
} from "lucide-react";
import type { Route } from "@/App";
import { MedicalDisclaimer, PageTransition, Panel, SectionLabel } from "@/components/ui";

const fade = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay: i * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
});

function Concept({ icon: Icon, title, children, i }: { icon: typeof BrainCircuit; title: string; children: React.ReactNode; i: number }) {
  return (
    <motion.div {...fade(i)} className="glass rounded-2xl p-6">
      <div className="mb-3 inline-flex rounded-xl border border-pulse-400/20 bg-pulse-400/8 p-2.5">
        <Icon className="h-4.5 w-4.5 text-pulse-300" strokeWidth={1.9} />
      </div>
      <h3 className="display text-[15px] font-bold text-mist-100">{title}</h3>
      <div className="mt-2 text-[13px] leading-relaxed text-mist-400">{children}</div>
    </motion.div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mono overflow-x-auto rounded-xl border border-white/8 bg-ink-900/70 p-4 text-[11px] leading-relaxed text-mist-300">
      {children}
    </pre>
  );
}

export default function About({ navigate }: { navigate: (r: Route) => void }) {
  return (
    <PageTransition k="about">
      {/* intro */}
      <div className="max-w-3xl">
        <SectionLabel>About the System</SectionLabel>
        <h1 className="display mt-2 text-3xl font-bold leading-tight text-mist-100 sm:text-4xl">
          MediLogic X doesn’t just give an answer.
          <span className="text-pulse-300"> It shows how the answer was reasoned.</span>
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-mist-400">
          Traditional symptom checkers simply match symptoms to diseases. MediLogic X treats diagnosis as a
          <span className="text-mist-100"> reasoning process</span>: forward chaining discovers candidate hypotheses,
          backward chaining verifies them, an adaptive interview asks the most informative question next, and a
          contradiction engine refuses to silently resolve conflicting evidence.
        </p>
      </div>

      {/* concepts */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Concept icon={BookOpen} title="What is an Expert System?" i={0}>
          A knowledge-based system that reaches conclusions from <span className="text-mist-200">explicitly defined facts and rules</span> —
          the same architecture that powered classical systems like MYCIN. No learned weights, no probabilities, no black box:
          knowledge is declarative and inspectable.
        </Concept>
        <Concept icon={ScanSearch} title="Forward Chaining" i={1}>
          <span className="text-mist-200">Data-driven</span> inference. Starting from known facts, every rule whose premises are satisfied fires,
          adding new facts (including derived intermediate facts) to working memory until a fixpoint is reached — no rule can fire again.
        </Concept>
        <Concept icon={Target} title="Backward Chaining" i={2}>
          <span className="text-mist-200">Goal-driven</span> inference. Starting from a hypothesis, the engine finds rules that could conclude it and
          recursively proves each premise, producing a full AND/OR proof tree with satisfied / failed / unknown nodes.
        </Concept>
        <Concept icon={GitCompareArrows} title="Why Both?" i={3}>
          Forward chaining efficiently <span className="text-mist-200">discovers</span> which conditions deserve attention from raw evidence;
          backward chaining rigorously <span className="text-mist-200">verifies</span> specific hypotheses. Combining discovery with verification
          mirrors how clinicians both generate and test hypotheses.
        </Concept>
        <Concept icon={CircleHelp} title="What is Novel Here?" i={4}>
          MediLogic X couples dual-direction inference with <span className="text-mist-200">adaptive questioning</span> (a discrimination analysis
          over unknown facts), a competing-hypothesis arena, contradictions that are surfaced rather than suppressed, and
          complete per-conclusion explainability.
        </Concept>
        <Concept icon={ShieldAlert} title="Medical Safety" i={5}>
          The knowledge base is deliberately small (12 everyday conditions), conservative, and educational. Output is always a
          <span className="text-mist-200"> rule-match score — never a probability, never a diagnosis</span>, never treatment advice.
        </Concept>
      </div>

      {/* the loop */}
      <motion.div {...fade(0)} className="mt-14">
        <SectionLabel>The Adaptive Reasoning Loop</SectionLabel>
        <Panel className="mt-4 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-1.5 text-center">
            {[
              ["Patient Evidence", "present · absent · unknown (tri-state facts)"],
              ["Forward Chaining", "fire all satisfiable rules → fixpoint"],
              ["Hypothesis Arena", "competing conditions ranked by rule-match score"],
              ["Backward Chaining", "verify each hypothesis premise-by-premise"],
              ["Contradiction Check", "surface conflicts — never auto-resolve"],
              ["Next Best Question", "ask the most discriminative unknown fact"],
              ["Re-Reason", "new evidence enters working memory → loop repeats"],
            ].map(([t, s], i, arr) => (
              <div key={t} className="flex w-full max-w-md flex-col items-center">
                <div className="glass w-full rounded-2xl px-5 py-3.5">
                  <p className="display text-[14px] font-bold text-mist-100">{t}</p>
                  <p className="mono mt-0.5 text-[9.5px] uppercase tracking-widest text-mist-500">{s}</p>
                </div>
                {i < arr.length - 1 && <ArrowDown className="my-1 h-4 w-4 text-pulse-400/60" />}
                {i === arr.length - 1 && (
                  <p className="mono mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-pulse-300">
                    <ArrowRight className="h-3 w-3 rotate-180" /> loop until evidence is exhausted → explainable result
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </motion.div>

      {/* algorithms */}
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <motion.div {...fade(0)}>
          <SectionLabel>Algorithm — Forward Chaining</SectionLabel>
          <div className="mt-3"><Mono>{
`facts ← working memory (present / absent / unknown)
repeat until fixpoint:
    for each rule R not yet fired:
        if operator = AND and all premises PRESENT
           and all NOT-premises ABSENT:
               fire R → add conclusion to memory
        if operator = OR and ≥1 premise PRESENT
           and no NOT-premise PRESENT:
               fire R → add conclusion to memory
    (derived facts x_* become premises for
     other rules → multi-hop chaining)
trace ← every evaluation, in order`}</Mono></div>
        </motion.div>
        <motion.div {...fade(1)}>
          <SectionLabel>Algorithm — Backward Chaining</SectionLabel>
          <div className="mt-3"><Mono>{
`goal ← hypothesis H
rules ← all rules concluding H
prove(rule):
    for each premise p:
        if p ∈ facts:      status ← present|absent
        if p is derived:   prove(rules concluding p)  ↻
        if p unknown:      status ← unknown
    AND → satisfied iff ALL satisfied
    OR  → satisfied iff ANY satisfied
verdict:
    pattern satisfied        → VERIFIED
    contradiction / failed   → WEAKENED
    partial evidence         → PARTIALLY SUPPORTED
    no usable evidence       → INSUFFICIENT DATA`}</Mono></div>
        </motion.div>
        <motion.div {...fade(2)}>
          <SectionLabel>Algorithm — Rule Match Score</SectionLabel>
          <div className="mt-3"><Mono>{
`expected(H) ← distinct evidence items across
                all rules concluding H
score(H) = 100 × max(0,
      satisfied
    − 1.5 × contradicted      // NOT-premise present
    − 0.5 × unmet )           // expected but absent
    ÷ |expected(H)|

displayed as “satisfied / expected”
→ a rule-match score, NOT a medical probability`}</Mono></div>
        </motion.div>
        <motion.div {...fade(3)}>
          <SectionLabel>Algorithm — Next Best Question</SectionLabel>
          <div className="mt-3"><Mono>{
`candidates ← unknown symptoms referenced by
              rules of active hypotheses
for each candidate s:
    yes ← re-run scoring with s = PRESENT
    no  ← re-run scoring with s = ABSENT
    power(s) ← Σ over hypotheses |yes(h) − no(h)|
ask argmax power(s)

impact preview (current / yes / no per hypothesis)
is returned alongside the question`}</Mono></div>
        </motion.div>
      </div>

      {/* test cases */}
      <motion.div {...fade(0)} className="mt-14">
        <SectionLabel>Sample Test Cases</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              name: "T1 — Reference Flu Case",
              facts: "fever✓ cough✓ sore_throat✓ fatigue✓ · runny_nose✗ itchy_eyes✗",
              expect: "Influenza tops the arena (4/5) with zero contradictions; Next Best Question asks about Body Ache. YES → 5/5 verified.",
            },
            {
              name: "T2 — Allergy vs Flu Split",
              facts: "sneezing✓ itchy_eyes✓ runny_nose✓ · fever✗ body_ache✗",
              expect: "Allergy pattern fires and tops the arena (verified); Influenza never enters the arena — no flu premise is satisfied — and Common Cold trails as partially supported.",
            },
            {
              name: "T3 — Contradiction Surfacing",
              facts: "sneezing✓ itchy_eyes✓ runny_nose✓ fever✓ (or What-If: fever=YES)",
              expect: "Allergy hypothesis flagged WEAKENED — rule R020 requires fever ABSENT. The contradiction alert is displayed and never silently resolved.",
            },
          ].map((t) => (
            <div key={t.name} className="glass rounded-2xl p-5">
              <p className="display text-[13px] font-bold text-mist-100">{t.name}</p>
              <p className="mono mt-2.5 text-[10.5px] leading-relaxed text-pulse-300/80">{t.facts}</p>
              <p className="mt-2.5 text-[12px] leading-relaxed text-mist-400">{t.expect}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* viva guide */}
      <motion.div {...fade(0)} className="mt-14">
        <SectionLabel>Viva / Demo Guide</SectionLabel>
        <Panel className="mt-4 p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2 md:w-40">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-pulse-400/30 bg-pulse-400/10">
                <GraduationCap className="h-6 w-6 text-pulse-300" />
              </span>
              <p className="mono text-center text-[9.5px] uppercase tracking-widest text-mist-500">5-minute presentation path</p>
            </div>
            <ol className="space-y-3.5">
              {[
                "Open Diagnose → “Load Demo Patient”. Show tri-state chips and explain that unknown ≠ absent.",
                "Run Inference Engine. Point at the pipeline animation: facts → rule matching → hypotheses.",
                "In the Hypothesis Arena, expand Why? on Influenza: supporting evidence, fired rules R010–R012, missing Body Ache, zero contradictions, and the backward proof tree.",
                "Answer the Next Best Question “Body ache?” with YES — highlight the score change and the updated rule-match fraction.",
                "Open the Reasoning Graph tab and press Animate Inference to replay rule firing step by step.",
                "Open What-If Simulator, simulate Fever = YES on an allergy case — show the contradiction alert appearing instead of being hidden.",
                "Finish in Expert System View: the full event log FACTS → RULE FIRED → HYPOTHESIS → VERIFICATION → QUESTION.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-mist-300">
                  <span className="mono mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md bg-pulse-400/12 text-[10px] font-bold text-pulse-300">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      </motion.div>

      {/* stack + safety */}
      <div className="mt-14 grid gap-4 md:grid-cols-2">
        <motion.div {...fade(0)} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2.5">
            <ListOrdered className="h-4.5 w-4.5 text-iris-400" />
            <SectionLabel>Engineering Stack</SectionLabel>
          </div>
          <ul className="mt-4 space-y-2.5 text-[13px] text-mist-400">
            {[
              "React + Vite + Tailwind + Framer Motion frontend",
              "FastAPI + SQLAlchemy + SQLite backend (backend/)",
              "UI-independent inference engine (forward / backward / arena / questions / contradictions / explanations)",
              "REST contract: structured reasoning JSON, never bare diagnoses",
              "Rule editor persists knowledge-base changes (mirrored in SQLite)",
              "All results reproducible — identical facts always yield identical traces",
            ].map((s) => (
              <li key={s} className="flex gap-2.5">
                <Beaker className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pulse-300/70" />{s}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...fade(1)} className="space-y-4">
          <MedicalDisclaimer />
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="h-4.5 w-4.5 text-vit-400" />
              <SectionLabel>The One-Line Pitch</SectionLabel>
            </div>
            <p className="display mt-3 text-[15px] font-semibold leading-relaxed text-mist-100">
              “Forward chaining discovers hypotheses, backward chaining verifies them, and the system asks only the
              questions that matter — then proves its work.”
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div {...fade(0)} className="mt-12 text-center">
        <button onClick={() => navigate("diagnose")} className="inline-flex items-center gap-2.5 rounded-2xl bg-linear-to-r from-cyan-500 to-teal-500 px-8 py-4 text-sm font-bold text-ink-950 transition hover:shadow-[0_0_44px_-6px_rgba(34,211,238,0.7)]">
          <FlaskConical className="h-4 w-4" /> Try the Reference Demo
        </button>
      </motion.div>
    </PageTransition>
  );
}

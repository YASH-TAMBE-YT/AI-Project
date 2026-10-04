import { motion } from "framer-motion";
import {
  ArrowRight, ArrowDown, BookOpen, BrainCircuit, CircleHelp, GitCompareArrows,
  HelpCircle, Layers, Network, ScanSearch, ShieldAlert, Sparkles, Target, Workflow,
} from "lucide-react";
import type { Route } from "@/App";
import { MedicalDisclaimer, PageTransition, SectionLabel } from "@/components/ui";
import { CONDITIONS, RULES, SYMPTOMS } from "@/data/knowledgeBase";
import { loadHistory } from "@/services/storage";

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
};

function EkgDivider() {
  return (
    <svg viewBox="0 0 600 60" className="mx-auto my-2 h-10 w-64 text-pulse-400/60" fill="none">
      <path
        d="M0 30 H180 l12-18 14 36 12-30 10 12 H420 l12-18 14 36 12-30 10 12 H600"
        stroke="currentColor" strokeWidth="1.6" className="ekg-line"
      />
    </svg>
  );
}

/** Animated inference pipeline — the core identity of the product. */
function PipelineDiagram() {
  const stages = [
    { icon: ScanSearch, label: "Patient Evidence", sub: "present / absent / unknown", tone: "text-mist-300" },
    { icon: ArrowDown, label: "Forward Chaining", sub: "data-driven discovery", tone: "text-pulse-300" },
    { icon: GitCompareArrows, label: "Hypothesis Arena", sub: "competing conditions ranked", tone: "text-iris-400" },
    { icon: Target, label: "Backward Chaining", sub: "goal-driven verification", tone: "text-pulse-300" },
    { icon: CircleHelp, label: "Next Best Question", sub: "most informative unknown fact", tone: "text-alert-400" },
    { icon: BrainCircuit, label: "Explainable Result", sub: "every conclusion traced", tone: "text-vit-400" },
  ];
  return (
    <div className="relative mx-auto grid max-w-3xl gap-2.5 sm:grid-cols-6 sm:gap-0">
      {stages.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="glass float-slow mx-auto flex w-full max-w-44 flex-col items-center gap-1 rounded-2xl px-3 py-4 text-center sm:mx-1" style={{ animationDelay: `${i * 0.5}s` }}>
            <s.icon className={`h-5 w-5 ${s.tone}`} strokeWidth={1.8} />
            <p className="display text-[11.5px] font-semibold leading-tight text-mist-100">{s.label}</p>
            <p className="mono text-[8.5px] uppercase tracking-wider text-mist-500">{s.sub}</p>
          </div>
          {i < stages.length - 1 && (
            <div className="absolute right-[-14px] top-1/2 hidden h-px w-7 -translate-y-1/2 bg-linear-to-r from-pulse-400/50 to-transparent sm:block" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default function Landing({ navigate }: { navigate: (r: Route) => void }) {
  const sessions = loadHistory().length;
  const stats = [
    { label: "Production Rules", value: RULES.length, icon: Workflow },
    { label: "Conditions", value: CONDITIONS.length, icon: Target },
    { label: "Symptoms Tracked", value: SYMPTOMS.length, icon: Layers },
    { label: "Sessions", value: sessions, icon: Network },
  ];

  const features = [
    { icon: ArrowRight, title: "Forward Discovery", body: "Data-driven inference explores every rule your evidence can fire, deriving intermediate facts and generating multiple competing hypotheses — never a single blind answer." },
    { icon: Target, title: "Backward Verification", body: "Goal-driven proof trees verify each hypothesis premise-by-premise, marking evidence satisfied, failed or unknown with full recursive traces." },
    { icon: CircleHelp, title: "Next Best Question", body: "A discrimination analysis simulates both answers for every unknown symptom and asks only the question that most changes the ranking." },
    { icon: ShieldAlert, title: "Contradiction Detection", body: "Conflicting evidence is surfaced — never silently resolved. NOT-premises, simulation clashes and rule conflicts are all flagged with sources." },
    { icon: Sparkles, title: "What-If Simulator", body: "Simulate any symptom state without touching recorded evidence and watch rule-match scores shift before and after, side by side." },
    { icon: HelpCircle, title: "Total Explainability", body: "Every result carries a Why? panel: fired rules, supporting evidence, missing information and contradictory facts in plain language." },
  ];

  return (
    <PageTransition k="landing">
      {/* ---------- hero ---------- */}
      <section className="relative flex min-h-[78vh] flex-col items-center justify-center text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mono mx-auto mb-6 inline-flex items-center gap-2.5 rounded-full border border-pulse-400/25 bg-pulse-400/8 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-pulse-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pulse-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pulse-400" />
            </span>
            Rule-Based Expert System · No ML · No Generative AI
          </div>

          <h1 className="display text-glow text-[52px] font-bold leading-[0.98] tracking-tight sm:text-[84px]">
            MediLogic <span className="bg-linear-to-r from-cyan-300 via-pulse-400 to-vit-400 bg-clip-text text-transparent">X</span>
          </h1>
          <p className="display mt-4 text-lg font-medium tracking-wide text-mist-200 sm:text-xl">
            Adaptive Explainable Medical Expert System
          </p>
          <p className="mono mt-3 text-[11px] uppercase tracking-[0.34em] text-mist-500">
            Discover · Verify · Explain
          </p>

          <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-mist-400">
            A rule-based expert system that uses <span className="text-mist-100">forward chaining</span> to discover possible
            conditions and <span className="text-mist-100">backward chaining</span> to verify them — then asks the single most
            informative question and explains exactly how every conclusion was reasoned.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => navigate("diagnose")}
            className="group inline-flex items-center gap-2.5 rounded-2xl bg-linear-to-r from-cyan-500 to-teal-500 px-7 py-3.5 text-sm font-bold text-ink-950 transition-all hover:shadow-[0_0_44px_-6px_rgba(34,211,238,0.7)]"
          >
            Start Diagnosis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button onClick={() => navigate("about")} className="rounded-2xl border border-white/12 bg-white/4 px-7 py-3.5 text-sm font-semibold text-mist-100 transition hover:border-white/25 hover:bg-white/8">
            How It Works
          </button>
          <button onClick={() => navigate("knowledge")} className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/4 px-7 py-3.5 text-sm font-semibold text-mist-100 transition hover:border-white/25 hover:bg-white/8">
            <BookOpen className="h-4 w-4 text-pulse-300" /> Knowledge Base
          </button>
        </motion.div>

        <EkgDivider />

        {/* stats strip */}
        <motion.div {...fadeUp} className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl px-4 py-4">
              <s.icon className="mx-auto h-4 w-4 text-pulse-400/80" />
              <p className="display mt-2 text-2xl font-bold text-mist-100">{s.value}</p>
              <p className="mono mt-0.5 text-[9px] uppercase tracking-widest text-mist-500">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ---------- inference pipeline ---------- */}
      <section className="mt-24">
        <motion.div {...fadeUp} className="text-center">
          <SectionLabel>The Reasoning Loop</SectionLabel>
          <h2 className="display mx-auto mt-3 max-w-2xl text-3xl font-bold text-mist-100 sm:text-4xl">
            Not <span className="italic text-mist-500">symptoms → disease</span>.
            <br />A complete reasoning architecture.
          </h2>
        </motion.div>
        <div className="mt-12">
          <PipelineDiagram />
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="mt-24">
        <motion.div {...fadeUp} className="text-center">
          <SectionLabel>Six Engines · One System</SectionLabel>
          <h2 className="display mt-3 text-3xl font-bold text-mist-100 sm:text-4xl">Every answer shows its reasoning.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="glass group rounded-2xl p-6 transition-colors hover:border-pulse-400/25"
            >
              <div className="mb-4 inline-flex rounded-xl border border-pulse-400/20 bg-pulse-400/8 p-2.5">
                <f.icon className="h-4.5 w-4.5 text-pulse-300" strokeWidth={1.9} />
              </div>
              <h3 className="display text-[15px] font-semibold text-mist-100">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-mist-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- safety ---------- */}
      <motion.section {...fadeUp} className="mx-auto mt-20 max-w-3xl">
        <MedicalDisclaimer />
      </motion.section>
    </PageTransition>
  );
}

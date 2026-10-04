/**
 * Inference orchestrator — runs one full adaptive reasoning cycle:
 *
 *   facts → forward chaining → hypothesis arena → backward verification
 *         → contradiction detection → next-best-question selection
 *         → reasoning graph + expert-system event log
 *
 * This module is UI-independent. The React layer consumes EngineResponse only.
 */

import type {
  BackwardReport, EngineRequest, EngineResponse, FactBase, PipelineEvent, Rule, Symptom,
} from "./types";
import { runForwardChaining } from "./forward";
import { runBackwardChaining } from "./backward";
import { buildHypotheses } from "./hypothesis";
import { detectContradictions } from "./contradiction";
import { quickScoreMap, selectNextBestQuestion } from "./questions";
import { buildReasoningGraph } from "./graph";
import { conditionLabel, isDerivedFact, symptomLabel } from "@/data/knowledgeBase";

export interface RunOptions {
  rules: Rule[];
  symptoms: Symptom[];
  conditionIds: string[];
  askedIds: Set<string>;
}

function mergeFacts(base: FactBase, simulation?: FactBase): FactBase {
  if (!simulation) return { ...base };
  const merged = { ...base };
  for (const [k, v] of Object.entries(simulation)) merged[k] = v;
  return merged;
}

export function runInference(request: EngineRequest, options: RunOptions): EngineResponse {
  const { rules, symptoms, conditionIds, askedIds } = options;
  const effective = mergeFacts(request.facts, request.simulation);
  const events: PipelineEvent[] = [];

  const known = Object.entries(effective).filter(([, v]) => v !== "unknown");
  events.push({
    type: "facts", title: "Facts Recorded",
    detail: `${known.length} known fact${known.length === 1 ? "" : "s"} loaded into working memory (${known.filter(([, v]) => v === "present").length} present · ${known.filter(([, v]) => v === "absent").length} absent). Unknown facts are never assumed absent (closed-world assumption rejected).`,
    mono: known.map(([k, v]) => `${k} = ${String(v).toUpperCase()}`),
  });

  /* ---------- 1. FORWARD CHAINING ---------- */
  const forward = runForwardChaining(effective, rules);
  const derivedSet = new Set(forward.derivedFacts);
  const firedEvents = forward.trace.filter((t) => t.status === "fired");
  const evaluated = forward.trace.filter((t) => t.iteration === 1).length;

  events.push({
    type: "rule_matching", title: "Rule Matching",
    detail: `${evaluated} production rules evaluated against working memory over ${forward.iterations} inference cycle${forward.iterations === 1 ? "" : "s"}.`,
  });
  for (const f of firedEvents) {
    const isDerivedRule = isDerivedFact(f.conclusion);
    events.push({
      type: isDerivedRule ? "derived_fact" : "rule_fired",
      title: isDerivedRule ? `Derived Fact: ${symptomLabel(f.conclusion)}` : `Rule Fired: ${f.ruleId}`,
      detail: isDerivedRule
        ? `${f.ruleId} derived the intermediate fact "${symptomLabel(f.conclusion)}" — it is now usable as a premise for other rules (multi-hop chaining).`
        : `${f.ruleId} concluded ${conditionLabel(f.conclusion)} from satisfied premises.`,
      mono: [`${f.ruleId}: ${f.satisfied.map(symptomLabel).join(" ∧ ") || "(NOT-guard)"} → ${f.conclusion}`],
    });
  }

  /* ---------- 2. BACKWARD VERIFICATION (for all forward-concluded + evidence-backed ids) ---------- */
  const candidateIds = new Set<string>(forward.derivedConclusions);
  // also allow conditions with ≥1 satisfied support premise into the arena
  for (const cid of conditionIds) {
    if (candidateIds.has(cid)) continue;
    const condRules = rules.filter((r) => r.conclusion === cid);
    const anySupport = condRules.some((r) =>
      r.premises.some((p) => (isDerivedFact(p) ? derivedSet.has(p) : effective[p] === "present")));
    if (anySupport) candidateIds.add(cid);
  }

  const backwardReports = new Map<string, BackwardReport>();
  for (const cid of candidateIds) {
    backwardReports.set(cid, runBackwardChaining(cid, effective, rules, derivedSet));
  }

  /* ---------- 3. HYPOTHESIS ARENA ---------- */
  const hypotheses = buildHypotheses({
    conditionIds: [...candidateIds],
    facts: effective,
    rules,
    derivedSet,
    forwardTrace: forward.trace,
    backwardReports,
    askedIds,
  });

  if (hypotheses.length > 0) {
    events.push({
      type: "hypothesis", title: "Hypotheses Created",
      detail: `${hypotheses.length} competing hypothesis${hypotheses.length === 1 ? "" : "es"} entered the arena. Ranking by rule-match score with contradiction penalties.`,
      mono: hypotheses.slice(0, 5).map((h) => `#${h.rank} ${h.label} — ${h.ruleMatchFraction} (${h.score})`),
    });
  } else {
    events.push({
      type: "hypothesis", title: "No Hypotheses Yet",
      detail: "Current evidence does not satisfy any premise in the knowledge base. Provide at least one present symptom to begin reasoning.",
    });
  }

  events.push({
    type: "backward", title: "Backward Verification",
    detail: hypotheses.length
      ? `Every arena hypothesis was re-verified goal-first: ${hypotheses.filter((h) => h.verdict === "verified").length} verified · ${hypotheses.filter((h) => h.verdict === "partially_supported").length} partially supported · ${hypotheses.filter((h) => h.verdict === "weakened").length} weakened · ${hypotheses.filter((h) => h.verdict === "insufficient_data").length} insufficient data.`
      : "Backward chaining skipped — no hypotheses to verify.",
  });

  /* ---------- 4. CONTRADICTION DETECTION ---------- */
  const contradictions = detectContradictions(
    request.facts, effective, request.simulation, rules, hypotheses.map((h) => h.condition), symptoms,
  );
  events.push({
    type: "contradiction", title: "Contradiction Check",
    detail: contradictions.length
      ? `${contradictions.length} contradiction${contradictions.length === 1 ? "" : "s"} detected and NOT silently resolved — user verification required.`
      : "No contradictory evidence detected across facts, rules and hypotheses.",
  });

  /* ---------- 5. NEXT BEST QUESTION ---------- */
  // discrimination analysis focuses on the LEADING hypotheses (top 3):
  // the goal is to separate the front-runners, not to lift the whole arena.
  const active = hypotheses.slice(0, 3).map((h) => h.condition);
  const currentScores = new Map(hypotheses.map((h) => [h.condition, h.score]));
  const derivedSetOf = (f: FactBase) => new Set(runForwardChaining(f, rules).derivedFacts);
  const rescore = (f: FactBase) => quickScoreMap(f, derivedSetOf, rules, active);
  const nextBestQuestion = hypotheses.length >= 1
    ? selectNextBestQuestion({ facts: effective, rules, activeConditions: active, symptoms, currentScores, rescore })
    : null;

  events.push(
    nextBestQuestion
      ? {
          type: "question", title: "Next Best Question Selected",
          detail: `Discrimination analysis over ${active.length} hypotheses selected "${nextBestQuestion.label}" as the most informative unknown fact (power ${nextBestQuestion.discriminationPower}).`,
        }
      : {
          type: "question", title: "No Further Questions",
          detail: hypotheses.length ? "All discriminative evidence is either known or non-informative." : "Waiting for initial symptoms.",
        },
  );

  /* ---------- 6. GRAPH + RESULT ---------- */
  const graph = buildReasoningGraph({ facts: effective, rules, trace: forward.trace, hypotheses, derivedFacts: forward.derivedFacts, topN: 3 });

  events.push({
    type: "result", title: "Reasoning Cycle Complete",
    detail: hypotheses.length
      ? `Top rule-based match: ${conditionLabel(hypotheses[0].condition)} (${hypotheses[0].ruleMatchFraction}). This is a rule-match result, not a medical diagnosis.`
      : "Cycle complete with an empty arena.",
  });

  return {
    facts: request.facts,
    effectiveFacts: effective,
    derivedFacts: forward.derivedFacts,
    forwardTrace: forward.trace,
    fireCount: firedEvents.length,
    iterations: forward.iterations,
    hypotheses,
    backwardReports: hypotheses.map((h) => backwardReports.get(h.condition)!),
    contradictions,
    nextBestQuestion,
    graph,
    events,
    stats: {
      factsKnown: known.length,
      rulesEvaluated: evaluated,
      rulesFired: firedEvents.length,
      iterations: forward.iterations,
      reasoningSteps: forward.trace.length + hypotheses.length * 2,
    },
    simulated: Boolean(request.simulation && Object.keys(request.simulation).length),
  };
}

export * from "./types";

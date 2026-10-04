/**
 * Next Best Question Engine — adaptive interview strategy.
 *
 * For every UNKNOWN symptom that appears in at least one active hypothesis,
 * the engine simulates both answers ("present" and "absent") and measures how
 * much the hypothesis ranking would change under each outcome.
 *
 * Discrimination power = Σ over hypotheses of |scoreYes − scoreNo|
 *
 * The question with the highest power is asked next, along with a full impact
 * preview so the user can see WHY this question is the most informative one.
 */

import type { FactBase, Hypothesis, NextBestQuestion, Rule, Symptom } from "./types";
import { conditionLabel, isDerivedFact, symptomLabel } from "@/data/knowledgeBase";

interface QuestionBuildInput {
  facts: FactBase;
  rules: Rule[];
  activeConditions: string[];
  symptoms: Symptom[];
  currentScores: Map<string, number>;
  /** recompute hypotheses for an amended fact base; injected by orchestrator */
  rescore: (facts: FactBase) => Map<string, number>;
}

export function selectNextBestQuestion(input: QuestionBuildInput): NextBestQuestion | null {
  const { facts, rules, activeConditions, symptoms, currentScores, rescore } = input;

  // candidate symptoms: unknown + referenced by a rule of an active condition
  const referenced = new Set<string>();
  for (const r of rules) {
    if (!activeConditions.includes(r.conclusion)) continue;
    for (const p of r.premises) if (!isDerivedFact(p)) referenced.add(p);
    for (const np of r.notPremises) referenced.add(np);
  }
  const candidates = [...referenced].filter((id) => (facts[id] ?? "unknown") === "unknown");
  if (candidates.length === 0) return null;

  let best: { id: string; power: number; yesMap: Map<string, number>; noMap: Map<string, number> } | null = null;

  for (const cand of candidates) {
    const yesMap = rescore({ ...facts, [cand]: "present" });
    const noMap = rescore({ ...facts, [cand]: "absent" });
    let power = 0;
    for (const cid of activeConditions) {
      const y = yesMap.get(cid) ?? 0;
      const n = noMap.get(cid) ?? 0;
      power += Math.abs(y - n);
    }
    // small bonus if the symptom differentiates the top-2 hypotheses specifically
    if (!best || power > best.power) best = { id: cand, power, yesMap, noMap };
  }

  if (!best || best.power <= 0) return null;

  const impacts = activeConditions.slice(0, 4).map((cid) => ({
    condition: cid,
    label: conditionLabel(cid),
    current: currentScores.get(cid) ?? 0,
    ifYes: best!.yesMap.get(cid) ?? 0,
    ifNo: best!.noMap.get(cid) ?? 0,
  })).filter((i) => i.ifYes !== i.current || i.ifNo !== i.current);

  const label = symptomLabel(best.id);
  const symName = symptoms.find((s) => s.id === best!.id)?.label.toLowerCase() ?? label.toLowerCase();

  const movers = impacts
    .map((i) => `${i.label}: ${i.current} → ${i.ifYes} if YES / ${i.ifNo} if NO`)
    .join(" · ");

  return {
    symptom: best.id,
    label,
    question: `Are you currently experiencing ${symName}?`,
    discriminationPower: Math.round(best.power),
    whyThisQuestion: `Answering "${label}" changes rule outcomes for ${impacts.length} competing hypothes${impacts.length === 1 ? "is" : "es"} — it is the most discriminative unknown fact right now. ${movers}`,
    impacts,
  };
}

/** Compact score map used by the question engine (mirrors hypothesis scoring). */
export function quickScoreMap(facts: FactBase, derivedSetOf: (f: FactBase) => Set<string>, rules: Rule[], active: string[]): Map<string, number> {
  const derived = derivedSetOf(facts);
  const map = new Map<string, number>();
  for (const cid of active) {
    const condRules = rules.filter((r) => r.conclusion === cid);
    const expected = new Set<string>();
    const mustAbsent = new Set<string>();
    for (const r of condRules) {
      r.premises.forEach((p) => expected.add(p));
      r.notPremises.forEach((np) => mustAbsent.add(np));
    }
    let sat = 0, unmet = 0, contra = 0;
    for (const e of expected) {
      const st = isDerivedFact(e) ? (derived.has(e) ? "present" : "unknown") : (facts[e] ?? "unknown");
      if (st === "present") sat++;
      else if (st === "absent") unmet++;
    }
    for (const np of mustAbsent) {
      if ((facts[np] ?? "unknown") === "present") contra++;
    }
    const total = Math.max(1, expected.size);
    map.set(cid, Math.max(0, Math.min(100, Math.round((100 * (sat - 1.5 * contra - 0.5 * unmet)) / total))));
  }
  return map;
}

export type { Hypothesis };

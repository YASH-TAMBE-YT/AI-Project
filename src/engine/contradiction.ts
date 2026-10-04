/**
 * Contradiction Engine — never silently resolves conflicting evidence.
 *
 * Detects three classes of contradiction:
 *  1. fact_conflict        — same fact asserted both present and absent
 *                            (arises when a simulation overlays recorded facts)
 *  2. hypothesis_conflict  — a symptom reported present that a rule requires
 *                            to be absent (NOT-premise violation)
 *  3. simulation_conflict  — a what-if override that clashes with the base
 *                            fact base (flagged differently in the UI)
 */

import type { Contradiction, FactBase, Rule, Symptom } from "./types";
import { conditionLabel, symptomLabel } from "@/data/knowledgeBase";

export function detectContradictions(
  baseFacts: FactBase,
  effectiveFacts: FactBase,
  simulation: FactBase | undefined,
  rules: Rule[],
  activeConditions: string[],
  symptoms: Symptom[],
): Contradiction[] {
  const out: Contradiction[] = [];
  const serious = new Set(symptoms.filter((s) => s.seriousFlag).map((s) => s.id));

  // 1 + 3 — fact-level conflicts introduced by the simulation overlay
  if (simulation) {
    for (const [id, simState] of Object.entries(simulation)) {
      if (simState === "unknown") continue;
      const base = baseFacts[id] ?? "unknown";
      if (base !== "unknown" && base !== simState) {
        out.push({
          id: `sim-${id}`,
          type: "simulation_conflict",
          fact: id,
          detail: `The simulation sets ${symptomLabel(id)} = ${simState.toUpperCase()} but the recorded answer is ${base.toUpperCase()}. Simulated facts never overwrite recorded evidence.`,
          evidenceFor: `Simulated as ${simState}`,
          evidenceAgainst: `Recorded as ${base}`,
          severe: serious.has(id),
        });
      }
    }
  }

  // a direct conflict inside the fact base itself (defensive — tri-state UI prevents it,
  // but the check is part of the engine contract)
  for (const id of Object.keys(effectiveFacts)) {
    const both = effectiveFacts[id] === ("present" as never) && effectiveFacts[id] === ("absent" as never);
    if (both) {
      out.push({
        id: `fact-${id}`, type: "fact_conflict", fact: id,
        detail: `${symptomLabel(id)} was reported both present and absent.`,
        evidenceFor: "Reported present", evidenceAgainst: "Reported absent",
        severe: true,
      });
    }
  }

  // 2 — hypothesis-level contradictions (NOT-premises violated by present evidence)
  const seen = new Set<string>();
  for (const cid of activeConditions) {
    for (const rule of rules.filter((r) => r.conclusion === cid)) {
      for (const np of rule.notPremises) {
        if (effectiveFacts[np] === "present") {
          const key = `${cid}:${np}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            id: `hyp-${key}`,
            type: "hypothesis_conflict",
            fact: np,
            detail: `${symptomLabel(np)} is present, but rule ${rule.id} requires it ABSENT for ${conditionLabel(cid)}. This weakens the ${conditionLabel(cid)} hypothesis.`,
            evidenceFor: `${symptomLabel(np)} reported present`,
            evidenceAgainst: `Rule ${rule.id} → IF … NOT ${symptomLabel(np)} … THEN ${conditionLabel(cid)}`,
            severe: serious.has(np),
          });
        }
      }
    }
  }

  const order = { fact_conflict: 0, simulation_conflict: 1, hypothesis_conflict: 2 };
  return out.sort((a, b) => order[a.type] - order[b.type]);
}

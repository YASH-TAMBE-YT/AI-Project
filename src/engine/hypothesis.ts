/**
 * Hypothesis Engine — the "Hypothesis Arena".
 *
 * Aggregates the forward-chaining trace into scored, competing hypotheses.
 * The Rule Match Score is defined transparently as:
 *
 *    score = 100 × max(0, satisfied − 1.5 × contradicted − 0.5 × unmet) / expected
 *
 * where "expected" is the set of distinct evidence items referenced by the
 * rules of a condition. This is a rule-match score — NOT a medical probability.
 */

import type { BackwardReport, Explanation, FactBase, Hypothesis, Rule, RuleEvaluation } from "./types";
import { conditionLabel, isDerivedFact, symptomLabel } from "@/data/knowledgeBase";
import { latestRuleStatuses } from "./forward";

const PENALTY_CONTRADICTION = 1.5;
const PENALTY_UNMET = 0.5;

export interface HypothesisBuildInput {
  conditionIds: string[];
  facts: FactBase;
  rules: Rule[];
  derivedSet: Set<string>;
  forwardTrace: RuleEvaluation[];
  backwardReports: Map<string, BackwardReport>;
  askedIds: Set<string>;
}

function evidenceState(id: string, facts: FactBase, derivedSet: Set<string>): "present" | "absent" | "unknown" {
  if (isDerivedFact(id)) return derivedSet.has(id) ? "present" : "unknown";
  return facts[id] ?? "unknown";
}

function buildExplanation(
  conditionId: string,
  condRules: Rule[],
  latest: Map<string, RuleEvaluation>,
  supporting: string[],
  missing: string[],
  contradicting: string[],
  askedIds: Set<string>,
): Explanation {
  const supportingEvidence = supporting.map((f) => {
    const via = condRules.find((r) => r.premises.includes(f) && latest.get(r.id)?.status === "fired");
    return { fact: f, via: via ? via.id : "—" };
  });

  const missingEvidence = missing
    .filter((f) => !isDerivedFact(f))
    .map((f) => ({ fact: f, asked: askedIds.has(f) }));

  const contradictoryEvidence = contradicting.map((f) => {
    const rule = condRules.find((r) => r.notPremises.includes(f));
    return {
      fact: f,
      reason: `Rule ${rule?.id ?? "?"} requires ${symptomLabel(f)} to be ABSENT for ${conditionLabel(conditionId)}, but it was reported present.`,
    };
  });

  const firedRuleNarratives = condRules
    .filter((r) => latest.get(r.id)?.status === "fired")
    .map((r) => {
      const parts = r.premises.map(symptomLabel).join(` ${r.operator} `);
      const nots = r.notPremises.length ? ` while NOT ${r.notPremises.map(symptomLabel).join(", NOT ")}` : "";
      return `${r.id} — ${r.name}: ${parts || "∅"}${nots} → ${conditionLabel(r.conclusion)}`;
    });

  const label = conditionLabel(conditionId);
  const plainSummary = [
    supporting.length
      ? `${label} is supported by ${supporting.length} evidence item${supporting.length > 1 ? "s" : ""} (${supporting.slice(0, 4).map(symptomLabel).join(", ")}) via ${firedRuleNarratives.length} fired rule${firedRuleNarratives.length === 1 ? "" : "s"}.`
      : `${label} currently has no satisfied supporting rules.`,
    missing.filter((f) => !isDerivedFact(f)).length
      ? `${missing.filter((f) => !isDerivedFact(f)).length} expected item(s) are still unknown.`
      : "No expected evidence remains unknown.",
    contradicting.length
      ? `${contradicting.length} contradiction${contradicting.length > 1 ? "s" : ""} actively weaken this hypothesis.`
      : "No contradictory evidence detected.",
  ].join(" ");

  return { headline: `Why is ${label} ranked here?`, supportingEvidence, missingEvidence, contradictoryEvidence, firedRuleNarratives, plainSummary };
}

export function buildHypotheses(input: HypothesisBuildInput): Hypothesis[] {
  const { conditionIds, facts, rules, derivedSet, forwardTrace, backwardReports, askedIds } = input;
  const latest = latestRuleStatuses(forwardTrace);
  const cards: Hypothesis[] = [];

  for (const cid of conditionIds) {
    const condRules = rules.filter((r) => r.conclusion === cid);
    if (condRules.length === 0) continue;

    const expected = new Set<string>();
    const mustBeAbsent = new Set<string>();
    for (const r of condRules) {
      r.premises.forEach((p) => expected.add(p));
      r.notPremises.forEach((np) => mustBeAbsent.add(np));
    }

    const supporting: string[] = [];
    const missing: string[] = [];
    const unmet: string[] = [];
    for (const e of expected) {
      const st = evidenceState(e, facts, derivedSet);
      if (st === "present") supporting.push(e);
      else if (st === "absent") unmet.push(e);
      else missing.push(e);
    }

    const contradicting: string[] = [];
    for (const np of mustBeAbsent) {
      if (evidenceState(np, facts, derivedSet) === "present") contradicting.push(np);
    }

    const fired = condRules.filter((r) => latest.get(r.id)?.status === "fired").map((r) => r.id);
    const pending = condRules.filter((r) => latest.get(r.id)?.status === "pending").map((r) => r.id);
    const failedR = condRules.filter((r) => latest.get(r.id)?.status === "failed").map((r) => r.id);

    // a hypothesis enters the arena only if some evidence supports it
    if (supporting.length === 0 && contradicting.length === 0) continue;

    const total = expected.size;
    const raw = supporting.length - PENALTY_CONTRADICTION * contradicting.length - PENALTY_UNMET * unmet.length;
    const score = Math.max(0, Math.min(100, Math.round((100 * raw) / total)));

    const verdict = backwardReports.get(cid)?.verdict ?? "insufficient_data";

    cards.push({
      condition: cid,
      label: conditionLabel(cid),
      rank: 0,
      ruleMatchFraction: `${supporting.length}/${total}`,
      satisfiedCount: supporting.length,
      totalExpected: total,
      score,
      supporting,
      missing: missing.filter((m) => !isDerivedFact(m)),
      unmet,
      contradicting,
      firedRules: fired,
      pendingRules: pending,
      failedRules: failedR,
      verdict,
      explanation: buildExplanation(cid, condRules, latest, supporting, missing, contradicting, askedIds),
    });
  }

  cards.sort((a, b) => b.score - a.score || b.satisfiedCount - a.satisfiedCount || a.contradicting.length - b.contradicting.length);
  cards.forEach((c, i) => (c.rank = i + 1));
  return cards;
}

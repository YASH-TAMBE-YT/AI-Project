/**
 * Backward Chaining — goal-driven inference.
 *
 * Given a hypothesis (goal condition), the engine finds all rules capable of
 * deriving it, then recursively proves each premise against the fact base.
 * Premises that are themselves derivable facts (x_*) recurse into sub-goals,
 * producing a full AND/OR proof tree with satisfied / failed / unknown states.
 */

import type { BackwardReport, FactBase, ProofNode, Rule } from "./types";
import { conditionLabel, isDerivedFact, symptomLabel } from "@/data/knowledgeBase";

interface Ctx {
  facts: FactBase;
  rules: Rule[];
  derivedSet: Set<string>;
  depthLimit: number;
}

function proveFact(id: string, ctx: Ctx, depth: number, visited: Set<string>): ProofNode {
  const label = symptomLabel(id);

  // direct evidence in the patient's fact base
  if (!isDerivedFact(id)) {
    const st = ctx.facts[id] ?? "unknown";
    const status = st === "present" ? "satisfied" : st === "absent" ? "failed" : "unknown";
    return {
      goal: id, kind: "fact", status,
      detail: st === "present" ? `${label} reported present` : st === "absent" ? `${label} reported absent` : `${label} not yet established`,
      children: [],
    };
  }

  // derived fact → recurse into the rules that produce it
  if (ctx.derivedSet.has(id)) {
    // proven by forward chaining already; still expand the sub-proof for explainability
  }
  if (depth >= ctx.depthLimit || visited.has(id)) {
    return {
      goal: id, kind: "fact",
      status: ctx.derivedSet.has(id) ? "satisfied" : "unknown",
      detail: `${label} — depth limit reached`, children: [],
    };
  }
  visited.add(id);
  const producing = ctx.rules.filter((r) => r.conclusion === id);
  const children = producing.map((r) => proveRule(r, ctx, depth + 1, new Set(visited)));
  const anySat = children.some((c) => c.status === "satisfied");
  const allFail = children.length > 0 && children.every((c) => c.status === "failed");
  return {
    goal: id, kind: "fact",
    status: anySat ? "satisfied" : allFail ? "failed" : "unknown",
    detail: `${label} must be derived by rule`,
    children,
  };
}

function proveRule(rule: Rule, ctx: Ctx, depth: number, visited: Set<string>): ProofNode {
  const children: ProofNode[] = rule.premises.map((p) => proveFact(p, ctx, depth, new Set(visited)));
  const notChildren: ProofNode[] = rule.notPremises.map((np) => {
    const st = ctx.facts[np] ?? "unknown";
    // For a NOT-premise the requirement is "must be ABSENT"
    return {
      goal: `NOT ${np}`, kind: "fact" as const,
      status: st === "absent" ? "satisfied" as const : st === "present" ? "failed" as const : "unknown" as const,
      detail: st === "present"
        ? `${symptomLabel(np)} is present — conflicts with rule requirement`
        : st === "absent"
          ? `${symptomLabel(np)} confirmed absent`
          : `absence of ${symptomLabel(np)} not confirmed`,
      children: [],
    };
  });

  const all = [...children, ...notChildren];
  const posStatuses = children.map((c) => c.status);
  const anyFailed = posStatuses.includes("failed") || notChildren.some((n) => n.status === "failed");
  const blocked = notChildren.some((n) => n.status === "failed");

  let status: ProofNode["status"];
  if (rule.operator === "AND") {
    if (anyFailed) status = "failed";
    else if (all.every((n) => n.status === "satisfied")) status = "satisfied";
    else status = "unknown";
  } else {
    if (blocked) status = "failed";
    else if (posStatuses.includes("satisfied")) status = "satisfied";
    else if (posStatuses.every((s) => s === "failed")) status = "failed";
    else status = "unknown";
  }

  const premiseLabels = rule.premises.map(symptomLabel).join(` ${rule.operator} `);
  const notLabels = rule.notPremises.length ? ` · NOT ${rule.notPremises.map(symptomLabel).join(" · NOT ")}` : "";
  return {
    goal: rule.id, kind: "rule", ruleId: rule.id, status,
    detail: `IF ${premiseLabels}${notLabels} → ${conditionLabel(rule.conclusion)}`,
    children: all,
  };
}

/** Verify a hypothesis via backward chaining and return a structured report. */
export function runBackwardChaining(
  hypothesis: string,
  facts: FactBase,
  rules: Rule[],
  derivedSet: Set<string>,
  depthLimit = 6,
): BackwardReport {
  const ctx: Ctx = { facts, rules, derivedSet, depthLimit };
  const relevant = rules.filter((r) => r.conclusion === hypothesis);
  const ruleNodes = relevant.map((r) => proveRule(r, ctx, 1, new Set([hypothesis])));

  const satisfied = new Set<string>();
  const failed = new Set<string>();
  const unknown = new Set<string>();
  const contradicting: string[] = [];

  const collect = (n: ProofNode) => {
    if (n.kind === "fact" && !n.goal.startsWith("NOT ")) {
      if (n.status === "satisfied") satisfied.add(n.goal);
      else if (n.status === "failed" && !isDerivedFact(n.goal)) failed.add(n.goal);
      else if (n.status === "unknown") unknown.add(n.goal);
    }
    if (n.kind === "fact" && n.goal.startsWith("NOT ") && n.status === "failed") {
      contradicting.push(n.goal.replace("NOT ", ""));
    }
    n.children.forEach(collect);
  };
  ruleNodes.forEach(collect);

  const patternRule = relevant.find((r) => r.kind === "pattern");
  const patternNode = patternRule ? ruleNodes[relevant.indexOf(patternRule)] : undefined;

  let verdict: BackwardReport["verdict"];
  if (contradicting.length > 0) verdict = "weakened";
  else if (patternNode?.status === "satisfied") verdict = "verified";
  else if (patternNode?.status === "failed") verdict = "weakened";
  else if (satisfied.size > 0) verdict = "partially_supported";
  else verdict = "insufficient_data";

  const root: ProofNode = {
    goal: hypothesis, kind: "condition",
    status: verdict === "verified" ? "satisfied" : verdict === "weakened" ? "failed" : "unknown",
    detail: `Verification of ${conditionLabel(hypothesis)} via ${relevant.length} rule(s)`,
    children: ruleNodes,
  };

  const verdictText: Record<BackwardReport["verdict"], string> = {
    verified: "Core pattern fully supported by current evidence",
    partially_supported: "Some evidence supports this hypothesis; key facts remain unverified",
    insufficient_data: "Not enough evidence to evaluate this hypothesis",
    weakened: contradicting.length
      ? `Contradictory evidence present (${contradicting.map(symptomLabel).join(", ")})`
      : "A required premise of the core pattern is known to be absent",
  };

  return {
    hypothesis,
    verdict,
    proofTree: root,
    satisfied: [...satisfied],
    failed: [...failed],
    unknown: [...unknown],
    contradicting,
    summary: verdictText[verdict],
  };
}

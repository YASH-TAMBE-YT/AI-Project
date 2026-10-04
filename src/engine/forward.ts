/**
 * Forward Chaining — data-driven inference.
 *
 * Starts from known facts (present symptoms) and repeatedly evaluates every
 * production rule. A rule FIRES when:
 *   - AND rule: every positive premise is true and every NOT-premise is false
 *   - OR  rule: at least one positive premise is true and all NOT-premises are false
 * A rule is FAILED when it can never fire given current knowledge
 * (a required premise is known false, or a NOT-premise is known true).
 * Otherwise it stays PENDING (waiting on unknown evidence).
 *
 * Derived facts (x_*) feed back into the fact base, enabling multi-hop
 * inference. The loop runs to a fixpoint and records a full trace.
 */

import type { FactBase, Rule, RuleEvaluation } from "./types";
import { isDerivedFact } from "@/data/knowledgeBase";

export interface ForwardResult {
  derivedConclusions: string[];   // condition ids concluded by fired rules
  derivedFacts: string[];         // intermediate facts x_* that were derived
  trace: RuleEvaluation[];        // every rule evaluated, in order
  iterations: number;
}

type Tri = "present" | "absent" | "unknown";

function factState(facts: FactBase, derivedSet: Set<string>, id: string): Tri {
  if (isDerivedFact(id)) return derivedSet.has(id) ? "present" : "unknown";
  return facts[id] ?? "unknown";
}

/** Evaluate a single rule against facts + derived facts. */
export function evaluateRule(rule: Rule, facts: FactBase, derivedSet: Set<string>, iteration: number): RuleEvaluation {
  const satisfied: string[] = [];
  const failed: string[] = [];
  const unknown: string[] = [];
  const blockedBy: string[] = [];

  for (const np of rule.notPremises) {
    const st = factState(facts, derivedSet, np);
    if (st === "present") blockedBy.push(np);
    else if (st === "unknown") unknown.push(np);
  }

  let anyTrue = false;
  for (const p of rule.premises) {
    const st = factState(facts, derivedSet, p);
    if (st === "present") { satisfied.push(p); anyTrue = true; }
    else if (st === "absent") failed.push(p);
    else unknown.push(p);
  }

  let status: RuleEvaluation["status"];
  if (rule.premises.length === 0 && rule.notPremises.length === 0) {
    status = "failed";
  } else if (rule.operator === "AND") {
    if (failed.length > 0 || blockedBy.length > 0) status = "failed";
    else if (unknown.length > 0) status = "pending";
    else status = rule.premises.length > 0 || rule.notPremises.some((np) => factState(facts, derivedSet, np) === "absent") ? "fired" : "pending";
  } else {
    // OR rule: at least one positive premise true, no blockers
    if (blockedBy.length > 0) status = "failed";
    else if (anyTrue) status = "fired";
    else if (failed.length === rule.premises.length) status = "failed";
    else status = "pending";
  }

  return {
    ruleId: rule.id,
    status,
    satisfied,
    failed,
    unknown,
    blockedBy: blockedBy.length ? blockedBy : undefined,
    conclusion: rule.conclusion,
    kind: rule.kind,
    iteration,
  };
}

/** Run forward chaining to a fixpoint. Trace preserves evaluation order per cycle. */
export function runForwardChaining(facts: FactBase, rules: Rule[], maxIterations = 12): ForwardResult {
  const derivedSet = new Set<string>();
  const concluded = new Set<string>();
  const firedIds = new Set<string>();
  const trace: RuleEvaluation[] = [];
  let iterations = 0;
  let changed = true;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations += 1;
    for (const rule of rules) {
      if (firedIds.has(rule.id)) continue; // a fired rule stays fired (monotonic inference)
      const ev = evaluateRule(rule, facts, derivedSet, iterations);
      trace.push(ev);
      if (ev.status === "fired") {
        firedIds.add(rule.id);
        if (isDerivedFact(rule.conclusion)) {
          if (!derivedSet.has(rule.conclusion)) { derivedSet.add(rule.conclusion); changed = true; }
        } else {
          concluded.add(rule.conclusion);
          // conclusions may also be used as premises in future extensions; track change anyway
          changed = changed || false;
        }
      }
    }
  }

  // final verification pass for rules that never fired (status for display)
  for (const rule of rules) {
    if (firedIds.has(rule.id)) continue;
    // status from last evaluation already in trace
  }

  return {
    derivedConclusions: [...concluded],
    derivedFacts: [...derivedSet],
    trace,
    iterations,
  };
}

/** Latest evaluation status of each rule (last occurrence in the trace). */
export function latestRuleStatuses(trace: RuleEvaluation[]): Map<string, RuleEvaluation> {
  const map = new Map<string, RuleEvaluation>();
  for (const ev of trace) map.set(ev.ruleId, ev);
  return map;
}

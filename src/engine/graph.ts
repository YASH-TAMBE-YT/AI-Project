/**
 * Reasoning Graph Builder.
 *
 * Converts the inference result into a layered node/edge graph:
 *   Layer 0  symptoms (present / absent / unknown)
 *   Layer 1  derived intermediate facts
 *   Layer 2  production rules (fired / pending / failed)
 *   Layer 3  conditions (top / candidate / eliminated)
 *
 * Edge semantics: supports · requires · produces · contradicts · derives.
 */

import type { FactBase, GraphEdge, GraphNode, Hypothesis, ReasoningGraph, Rule, RuleEvaluation } from "./types";
import { isDerivedFact, symptomLabel } from "@/data/knowledgeBase";
import { latestRuleStatuses } from "./forward";

interface GraphInput {
  facts: FactBase;
  rules: Rule[];
  trace: RuleEvaluation[];
  hypotheses: Hypothesis[];
  derivedFacts: string[];
  topN?: number;
}

export function buildReasoningGraph(input: GraphInput): ReasoningGraph {
  const { facts, rules, trace, hypotheses, derivedFacts, topN = 3 } = input;
  const latest = latestRuleStatuses(trace);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const arena = hypotheses.slice(0, topN);
  if (arena.length === 0) return { nodes: [], edges: [] };

  const addNode = (n: GraphNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); };
  const pushEdge = (e: GraphEdge) => edges.push(e);

  const symptomState = (id: string): GraphNode["state"] => facts[id] === "present" ? "present" : facts[id] === "absent" ? "absent" : "unknown";
  const seenPairs = new Set<string>();
  const safeEdge = (e: GraphEdge) => {
    const k = `${e.from}->${e.to}:${e.kind}`;
    if (!seenPairs.has(k)) { seenPairs.add(k); pushEdge(e); }
  };

  for (const hyp of arena) {
    const condRules = rules.filter((r) => r.conclusion === hyp.condition);

    addNode({
      id: hyp.condition, kind: "condition", label: hyp.label, layer: 3,
      state: hyp.rank === 1 ? "top" : "candidate",
      meta: `${hyp.ruleMatchFraction} · score ${hyp.score}`,
    });

    for (const rule of condRules) {
      const ev = latest.get(rule.id);
      const ruleState: GraphNode["state"] = ev?.status === "fired" ? "fired" : ev?.status === "pending" ? "pending" : "failed";
      addNode({
        id: rule.id, kind: "rule", label: rule.id, layer: 2, state: ruleState,
        meta: rule.name,
      });
      safeEdge({ from: rule.id, to: hyp.condition, kind: "produces", active: ruleState === "fired" });

      for (const p of rule.premises) {
        if (isDerivedFact(p)) {
          addNode({ id: p, kind: "derived", label: symptomLabel(p), layer: 1, state: derivedFacts.includes(p) ? "present" : "unknown", meta: "derived fact" });
          safeEdge({ from: p, to: rule.id, kind: "requires", active: derivedFacts.includes(p) });

          // expand the derivation chain of the intermediate fact
          const derivRule = rules.find((r) => r.conclusion === p);
          const drivEv = derivRule ? latest.get(derivRule.id) : undefined;
          if (derivRule) {
            addNode({ id: derivRule.id, kind: "rule", label: derivRule.id, layer: 2, state: drivEv?.status === "fired" ? "fired" : drivEv?.status === "pending" ? "pending" : "failed", meta: derivRule.name });
            safeEdge({ from: derivRule.id, to: p, kind: "derives", active: drivEv?.status === "fired" });
            for (const dp of derivRule.premises) {
              addNode({ id: dp, kind: "symptom", label: symptomLabel(dp), layer: 0, state: symptomState(dp) });
              safeEdge({ from: dp, to: derivRule.id, kind: "supports", active: facts[dp] === "present" });
            }
          }
        } else {
          addNode({ id: p, kind: "symptom", label: symptomLabel(p), layer: 0, state: symptomState(p) });
          safeEdge({ from: p, to: rule.id, kind: "supports", active: facts[p] === "present" });
        }
      }

      for (const np of rule.notPremises) {
        addNode({ id: np, kind: "symptom", label: symptomLabel(np), layer: 0, state: symptomState(np) });
        safeEdge({ from: np, to: rule.id, kind: "contradicts", negative: true, active: facts[np] === "present" });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}

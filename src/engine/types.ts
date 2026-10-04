/**
 * MediLogic X — Core domain types
 * These types are shared by the inference engine, the REST API layer
 * and the UI. The same shapes are returned by the Python backend.
 */

export type SymptomState = "present" | "absent" | "unknown";
export type FactBase = Record<string, SymptomState>;

export interface Symptom {
  id: string;
  label: string;
  category: string;
  description?: string;
  seriousFlag?: boolean;
}

export interface Condition {
  id: string;
  label: string;
  description: string;
  severity: "mild" | "moderate" | "attention";
  care: string;
}

export type RuleOperator = "AND" | "OR";
export type RuleKind = "pattern" | "support" | "derived";

/** A production rule of the knowledge base. */
export interface Rule {
  id: string;
  name: string;
  premises: string[];          // facts that must be PRESENT
  notPremises: string[];       // facts that must be ABSENT
  operator: RuleOperator;      // AND | OR over positive premises
  conclusion: string;          // condition id OR derived fact id (x_*)
  kind: RuleKind;
  note?: string;
  locked?: boolean;            // seeded rules cannot be hard-deleted from UI? (allowed, but restorable)
}

/** Result of evaluating one rule inside forward chaining. */
export interface RuleEvaluation {
  ruleId: string;
  status: "fired" | "failed" | "pending";
  satisfied: string[];   // premises evaluated true
  failed: string[];      // premises evaluated false
  unknown: string[];     // premises currently unknown
  blockedBy?: string[];  // NOT-premises that were present
  conclusion: string;
  kind: RuleKind;
  iteration: number;     // forward-chaining cycle in which it fired
}

export interface FiredRuleEvent {
  rule: string;
  ruleName: string;
  conditions: string[];
  operator: RuleOperator;
  result: string;
  status: "fired";
  iteration: number;
}

/** One node of a backward-chaining proof tree. */
export interface ProofNode {
  goal: string;                       // condition / derived fact / symptom id
  kind: "condition" | "rule" | "fact";
  status: "satisfied" | "failed" | "unknown";
  ruleId?: string;
  detail?: string;
  children: ProofNode[];
}

export interface BackwardReport {
  hypothesis: string;
  verdict: "verified" | "partially_supported" | "insufficient_data" | "weakened";
  proofTree: ProofNode;
  satisfied: string[];
  failed: string[];
  unknown: string[];
  contradicting: string[];
  summary: string;
}

/** Scored hypothesis card shown in the arena. */
export interface Hypothesis {
  condition: string;
  label: string;
  rank: number;
  ruleMatchFraction: string;   // "4/5"
  satisfiedCount: number;
  totalExpected: number;
  score: number;               // 0–100 rule-match score (not a medical probability)
  supporting: string[];        // satisfied expected evidence
  missing: string[];           // unknown expected evidence
  unmet: string[];             // absent expected evidence
  contradicting: string[];     // present symptoms that rules require absent
  firedRules: string[];
  pendingRules: string[];
  failedRules: string[];
  verdict: BackwardReport["verdict"];
  explanation: Explanation;
}

export interface Explanation {
  headline: string;
  supportingEvidence: { fact: string; via: string }[];
  missingEvidence: { fact: string; asked: boolean }[];
  contradictoryEvidence: { fact: string; reason: string }[];
  firedRuleNarratives: string[];
  plainSummary: string;
}

export interface Contradiction {
  id: string;
  type: "fact_conflict" | "hypothesis_conflict" | "simulation_conflict";
  fact: string;
  detail: string;
  evidenceFor: string;
  evidenceAgainst: string;
  severe: boolean;
}

export interface NextBestQuestion {
  symptom: string;
  label: string;
  question: string;
  discriminationPower: number;
  whyThisQuestion: string;
  impacts: { condition: string; label: string; ifYes: number; ifNo: number; current: number }[];
}

export interface GraphNode {
  id: string;
  kind: "symptom" | "derived" | "rule" | "condition";
  label: string;
  state: "present" | "absent" | "unknown" | "fired" | "pending" | "failed" | "top" | "candidate" | "eliminated";
  layer: number;
  meta?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "supports" | "requires" | "produces" | "contradicts" | "derives";
  active: boolean;
  negative?: boolean;
}

export interface ReasoningGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type PipelineEventType =
  | "facts"
  | "rule_matching"
  | "rule_fired"
  | "derived_fact"
  | "hypothesis"
  | "backward"
  | "contradiction"
  | "question"
  | "result";

export interface PipelineEvent {
  type: PipelineEventType;
  title: string;
  detail: string;
  mono?: string[];
}

export interface EngineRequest {
  facts: FactBase;
  simulation?: FactBase;         // what-if overlay
  focusHypothesis?: string;      // backward mode
  depthLimit?: number;
}

export interface EngineResponse {
  facts: FactBase;
  effectiveFacts: FactBase;
  derivedFacts: string[];
  forwardTrace: RuleEvaluation[];
  fireCount: number;
  iterations: number;
  hypotheses: Hypothesis[];
  backwardReports: BackwardReport[];
  contradictions: Contradiction[];
  nextBestQuestion: NextBestQuestion | null;
  graph: ReasoningGraph;
  events: PipelineEvent[];
  stats: {
    factsKnown: number;
    rulesEvaluated: number;
    rulesFired: number;
    iterations: number;
    reasoningSteps: number;
  };
  simulated: boolean;
}

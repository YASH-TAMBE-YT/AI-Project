/**
 * Local persistence layer.
 * In the full deployment these are mirrored by the FastAPI + SQLite backend;
 * in the standalone build they persist to localStorage so every feature
 * (custom rules, history, metrics) remains fully functional offline.
 */

import type { Rule } from "@/engine/types";
import { RULES } from "@/data/knowledgeBase";

const K = {
  customRules: "mlx.customRules.v1",
  ruleOverrides: "mlx.ruleOverrides.v1",
  ruleDeleted: "mlx.ruleDeleted.v1",
  history: "mlx.history.v1",
  metrics: "mlx.metrics.v1",
  seeded: "mlx.seeded.v1",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

/* ---------------- active knowledge base (seed + overlays) ---------------- */

export function loadActiveRules(): Rule[] {
  const custom = read<Rule[]>(K.customRules, []);
  const overrides = read<Record<string, Partial<Rule>>>(K.ruleOverrides, {});
  const deleted = new Set(read<string[]>(K.ruleDeleted, []));
  const base = RULES
    .filter((r) => !deleted.has(r.id))
    .map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } as Rule : r));
  return [...base, ...custom];
}

export function saveCustomRule(rule: Rule) {
  const custom = read<Rule[]>(K.customRules, []);
  const idx = custom.findIndex((r) => r.id === rule.id);
  if (idx >= 0) custom[idx] = rule; else custom.push(rule);
  write(K.customRules, custom);
}

export function overrideRule(rule: Rule, isSeeded: boolean) {
  if (isSeeded) {
    const overrides = read<Record<string, Partial<Rule>>>(K.ruleOverrides, {});
    overrides[rule.id] = rule;
    write(K.ruleOverrides, overrides);
  } else {
    saveCustomRule(rule);
  }
}

export function deleteRule(id: string, isSeeded: boolean) {
  if (isSeeded) {
    const deleted = read<string[]>(K.ruleDeleted, []);
    if (!deleted.includes(id)) { deleted.push(id); write(K.ruleDeleted, deleted); }
  } else {
    write(K.customRules, read<Rule[]>(K.customRules, []).filter((r) => r.id !== id));
  }
}

export function resetKnowledgeBase() {
  localStorage.removeItem(K.customRules);
  localStorage.removeItem(K.ruleOverrides);
  localStorage.removeItem(K.ruleDeleted);
}

export function isSeededRule(id: string): boolean {
  return RULES.some((r) => r.id === id);
}

export function nextRuleId(existing: Rule[]): string {
  let max = 0;
  for (const r of existing) {
    const m = /^R(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `R${String(max + 1).padStart(3, "0")}`;
}

/* ---------------- diagnosis history ---------------- */

export interface HistoryEntry {
  id: string;
  date: string;
  mode: "forward" | "backward";
  topMatch: string;
  scoreText: string;
  verdict: string;
  factsKnown: number;
  questionsAsked: number;
  contradictions: number;
  ageBand?: string;
  gender?: string;
  demo?: boolean;
}

export function loadHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(K.history, []);
}

export function saveHistory(entries: HistoryEntry[]) {
  write(K.history, entries.slice(0, 30));
}

export function clearHistory() {
  write(K.history, []);
}

export function seedDemoHistoryIfEmpty(): HistoryEntry[] {
  const existing = loadHistory();
  if (existing.length > 0 || read(K.seeded, false)) return existing;
  const demo: HistoryEntry[] = [
    {
      id: "demo-1", date: new Date(Date.now() - 86400000 * 2).toISOString(), mode: "forward",
      topMatch: "Influenza (Flu)", scoreText: "5/5", verdict: "verified", factsKnown: 6,
      questionsAsked: 1, contradictions: 0, ageBand: "18–30", gender: "female", demo: true,
    },
    {
      id: "demo-2", date: new Date(Date.now() - 86400000 * 6).toISOString(), mode: "backward",
      topMatch: "Migraine", scoreText: "3/4", verdict: "partially_supported", factsKnown: 5,
      questionsAsked: 2, contradictions: 1, ageBand: "31–45", gender: "male", demo: true,
    },
  ];
  saveHistory(demo);
  write(K.seeded, true);
  return demo;
}

/* ---------------- run metrics ---------------- */

export interface Metrics {
  inferenceRuns: number;
  forwardRuns: number;
  backwardRuns: number;
  contradictionsDetected: number;
  questionsAsked: number;
  totalReasoningSteps: number;
}

export function loadMetrics(): Metrics {
  return read<Metrics>(K.metrics, {
    inferenceRuns: 0, forwardRuns: 0, backwardRuns: 0,
    contradictionsDetected: 0, questionsAsked: 0, totalReasoningSteps: 0,
  });
}

export function recordRun(m: Metrics) { write(K.metrics, m); }

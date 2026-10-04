/**
 * API service layer.
 *
 * Production deployment: all inference is executed by the FastAPI backend
 * (POST /api/diagnosis/forward etc.) — the UI never computes diagnoses.
 *
 * Standalone/static build: the same request is routed to the bundled engine
 * in src/engine, a 1:1 TypeScript port of the Python inference engine kept
 * UI-independent. The response shape is identical in both cases.
 */

import type { EngineRequest, EngineResponse, Rule } from "@/engine/types";
import { runInference } from "@/engine/index";
import { CONDITIONS, SYMPTOMS } from "@/data/knowledgeBase";
import { loadActiveRules } from "./storage";

export const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? "";
const TIMEOUT_MS = 900;

let backendAvailable: boolean | null = null;

async function pingBackend(): Promise<boolean> {
  if (!API_BASE) return false;
  if (backendAvailable !== null) return backendAvailable;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/api/knowledge/symptoms`, { signal: ctrl.signal });
    clearTimeout(t);
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

export interface InferenceExtras {
  askedIds: Set<string>;
  rules?: Rule[];
}

export async function requestInference(req: EngineRequest, extras: InferenceExtras): Promise<EngineResponse> {
  const rules = extras.rules ?? loadActiveRules();

  if (await pingBackend()) {
    try {
      const res = await fetch(`${API_BASE}/api/diagnosis/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, asked_ids: [...extras.askedIds] }),
      });
      if (res.ok) return (await res.json()) as EngineResponse;
    } catch { /* fall through to local engine */ }
  }

  // offline mirror of the Python inference engine
  return runInference(req, {
    rules,
    symptoms: SYMPTOMS,
    conditionIds: CONDITIONS.map((c) => c.id),
    askedIds: extras.askedIds,
  });
}

export async function fetchKnowledge() {
  return { symptoms: SYMPTOMS, conditions: CONDITIONS };
}

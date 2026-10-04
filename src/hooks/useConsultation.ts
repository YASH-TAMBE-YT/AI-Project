/**
 * useConsultation — state machine for the diagnostic interview.
 *
 * Owns the patient fact base and orchestrates reasoning cycles through the
 * API layer. The UI never implements inference logic itself.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { EngineResponse, FactBase, SymptomState } from "@/engine/types";
import { EMPTY_FACTS } from "@/data/knowledgeBase";
import { requestInference } from "@/services/api";
import { loadMetrics, recordRun } from "@/services/storage";

export type ConsultMode = "forward" | "backward";
export type ConsultStage = "intake" | "symptoms" | "results";

export interface PatientInfo {
  age: string;
  gender: string;
  identifier: string;
}

export interface ConsultationState {
  stage: ConsultStage;
  mode: ConsultMode;
  focusHypothesis: string | null;
  patient: PatientInfo;
  facts: FactBase;
  questionsAnswered: number;
  running: boolean;
  result: EngineResponse | null;
  history: EngineResponse[];   // one entry per reasoning cycle
}

const initialPatient: PatientInfo = { age: "", gender: "", identifier: "" };

function freshState(): ConsultationState {
  return {
    stage: "intake",
    mode: "forward",
    focusHypothesis: null,
    patient: initialPatient,
    facts: { ...EMPTY_FACTS },
    questionsAnswered: 0,
    running: false,
    result: null,
    history: [],
  };
}

function trackMetrics(mode: ConsultMode, result: EngineResponse, answered: boolean) {
  const m = loadMetrics();
  m.inferenceRuns += 1;
  if (mode === "forward") m.forwardRuns += 1; else m.backwardRuns += 1;
  m.contradictionsDetected += result.contradictions.length;
  if (answered) m.questionsAsked += 1;
  m.totalReasoningSteps += result.stats.reasoningSteps;
  recordRun(m);
}

export function useConsultation() {
  const [state, setState] = useState<ConsultationState>(freshState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const askedRef = useRef<Set<string>>(new Set());

  const setPatient = useCallback((p: Partial<PatientInfo>) => {
    setState((s) => ({ ...s, patient: { ...s.patient, ...p } }));
  }, []);

  const setFact = useCallback((id: string, value: SymptomState) => {
    setState((s) => ({ ...s, facts: { ...s.facts, [id]: value } }));
  }, []);

  const setFacts = useCallback((facts: FactBase) => {
    setState((s) => ({ ...s, facts }));
  }, []);

  const toSymptoms = useCallback((mode: ConsultMode, focus: string | null) => {
    setState((s) => ({ ...s, stage: "symptoms", mode, focusHypothesis: focus }));
  }, []);

  const backToIntake = useCallback(() => setState((s) => ({ ...s, stage: "intake" })), []);

  const restart = useCallback(() => {
    askedRef.current = new Set();
    setState(freshState());
  }, []);

  /** Full reasoning cycle. A simulation overlay powers What-If mode and never mutates recorded facts. */
  const reason = useCallback(async (opts?: { simulation?: FactBase }) => {
    const snapshot = stateRef.current;
    setState((s) => ({ ...s, running: true }));
    const minDelay = new Promise((r) => setTimeout(r, opts?.simulation ? 120 : 900));

    const result = await requestInference(
      { facts: snapshot.facts, simulation: opts?.simulation },
      { askedIds: new Set(askedRef.current) },
    );
    if (!opts?.simulation) trackMetrics(snapshot.mode, result, false);
    await minDelay;

    setState((s) => ({
      ...s,
      running: false,
      stage: "results",
      result,
      history: opts?.simulation ? s.history : [...s.history.slice(-9), result],
    }));
    return result;
  }, []);

  /** Answer the next-best-question: records the fact, adds it to asked-set, re-reasons. */
  const answerQuestion = useCallback(async (symptom: string, value: SymptomState) => {
    const snapshot = stateRef.current;
    const withAnswer: FactBase = { ...snapshot.facts, [symptom]: value };
    askedRef.current.add(symptom);
    setState((s) => ({ ...s, running: true, facts: withAnswer }));
    const started = performance.now();

    const result = await requestInference({ facts: withAnswer }, { askedIds: new Set(askedRef.current) });
    trackMetrics(snapshot.mode, result, true);

    const elapsed = performance.now() - started;
    if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed));

    setState((s) => ({
      ...s,
      running: false,
      stage: "results",
      questionsAnswered: s.questionsAnswered + 1,
      result,
      history: [...s.history.slice(-9), result],
    }));
    return result;
  }, []);

  return useMemo(() => ({
    state,
    setPatient,
    setFact,
    setFacts,
    toSymptoms,
    backToIntake,
    restart,
    reason,
    answerQuestion,
  }), [state, setPatient, setFact, setFacts, toSymptoms, backToIntake, restart, reason, answerQuestion]);
}

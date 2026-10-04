/**
 * MediLogic X — Seeded Knowledge Base
 * Mirrors backend/knowledge_base.py (SQLite seed).
 * Scope is intentionally limited: 12 everyday conditions, ~24 symptoms, 46 rules.
 * Rules are conservative and educational.
 */

import type { Condition, FactBase, Rule, Symptom } from "@/engine/types";

export const SYMPTOMS: Symptom[] = [
  { id: "fever", label: "Fever", category: "General", description: "Elevated body temperature", seriousFlag: true },
  { id: "chills", label: "Chills", category: "General" },
  { id: "fatigue", label: "Fatigue", category: "General" },
  { id: "body_ache", label: "Body Ache", category: "General" },
  { id: "dizziness", label: "Dizziness", category: "General", seriousFlag: true },
  { id: "loss_of_appetite", label: "Loss of Appetite", category: "General" },
  { id: "thirst", label: "Excessive Thirst", category: "General" },
  { id: "dry_mouth", label: "Dry Mouth", category: "General" },
  { id: "headache", label: "Headache", category: "Head & Neuro" },
  { id: "light_sensitivity", label: "Light Sensitivity", category: "Head & Neuro" },
  { id: "cough", label: "Cough", category: "Respiratory" },
  { id: "sore_throat", label: "Sore Throat", category: "Respiratory" },
  { id: "sneezing", label: "Sneezing", category: "Respiratory" },
  { id: "runny_nose", label: "Runny Nose", category: "Respiratory" },
  { id: "nasal_congestion", label: "Nasal Congestion", category: "Respiratory" },
  { id: "itchy_eyes", label: "Itchy Eyes", category: "Respiratory" },
  { id: "facial_pressure", label: "Facial Pressure", category: "Respiratory" },
  { id: "chest_discomfort", label: "Chest Discomfort", category: "Chest", seriousFlag: true },
  { id: "difficulty_breathing", label: "Difficulty Breathing", category: "Chest", seriousFlag: true },
  { id: "joint_pain", label: "Joint Pain", category: "General" },
  { id: "nausea", label: "Nausea", category: "Digestive" },
  { id: "vomiting", label: "Vomiting", category: "Digestive", seriousFlag: true },
  { id: "diarrhea", label: "Diarrhea", category: "Digestive" },
  { id: "abdominal_pain", label: "Abdominal Pain", category: "Digestive" },
];

export const DERIVED_FACTS = [
  { id: "x_respiratory_distress", label: "Respiratory Distress (derived)" },
  { id: "x_gi_distress", label: "GI Distress (derived)" },
];

export const CONDITIONS: Condition[] = [
  { id: "common_cold", label: "Common Cold", severity: "mild", description: "Viral upper-respiratory pattern dominated by nasal symptoms; fever is typically absent.", care: "Rest, fluids, monitor. Usually self-limiting." },
  { id: "influenza", label: "Influenza (Flu)", severity: "moderate", description: "Systemic viral pattern: fever, cough, sore throat with body involvement.", care: "Rest and hydration; seek care if breathing difficulty or persistent high fever." },
  { id: "allergy", label: "Allergic Rhinitis", severity: "mild", description: "Immune response pattern: sneezing, itchy eyes and runny nose WITHOUT fever or body ache.", care: "Avoid triggers; non-urgent." },
  { id: "migraine", label: "Migraine", severity: "moderate", description: "Neurological headache pattern with light sensitivity and nausea.", care: "Rest in a dark, quiet room; consult a professional if recurrent or severe." },
  { id: "gastritis", label: "Gastritis", severity: "moderate", description: "Stomach-lining irritation pattern: upper abdominal pain with nausea, typically without diarrhea.", care: "Diet adjustments; seek care for persistent pain." },
  { id: "food_poisoning", label: "Food Poisoning", severity: "moderate", description: "Acute GI pattern: vomiting and diarrhea with abdominal pain after food exposure.", care: "Hydration is critical; seek care if severe or bloody." },
  { id: "dehydration", label: "Dehydration", severity: "attention", description: "Fluid-deficit pattern: excessive thirst, dry mouth and dizziness.", care: "Oral rehydration; seek urgent care if fainting or confusion." },
  { id: "sinusitis", label: "Sinusitis", severity: "mild", description: "Sinus inflammation pattern: congestion with facial pressure and headache.", care: "Steam, fluids; consult if >10 days." },
  { id: "bronchitis", label: "Bronchitis", severity: "attention", description: "Airway inflammation pattern: persistent cough with chest discomfort.", care: "Seek professional evaluation, especially with breathing difficulty." },
  { id: "pharyngitis", label: "Pharyngitis", severity: "mild", description: "Throat-infection pattern: sore throat with fever but typically no cough.", care: "Gargle, fluids; test if persistent fever." },
  { id: "gastroenteritis", label: "Gastroenteritis", severity: "moderate", description: "Stomach-flu pattern: nausea, vomiting and diarrhea together, often with fever.", care: "Hydration; monitor for dehydration signs." },
  { id: "tension_headache", label: "Tension Headache", severity: "mild", description: "Tension-type headache with fatigue but WITHOUT light sensitivity or nausea.", care: "Rest, hydration, posture breaks." },
];

/**
 * Production rules.
 * kind "pattern"  → core signature of a condition (AND-heavy, may use NOT premises)
 * kind "support"  → additional evidence that strengthens a hypothesis
 * kind "derived"  → intermediate facts (conclusions starting with x_) usable as premises
 */
export const RULES: Rule[] = [
  /* ---- derived intermediate facts (enable multi-hop chaining) ---- */
  { id: "R200", name: "Respiratory Distress Derivation", premises: ["cough", "difficulty_breathing"], notPremises: [], operator: "AND", conclusion: "x_respiratory_distress", kind: "derived", note: "Cough combined with breathing difficulty signals airway involvement." },
  { id: "R201", name: "GI Distress Derivation", premises: ["vomiting", "diarrhea"], notPremises: [], operator: "OR", conclusion: "x_gi_distress", kind: "derived", note: "Either vomiting or diarrhea signals acute GI involvement." },

  /* ---- common cold ---- */
  { id: "R001", name: "Cold Core Pattern", premises: ["runny_nose", "sneezing", "nasal_congestion"], notPremises: ["fever"], operator: "AND", conclusion: "common_cold", kind: "pattern" },
  { id: "R002", name: "Cold — throat irritation", premises: ["sore_throat"], notPremises: [], operator: "AND", conclusion: "common_cold", kind: "support" },
  { id: "R003", name: "Cold — cough", premises: ["cough"], notPremises: [], operator: "AND", conclusion: "common_cold", kind: "support" },
  { id: "R004", name: "Cold — malaise", premises: ["fatigue"], notPremises: [], operator: "AND", conclusion: "common_cold", kind: "support" },

  /* ---- influenza ---- */
  { id: "R010", name: "Influenza Pattern", premises: ["fever", "cough", "sore_throat"], notPremises: ["itchy_eyes", "runny_nose"], operator: "AND", conclusion: "influenza", kind: "pattern", note: "Systemic respiratory pattern; allergic rhinitis markers excluded." },
  { id: "R011", name: "Flu — body involvement", premises: ["body_ache"], notPremises: [], operator: "AND", conclusion: "influenza", kind: "support" },
  { id: "R012", name: "Flu — fatigue", premises: ["fatigue"], notPremises: [], operator: "AND", conclusion: "influenza", kind: "support" },
  { id: "R013", name: "Flu — chills", premises: ["chills"], notPremises: [], operator: "AND", conclusion: "influenza", kind: "support" },
  { id: "R014", name: "Flu — headache", premises: ["headache"], notPremises: [], operator: "AND", conclusion: "influenza", kind: "support" },

  /* ---- allergy ---- */
  { id: "R020", name: "Allergy Pattern", premises: ["sneezing", "itchy_eyes", "runny_nose"], notPremises: ["fever", "body_ache"], operator: "AND", conclusion: "allergy", kind: "pattern", note: "Fever or body ache argues AGAINST an allergic pattern." },
  { id: "R021", name: "Allergy — congestion", premises: ["nasal_congestion"], notPremises: [], operator: "AND", conclusion: "allergy", kind: "support" },
  { id: "R022", name: "Allergy — sneeze + congestion combo", premises: ["sneezing", "nasal_congestion"], notPremises: [], operator: "AND", conclusion: "allergy", kind: "support" },

  /* ---- migraine ---- */
  { id: "R030", name: "Migraine Pattern", premises: ["headache", "light_sensitivity", "nausea"], notPremises: [], operator: "AND", conclusion: "migraine", kind: "pattern" },
  { id: "R031", name: "Migraine — dizziness", premises: ["dizziness"], notPremises: [], operator: "AND", conclusion: "migraine", kind: "support" },
  { id: "R032", name: "Migraine — vomiting", premises: ["vomiting"], notPremises: [], operator: "AND", conclusion: "migraine", kind: "support" },

  /* ---- gastritis ---- */
  { id: "R040", name: "Gastritis Pattern", premises: ["abdominal_pain", "nausea"], notPremises: ["diarrhea"], operator: "AND", conclusion: "gastritis", kind: "pattern", note: "Diarrhea points away from gastritis toward a lower-GI pattern." },
  { id: "R041", name: "Gastritis — appetite loss", premises: ["loss_of_appetite"], notPremises: [], operator: "AND", conclusion: "gastritis", kind: "support" },
  { id: "R042", name: "Gastritis — vomiting", premises: ["vomiting"], notPremises: [], operator: "AND", conclusion: "gastritis", kind: "support" },

  /* ---- food poisoning ---- */
  { id: "R050", name: "Food Poisoning Pattern", premises: ["vomiting", "diarrhea", "abdominal_pain"], notPremises: [], operator: "AND", conclusion: "food_poisoning", kind: "pattern" },
  { id: "R051", name: "Food Poisoning — nausea", premises: ["nausea"], notPremises: [], operator: "AND", conclusion: "food_poisoning", kind: "support" },
  { id: "R052", name: "Food Poisoning — GI distress", premises: ["x_gi_distress"], notPremises: [], operator: "AND", conclusion: "food_poisoning", kind: "support" },
  { id: "R053", name: "Food Poisoning — fever response", premises: ["fever"], notPremises: [], operator: "AND", conclusion: "food_poisoning", kind: "support" },

  /* ---- dehydration ---- */
  { id: "R060", name: "Dehydration Pattern", premises: ["thirst", "dry_mouth", "dizziness"], notPremises: [], operator: "AND", conclusion: "dehydration", kind: "pattern" },
  { id: "R061", name: "Dehydration — fatigue", premises: ["fatigue"], notPremises: [], operator: "AND", conclusion: "dehydration", kind: "support" },
  { id: "R062", name: "Dehydration — headache", premises: ["headache"], notPremises: [], operator: "AND", conclusion: "dehydration", kind: "support" },
  { id: "R063", name: "Dehydration — fluid loss", premises: ["vomiting", "diarrhea"], notPremises: [], operator: "OR", conclusion: "dehydration", kind: "support" },

  /* ---- sinusitis ---- */
  { id: "R070", name: "Sinusitis Pattern", premises: ["nasal_congestion", "facial_pressure", "headache"], notPremises: [], operator: "AND", conclusion: "sinusitis", kind: "pattern" },
  { id: "R071", name: "Sinusitis — runny nose", premises: ["runny_nose"], notPremises: [], operator: "AND", conclusion: "sinusitis", kind: "support" },
  { id: "R072", name: "Sinusitis — sore throat", premises: ["sore_throat"], notPremises: [], operator: "AND", conclusion: "sinusitis", kind: "support" },
  { id: "R073", name: "Sinusitis — fever", premises: ["fever"], notPremises: [], operator: "AND", conclusion: "sinusitis", kind: "support" },

  /* ---- bronchitis ---- */
  { id: "R080", name: "Bronchitis Pattern", premises: ["cough", "chest_discomfort", "fatigue"], notPremises: [], operator: "AND", conclusion: "bronchitis", kind: "pattern" },
  { id: "R081", name: "Bronchitis — breathing effort", premises: ["difficulty_breathing"], notPremises: [], operator: "AND", conclusion: "bronchitis", kind: "support" },
  { id: "R082", name: "Bronchitis — respiratory distress", premises: ["x_respiratory_distress"], notPremises: [], operator: "AND", conclusion: "bronchitis", kind: "support" },

  /* ---- pharyngitis ---- */
  { id: "R090", name: "Pharyngitis Pattern", premises: ["sore_throat", "fever"], notPremises: ["cough"], operator: "AND", conclusion: "pharyngitis", kind: "pattern", note: "Absence of cough distinguishes pharyngitis from influenza/bronchitis." },
  { id: "R091", name: "Pharyngitis — headache", premises: ["headache"], notPremises: [], operator: "AND", conclusion: "pharyngitis", kind: "support" },
  { id: "R092", name: "Pharyngitis — body ache", premises: ["body_ache"], notPremises: [], operator: "AND", conclusion: "pharyngitis", kind: "support" },

  /* ---- gastroenteritis ---- */
  { id: "R100", name: "Gastroenteritis Pattern", premises: ["nausea", "vomiting", "diarrhea"], notPremises: [], operator: "AND", conclusion: "gastroenteritis", kind: "pattern" },
  { id: "R101", name: "Gastroenteritis — abdominal pain", premises: ["abdominal_pain"], notPremises: [], operator: "AND", conclusion: "gastroenteritis", kind: "support" },
  { id: "R102", name: "Gastroenteritis — fever", premises: ["fever"], notPremises: [], operator: "AND", conclusion: "gastroenteritis", kind: "support" },
  { id: "R103", name: "Gastroenteritis — GI distress", premises: ["x_gi_distress"], notPremises: [], operator: "AND", conclusion: "gastroenteritis", kind: "support" },

  /* ---- tension headache ---- */
  { id: "R110", name: "Tension Headache Pattern", premises: ["headache", "fatigue"], notPremises: ["light_sensitivity", "nausea"], operator: "AND", conclusion: "tension_headache", kind: "pattern", note: "Light sensitivity or nausea argues AGAINST tension-type and toward migraine." },
  { id: "R111", name: "Tension — body tension", premises: ["body_ache"], notPremises: [], operator: "AND", conclusion: "tension_headache", kind: "support" },
  { id: "R112", name: "Tension — dizziness", premises: ["dizziness"], notPremises: [], operator: "AND", conclusion: "tension_headache", kind: "support" },
];

export const EMPTY_FACTS: FactBase = Object.fromEntries(SYMPTOMS.map((s) => [s.id, "unknown"]));

/** Spec demo scenario used by the guided presentation. */
export const DEMO_FACTS: FactBase = {
  ...EMPTY_FACTS,
  fever: "present",
  cough: "present",
  sore_throat: "present",
  fatigue: "present",
  runny_nose: "absent",
  itchy_eyes: "absent",
  body_ache: "unknown",
};

export function symptomLabel(id: string): string {
  return SYMPTOMS.find((s) => s.id === id)?.label
    ?? DERIVED_FACTS.find((d) => d.id === id)?.label
    ?? id;
}

export function conditionLabel(id: string): string {
  return CONDITIONS.find((c) => c.id === id)?.label ?? id;
}

export function isDerivedFact(id: string): boolean {
  return id.startsWith("x_");
}

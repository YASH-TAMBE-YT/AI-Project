"""
MediLogic X — Seeded Medical Knowledge Base
============================================
Scope is intentionally limited: 12 everyday conditions, 24 symptoms, 46 rules.
Rules are conservative and strictly educational. This module seeds the SQLite
database and serves as the default in-memory knowledge layer.

Rule format:
    {
      "id": "R010",
      "name": "Influenza Pattern",
      "premises": ["fever", "cough", "sore_throat"],   # must be PRESENT
      "not_premises": ["itchy_eyes", "runny_nose"],    # must be ABSENT
      "operator": "AND",                               # AND | OR (positive premises)
      "conclusion": "influenza",                       # condition id or x_* derived fact
      "kind": "pattern",                               # pattern | support | derived
      "note": "..."
    }
"""

SYMPTOMS = [
    {"id": "fever", "label": "Fever", "category": "General", "serious": True},
    {"id": "chills", "label": "Chills", "category": "General", "serious": False},
    {"id": "fatigue", "label": "Fatigue", "category": "General", "serious": False},
    {"id": "body_ache", "label": "Body Ache", "category": "General", "serious": False},
    {"id": "dizziness", "label": "Dizziness", "category": "General", "serious": True},
    {"id": "loss_of_appetite", "label": "Loss of Appetite", "category": "General", "serious": False},
    {"id": "thirst", "label": "Excessive Thirst", "category": "General", "serious": False},
    {"id": "dry_mouth", "label": "Dry Mouth", "category": "General", "serious": False},
    {"id": "headache", "label": "Headache", "category": "Head & Neuro", "serious": False},
    {"id": "light_sensitivity", "label": "Light Sensitivity", "category": "Head & Neuro", "serious": False},
    {"id": "cough", "label": "Cough", "category": "Respiratory", "serious": False},
    {"id": "sore_throat", "label": "Sore Throat", "category": "Respiratory", "serious": False},
    {"id": "sneezing", "label": "Sneezing", "category": "Respiratory", "serious": False},
    {"id": "runny_nose", "label": "Runny Nose", "category": "Respiratory", "serious": False},
    {"id": "nasal_congestion", "label": "Nasal Congestion", "category": "Respiratory", "serious": False},
    {"id": "itchy_eyes", "label": "Itchy Eyes", "category": "Respiratory", "serious": False},
    {"id": "facial_pressure", "label": "Facial Pressure", "category": "Respiratory", "serious": False},
    {"id": "chest_discomfort", "label": "Chest Discomfort", "category": "Chest", "serious": True},
    {"id": "difficulty_breathing", "label": "Difficulty Breathing", "category": "Chest", "serious": True},
    {"id": "joint_pain", "label": "Joint Pain", "category": "General", "serious": False},
    {"id": "nausea", "label": "Nausea", "category": "Digestive", "serious": False},
    {"id": "vomiting", "label": "Vomiting", "category": "Digestive", "serious": True},
    {"id": "diarrhea", "label": "Diarrhea", "category": "Digestive", "serious": False},
    {"id": "abdominal_pain", "label": "Abdominal Pain", "category": "Digestive", "serious": False},
]

DERIVED_FACTS = [
    {"id": "x_respiratory_distress", "label": "Respiratory Distress (derived)"},
    {"id": "x_gi_distress", "label": "GI Distress (derived)"},
]

CONDITIONS = [
    {"id": "common_cold", "label": "Common Cold", "severity": "mild",
     "description": "Viral upper-respiratory pattern dominated by nasal symptoms; fever is typically absent.",
     "care": "Rest, fluids, monitor. Usually self-limiting."},
    {"id": "influenza", "label": "Influenza (Flu)", "severity": "moderate",
     "description": "Systemic viral pattern: fever, cough, sore throat with body involvement.",
     "care": "Rest and hydration; seek care if breathing difficulty or persistent high fever."},
    {"id": "allergy", "label": "Allergic Rhinitis", "severity": "mild",
     "description": "Immune response pattern: sneezing, itchy eyes and runny nose WITHOUT fever or body ache.",
     "care": "Avoid triggers; non-urgent."},
    {"id": "migraine", "label": "Migraine", "severity": "moderate",
     "description": "Neurological headache pattern with light sensitivity and nausea.",
     "care": "Rest in a dark, quiet room; consult a professional if recurrent or severe."},
    {"id": "gastritis", "label": "Gastritis", "severity": "moderate",
     "description": "Stomach-lining irritation pattern: upper abdominal pain with nausea, typically without diarrhea.",
     "care": "Diet adjustments; seek care for persistent pain."},
    {"id": "food_poisoning", "label": "Food Poisoning", "severity": "moderate",
     "description": "Acute GI pattern: vomiting and diarrhea with abdominal pain after food exposure.",
     "care": "Hydration is critical; seek care if severe or bloody."},
    {"id": "dehydration", "label": "Dehydration", "severity": "attention",
     "description": "Fluid-deficit pattern: excessive thirst, dry mouth and dizziness.",
     "care": "Oral rehydration; seek urgent care if fainting or confusion."},
    {"id": "sinusitis", "label": "Sinusitis", "severity": "mild",
     "description": "Sinus inflammation pattern: congestion with facial pressure and headache.",
     "care": "Steam, fluids; consult if >10 days."},
    {"id": "bronchitis", "label": "Bronchitis", "severity": "attention",
     "description": "Airway inflammation pattern: persistent cough with chest discomfort.",
     "care": "Seek professional evaluation, especially with breathing difficulty."},
    {"id": "pharyngitis", "label": "Pharyngitis", "severity": "mild",
     "description": "Throat-infection pattern: sore throat with fever but typically no cough.",
     "care": "Gargle, fluids; test if persistent fever."},
    {"id": "gastroenteritis", "label": "Gastroenteritis", "severity": "moderate",
     "description": "Stomach-flu pattern: nausea, vomiting and diarrhea together, often with fever.",
     "care": "Hydration; monitor for dehydration signs."},
    {"id": "tension_headache", "label": "Tension Headache", "severity": "mild",
     "description": "Tension-type headache with fatigue but WITHOUT light sensitivity or nausea.",
     "care": "Rest, hydration, posture breaks."},
]

RULES = [
    # ---- derived intermediate facts (enable multi-hop chaining) ----
    {"id": "R200", "name": "Respiratory Distress Derivation", "premises": ["cough", "difficulty_breathing"],
     "not_premises": [], "operator": "AND", "conclusion": "x_respiratory_distress", "kind": "derived",
     "note": "Cough combined with breathing difficulty signals airway involvement."},
    {"id": "R201", "name": "GI Distress Derivation", "premises": ["vomiting", "diarrhea"],
     "not_premises": [], "operator": "OR", "conclusion": "x_gi_distress", "kind": "derived",
     "note": "Either vomiting or diarrhea signals acute GI involvement."},

    # ---- common cold ----
    {"id": "R001", "name": "Cold Core Pattern", "premises": ["runny_nose", "sneezing", "nasal_congestion"],
     "not_premises": ["fever"], "operator": "AND", "conclusion": "common_cold", "kind": "pattern", "note": None},
    {"id": "R002", "name": "Cold - throat irritation", "premises": ["sore_throat"], "not_premises": [],
     "operator": "AND", "conclusion": "common_cold", "kind": "support", "note": None},
    {"id": "R003", "name": "Cold - cough", "premises": ["cough"], "not_premises": [],
     "operator": "AND", "conclusion": "common_cold", "kind": "support", "note": None},
    {"id": "R004", "name": "Cold - malaise", "premises": ["fatigue"], "not_premises": [],
     "operator": "AND", "conclusion": "common_cold", "kind": "support", "note": None},

    # ---- influenza ----
    {"id": "R010", "name": "Influenza Pattern", "premises": ["fever", "cough", "sore_throat"],
     "not_premises": ["itchy_eyes", "runny_nose"], "operator": "AND", "conclusion": "influenza", "kind": "pattern",
     "note": "Systemic respiratory pattern; allergic rhinitis markers excluded."},
    {"id": "R011", "name": "Flu - body involvement", "premises": ["body_ache"], "not_premises": [],
     "operator": "AND", "conclusion": "influenza", "kind": "support", "note": None},
    {"id": "R012", "name": "Flu - fatigue", "premises": ["fatigue"], "not_premises": [],
     "operator": "AND", "conclusion": "influenza", "kind": "support", "note": None},
    {"id": "R013", "name": "Flu - chills", "premises": ["chills"], "not_premises": [],
     "operator": "AND", "conclusion": "influenza", "kind": "support", "note": None},
    {"id": "R014", "name": "Flu - headache", "premises": ["headache"], "not_premises": [],
     "operator": "AND", "conclusion": "influenza", "kind": "support", "note": None},

    # ---- allergy ----
    {"id": "R020", "name": "Allergy Pattern", "premises": ["sneezing", "itchy_eyes", "runny_nose"],
     "not_premises": ["fever", "body_ache"], "operator": "AND", "conclusion": "allergy", "kind": "pattern",
     "note": "Fever or body ache argues AGAINST an allergic pattern."},
    {"id": "R021", "name": "Allergy - congestion", "premises": ["nasal_congestion"], "not_premises": [],
     "operator": "AND", "conclusion": "allergy", "kind": "support", "note": None},
    {"id": "R022", "name": "Allergy - sneeze + congestion combo", "premises": ["sneezing", "nasal_congestion"],
     "not_premises": [], "operator": "AND", "conclusion": "allergy", "kind": "support", "note": None},

    # ---- migraine ----
    {"id": "R030", "name": "Migraine Pattern", "premises": ["headache", "light_sensitivity", "nausea"],
     "not_premises": [], "operator": "AND", "conclusion": "migraine", "kind": "pattern", "note": None},
    {"id": "R031", "name": "Migraine - dizziness", "premises": ["dizziness"], "not_premises": [],
     "operator": "AND", "conclusion": "migraine", "kind": "support", "note": None},
    {"id": "R032", "name": "Migraine - vomiting", "premises": ["vomiting"], "not_premises": [],
     "operator": "AND", "conclusion": "migraine", "kind": "support", "note": None},

    # ---- gastritis ----
    {"id": "R040", "name": "Gastritis Pattern", "premises": ["abdominal_pain", "nausea"],
     "not_premises": ["diarrhea"], "operator": "AND", "conclusion": "gastritis", "kind": "pattern",
     "note": "Diarrhea points away from gastritis toward a lower-GI pattern."},
    {"id": "R041", "name": "Gastritis - appetite loss", "premises": ["loss_of_appetite"], "not_premises": [],
     "operator": "AND", "conclusion": "gastritis", "kind": "support", "note": None},
    {"id": "R042", "name": "Gastritis - vomiting", "premises": ["vomiting"], "not_premises": [],
     "operator": "AND", "conclusion": "gastritis", "kind": "support", "note": None},

    # ---- food poisoning ----
    {"id": "R050", "name": "Food Poisoning Pattern", "premises": ["vomiting", "diarrhea", "abdominal_pain"],
     "not_premises": [], "operator": "AND", "conclusion": "food_poisoning", "kind": "pattern", "note": None},
    {"id": "R051", "name": "Food Poisoning - nausea", "premises": ["nausea"], "not_premises": [],
     "operator": "AND", "conclusion": "food_poisoning", "kind": "support", "note": None},
    {"id": "R052", "name": "Food Poisoning - GI distress", "premises": ["x_gi_distress"], "not_premises": [],
     "operator": "AND", "conclusion": "food_poisoning", "kind": "support", "note": None},
    {"id": "R053", "name": "Food Poisoning - fever response", "premises": ["fever"], "not_premises": [],
     "operator": "AND", "conclusion": "food_poisoning", "kind": "support", "note": None},

    # ---- dehydration ----
    {"id": "R060", "name": "Dehydration Pattern", "premises": ["thirst", "dry_mouth", "dizziness"],
     "not_premises": [], "operator": "AND", "conclusion": "dehydration", "kind": "pattern", "note": None},
    {"id": "R061", "name": "Dehydration - fatigue", "premises": ["fatigue"], "not_premises": [],
     "operator": "AND", "conclusion": "dehydration", "kind": "support", "note": None},
    {"id": "R062", "name": "Dehydration - headache", "premises": ["headache"], "not_premises": [],
     "operator": "AND", "conclusion": "dehydration", "kind": "support", "note": None},
    {"id": "R063", "name": "Dehydration - fluid loss", "premises": ["vomiting", "diarrhea"], "not_premises": [],
     "operator": "OR", "conclusion": "dehydration", "kind": "support", "note": None},

    # ---- sinusitis ----
    {"id": "R070", "name": "Sinusitis Pattern", "premises": ["nasal_congestion", "facial_pressure", "headache"],
     "not_premises": [], "operator": "AND", "conclusion": "sinusitis", "kind": "pattern", "note": None},
    {"id": "R071", "name": "Sinusitis - runny nose", "premises": ["runny_nose"], "not_premises": [],
     "operator": "AND", "conclusion": "sinusitis", "kind": "support", "note": None},
    {"id": "R072", "name": "Sinusitis - sore throat", "premises": ["sore_throat"], "not_premises": [],
     "operator": "AND", "conclusion": "sinusitis", "kind": "support", "note": None},
    {"id": "R073", "name": "Sinusitis - fever", "premises": ["fever"], "not_premises": [],
     "operator": "AND", "conclusion": "sinusitis", "kind": "support", "note": None},

    # ---- bronchitis ----
    {"id": "R080", "name": "Bronchitis Pattern", "premises": ["cough", "chest_discomfort", "fatigue"],
     "not_premises": [], "operator": "AND", "conclusion": "bronchitis", "kind": "pattern", "note": None},
    {"id": "R081", "name": "Bronchitis - breathing effort", "premises": ["difficulty_breathing"], "not_premises": [],
     "operator": "AND", "conclusion": "bronchitis", "kind": "support", "note": None},
    {"id": "R082", "name": "Bronchitis - respiratory distress", "premises": ["x_respiratory_distress"],
     "not_premises": [], "operator": "AND", "conclusion": "bronchitis", "kind": "support", "note": None},

    # ---- pharyngitis ----
    {"id": "R090", "name": "Pharyngitis Pattern", "premises": ["sore_throat", "fever"],
     "not_premises": ["cough"], "operator": "AND", "conclusion": "pharyngitis", "kind": "pattern",
     "note": "Absence of cough distinguishes pharyngitis from influenza/bronchitis."},
    {"id": "R091", "name": "Pharyngitis - headache", "premises": ["headache"], "not_premises": [],
     "operator": "AND", "conclusion": "pharyngitis", "kind": "support", "note": None},
    {"id": "R092", "name": "Pharyngitis - body ache", "premises": ["body_ache"], "not_premises": [],
     "operator": "AND", "conclusion": "pharyngitis", "kind": "support", "note": None},

    # ---- gastroenteritis ----
    {"id": "R100", "name": "Gastroenteritis Pattern", "premises": ["nausea", "vomiting", "diarrhea"],
     "not_premises": [], "operator": "AND", "conclusion": "gastroenteritis", "kind": "pattern", "note": None},
    {"id": "R101", "name": "Gastroenteritis - abdominal pain", "premises": ["abdominal_pain"], "not_premises": [],
     "operator": "AND", "conclusion": "gastroenteritis", "kind": "support", "note": None},
    {"id": "R102", "name": "Gastroenteritis - fever", "premises": ["fever"], "not_premises": [],
     "operator": "AND", "conclusion": "gastroenteritis", "kind": "support", "note": None},
    {"id": "R103", "name": "Gastroenteritis - GI distress", "premises": ["x_gi_distress"], "not_premises": [],
     "operator": "AND", "conclusion": "gastroenteritis", "kind": "support", "note": None},

    # ---- tension headache ----
    {"id": "R110", "name": "Tension Headache Pattern", "premises": ["headache", "fatigue"],
     "not_premises": ["light_sensitivity", "nausea"], "operator": "AND", "conclusion": "tension_headache",
     "kind": "pattern", "note": "Light sensitivity or nausea argues AGAINST tension-type and toward migraine."},
    {"id": "R111", "name": "Tension - body tension", "premises": ["body_ache"], "not_premises": [],
     "operator": "AND", "conclusion": "tension_headache", "kind": "support", "note": None},
    {"id": "R112", "name": "Tension - dizziness", "premises": ["dizziness"], "not_premises": [],
     "operator": "AND", "conclusion": "tension_headache", "kind": "support", "note": None},
]

DEMO_FACTS = {
    "fever": "present", "cough": "present", "sore_throat": "present", "fatigue": "present",
    "runny_nose": "absent", "itchy_eyes": "absent", "body_ache": "unknown",
}


def symptom_label(sid: str) -> str:
    for s in SYMPTOMS:
        if s["id"] == sid:
            return s["label"]
    for d in DERIVED_FACTS:
        if d["id"] == sid:
            return d["label"]
    return sid


def condition_label(cid: str) -> str:
    for c in CONDITIONS:
        if c["id"] == cid:
            return c["label"]
    return cid


def is_derived(fid: str) -> bool:
    return fid.startswith("x_")

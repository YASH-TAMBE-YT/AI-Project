# MediLogic X
## Adaptive Explainable Medical Expert System using Forward & Backward Chaining

**Project Documentation**

| | |
|---|---|
| **Project name** | MediLogic X |
| **Subtitle** | Adaptive Explainable Medical Expert System |
| **Tagline** | *"Discover. Verify. Explain."* |
| **Category** | College mini-project — Knowledge-Based / Symbolic AI |
| **Stack** | React · Vite · Tailwind CSS · Framer Motion · Lucide (frontend) — FastAPI · SQLAlchemy · SQLite · Python inference engine (backend) |
| **Nature** | Rule-based expert system. **Not** an ML model. **Not** a generative AI chatbot. |

> ⚠️ **Medical safety statement.** MediLogic X is an *educational decision-support system*. Every result is a **rule-based match** produced only by programmed knowledge. It is **never** a medical diagnosis, never treatment advice, and never a substitute for a qualified professional. If symptoms are severe, worsening, or concerning, seek professional medical attention.

---

# Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction & Motivation](#2-introduction--motivation)
3. [Objectives](#3-objectives)
4. [Scope](#4-scope)
5. [Theoretical Background](#5-theoretical-background)
6. [System Architecture](#6-system-architecture)
7. [Knowledge Base Design](#7-knowledge-base-design)
8. [The Dual Inference Engine](#8-the-dual-inference-engine)
9. [The Hypothesis Arena (Diagnostic Battle)](#9-the-hypothesis-arena-diagnostic-battle)
10. [Contradiction Detection](#10-contradiction-detection)
11. [Next Best Question Engine](#11-next-best-question-engine)
12. [What-If Simulator](#12-what-if-simulator)
13. [Explainability Engine](#13-explainability-engine)
14. [Reasoning Graph](#14-reasoning-graph)
15. [Expert System View (Viva Mode)](#15-expert-system-view-viva-mode)
16. [User Interface Walkthrough](#16-user-interface-walkthrough)
17. [REST API Reference](#17-rest-api-reference)
18. [Reference Demonstration Scenario](#18-reference-demonstration-scenario)
19. [Test Cases](#19-test-cases)
20. [Project Structure](#20-project-structure)
21. [Setup & Installation](#21-setup--installation)
22. [Engineering Guarantees](#22-engineering-guarantees)
23. [Limitations](#23-limitations)
24. [Future Enhancements](#24-future-enhancements)
25. [Viva Preparation — Q&A](#25-viva-preparation--qa)
26. [Conclusion](#26-conclusion)
27. [References](#27-references)

---

# 1. Abstract

MediLogic X is an **adaptive, explainable medical expert system** built as a college mini-project. Instead of mapping symptoms directly to diseases — as conventional symptom checkers do — the system treats diagnosis as an explicit **reasoning process** over a structured knowledge base.

Patient symptoms are recorded as **tri-state facts** (present / absent / unknown). A **forward-chaining engine** performs data-driven inference to a fixpoint, firing production rules and deriving intermediate facts to produce multiple competing hypotheses. Each hypothesis is then re-examined by a **backward-chaining engine**, which constructs a recursive AND/OR proof tree and assigns a verification verdict. Competing hypotheses are ranked in a **Hypothesis Arena** using a transparent rule-match score with published penalties. A **contradiction engine** detects conflicting evidence and surfaces it to the user rather than resolving it silently. When information is insufficient, a **Next Best Question engine** simulates both answers of every unknown symptom and asks only the question that most effectively discriminates between the leading hypotheses. After each answer the entire cycle repeats, forming an **adaptive diagnostic interview**. Finally, an **explanation engine** exposes exactly which facts and rules produced each conclusion — through evidence panels, proof trees, an animated reasoning graph, and a step-by-step expert-system event log.

Every output is presented strictly as a **possible condition / rule-based match**, never as a definitive diagnosis.

---

# 2. Introduction & Motivation

## 2.1 The problem with symptom checkers

Typical consumer symptom checkers work like this:

```
Symptoms → Disease
```

They are opaque, return a single answer, hide the reasoning, ignore missing information, and treat anything the user did not mention as absent. These properties make them poor teaching tools and risky demonstrations.

## 2.2 The core idea of MediLogic X

MediLogic X replaces the single-step match with a complete reasoning loop:

```text
Patient Symptoms
       ↓
Forward Chaining              (data-driven discovery)
       ↓
Generate Multiple Hypotheses  (the arena — never one blind answer)
       ↓
Rank Competing Conditions     (rule-match score)
       ↓
Backward Chaining             (goal-driven verification, proof trees)
       ↓
Detect Contradictions         (surface, never silently resolve)
       ↓
Find Most Informative Unknown (discrimination analysis)
       ↓
Ask Next Best Question        (adaptive interview)
       ↓
Update Knowledge → Reason Again
       ↓
Explain Final Reasoning       (facts + rules + trace)
```

## 2.3 Why this matters academically

This architecture demonstrates, in one coherent system, the classical AI concepts taught in expert-systems courses:

- production rules and declarative knowledge representation
- forward (data-driven) inference with a fixpoint
- backward (goal-driven) inference with proof trees
- open-world reasoning over unknown facts
- conflict detection in knowledge bases
- information-gathering strategy (adaptive questioning)
- explainability as a first-class output

The key statement of the project:

> **"MediLogic X doesn't just give an answer. It shows how the answer was reasoned."**

---

# 3. Objectives

1. Implement a genuine **rule-based expert system** (no ML, no LLM, no probabilistic model).
2. Implement **forward chaining** with a full inference trace, including multi-hop reasoning through derived intermediate facts.
3. Implement **backward chaining** with recursive proof construction and structured verdicts.
4. Run both engines **integrated**: forward discovery followed by backward verification in a single cycle.
5. Build a **Hypothesis Arena** that keeps multiple conditions competing with an explainable score.
6. Detect and display **contradictions** instead of hiding them.
7. Implement a **Next Best Question** strategy that asks the most discriminative unknown fact.
8. Provide a **What-If simulator** that overlays hypothetical evidence without mutating recorded facts.
9. Make **every conclusion explainable** to a non-programmer (Why? panels, proof trees, reasoning graph).
10. Provide **rule management** (create / edit / delete rules) so the knowledge base is visibly declarative.
11. Keep a clear **frontend / backend / engine separation**: the UI never computes diagnoses.
12. Remain **medically safe**: limited scope, conservative rules, constant disclaimers, no probabilities of disease.

---

# 4. Scope

## 4.1 Intentional limitations

- **12 everyday conditions** (common cold, influenza, allergy, migraine, gastritis, food poisoning, dehydration, sinusitis, bronchitis, pharyngitis, gastroenteritis, tension headache).
- **24 tracked symptoms** and **46 production rules**.
- The project deliberately does **not** attempt to cover the whole of medicine; a small, inspectable knowledge base is a feature, not a weakness.

## 4.2 What the system never does

- prescribe medicine or dosages
- claim certainty or display "90% chance of disease"-style numbers
- replace doctors or emergency care
- use any external AI/ML API

## 4.3 What users see

Scores are labeled **Rule Match Score**. Verdicts are labeled as rule verification results. A permanent disclaimer is shown on the landing page, the intake screen, and the results screen:

> *"Educational decision-support system. Results are based only on programmed rules and should not be considered a medical diagnosis… If symptoms are severe, worsening, or concerning, seek professional medical attention."*

Symptoms that can indicate seriousness (fever, dizziness, chest discomfort, difficulty breathing, vomiting) carry a visual marker in the interface.

---

# 5. Theoretical Background

## 5.1 Expert systems

An **expert system** is a knowledge-based program that reaches conclusions from **explicitly defined facts and rules**, rather than from learned statistical patterns. Classical architecture:

```
Knowledge Base  (rules + facts — declarative, editable, inspectable)
Inference Engine (applies rules to facts — independent of the domain)
User Interface   (collects facts, presents conclusions)
Explanation      (justifies conclusions from the trace)
```

MediLogic X follows this architecture exactly: the knowledge base (Section 7) is pure data; the engine (Section 8) contains no disease-specific code; the UI contains no medical rules.

## 5.2 Production rules

Rules follow the `IF conditions THEN conclusion` form, e.g.:

```
IF fever AND cough AND sore_throat AND NOT itchy_eyes AND NOT runny_nose
THEN influenza
```

Supported operators: **AND** (all premises true), **OR** (at least one true), **NOT** (a fact must be known-absent for the rule to fire).

## 5.3 Forward chaining

**Data-driven** reasoning. Start from known facts; fire every rule whose premises are satisfied; add conclusions to working memory; repeat until nothing new can be derived (**fixpoint**). Efficient for *discovery*: "what can be concluded from what we know?"

## 5.4 Backward chaining

**Goal-driven** reasoning. Start from a hypothesis; find the rules that could conclude it; recursively prove each premise against the fact base (sub-goaling through derived rules); produce a proof tree where every node is `satisfied`, `failed` or `unknown`. Efficient for *verification*: "is this specific hypothesis supported?"

## 5.5 Open-world tri-state facts

Each symptom is one of:

| State | Meaning | Engine behavior |
|---|---|---|
| `PRESENT` | user said YES | confirms rules requiring it; contradicts NOT-premises |
| `ABSENT` | user explicitly said NO | fails rules requiring it; satisfies NOT-premises |
| `UNKNOWN` | not stated / not sure | leaves rules **pending**; becomes a question candidate |

The closed-world assumption (*"not mentioned ⇒ absent"*) is **explicitly rejected**. This is what makes adaptive questioning possible: the system knows what it does not know.

## 5.6 Multi-hop inference via derived facts

Two *derivation rules* conclude **intermediate facts** (`x_respiratory_distress`, `x_gi_distress`) that are not symptoms but inference products. These derived facts then appear as premises in other rules, so the engine chains conclusions into new conclusions — e.g.:

```
cough + difficulty_breathing → x_respiratory_distress (R200)
x_respiratory_distress → support bronchitis (R082)
```

This visibly demonstrates chaining depth in the reasoning graph.

---

# 6. System Architecture

## 6.1 Layered architecture

```text
┌─────────────────────────────────────────────┐
│ React Frontend (Vite + Tailwind + Framer)   │  presentation ONLY — never computes a diagnosis
└──────────────────┬──────────────────────────┘
                   │ REST — structured reasoning JSON
┌──────────────────▼──────────────────────────┐
│ FastAPI (validation, routing, CORS)         │  backend/main.py · backend/routes.py
└──────────────────┬──────────────────────────┘
                   │ function calls
┌──────────────────▼──────────────────────────┐
│ Inference Engine (pure, deterministic)      │  backend/engine.py
│  forward · backward · arena · contradictions│
│  next-best-question · explanation           │
└──────────────────┬──────────────────────────┘
                   │ reads
┌──────────────────▼──────────────────────────┐
│ Knowledge Base (declarative rules)          │  backend/knowledge_base.py → SQLite seed
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ SQLite (symptoms, conditions, rules,        │  backend/database.py → medilogic.db
│ session history)                            │
└─────────────────────────────────────────────┘
```

## 6.2 The offline mirror (deployment note)

The frontend always calls the REST layer first (`VITE_API_URL`). For the static demo build (no server), it falls back to `src/engine/` — a **1:1 TypeScript port of the Python engine**, kept entirely outside the component layer and returning an identical response shape. This satisfies the engineering requirement ("all inference happens inside the backend engine") in production while keeping the deliverable fully demonstrable offline.

## 6.3 One reasoning cycle (API contract)

`POST /api/diagnosis/forward` returns the complete reasoning state:

```json
{
  "facts": {}, "effectiveFacts": {},
  "derivedFacts": ["x_gi_distress"],
  "forwardTrace": [{ "ruleId": "R010", "status": "fired", "satisfied": ["fever"] }],
  "hypotheses": [ { "condition": "influenza", "ruleMatchFraction": "4/7", "score": 57,
                    "supporting": [], "missing": [], "unmet": [], "contradicting": [],
                    "verdict": "verified", "explanation": { } } ],
  "backwardReports": [ { "hypothesis": "influenza", "proofTree": { } } ],
  "contradictions": [],
  "nextBestQuestion": { "symptom": "body_ache", "question": "Are you currently experiencing body ache?",
                        "discriminationPower": 58, "impacts": [] },
  "graph": { "nodes": [], "edges": [] },
  "events": [ { "type": "rule_fired", "title": "Rule Fired: R010" } ],
  "stats": { "rulesFired": 7, "iterations": 2, "reasoningSteps": 54 }
}
```

The UI is a renderer of this structure — nothing more.

---

# 7. Knowledge Base Design

## 7.1 Rule format

```json
{
  "id": "R010",
  "name": "Influenza Pattern",
  "premises": ["fever", "cough", "sore_throat"],
  "not_premises": ["itchy_eyes", "runny_nose"],
  "operator": "AND",
  "conclusion": "influenza",
  "kind": "pattern",
  "note": "Systemic respiratory pattern; allergic rhinitis markers excluded."
}
```

- `premises` — facts that must be **PRESENT** (evaluated with `operator`: AND = all, OR = at least one)
- `not_premises` — facts that must be **ABSENT** (always AND-joined; used for exclusions and differential diagnosis)
- `kind` — `pattern` (core signature of a condition), `support` (additional evidence), `derived` (concludes an intermediate `x_*` fact)

## 7.2 Firing semantics

| Operator | FIRES when | FAILS when | PENDING when |
|---|---|---|---|
| AND | every premise present **and** every NOT-premise absent | any premise absent **or** any NOT-premise present | otherwise (something unknown) |
| OR | ≥1 premise present **and** no NOT-premise present | no premise present and all known-absent, or blocked | otherwise |

A fired rule stays fired within the cycle (**monotonic inference**); the loop stops at a fixpoint (≤ 12 cycles guard).

## 7.3 The 12 conditions and their rule families

| Condition | Pattern rule (core signature) | NOT-guards | Support rules |
|---|---|---|---|
| Common Cold | runny nose ∧ sneezing ∧ congestion (R001) | fever | sore throat, cough, fatigue |
| Influenza | fever ∧ cough ∧ sore throat (R010) | itchy eyes, runny nose | body ache, fatigue, chills, headache |
| Allergic Rhinitis | sneezing ∧ itchy eyes ∧ runny nose (R020) | fever, body ache | congestion, sneeze+congestion combo |
| Migraine | headache ∧ light sensitivity ∧ nausea (R030) | — | dizziness, vomiting |
| Gastritis | abdominal pain ∧ nausea (R040) | diarrhea | appetite loss, vomiting |
| Food Poisoning | vomiting ∧ diarrhea ∧ abdominal pain (R050) | — | nausea, x_gi_distress, fever |
| Dehydration | thirst ∧ dry mouth ∧ dizziness (R060) | — | fatigue, headache, vomiting∨diarrhea (OR) |
| Sinusitis | congestion ∧ facial pressure ∧ headache (R070) | — | runny nose, sore throat, fever |
| Bronchitis | cough ∧ chest discomfort ∧ fatigue (R080) | — | breathing difficulty, x_respiratory_distress |
| Pharyngitis | sore throat ∧ fever (R090) | **cough** | headache, body ache |
| Gastroenteritis | nausea ∧ vomiting ∧ diarrhea (R100) | — | abdominal pain, fever, x_gi_distress |
| Tension Headache | headache ∧ fatigue (R110) | light sensitivity, nausea | body ache, dizziness |

The NOT-guards encode **differential knowledge**: fever argues against cold/allergy; cough argues against pharyngitis; light sensitivity argues against tension-type headache (toward migraine); diarrhea argues against gastritis. These guards are also what powers contradiction detection (Section 10).

## 7.4 Rule management

The Knowledge Base screen exposes the knowledge as data:

- rule table: ID · name · premises (chips) · NOT-premises · conclusion · kind · status · edit · delete
- rule editor: IF-builder with AND/OR toggle, positive multi-select, AND-NOT multi-select, THEN conclusion picker (conditions or derived facts), kind, and a note
- edits/overrides/deletions persist (SQLite in the full deployment; localStorage mirror offline) and a **Reset KB** restores the seed

---

# 8. The Dual Inference Engine

## 8.1 Forward chaining — algorithm

```text
facts    ← working memory (tri-state)
derived  ← ∅
repeat until fixpoint (max 12 cycles):
    for each rule R not yet fired:
        evaluate R against facts + derived
        if fired:
            if conclusion is derived fact x_*:
                derived ← derived ∪ {x_*}        # usable as premise next cycle
            else:
                concluded ← concluded ∪ {condition}
trace ← every evaluation, in order, with status fired/failed/pending
```

Each trace entry is structured exactly like this example from the spec:

```json
{ "rule": "R010", "conditions": ["fever", "cough", "sore_throat"],
  "result": "influenza", "status": "fired", "iteration": 1 }
```

## 8.2 Backward chaining — algorithm

```text
goal ← hypothesis H
rules ← all rules concluding H

prove(rule):
    for each positive premise p:
        if p is a symptom:   status ← present | absent | unknown (from facts)
        if p is derived x_*: recurse into rules concluding x_*   (depth ≤ 6, cycle-guarded)
    for each NOT-premise n:  satisfied iff n is ABSENT; failed iff n is PRESENT
    AND-rule: satisfied iff ALL children satisfied; failed iff ANY failed; else unknown
    OR-rule:  satisfied iff ANY positive child satisfied; failed iff blocked or all failed

verdict(H):
    pattern satisfied                     → VERIFIED
    contradiction present (NOT violated)  → WEAKENED
    required pattern premise absent       → WEAKENED
    some satisfied evidence               → PARTIALLY SUPPORTED
    no usable evidence                    → INSUFFICIENT DATA
```

The proof tree is rendered directly in the UI, e.g. for the demo influenza case:

```
GOAL Verification of Influenza (Flu) via 5 rule(s)
└─ ✗ R004 … (cold rule, not part of this goal)
└─ ✓ R010  IF Fever ∧ Cough ∧ Sore Throat · NOT Itchy Eyes · NOT Runny Nose → Influenza
│   ├─ ✓ Fever reported present
│   ├─ ✓ Cough reported present
│   ├─ ✓ Sore Throat reported present
│   ├─ ✓ NOT itchy_eyes — confirmed absent
│   └─ ✓ NOT runny_nose — confirmed absent
└─ ? R011  IF Body Ache → Influenza
    └─ ? Body Ache not yet established
```

## 8.3 Integration per cycle

One API reasoning cycle = forward discovery → candidate collection (fired conclusions **plus** any condition with at least one satisfied premise) → backward verification of every candidate → arena scoring → contradiction scan → question selection → event log. This matches the "both modes integrated internally" requirement; the UI's Mode A/B only changes emphasis (Mode B pins one proof tree on top).

---

# 9. The Hypothesis Arena (Diagnostic Battle)

## 9.1 Scoring — fully defined

For condition H:

```
expected(H)     = distinct evidence items across all rules concluding H
satisfied       = expected items currently PRESENT (derived facts count when derived)
unmet           = expected items currently known ABSENT
contradicted    = NOT-premises that are currently PRESENT

Rule Match Score = 100 × max(0, satisfied − 1.5·contradicted − 0.5·unmet) ÷ |expected(H)|
```

- displayed as **`satisfied / expected`** (e.g. `4/7`) plus the 0–100 score
- penalties are public: each contradiction costs 1.5 satisfied-items; each unmet item costs 0.5
- a hypothesis enters the arena only if it has ≥ 1 satisfied item or a contradiction (visible-but-weakened)

This is a **rule-match score — explicitly not a medical probability.**

## 9.2 Each arena card shows

- rank, label, verification verdict badge, contradiction badge
- Rule Match bar + fraction
- expandable **Why?** panel: supporting evidence (with the rule that consumed each fact), missing information (unknown, and whether already asked), expected-but-absent items, contradictory evidence with the exact rule it violates, fired-rule narratives, plain-language summary, and the backward proof tree

## 9.3 Ranking example (from the demo case)

```
#1 Influenza (Flu)    4/7  score 57   Verified
#2 Tension Headache   1/4  score 25   Partially Supported
#3 Common Cold        3/6  score 17   WEAKENED (fever present vs R001 NOT-guard)
#4 Food Poisoning     1/6  score 17   Partially Supported
#5 Gastroenteritis    1/6  score 17   Partially Supported
```

The Cold is visibly *penalized*, not hidden — the user sees exactly why it fell.

---

# 10. Contradiction Detection

Three classes, all surfaced — none auto-resolved:

| Class | Trigger | Example |
|---|---|---|
| `fact_conflict` | same fact both present and absent (engine-contract check) | defensive; the tri-state UI prevents it |
| `hypothesis_conflict` | a symptom is present that a rule requires ABSENT | fever is present, but R001 requires fever absent for Common Cold |
| `simulation_conflict` | a what-if override clashes with a recorded answer | recorded: vomiting = NO; simulated: vomiting = YES |

UI presentation:

```
⚠ Contradictory Evidence Detected        HYPOTHESIS CONFLICT
Fever is present, but rule R001 requires it ABSENT for Common Cold.
[ ✓ Fever reported present ]  [ ✗ Rule R001 → IF … NOT Fever … THEN Common Cold ]
Not auto-resolved — please verify this evidence.
```

Contradictions also feed the arena (penalty −1.5 each) and the backward verdict (`weakened`).

---

# 11. Next Best Question Engine

## 11.1 Algorithm

```text
candidates ← UNKNOWN symptoms referenced by rules of the TOP-3 hypotheses
for each candidate s:
    scoresYes ← re-score arena with s = PRESENT
    scoresNo  ← re-score arena with s = ABSENT
    power(s)  ← Σ over leading hypotheses | scoreYes(h) − scoreNo(h) |
ask argmax power(s)   (deterministic tie-break by candidate order)
```

## 11.2 Why this design

- **Top-3 focus:** the question's job is to separate the front-runners. Averaging over the whole arena would reward questions that lift two weak, jointly-moving hypotheses (e.g. vomiting raising both food-poisoning and gastroenteritis) instead of discriminating the leaders. This is exactly why the demo asks about **body ache** (separates influenza from tension headache) and not about a GI symptom.
- **Full transparency:** the question card shows discrimination power and a per-hypothesis impact table:

```
Influenza (Flu)      57 → 71 Y / 50 N
Tension Headache     25 → 50 Y / 13 N
```

## 11.3 The adaptive loop

Answer **YES / NO / NOT SURE** → fact recorded (NOT SURE records "unknown" but marks the question as *asked* so it is not repeated) → metrics updated → engine re-runs → arena re-ranks → NBQ recomputed → repeat. This turns a static questionnaire into an adaptive interview that asks only what matters.

---

# 12. What-If Simulator

- User picks any symptom and simulates YES or NO; multiple overlays can stack.
- The engine runs **twice**: once on recorded facts (Before) and once on `recorded ∪ overlay` (After).
- Simulated facts are clearly tagged `SIM · Body Ache = YES`, never mutate recorded evidence, and removal re-simulates instantly.
- Output table animates each hypothesis from before → after; overlay conflicts trigger the `simulation_conflict` alert.
- The panel is permanently labeled: **"Rule simulation — not a medical prediction."**

---

# 13. Explainability Engine

Every conclusion is answerable at three depths:

1. **Plain-language summary** — one paragraph per hypothesis ("Influenza is supported by 4 evidence items via 3 fired rules; 1 expected item unknown; no contradictions").
2. **Structured evidence** — supporting facts with the consuming rule id, missing items, unmet items, contradictions with the violated rule, and fired-rule narratives:

```
R010 — Influenza Pattern: Fever AND Cough AND Sore Throat
       while NOT Itchy Eyes, NOT Runny Nose → Influenza (Flu)
R012 — Flu — fatigue: Fatigue → Influenza (Flu)
```

3. **Formal trace** — the raw forward trace and the backward proof tree (Expert System View & proof tree panel).

Because the system is symbolic and deterministic, explanations are **complete and exact** — not approximations of a black box.

---

# 14. Reasoning Graph

A custom layered SVG visualization (no external graph library):

```
Layer 0  SYMPTOM FACTS      pills   — teal present · rose absent · dashed slate unknown
Layer 1  DERIVED FACTS      diamonds— x_respiratory_distress etc.
Layer 2  PRODUCTION RULES   nodes   — cyan-glow fired · amber-dashed pending · grey failed
Layer 3  HYPOTHESES         cards   — top match highlighted, score + fraction shown
```

Edges: `supports` (symptom→rule), `requires` (derived→rule), `derives` (rule→derived), `contradicts` (NOT-premise, rose dashed), `produces` (rule→condition). Inactive edges dim; contradicts edges are visually distinct.

**Animate Inference** replays the forward trace step-by-step: known symptoms light up, then each rule fires in true engine order, its conclusion activates, and the caption narrates *"Cycle event 3/7 — rule R012 fired"* until the fixpoint. Node hover shows state and metadata; the legend explains the visual language.

---

# 15. Expert System View (Viva Mode)

A chronological event log of the reasoning cycle — built for presenting to teachers:

```
T+00  FACTS               6 known facts loaded (4 present · 2 absent)
                          [ fever = PRESENT ] [ cough = PRESENT ] …
T+01  RULE MATCHING       46 production rules evaluated over 2 inference cycles
T+02  RULE FIRED: R002    Cold — throat irritation concluded common_cold
T+03  RULE FIRED: R010    Influenza Pattern concluded influenza
T+04  DERIVED FACT …      (when applicable)
T+..  HYPOTHESES CREATED  #1 Influenza (4/7, 57) · #2 Tension (1/4, 25) · …
T+..  BACKWARD VERIF.     1 verified · 2 partially supported · 1 weakened
T+..  CONTRADICTION CHECK 1 contradiction detected — NOT silently resolved
T+..  QUESTION SELECTED   body_ache chosen (discrimination power 58)
T+..  RESULT              Top rule-based match: Influenza (4/7)
```

Each event carries its machine-readable payload as mono chips (e.g. `fever = PRESENT`), connecting the friendly narration to the formal trace.

---

# 16. User Interface Walkthrough

| Screen | Contents |
|---|---|
| **Landing** | hero, tagline, animated reasoning-pipeline diagram, engine stats, feature cards (six engines), permanent disclaimer |
| **Diagnose — Step 1** | age / gender / optional identifier (nothing else, nothing personal), Mode A card (*"What conditions could explain these symptoms?"*), Mode B card (*"Could this condition explain my symptoms?"* + condition picker), **Load Demo Patient** |
| **Diagnose — Step 2** | 24 symptoms as tri-state chips grouped by category with search, per-chip tooltips, serious-symptom markers, live counter (`4 present · 2 absent · 18 unknown`) |
| **Diagnose — Step 3** | pipeline animation → top condition card (spec layout) → contradiction alerts → Next Best Question → tabs: **Arena / Reasoning Graph / Expert View / What-If** |
| **Knowledge Base** | rules table + full rule editor (IF [AND/OR] … AND NOT … THEN …), conditions browser with care notes, symptoms reference, Reset KB |
| **Dashboard** | totals (rules/conditions/symptoms), inference runs, mode split bar, contradictions, questions asked, average reasoning steps, most frequent top matches, architecture map |
| **History** | dated session cards: mode, top match + verdict badge, score, facts/questions/conflicts counters, cohort band only — deletable individually or wholesale |
| **About** | expert-system theory, both chaining strategies, why both, novelty, all four algorithms in pseudocode, test cases, 7-step viva guide, stack |

Design language: dark navy glass panels, restrained cyan/teal accent, amber for attention, rose for conflicts; Space Grotesk display + Inter body + JetBrains Mono for rule ids, traces and code; subtle grid backdrop, scanline and pulse micro-animations; fully responsive.

---

# 17. REST API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/diagnosis/forward` | Full adaptive cycle from a fact base (+ optional focus hypothesis) |
| POST | `/api/diagnosis/backward` | Focused verification of one hypothesis → proof tree + contradictions |
| POST | `/api/diagnosis/next-question` | Discrimination analysis only (question + impact preview + arena) |
| POST | `/api/diagnosis/what-if` | Before/after runs with a simulation overlay |
| GET | `/api/diagnosis/demo` | The reference scenario, pre-executed |
| GET | `/api/knowledge/symptoms` | All symptoms |
| GET | `/api/knowledge/conditions` | All conditions |
| GET | `/api/knowledge/rules` | All rules |
| POST | `/api/knowledge/rules` | Create rule (server assigns `R###` id if omitted) |
| PUT | `/api/knowledge/rules/{id}` | Update rule |
| DELETE | `/api/knowledge/rules/{id}` | Delete rule |
| GET | `/api/history` | Last 30 sessions |
| POST | `/api/history` | Append session summary |
| DELETE | `/api/history` | Clear history |

All diagnosis endpoints return **structured reasoning objects** (Section 6.3) — never a bare diagnosis string.

---

# 18. Reference Demonstration Scenario

The built-in demo (spec reference case):

```text
Fever: YES · Cough: YES · Sore Throat: YES · Fatigue: YES
Runny Nose: NO · Itchy Eyes: NO · Body Ache: UNKNOWN
```

**Cycle 1 expectations** (verified against the engine):

1. Forward chaining fires R002/R003/R004 (cold supports), R010 (influenza pattern), R012 (flu fatigue); R001 fails on runny-nose; R020 fails; R090 is blocked by cough; R200/R201 stay pending.
2. Arena: **Influenza 4/7 (57) Verified** — supporting fever/cough/sore-throat/fatigue, missing body-ache/chills/headache, zero contradictions. Cold 3/6 (17) **Weakened** by its own fever NOT-guard. Tension 1/4 (25).
3. NBQ: candidates evaluated; **body ache** selected (power 58 — it moves both influenza 57→71/50 and tension 25→50/13).

**Cycle 2 — answer YES:** influenza 5/7 (71), still verified; NBQ moves to headache/chills. **Answer NO instead:** influenza drops to 50 (unmet penalty) but keeps rank 1 — the ranking change is the teaching moment.

**Presentation tip:** open Reasoning Graph → *Animate Inference*, then Expert System View to narrate the cycle formally.

---

# 19. Test Cases

| # | Input facts | Expected engine behavior |
|---|---|---|
| T1 | fever✓ cough✓ sore_throat✓ fatigue✓ · runny_nose✗ itchy_eyes✗ | Influenza top (4/7), verdict Verified, NBQ = body ache; YES → 5/7 |
| T2 | sneezing✓ itchy_eyes✓ runny_nose✓ · fever✗ body_ache✗ | Allergy pattern fires (Verified, 3/4); Influenza never enters the arena (no satisfied premise); Cold trails as Partially Supported |
| T3 | T2 + fever✓ (or What-If fever=YES) | Allergy verdict flips to Weakened; `hypothesis_conflict` alert for R020's NOT-fever guard is displayed, not resolved |
| T4 | headache✓ fatigue✓ · light_sensitivity✗ nausea✗ | Tension-headache pattern verifies via satisfied NOT-guards; Migraine sits at 0 with two unmet items |
| T5 | nausea✓ vomiting✓ diarrhea✓ | R201 fires → `x_gi_distress` derived → multi-hop support R103/R052; gastroenteritis and food poisoning tie at 4/6 |
| T6 | recorded vomiting = NO, What-If vomiting = YES | `simulation_conflict` alert; recorded fact untouched; Before/After table shows the delta; revert restores |
| T7 | headache✓ light_sensitivity✓ nausea✓ | Migraine pattern verified (3/5); tension headache is eliminated by its NOT-guards |
| T8 | thirst✓ dry_mouth✓ dizziness✓ | Dehydration verified (3/7); OR-rule R063 pending (vomiting ∨ diarrhea unknown) |
| T9 | no present symptoms | Engine refuses to guess: empty arena, "mark at least one symptom PRESENT" — unknown is never assumed absent |
| T10 | admin deletes R010 then re-runs T1 | Influenza drops out of the arena top (pattern gone; supports may still enter with low score) — proves rules truly drive results |

---

# 20. Project Structure

```text
backend/
├── main.py               FastAPI app, CORS, startup seeding
├── engine.py             forward / backward / arena / contradictions / NBQ / orchestrator
├── knowledge_base.py     seed: 24 symptoms · 12 conditions · 46 rules · demo case
├── schemas.py            Pydantic request/response contracts
├── database.py           SQLAlchemy models + SQLite init/seed (medilogic.db)
├── routes.py             /api/diagnosis · /api/knowledge · /api/history
└── requirements.txt      fastapi · uvicorn · sqlalchemy · pydantic

src/
├── engine/               TypeScript mirror of the Python engine (offline fallback)
│   ├── types.ts          shared domain types (EngineResponse contract)
│   ├── forward.ts        fixpoint chaining + trace
│   ├── backward.ts       proof-tree verification + verdicts
│   ├── hypothesis.ts     arena scoring + explanation assembly
│   ├── contradiction.ts  three-class conflict detection
│   ├── questions.ts      next-best-question discrimination analysis
│   ├── graph.ts          layered reasoning-graph construction
│   └── index.ts          orchestrator: one full adaptive cycle + event log
├── data/knowledgeBase.ts KB mirror (single source shared with backend seed)
├── services/
│   ├── api.ts            REST-first client → engine fallback, same response shape
│   └── storage.ts        rule overrides, history, metrics (localStorage mirror)
├── hooks/useConsultation.ts  interview state machine (UI owns NO inference logic)
├── components/
│   ├── ReasoningGraph.tsx  layered SVG graph + trace animation
│   ├── ResultsView.tsx     arena, NBQ, what-if, proof trees, expert view
│   ├── Navbar.tsx · ui.tsx  design-system primitives
├── pages/                Landing · Diagnose · KnowledgeBase · Dashboard · HistoryPage · About
└── App.tsx               hash router shell

README.md                 quick setup + summary
document.md               this document
```

---

# 21. Setup & Installation

## 21.1 Backend (full deployment)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# optional: engine smoke test without HTTP
python engine.py
```

On first start, `medilogic.db` is created and seeded automatically.

## 21.2 Frontend

```bash
npm install
echo "VITE_API_URL=http://localhost:8000" > .env   # optional
npm run dev        # http://localhost:5173
npm run build      # production build
```

Without `.env`, the frontend transparently uses the bundled engine mirror — every feature (including rule editing, history, what-if) remains functional.

## 21.3 Verifying the integration

1. Start backend, set `VITE_API_URL`, run frontend.
2. Load the Demo Patient → Run Inference.
3. In DevTools, confirm `POST /api/diagnosis/forward` and that the UI renders the returned `hypotheses` unchanged.
4. Edit a rule in the Knowledge Base screen, re-run — observe the changed arena (rule-driven behavior).

---

# 22. Engineering Guarantees

- **Separation of concerns** — the React layer contains zero medical rules and zero scoring logic; it renders `EngineResponse` only.
- **Determinism / reproducibility** — identical facts + identical rules always produce identical traces, scores and questions (no randomness anywhere in the engine).
- **Monotonic forward inference** — fired rules are stable within a cycle; derived facts only add information.
- **Guarded recursion** — backward chaining is depth-limited (6) and cycle-guarded; forward chaining is iteration-limited (12).
- **Validation** — the rule editor enforces non-empty rule bodies, prevents a fact from being both required-present and required-absent, and prevents duplicate IDs; the backend re-validates with Pydantic.
- **Persistence** — rule edits and session history survive reloads; one-click seed restore.
- **Auditability** — every number in the UI can be traced to a formula (Section 9.1) and a rule trace; nothing is computed ad hoc.

---

# 23. Limitations

1. **Tiny knowledge base** — 12 conditions, 46 rules, everyday ailments only, by design.
2. **No uncertainty calculus** — no certainty factors, Bayesian weights, or fuzzy membership; the rule-match score is a deterministic audit metric, not a confidence measure.
3. **Single-user, local persistence** — history and rule edits are per-device (SQLite/localStorage), no accounts or multi-user KB concurrency.
4. **No temporal or severity modeling** — rules don't encode duration, intensity, or symptom progression.
5. **Booleans only** — symptoms are tri-state; there are no numeric measurements (temperature values, lab results).
6. **English-only, no accessibility audit beyond baseline semantics.**

None of these affect the validity of the reasoning engine — they bound the *domain*, not the *method*.

---

# 24. Future Enhancements

1. **Certainty factors (MYCIN-style CF algebra)** or fuzzy rule strengths layered on the trace, with the same transparency demands.
2. **Larger curated KB** with import/export of rules as JSON/CSV and a review workflow.
3. **Context rules** — duration, severity, and onset facts as first-class premises.
4. **Explanation localization** and an accessible (screen-reader-first) reasoning mode.
5. **Session comparison view** — diff two reasoning cycles side by side.
6. **Property-based engine tests** (e.g. fast-check/Hypothesis) asserting engine invariants: monotonicity, determinism, and "no unknown ⇒ no fire".
7. **Teacher dashboard** — inspect a class's rule edits and traces.

---

# 25. Viva Preparation — Q&A

**Q. Is this AI?**
A. Yes — *symbolic* AI. A knowledge-based expert system: explicit rules + an inference engine. There is no machine learning, no training data, and no LLM/ChatGPT API anywhere.

**Q. What is the difference between forward and backward chaining?**
A. Forward chaining is data-driven: from facts it fires all rules it can, discovering what can be concluded (used for hypothesis generation). Backward chaining is goal-driven: from a hypothesis it recursively proves premises, producing a proof tree (used for verification). MediLogic X runs both per cycle — discovery *then* verification.

**Q. Why three states for symptoms?**
A. Under a closed-world assumption, unasked symptoms would silently count as absent, corrupting rules with NOT-guards and making principled questioning impossible. Tri-state facts let the engine distinguish "known absent" from "not yet known" — the latter becomes question candidates.

**Q. What does the score mean?**
A. A **Rule Match Score**: satisfied/expected evidence minus published penalties (1.5 per contradiction, 0.5 per expected-but-absent item), scaled to 100. It is deterministic and reproducible, and is never presented as a medical probability.

**Q. How is the next question chosen?**
A. For every unknown symptom referenced by the top-3 hypotheses, both answers are simulated and engine scores recomputed. The symptom with the greatest total absolute score shift across leaders is asked, with its impact preview shown.

**Q. How are contradictions handled?**
A. Detected in three classes (fact, hypothesis-NOT-guard, simulation), displayed with both evidence sides, penalized in scoring, and reflected in verdicts — but **never** silently resolved; user verification is requested.

**Q. What are derived facts for?**
A. They enable multi-hop chaining: intermediate conclusions (`x_respiratory_distress`, `x_gi_distress`) become premises of other rules, so inference runs in multiple cycles to a fixpoint. This demonstrates true chaining depth in the graph.

**Q. Why is the frontend not allowed to compute results?**
A. To keep the expert system academically legitimate and auditable: one engine, one source of truth. The UI renders the structured `EngineResponse`; rule edits change behavior without touching UI code.

**Q. How do you test correctness?**
A. Deterministic engine + scripted test cases (Section 19) with expected traces; the demo scenario is reproducible end-to-end, and `python engine.py` smoke-tests the KB without any server.

---

# 26. Conclusion

MediLogic X demonstrates that a carefully engineered **rule-based expert system** can deliver something ML demos usually cannot: a decision-support tool whose every conclusion is **discovered by forward chaining, verified by backward chaining, refined by adaptive questioning, guarded by contradiction detection, and explained down to the individual rule**.

The system's value is architectural honesty: a declarative knowledge base, a deterministic engine, and a UI that merely renders reasoning. The result is not just a working app but a teaching artifact — the inference trace, the proof trees, the arena and the event log make the classical AI syllabus *visible*.

> **"MediLogic X doesn't just give an answer. It shows how the answer was reasoned."**

---

# 27. References

1. J. Giarratano, G. Riley — *Expert Systems: Principles and Programming*, 4th ed., Thomson/Course Technology.
2. S. Russell, P. Norvig — *Artificial Intelligence: A Modern Approach*, 4th ed., Pearson (chapters on logical agents, forward/backward chaining).
3. B. G. Buchanan, E. H. Shortliffe (eds.) — *Rule-Based Expert Systems: The MYCIN Experiments*, Addison-Wesley (certainty factors, explanation).
4. P. Jackson — *Introduction to Expert Systems*, 3rd ed., Addison-Wesley.
5. FastAPI documentation — https://fastapi.tiangolo.com
6. SQLAlchemy documentation — https://docs.sqlalchemy.org
7. React documentation — https://react.dev · Tailwind CSS — https://tailwindcss.com
8. Course lecture notes on knowledge representation and inference strategies.

---

*Document version 1.0 — MediLogic X project documentation. Educational use only; not a medical device.*

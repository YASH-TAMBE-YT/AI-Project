# MediLogic X — Adaptive Explainable Medical Expert System

> **Discover. Verify. Explain.**
> A rule-based medical decision-support expert system using **Forward Chaining** + **Backward Chaining** + **Adaptive Questioning**. Not an ML model. Not a generative AI chatbot.

⚠️ **Educational decision-support system.** Results are *rule-based matches* produced only by programmed knowledge and must not be considered a medical diagnosis. If symptoms are severe, worsening or concerning, seek professional medical attention.

---

## 1. The Core Idea

Traditional symptom checkers do `Symptoms → Disease`. MediLogic X treats diagnosis as a **reasoning process**:

```
Patient Symptoms
      ↓
Forward Chaining          (data-driven discovery, fixpoint + derived facts)
      ↓
Hypothesis Arena          (competing conditions, rule-match scores)
      ↓
Backward Chaining         (goal-driven verification, AND/OR proof trees)
      ↓
Contradiction Detection   (conflicts surfaced — never silently resolved)
      ↓
Next Best Question        (discrimination analysis over unknown facts)
      ↓
Update Knowledge → Repeat → Explainable Result
```

## 2. Architecture

```
React Frontend  (presentation only — NEVER computes a diagnosis)
      ↓ REST (structured reasoning JSON)
FastAPI
      ↓
Inference Engine   (pure, deterministic, UI-independent)
      ↓
Knowledge Base     (46 production rules, AND/OR/NOT operators)
      ↓
SQLite             (symptoms, conditions, rules, history)
```

```
backend/
├── main.py             FastAPI entry + CORS
├── engine.py           forward / backward / arena / contradictions / NBQ / orchestrator
├── knowledge_base.py   seed: 24 symptoms · 12 conditions · 46 rules
├── schemas.py          Pydantic contracts
├── database.py         SQLAlchemy models + SQLite seeding
├── routes.py           /api/diagnosis · /api/knowledge · /api/history
└── requirements.txt

frontend (project root)
└── src/
    ├── engine/         1:1 TypeScript port of the Python engine (offline mirror)
    ├── data/           knowledge base mirror of the SQLite seed
    ├── services/       api.ts (REST-first, engine fallback) · storage.ts
    ├── hooks/          useConsultation — interview state machine
    ├── components/     ResultsView · ReasoningGraph · ui primitives
    └── pages/          Landing · Diagnose · KnowledgeBase · Dashboard · History · About
```

> **Why a TypeScript mirror?** The deployed static demo has no server. The React app always
> calls the REST layer first (`VITE_API_URL`); when no backend is reachable it falls back to
> the bundled engine — a direct port that lives outside the UI layer and returns the same
> response shape. In the full deployment **all** inference runs inside FastAPI.

## 3. Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# smoke test the engine without HTTP:
python engine.py
```

### Frontend
```bash
npm install
echo "VITE_API_URL=http://localhost:8000" > .env   # optional; offline mirror is used without it
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

## 4. Reasoning Modes

| Mode | Question | Engine path |
|------|----------|-------------|
| **A — Forward Diagnosis** | *"What conditions could explain these symptoms?"* | Facts → forward chaining → arena → backward verification → NBQ |
| **B — Backward Verification** | *"Could this condition explain my symptoms?"* | Select hypothesis → evidence → recursive proof tree verdict |

Both modes run the *same* integrated cycle internally; Mode B additionally highlights the focus proof tree.

### Tri-state evidence
Every symptom is `PRESENT` / `ABSENT` / `UNKNOWN`. **Unknown is never assumed absent** — it becomes a candidate for the Next Best Question engine.

## 5. Algorithms

- **Forward chaining** — monotonic rule firing to a fixpoint (≤12 cycles). Derived facts (`x_respiratory_distress`, `x_gi_distress`) feed back as premises → multi-hop chaining. Full evaluation trace recorded.
- **Backward chaining** — goal-driven; finds rules concluding the goal, recursively proves premises (depth-limited, cycle-guarded), emits an AND/OR proof tree with `satisfied / failed / unknown` nodes and a verdict: `verified / partially_supported / insufficient_data / weakened`.
- **Rule Match Score** — `100 × max(0, satisfied − 1.5·contradicted − 0.5·unmet) / expected`. Displayed as `satisfied/expected`. Explicitly **not** a medical probability.
- **Next Best Question** — for every unknown symptom referenced by active hypotheses, both answers are simulated; `power(s) = Σ|score_yes(h) − score_no(h)|` across hypotheses; the argmax is asked, with a full impact preview.
- **Contradiction detection** — fact conflicts (present+absent), hypothesis conflicts (present symptom required ABSENT by a rule), simulation conflicts (what-if overlay vs recorded facts). All surfaced; none auto-resolved.

## 6. Demo Scenario (main presentation)

1. **Diagnose → Load Demo Patient**: fever✓ cough✓ sore_throat✓ fatigue✓ · runny_nose✗ itchy_eyes✗ · body_ache **unknown**.
2. Run inference → **Influenza** tops the arena (`4/5`), zero contradictions.
3. The engine asks the Next Best Question: *"Are you experiencing body ache?"*
   - **YES** → Influenza `5/5`, verdict *Verified*.
   - **NO** → score drops (unmet penalty), arena re-ranks.
4. Show **Why?** panel (fired rules R010–R012 + proof tree), the **Reasoning Graph** with *Animate Inference*, the **What-If Simulator**, and the **Expert System View** event log.

## 7. Sample Test Cases

| # | Facts | Expected engine behavior |
|---|-------|--------------------------|
| T1 | fever✓ cough✓ sore_throat✓ fatigue✓ runny_nose✗ itchy_eyes✗ | Influenza top (`4/5`), NBQ = body ache; YES → `5/5` verified |
| T2 | sneezing✓ itchy_eyes✓ runny_nose✓ fever✗ body_ache✗ | Allergy pattern fires; allergy dominates arena |
| T3 | Allergy evidence + fever✓ (or What-If fever=YES) | Allergy verdict *weakened*; contradiction alert shown, not resolved |
| T4 | headache✓ fatigue✓ light_sensitivity✗ nausea✗ | Tension headache pattern verifies (NOT-guards satisfied) |
| T5 | nausea✓ vomiting✓ diarrhea✓ | x_gi_distress derived → multi-hop support for gastroenteritis & food poisoning |
| T6 | vomiting=YES simulation over recorded vomiting=NO | Simulation conflict alert; recorded fact unchanged |

## 8. Rule Format

```json
{
  "id": "R010",
  "name": "Influenza Pattern",
  "premises": ["fever", "cough", "sore_throat"],
  "not_premises": ["itchy_eyes", "runny_nose"],
  "operator": "AND",
  "conclusion": "influenza",
  "kind": "pattern"
}
```
`AND` fires when all premises are present and all NOT-premises are absent; `OR` fires when ≥1 premise is present and no NOT-premise is present. Unknown premises keep a rule **pending** — never assumed.

## 9. API Surface

```
POST /api/diagnosis/forward         full reasoning cycle
POST /api/diagnosis/backward        focused verification + proof tree
POST /api/diagnosis/next-question   discrimination analysis
POST /api/diagnosis/what-if         before/after overlay simulation
GET  /api/diagnosis/demo            reference scenario
GET  /api/knowledge/symptoms|conditions|rules
POST /api/knowledge/rules           PUT/DELETE /api/knowledge/rules/{id}
GET/POST/DELETE /api/history
```

## 10. Viva Quick Answers

- **Is it AI?** It's a *symbolic AI expert system* — knowledge-based reasoning over explicit rules. No machine learning, no LLMs, no probabilistic model.
- **Why two chaining directions?** Forward discovers candidates efficiently from data; backward verifies specific goals rigorously. Discovery + verification together outperform either alone.
- **Why tri-state facts?** Missing information must remain visible so the system knows what it doesn't know — the basis for the Next Best Question engine.
- **Where is uncertainty?** Deliberately excluded. The *Rule Match Score* is a deterministic rule-matching metric with published penalties — reproducible, inspectable, and never presented as a probability.
- **How are contradictions handled?** They are detected, displayed with both evidence sides, and left for user verification — the engine never silently resolves conflicts.

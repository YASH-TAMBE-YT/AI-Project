"""
MediLogic X — REST API routers.

Endpoints
    POST /api/diagnosis/forward         full adaptive reasoning cycle
    POST /api/diagnosis/backward        focused goal verification
    POST /api/diagnosis/next-question   discrimination analysis only
    POST /api/diagnosis/what-if         simulated overlay reasoning
    GET  /api/diagnosis/{id}/reasoning  stored session replay (history detail)

    GET  /api/knowledge/symptoms
    GET  /api/knowledge/conditions
    GET  /api/knowledge/rules
    POST /api/knowledge/rules
    PUT  /api/knowledge/rules/{id}
    DELETE /api/knowledge/rules/{id}

    GET  /api/history
    POST /api/history
    DELETE /api/history
"""

from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import HistoryRow, RuleRow, get_db, load_rules
from engine import (backward_chaining, detect_contradictions, forward_chaining,
                    run_inference, select_next_best_question)
from knowledge_base import CONDITIONS, SYMPTOMS, DEMO_FACTS
from schemas import (BackwardRequest, HistoryIn, InferenceRequest, QuestionRequest,
                     RuleIn, WhatIfRequest)

api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# diagnosis
# ---------------------------------------------------------------------------

diagnosis = APIRouter(prefix="/diagnosis", tags=["diagnosis"])


@diagnosis.post("/forward")
def forward_endpoint(req: InferenceRequest, db: Session = Depends(get_db)):
    """Run one full adaptive cycle: forward discovery + backward verification
    + arena scoring + contradiction detection + next best question."""
    rules = load_rules(db)
    return run_inference(req.facts, simulation=None,
                         focus_hypothesis=req.focus_hypothesis,
                         asked_ids=req.asked_ids, rules=rules)


@diagnosis.post("/backward")
def backward_endpoint(req: BackwardRequest, db: Session = Depends(get_db)):
    rules = load_rules(db)
    derived = set(forward_chaining(req.facts, rules)["derivedFacts"])
    report = backward_chaining(req.hypothesis, req.facts, rules, derived)
    contradictions = detect_contradictions(req.facts, req.facts, None, rules, [req.hypothesis])
    return {"report": report, "contradictions": contradictions}


@diagnosis.post("/next-question")
def next_question_endpoint(req: QuestionRequest, db: Session = Depends(get_db)):
    rules = load_rules(db)
    result = run_inference(req.facts, asked_ids=req.asked_ids, rules=rules)
    return {"next_best_question": result["nextBestQuestion"],
            "hypotheses": result["hypotheses"]}


@diagnosis.post("/what-if")
def what_if_endpoint(req: WhatIfRequest, db: Session = Depends(get_db)):
    """Simulated overlay — recorded facts are never modified server-side."""
    rules = load_rules(db)
    before = run_inference(req.facts, rules=rules)
    after = run_inference(req.facts, simulation=req.simulation, rules=rules)
    return {"before": before, "after": after,
            "simulation": req.simulation,
            "label": "Rule simulation — not a medical prediction"}


@diagnosis.get("/demo")
def demo_endpoint(db: Session = Depends(get_db)):
    """Reference presentation scenario from the project specification."""
    rules = load_rules(db)
    return {"facts": DEMO_FACTS, "result": run_inference(DEMO_FACTS, rules=rules)}


# ---------------------------------------------------------------------------
# knowledge base
# ---------------------------------------------------------------------------

knowledge = APIRouter(prefix="/knowledge", tags=["knowledge"])


@knowledge.get("/symptoms")
def get_symptoms():
    return {"symptoms": SYMPTOMS}


@knowledge.get("/conditions")
def get_conditions():
    return {"conditions": CONDITIONS}


@knowledge.get("/rules")
def get_rules(db: Session = Depends(get_db)):
    return {"rules": load_rules(db)}


def _next_rule_id(db: Session) -> str:
    ids = [r.id for r in db.query(RuleRow).all()]
    nums = [int(m.group(1)) for rid in ids if (m := re.match(r"R(\d+)$", rid))]
    return f"R{(max(nums) if nums else 0) + 1:03d}"


@knowledge.post("/rules", status_code=201)
def create_rule(rule: RuleIn, db: Session = Depends(get_db)):
    rid = rule.id or _next_rule_id(db)
    if db.get(RuleRow, rid):
        raise HTTPException(409, f"Rule {rid} already exists")
    row = RuleRow(id=rid, name=rule.name, premises=json.dumps(rule.premises),
                  not_premises=json.dumps(rule.not_premises), operator=rule.operator,
                  conclusion=rule.conclusion, kind=rule.kind, note=rule.note)
    db.add(row)
    db.commit()
    return {"rule": load_rules(db) and {"id": rid, **rule.model_dump(exclude={"id"})}}


@knowledge.put("/rules/{rule_id}")
def update_rule(rule_id: str, rule: RuleIn, db: Session = Depends(get_db)):
    row = db.get(RuleRow, rule_id)
    if not row:
        raise HTTPException(404, f"Rule {rule_id} not found")
    row.name = rule.name
    row.premises = json.dumps(rule.premises)
    row.not_premises = json.dumps(rule.not_premises)
    row.operator = rule.operator
    row.conclusion = rule.conclusion
    row.kind = rule.kind
    row.note = rule.note
    db.commit()
    return {"ok": True}


@knowledge.delete("/rules/{rule_id}")
def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    row = db.get(RuleRow, rule_id)
    if not row:
        raise HTTPException(404, f"Rule {rule_id} not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# history
# ---------------------------------------------------------------------------

history = APIRouter(prefix="/history", tags=["history"])


@history.get("")
def list_history(db: Session = Depends(get_db)):
    rows = db.query(HistoryRow).order_by(HistoryRow.created_at.desc()).limit(30).all()
    return {"history": [{
        "id": r.id, "date": r.created_at.isoformat(), "mode": r.mode,
        "topMatch": r.top_match, "scoreText": r.score_text, "verdict": r.verdict,
        "factsKnown": r.facts_known, "questionsAsked": r.questions_asked,
        "contradictions": r.contradictions, "ageBand": r.age_band, "gender": r.gender,
    } for r in rows]}


@history.post("", status_code=201)
def add_history(entry: HistoryIn, db: Session = Depends(get_db)):
    row = HistoryRow(mode=entry.mode, top_match=entry.top_match, score_text=entry.score_text,
                     verdict=entry.verdict, facts_known=entry.facts_known,
                     questions_asked=entry.questions_asked, contradictions=entry.contradictions,
                     age_band=entry.age_band, gender=entry.gender)
    db.add(row)
    db.commit()
    return {"id": row.id}


@history.delete("")
def clear_history(db: Session = Depends(get_db)):
    db.query(HistoryRow).delete()
    db.commit()
    return {"ok": True}


api.include_router(diagnosis)
api.include_router(knowledge)
api.include_router(history)

"""
MediLogic X — SQLite persistence layer (SQLAlchemy).

Tables: symptoms, conditions, rules (+ rule premise junctions), history.
On first run the database is created and seeded from knowledge_base.py.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from knowledge_base import CONDITIONS, RULES, SYMPTOMS

DATABASE_URL = "sqlite:///medilogic.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class SymptomRow(Base):
    __tablename__ = "symptoms"
    id = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    category = Column(String, nullable=False)
    serious = Column(Boolean, default=False)


class ConditionRow(Base):
    __tablename__ = "conditions"
    id = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    severity = Column(String, default="mild")
    description = Column(Text, default="")
    care = Column(Text, default="")


class RuleRow(Base):
    __tablename__ = "rules"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    premises = Column(Text, default="[]")        # JSON list of fact ids (must be present)
    not_premises = Column(Text, default="[]")    # JSON list of fact ids (must be absent)
    operator = Column(String, default="AND")
    conclusion = Column(String, nullable=False)
    kind = Column(String, default="support")
    note = Column(Text, nullable=True)


class HistoryRow(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    mode = Column(String, default="forward")
    top_match = Column(String, default="")
    score_text = Column(String, default="")
    verdict = Column(String, default="")
    facts_known = Column(Integer, default=0)
    questions_asked = Column(Integer, default=0)
    contradictions = Column(Integer, default=0)
    age_band = Column(String, nullable=True)
    gender = Column(String, nullable=True)


def row_to_rule(r: RuleRow) -> dict:
    return {"id": r.id, "name": r.name,
            "premises": json.loads(r.premises or "[]"),
            "not_premises": json.loads(r.not_premises or "[]"),
            "operator": r.operator, "conclusion": r.conclusion,
            "kind": r.kind, "note": r.note}


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.query(SymptomRow).count() == 0:
            db.add_all(SymptomRow(id=s["id"], label=s["label"], category=s["category"], serious=s.get("serious", False)) for s in SYMPTOMS)
        if db.query(ConditionRow).count() == 0:
            db.add_all(ConditionRow(**c) for c in CONDITIONS)
        if db.query(RuleRow).count() == 0:
            db.add_all(RuleRow(id=r["id"], name=r["name"], premises=json.dumps(r["premises"]),
                               not_premises=json.dumps(r["not_premises"]), operator=r["operator"],
                               conclusion=r["conclusion"], kind=r["kind"], note=r["note"]) for r in RULES)
        db.commit()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def load_rules(db: Session) -> list[dict]:
    return [row_to_rule(r) for r in db.query(RuleRow).all()]

"""
MediLogic X — Pydantic request/response schemas.

The API always returns structured reasoning data (hypotheses, traces,
contradictions, questions, explanations) — never a bare diagnosis string.
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

SymptomState = Literal["present", "absent", "unknown"]
RuleOperator = Literal["AND", "OR"]
RuleKind = Literal["pattern", "support", "derived"]


class InferenceRequest(BaseModel):
    facts: dict[str, SymptomState] = Field(default_factory=dict)
    simulation: Optional[dict[str, SymptomState]] = None
    focus_hypothesis: Optional[str] = None
    asked_ids: list[str] = Field(default_factory=list)


class BackwardRequest(BaseModel):
    hypothesis: str
    facts: dict[str, SymptomState] = Field(default_factory=dict)
    asked_ids: list[str] = Field(default_factory=list)


class QuestionRequest(BaseModel):
    facts: dict[str, SymptomState] = Field(default_factory=dict)
    asked_ids: list[str] = Field(default_factory=list)


class WhatIfRequest(BaseModel):
    facts: dict[str, SymptomState] = Field(default_factory=dict)
    simulation: dict[str, SymptomState] = Field(default_factory=dict)


class RuleIn(BaseModel):
    id: Optional[str] = None                     # server assigns when omitted
    name: str
    premises: list[str] = Field(default_factory=list)
    not_premises: list[str] = Field(default_factory=list)
    operator: RuleOperator = "AND"
    conclusion: str
    kind: RuleKind = "support"
    note: Optional[str] = None


class RuleOut(RuleIn):
    id: str


class SymptomOut(BaseModel):
    id: str
    label: str
    category: str
    serious: bool = False


class ConditionOut(BaseModel):
    id: str
    label: str
    severity: str
    description: str
    care: str


class HistoryIn(BaseModel):
    mode: Literal["forward", "backward"]
    top_match: str
    score_text: str
    verdict: str
    facts_known: int = 0
    questions_asked: int = 0
    contradictions: int = 0
    age_band: Optional[str] = None
    gender: Optional[str] = None

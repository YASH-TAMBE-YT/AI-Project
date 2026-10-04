"""
MediLogic X — Inference Engine
==============================

UI-independent, framework-independent expert-system core.

Sub-engines:
    ForwardChainingEngine    — data-driven, fixpoint, multi-hop via derived facts
    BackwardChainingEngine   — goal-driven, recursive AND/OR proof trees
    HypothesisEngine         — the "arena": rule-match scoring with penalties
    ContradictionEngine      — conflicts are surfaced, never silently resolved
    QuestionEngine           — next best question via discrimination analysis
    ExplanationEngine        — plain-language justifications per hypothesis

Purity: every function is deterministic — identical facts + rules always
produce identical traces (important for testing and demonstration).
"""

from __future__ import annotations

from copy import deepcopy
from knowledge_base import CONDITIONS, RULES, SYMPTOMS, condition_label, is_derived, symptom_label

PENALTY_CONTRADICTION = 1.5
PENALTY_UNMET = 0.5
MAX_ITERATIONS = 12
DEPTH_LIMIT = 6


# ---------------------------------------------------------------------------
# Forward chaining
# ---------------------------------------------------------------------------

def _fact_state(facts: dict, derived: set, fid: str) -> str:
    if is_derived(fid):
        return "present" if fid in derived else "unknown"
    return facts.get(fid, "unknown")


def evaluate_rule(rule: dict, facts: dict, derived: set, iteration: int) -> dict:
    satisfied, failed, unknown, blocked = [], [], [], []

    for np_ in rule["not_premises"]:
        st = _fact_state(facts, derived, np_)
        if st == "present":
            blocked.append(np_)
        elif st == "unknown":
            unknown.append(np_)

    any_true = False
    for p in rule["premises"]:
        st = _fact_state(facts, derived, p)
        if st == "present":
            satisfied.append(p)
            any_true = True
        elif st == "absent":
            failed.append(p)
        else:
            unknown.append(p)

    if rule["operator"] == "AND":
        if failed or blocked:
            status = "failed"
        elif unknown:
            status = "pending"
        else:
            status = "fired" if rule["premises"] or rule["not_premises"] else "failed"
    else:  # OR
        if blocked:
            status = "failed"
        elif any_true:
            status = "fired"
        elif len(failed) == len(rule["premises"]):
            status = "failed"
        else:
            status = "pending"

    return {
        "ruleId": rule["id"],
        "status": status,
        "satisfied": satisfied,
        "failed": failed,
        "unknown": unknown,
        "blockedBy": blocked or None,
        "conclusion": rule["conclusion"],
        "kind": rule["kind"],
        "iteration": iteration,
    }


def forward_chaining(facts: dict, rules: list[dict] | None = None) -> dict:
    """Run data-driven inference to a fixpoint. Returns trace + derived sets."""
    rules = rules if rules is not None else RULES
    derived, concluded, fired_ids, trace = set(), set(), set(), []
    iterations = 0
    changed = True

    while changed and iterations < MAX_ITERATIONS:
        changed = False
        iterations += 1
        for rule in rules:
            if rule["id"] in fired_ids:
                continue  # monotonic inference: a fired rule stays fired
            ev = evaluate_rule(rule, facts, derived, iterations)
            trace.append(ev)
            if ev["status"] == "fired":
                fired_ids.add(rule["id"])
                if is_derived(rule["conclusion"]):
                    if rule["conclusion"] not in derived:
                        derived.add(rule["conclusion"])
                        changed = True
                else:
                    concluded.add(rule["conclusion"])

    return {"derivedConclusions": sorted(concluded), "derivedFacts": sorted(derived),
            "trace": trace, "iterations": iterations}


def latest_statuses(trace: list[dict]) -> dict:
    out = {}
    for ev in trace:
        out[ev["ruleId"]] = ev
    return out


# ---------------------------------------------------------------------------
# Backward chaining
# ---------------------------------------------------------------------------

def _prove_fact(fid: str, facts: dict, rules: list[dict], derived: set, depth: int, visited: set) -> dict:
    label = symptom_label(fid)
    if not is_derived(fid):
        st = facts.get(fid, "unknown")
        status = {"present": "satisfied", "absent": "failed"}.get(st, "unknown")
        return {"goal": fid, "kind": "fact", "status": status,
                "detail": f"{label} reported {st}" if st != "unknown" else f"{label} not yet established",
                "children": []}
    if depth >= DEPTH_LIMIT or fid in visited:
        return {"goal": fid, "kind": "fact",
                "status": "satisfied" if fid in derived else "unknown",
                "detail": f"{label} — depth limit reached", "children": []}
    visited = visited | {fid}
    children = [_prove_rule(r, facts, rules, derived, depth + 1, visited)
                for r in rules if r["conclusion"] == fid]
    any_sat = any(c["status"] == "satisfied" for c in children)
    all_fail = children and all(c["status"] == "failed" for c in children)
    return {"goal": fid, "kind": "fact",
            "status": "satisfied" if any_sat else ("failed" if all_fail else "unknown"),
            "detail": f"{label} must be derived by rule", "children": children}


def _prove_rule(rule: dict, facts: dict, rules: list[dict], derived: set, depth: int, visited: set) -> dict:
    children = [_prove_fact(p, facts, rules, derived, depth, visited) for p in rule["premises"]]
    not_children = []
    for np_ in rule["not_premises"]:
        st = facts.get(np_, "unknown")
        status = {"absent": "satisfied", "present": "failed"}.get(st, "unknown")
        not_children.append({"goal": f"NOT {np_}", "kind": "fact", "status": status,
                             "detail": f"{symptom_label(np_)} is {'present — conflicts with rule requirement' if st == 'present' else st}",
                             "children": []})

    pos = [c["status"] for c in children]
    blocked = any(n["status"] == "failed" for n in not_children)
    if rule["operator"] == "AND":
        if "failed" in pos or blocked:
            status = "failed"
        elif all(n["status"] == "satisfied" for n in children + not_children):
            status = "satisfied"
        else:
            status = "unknown"
    else:
        if blocked:
            status = "failed"
        elif "satisfied" in pos:
            status = "satisfied"
        elif pos and all(s == "failed" for s in pos):
            status = "failed"
        else:
            status = "unknown"

    premise_labels = f" {rule['operator']} ".join(symptom_label(p) for p in rule["premises"])
    not_labels = " · NOT " + " · NOT ".join(symptom_label(n) for n in rule["not_premises"]) if rule["not_premises"] else ""
    return {"goal": rule["id"], "kind": "rule", "ruleId": rule["id"], "status": status,
            "detail": f"IF {premise_labels}{not_labels} → {condition_label(rule['conclusion'])}",
            "children": children + not_children}


def backward_chaining(hypothesis: str, facts: dict, rules: list[dict] | None = None, derived: set | None = None) -> dict:
    """Goal-driven verification of `hypothesis` with a full proof tree."""
    rules = rules if rules is not None else RULES
    derived = derived if derived is not None else set(forward_chaining(facts, rules)["derivedFacts"])
    relevant = [r for r in rules if r["conclusion"] == hypothesis]
    rule_nodes = [_prove_rule(r, facts, rules, derived, 1, {hypothesis}) for r in relevant]

    satisfied, failed, unknown, contradicting = set(), set(), set(), []

    def collect(n: dict) -> None:
        if n["kind"] == "fact" and not n["goal"].startswith("NOT "):
            if n["status"] == "satisfied":
                satisfied.add(n["goal"])
            elif n["status"] == "failed" and not is_derived(n["goal"]):
                failed.add(n["goal"])
            elif n["status"] == "unknown":
                unknown.add(n["goal"])
        if n["kind"] == "fact" and n["goal"].startswith("NOT ") and n["status"] == "failed":
            contradicting.append(n["goal"].replace("NOT ", ""))
        for c in n["children"]:
            collect(c)

    for n in rule_nodes:
        collect(n)

    pattern_idx = next((i for i, r in enumerate(relevant) if r["kind"] == "pattern"), None)
    pattern_status = rule_nodes[pattern_idx]["status"] if pattern_idx is not None else None

    if contradicting:
        verdict = "weakened"
    elif pattern_status == "satisfied":
        verdict = "verified"
    elif pattern_status == "failed":
        verdict = "weakened"
    elif satisfied:
        verdict = "partially_supported"
    else:
        verdict = "insufficient_data"

    summaries = {
        "verified": "Core pattern fully supported by current evidence",
        "partially_supported": "Some evidence supports this hypothesis; key facts remain unverified",
        "insufficient_data": "Not enough evidence to evaluate this hypothesis",
        "weakened": (f"Contradictory evidence present ({', '.join(symptom_label(c) for c in contradicting)})"
                     if contradicting else "A required premise of the core pattern is known to be absent"),
    }

    root = {"goal": hypothesis, "kind": "condition",
            "status": {"verified": "satisfied", "weakened": "failed"}.get(verdict, "unknown"),
            "detail": f"Verification of {condition_label(hypothesis)} via {len(relevant)} rule(s)",
            "children": rule_nodes}

    return {"hypothesis": hypothesis, "verdict": verdict, "proofTree": root,
            "satisfied": sorted(satisfied), "failed": sorted(failed), "unknown": sorted(unknown),
            "contradicting": contradicting, "summary": summaries[verdict]}


# ---------------------------------------------------------------------------
# Hypothesis engine (the arena)
# ---------------------------------------------------------------------------

def build_hypotheses(facts: dict, rules: list[dict], derived: set, trace: list[dict],
                     reports: dict, asked_ids: set) -> list[dict]:
    latest = latest_statuses(trace)
    candidate_ids = {ev["conclusion"] for ev in trace if ev["status"] == "fired" and not is_derived(ev["conclusion"])}
    for c in CONDITIONS:
        cid = c["id"]
        if cid in candidate_ids:
            continue
        if any(any(_fact_state(facts, derived, p) == "present" for p in r["premises"])
               for r in rules if r["conclusion"] == cid):
            candidate_ids.add(cid)

    cards = []
    for cid in candidate_ids:
        cond_rules = [r for r in rules if r["conclusion"] == cid]
        if not cond_rules:
            continue
        expected, must_absent = set(), set()
        for r in cond_rules:
            expected.update(r["premises"])
            must_absent.update(r["not_premises"])

        supporting = sorted(e for e in expected if _fact_state(facts, derived, e) == "present")
        missing = sorted(e for e in expected if _fact_state(facts, derived, e) == "unknown" and not is_derived(e))
        unmet = sorted(e for e in expected if _fact_state(facts, derived, e) == "absent")
        contradicting = sorted(np_ for np_ in must_absent if _fact_state(facts, derived, np_) == "present")

        if not supporting and not contradicting:
            continue

        total = max(1, len(expected))
        raw = len(supporting) - PENALTY_CONTRADICTION * len(contradicting) - PENALTY_UNMET * len(unmet)
        score = max(0, min(100, round(100 * raw / total)))

        fired = [r["id"] for r in cond_rules if latest.get(r["id"], {}).get("status") == "fired"]
        pending = [r["id"] for r in cond_rules if latest.get(r["id"], {}).get("status") == "pending"]
        failed_rules = [r["id"] for r in cond_rules if latest.get(r["id"], {}).get("status") == "failed"]

        fired_narratives = []
        for r in cond_rules:
            if latest.get(r["id"], {}).get("status") != "fired":
                continue
            parts = f" {r['operator']} ".join(symptom_label(p) for p in r["premises"]) or "∅"
            nots = f" while NOT {', NOT '.join(symptom_label(n) for n in r['not_premises'])}" if r["not_premises"] else ""
            fired_narratives.append(f"{r['id']} — {r['name']}: {parts}{nots} → {condition_label(r['conclusion'])}")

        explanation = {
            "headline": f"Why is {condition_label(cid)} ranked here?",
            "supportingEvidence": [{"fact": f, "via": next((r["id"] for r in cond_rules
                                                            if f in r["premises"] and latest.get(r["id"], {}).get("status") == "fired"), "—")}
                                   for f in supporting],
            "missingEvidence": [{"fact": f, "asked": f in asked_ids} for f in missing],
            "contradictoryEvidence": [{"fact": f,
                                       "reason": f"Rule {next((r['id'] for r in cond_rules if f in r['not_premises']), '?')} requires "
                                                 f"{symptom_label(f)} to be ABSENT for {condition_label(cid)}, but it was reported present."}
                                      for f in contradicting],
            "firedRuleNarratives": fired_narratives,
            "plainSummary": (
                f"{condition_label(cid)} is supported by {len(supporting)} evidence item(s) via {len(fired)} fired rule(s). "
                f"{len(missing)} expected item(s) remain unknown. "
                f"{len(contradicting)} contradiction(s) detected." if contradicting else
                f"{condition_label(cid)} is supported by {len(supporting)} evidence item(s) via {len(fired)} fired rule(s). "
                f"{len(missing)} expected item(s) remain unknown. No contradictory evidence detected."),
        }

        cards.append({
            "condition": cid, "label": condition_label(cid), "rank": 0,
            "ruleMatchFraction": f"{len(supporting)}/{total}",
            "satisfiedCount": len(supporting), "totalExpected": total, "score": score,
            "supporting": supporting, "missing": missing, "unmet": unmet,
            "contradicting": contradicting,
            "firedRules": fired, "pendingRules": pending, "failedRules": failed_rules,
            "verdict": reports.get(cid, {}).get("verdict", "insufficient_data"),
            "explanation": explanation,
        })

    cards.sort(key=lambda c: (-c["score"], -c["satisfiedCount"], len(c["contradicting"])))
    for i, c in enumerate(cards):
        c["rank"] = i + 1
    return cards


# ---------------------------------------------------------------------------
# Contradiction engine
# ---------------------------------------------------------------------------

def detect_contradictions(base_facts: dict, effective_facts: dict, simulation: dict | None,
                          rules: list[dict], active_conditions: list[str]) -> list[dict]:
    out, serious = [], {s["id"] for s in SYMPTOMS if s.get("serious")}

    if simulation:
        for fid, sim_state in simulation.items():
            if sim_state == "unknown":
                continue
            base = base_facts.get(fid, "unknown")
            if base != "unknown" and base != sim_state:
                out.append({"id": f"sim-{fid}", "type": "simulation_conflict", "fact": fid,
                            "detail": f"The simulation sets {symptom_label(fid)} = {sim_state.upper()} but the recorded answer is {base.upper()}. "
                                      "Simulated facts never overwrite recorded evidence.",
                            "evidenceFor": f"Simulated as {sim_state}", "evidenceAgainst": f"Recorded as {base}",
                            "severe": fid in serious})

    seen = set()
    for cid in active_conditions:
        for rule in (r for r in rules if r["conclusion"] == cid):
            for np_ in rule["not_premises"]:
                if effective_facts.get(np_) == "present" and (cid, np_) not in seen:
                    seen.add((cid, np_))
                    out.append({"id": f"hyp-{cid}-{np_}", "type": "hypothesis_conflict", "fact": np_,
                                "detail": f"{symptom_label(np_)} is present, but rule {rule['id']} requires it ABSENT for "
                                          f"{condition_label(cid)}. This weakens the {condition_label(cid)} hypothesis.",
                                "evidenceFor": f"{symptom_label(np_)} reported present",
                                "evidenceAgainst": f"Rule {rule['id']} → IF … NOT {symptom_label(np_)} … THEN {condition_label(cid)}",
                                "severe": np_ in serious})
    return out


# ---------------------------------------------------------------------------
# Question engine (next best question)
# ---------------------------------------------------------------------------

def _quick_scores(facts: dict, rules: list[dict], active: list[str]) -> dict:
    derived = set(forward_chaining(facts, rules)["derivedFacts"])
    scores = {}
    for cid in active:
        cond_rules = [r for r in rules if r["conclusion"] == cid]
        expected, must_absent = set(), set()
        for r in cond_rules:
            expected.update(r["premises"])
            must_absent.update(r["not_premises"])
        sat = sum(1 for e in expected if _fact_state(facts, derived, e) == "present")
        unmet = sum(1 for e in expected if _fact_state(facts, derived, e) == "absent")
        contra = sum(1 for n in must_absent if facts.get(n) == "present")
        total = max(1, len(expected))
        scores[cid] = max(0, min(100, round(100 * (sat - PENALTY_CONTRADICTION * contra - PENALTY_UNMET * unmet) / total)))
    return scores


def select_next_best_question(facts: dict, rules: list[dict], active: list[str],
                              current_scores: dict) -> dict | None:
    referenced = set()
    for r in rules:
        if r["conclusion"] not in active:
            continue
        referenced.update(p for p in r["premises"] if not is_derived(p))
        referenced.update(r["not_premises"])
    candidates = [c for c in referenced if facts.get(c, "unknown") == "unknown"]
    if not candidates:
        return None

    best, best_power, best_yes, best_no = None, -1, None, None
    for cand in sorted(candidates):
        yes = _quick_scores({**facts, cand: "present"}, rules, active)
        no = _quick_scores({**facts, cand: "absent"}, rules, active)
        power = sum(abs(yes.get(c, 0) - no.get(c, 0)) for c in active)
        if power > best_power:
            best, best_power, best_yes, best_no = cand, power, yes, no

    if best is None or best_power <= 0:
        return None

    impacts = [{"condition": c, "label": condition_label(c),
                "current": current_scores.get(c, 0),
                "ifYes": best_yes.get(c, 0), "ifNo": best_no.get(c, 0)}
               for c in active[:4]]
    impacts = [i for i in impacts if i["ifYes"] != i["current"] or i["ifNo"] != i["current"]]
    movers = " · ".join(f"{i['label']}: {i['current']} → {i['ifYes']} if YES / {i['ifNo']} if NO" for i in impacts)

    return {
        "symptom": best, "label": symptom_label(best),
        "question": f"Are you currently experiencing {symptom_label(best).lower()}?",
        "discriminationPower": round(best_power),
        "whyThisQuestion": (f'Answering "{symptom_label(best)}" changes rule outcomes for {len(impacts)} competing '
                            f"hypotheses — it is the most discriminative unknown fact right now. {movers}"),
        "impacts": impacts,
    }


# ---------------------------------------------------------------------------
# Orchestrator — one full adaptive reasoning cycle
# ---------------------------------------------------------------------------

def run_inference(facts: dict, simulation: dict | None = None,
                  focus_hypothesis: str | None = None, asked_ids: list[str] | None = None,
                  rules: list[dict] | None = None) -> dict:
    rules = rules if rules is not None else deepcopy(RULES)
    asked = set(asked_ids or [])
    effective = {**facts, **(simulation or {})}
    events = []

    known = [(k, v) for k, v in effective.items() if v != "unknown"]
    events.append({"type": "facts", "title": "Facts Recorded",
                   "detail": f"{len(known)} known facts loaded into working memory. Unknown facts are never assumed absent.",
                   "mono": [f"{k} = {v.upper()}" for k, v in known]})

    # 1 — forward chaining
    fwd = forward_chaining(effective, rules)
    derived = set(fwd["derivedFacts"])
    fired_events = [t for t in fwd["trace"] if t["status"] == "fired"]
    events.append({"type": "rule_matching", "title": "Rule Matching",
                   "detail": f"{len(rules)} production rules evaluated over {fwd['iterations']} inference cycle(s).", "mono": None})
    for f in fired_events:
        events.append({"type": "derived_fact" if is_derived(f["conclusion"]) else "rule_fired",
                       "title": f"{'Derived Fact' if is_derived(f['conclusion']) else 'Rule Fired'}: {f['ruleId']}",
                       "detail": f"{f['ruleId']} concluded {condition_label(f['conclusion'])}.",
                       "mono": [f"{f['ruleId']} → {f['conclusion']}"]})

    # 2 — backward verification of every arena candidate
    reports_map = {}
    candidate_ids = {ev["conclusion"] for ev in fwd["trace"] if ev["status"] == "fired" and not is_derived(ev["conclusion"])}
    for c in CONDITIONS:
        cid = c["id"]
        if cid not in candidate_ids and any(
                any(_fact_state(effective, derived, p) == "present" for p in r["premises"])
                for r in rules if r["conclusion"] == cid):
            candidate_ids.add(cid)
    for cid in candidate_ids:
        reports_map[cid] = backward_chaining(cid, effective, rules, derived)

    # 3 — hypothesis arena
    hypotheses = build_hypotheses(effective, rules, derived, fwd["trace"], reports_map, asked)
    events.append({"type": "hypothesis", "title": "Hypotheses Created" if hypotheses else "No Hypotheses Yet",
                   "detail": f"{len(hypotheses)} competing hypotheses entered the arena." if hypotheses else
                             "No premise in the knowledge base is satisfied by current evidence.",
                   "mono": [f"#{h['rank']} {h['label']} — {h['ruleMatchFraction']} ({h['score']})" for h in hypotheses[:5]]})

    # 4 — contradictions
    contradictions = detect_contradictions(facts, effective, simulation, rules, [h["condition"] for h in hypotheses])
    events.append({"type": "contradiction", "title": "Contradiction Check",
                   "detail": f"{len(contradictions)} contradiction(s) detected — NOT silently resolved."
                             if contradictions else "No contradictory evidence detected.", "mono": None})

    # 5 — next best question (discrimination over the LEADING hypotheses)
    active = [h["condition"] for h in hypotheses[:3]]
    current_scores = {h["condition"]: h["score"] for h in hypotheses}
    nbq = select_next_best_question(effective, rules, active, current_scores) if hypotheses else None
    events.append({"type": "question",
                   "title": "Next Best Question Selected" if nbq else "No Further Questions",
                   "detail": nbq["whyThisQuestion"] if nbq else "All discriminative evidence is known.", "mono": None})

    events.append({"type": "result", "title": "Reasoning Cycle Complete",
                   "detail": f"Top rule-based match: {hypotheses[0]['label']} ({hypotheses[0]['ruleMatchFraction']})."
                             if hypotheses else "Cycle complete with an empty arena.", "mono": None})

    return {
        "facts": facts, "effectiveFacts": effective,
        "derivedFacts": sorted(derived), "forwardTrace": fwd["trace"],
        "fireCount": len(fired_events), "iterations": fwd["iterations"],
        "hypotheses": hypotheses,
        "backwardReports": [reports_map[h["condition"]] for h in hypotheses],
        "contradictions": contradictions,
        "nextBestQuestion": nbq,
        "graph": {"nodes": [], "edges": []},  # graph assembly happens client-side for rendering
        "events": events,
        "stats": {"factsKnown": len(known), "rulesEvaluated": len(rules),
                  "rulesFired": len(fired_events), "iterations": fwd["iterations"],
                  "reasoningSteps": len(fwd["trace"]) + len(hypotheses) * 2},
        "simulated": bool(simulation),
        "focusHypothesis": focus_hypothesis,
    }


if __name__ == "__main__":  # smoke test with the demo scenario
    from knowledge_base import DEMO_FACTS
    import json
    res = run_inference(DEMO_FACTS)
    print(json.dumps({"top": res["hypotheses"][0]["label"] if res["hypotheses"] else None,
                      "score": res["hypotheses"][0]["ruleMatchFraction"] if res["hypotheses"] else None,
                      "nbq": res["nextBestQuestion"]["question"] if res["nextBestQuestion"] else None,
                      "fired": res["stats"]["rulesFired"]}, indent=2))

"""Phase 0 synthetic contract review, not an application/runtime dependency.

GammaRay v0.0.2 (task P0-D03-002). Extends the v0.0.1 draft contract check with
the corrected finding identity models, the observation/evidence contract, the
registry v2 classification checks, state-transition reference tests, and the
D07 section 5.1 disclosure reference checks.

Requires Python 3 and the review-only package `jsonschema` 4.x. The local
family-schema references are resolved with `referencing` when it is installed,
and otherwise with jsonschema's legacy RefResolver store; both paths register
the same local resources and neither performs network resolution. The path
used is printed in the result line.
Run from the repository root:
  python docs/evidence/D03_draft_contract_check.py
"""
from __future__ import annotations

import copy
import hashlib
import json
import struct
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1] / "decisions" / "proposals"
load = lambda name: json.loads((ROOT / name).read_text(encoding="utf-8"))
main = load("D03_NORMALIZED_EVENT.schema.json")
families = [load(name) for name in ("D03_SOFTWARE_INVENTORY.schema.json", "D03_VULNERABILITY.schema.json")]
finding_schema = load("D03_FINDING.schema.json")
observation_schema = load("D03_FINDING_OBSERVATION.schema.json")
for schema in (main, *families, finding_schema, observation_schema):
    Draft202012Validator.check_schema(schema)

try:
    from referencing import Registry, Resource

    resources = Registry().with_resources(
        (schema["$id"], Resource.from_contents(schema)) for schema in families
    )
    validator = Draft202012Validator(main, format_checker=FormatChecker(), registry=resources)
    RESOLUTION = "referencing Registry"
except ImportError:
    import warnings

    from jsonschema import RefResolver

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        store = {schema["$id"]: schema for schema in families}
        resolver = RefResolver(base_uri="", referrer=main, store=store)
        validator = Draft202012Validator(main, format_checker=FormatChecker(), resolver=resolver)
    RESOLUTION = "legacy RefResolver store (referencing not installed)"

finding_validator = Draft202012Validator(finding_schema, format_checker=FormatChecker())
observation_validator = Draft202012Validator(observation_schema, format_checker=FormatChecker())

positives = [
    load("D03_example_auth.json"),
    load("D03_example_network.json"),
    load("D03_example_software_inventory.json"),
    load("D03_example_vulnerability.json"),
]
for event in positives:
    validator.validate(event)

# Every one of the 11 one-family/one-type alternatives is exercised.
for family_variant in main["oneOf"][:9]:
    family_name = family_variant["properties"]["event"]["properties"]["family"]["const"]
    type_name = family_variant["properties"]["event"]["properties"]["type"]["enum"][0]
    event = copy.deepcopy(positives[0])
    event.pop("details", None)
    event["event"] = {"family": family_name, "type": type_name, "outcome": "unknown"}
    validator.validate(event)

# --- Registry v2: completeness, classifications, schema agreement -----------
registry = load("D03_OBSERVABLE_REGISTRY.json")
assert registry["registry_version"] == 2
assert registry["cve_max_items_per_event"] == 32
assert registry["finding_evidence_max_refs_per_observation"] == 64
schema_fields = {
    f"{name}.{key}": value
    for name in registry["observable_roots"]
    for key, value in main["properties"][name]["properties"].items()
}
entries = registry["entries"]
registered_fields = [e["field"] for e in entries]
assert len(registered_fields) == len(set(registered_fields))
assert set(registered_fields) == set(schema_fields), "Registry/schema field mismatch"
assert len(entries) == 26

EXPECTED_CLASS = {
    "vulnerability.cve_ids": "operational",
    "vulnerability.cvss_score": "operational",
    "software.vendor": "operational",
    "software.name": "operational",
    "software.version": "operational",
    "software.cpe": "operational",
    "software.purl": "operational",
    "network.protocol": "operational",
    "host.name": "sensitive",
    "host.ip": "sensitive",
    "actor.user_name": "sensitive",
    "actor.user_id": "sensitive",
    "network.source_ip": "sensitive",
    "network.destination_ip": "sensitive",
    "vulnerability.source_finding_id": "sensitive",
}
for e in entries:
    s = schema_fields[e["field"]]
    assert e["handling_class"] in {"sensitive", "operational"}, e["field"]
    assert EXPECTED_CLASS.get(e["field"], e["handling_class"]) == e["handling_class"], (
        "classification drift",
        e["field"],
    )
    # Registry v2 completeness (task P0-D03-002 section 4 registry requirements).
    assert isinstance(e["families"], list) and e["families"], e["field"]
    assert e["nullable"] is False, e["field"]
    assert isinstance(e["required"], bool), e["field"]
    assert e["validation"] and e["normalization"], e["field"]
    for key in ("minLength", "maxLength", "minimum", "maximum", "pattern", "format", "items", "maxItems", "minItems", "uniqueItems"):
        if key in s:
            assert e["limits"].get(key) == s[key], (e["field"], key)
    if "enum" in s:
        assert e["limits"]["allowed"] == s["enum"]
    if "anyOf" in s:
        assert e["limits"]["formats"] == [v["format"] for v in s["anyOf"]]

# --- Event negatives (v0.0.1 set retained) -----------------------------------
sw = positives[2]
vuln = positives[3]
negatives = {
    "missing software": {k: v for k, v in sw.items() if k != "software"},
    "multiple software items in one event": {**sw, "software": [sw["software"], sw["software"]]},
    "missing vulnerability": {k: v for k, v in vuln.items() if k != "vulnerability"},
    "missing CVE array": {**vuln, "vulnerability": {"source_finding_id": "x"}},
    "CVE array empty": {**vuln, "vulnerability": {"cve_ids": []}},
    "CVE array over 32": {**vuln, "vulnerability": {"cve_ids": [f"CVE-2026-{1000 + i}" for i in range(33)]}},
    "CVE duplicate": {**vuln, "vulnerability": {"cve_ids": ["CVE-2026-12345"] * 2}},
    "invalid CVE": {**vuln, "vulnerability": {"cve_ids": ["2026-12345"]}},
    "lowercase CVE": {**vuln, "vulnerability": {"cve_ids": ["cve-2026-12345"]}},
    "invalid family/type": {**vuln, "event": {"family": "network", "type": "vulnerability.detected", "outcome": "unknown"}},
    "raw message": {**vuln, "message": "do not normalize this"},
    "extra observable": {**vuln, "file": {"unreviewed_text": "arbitrary"}},
    "invalid MD5": {**vuln, "file": {"md5": "ffff"}},
    "invalid SHA1": {**vuln, "file": {"sha1": "000"}},
    "URL with query": {**vuln, "web": {"url": "https://example.org/search?token=secret"}},
    "URL with fragment": {**vuln, "web": {"url": "https://example.org/path#fragment"}},
    "URL with userinfo": {**vuln, "web": {"url": "https://user@example.org/path"}},
    "CVSS outside range": {**vuln, "vulnerability": {"cve_ids": ["CVE-2026-12345"], "cvss_score": 10.1}},
    "unreviewed software free text": {**sw, "software": {"name": "ExampleSoft", "message": "not typed"}},
}
for label, event in negatives.items():
    assert not validator.is_valid(event), f"Validator accepted prohibited {label}"

# CVE boundaries: exactly 1 and exactly 32 accepted.
one_cve = copy.deepcopy(vuln)
one_cve["vulnerability"]["cve_ids"] = ["CVE-2026-12345"]
validator.validate(one_cve)
max_cve_event = copy.deepcopy(vuln)
max_cve_event["vulnerability"]["cve_ids"] = [f"CVE-2026-{1000 + i}" for i in range(32)]
validator.validate(max_cve_event)


# --- Deterministic identity reference implementations (D03 sections 5, 9) ---
def length_prefix(b: bytes) -> bytes:
    return struct.pack(">I", len(b)) + b


def framed(tag: bytes, *parts: str) -> str:
    material = tag + b"".join(length_prefix(p.encode()) for p in parts)
    return hashlib.sha256(material).hexdigest()


def event_id(event: dict) -> str:
    return framed(b"GammaRay:event-id:v1\x00", event["raw_ref"], event["parser"]["id"], event["parser"]["version"])


for event in positives:
    assert event_id(event) == event["event_id"], "Event fixture has an incorrect deterministic ID"


def evidence_set_hash(refs: list[str]) -> str:
    uniq = sorted({r.encode() for r in refs})
    assert 1 <= len(uniq) <= 64, "evidence set must hold 1..64 distinct refs"
    material = b"GammaRay:evidence-set:v1\x00" + struct.pack(">I", len(uniq))
    material += b"".join(length_prefix(r) for r in uniq)
    return hashlib.sha256(material).hexdigest()


def state_finding_id(scope: str, rule: str, subject: str) -> str:
    return framed(b"GammaRay:finding-id:state:v2\x00", scope, rule, subject)


def occurrence_finding_id(scope: str, rule: str, subject: str, occurrence_key: str) -> str:
    return framed(b"GammaRay:finding-id:occurrence:v2\x00", scope, rule, subject, occurrence_key)


def observation_id(finding: str, scan_key: str, ev_hash: str) -> str:
    return framed(b"GammaRay:observation-id:v1\x00", finding, scan_key, ev_hash)


def retired_v1_finding_id(refs, rule_id, rule_version, subject_id):
    ev = evidence_set_hash(refs)
    fid = framed(b"GammaRay:finding-id:v1\x00", rule_id, rule_version, subject_id, ev)
    return ev, fid


identity = load("D03_example_finding_identity.json")
scope = identity["scope_id"]
sf = identity["state_finding"]
fid = state_finding_id(scope, sf["rule_id"], sf["subject_id"])
assert fid == sf["expected_finding_id"], "state finding vector mismatch"

obs_vectors = sf["observations"]
assert len(obs_vectors) == 2
computed_obs = []
for ov in obs_vectors:
    ev = evidence_set_hash(ov["supporting_raw_refs"])
    assert ev == ov["expected_evidence_set_hash"], "evidence hash vector mismatch"
    oid = observation_id(fid, ov["scan_key"], ev)
    assert oid == ov["expected_observation_id"], "observation id vector mismatch"
    computed_obs.append(oid)
# Stability positives: same finding across both scans although evidence,
# rule version, parser version, and feed revision all changed.
assert obs_vectors[0]["rule_version"] != obs_vectors[1]["rule_version"]
assert obs_vectors[0]["expected_evidence_set_hash"] != obs_vectors[1]["expected_evidence_set_hash"]
# Observation determinism: exact replay reproduces the id; a distinct scan with
# identical evidence produces a distinct observation (history is not erased).
assert observation_id(fid, obs_vectors[0]["scan_key"], obs_vectors[0]["expected_evidence_set_hash"]) == computed_obs[0]
assert observation_id(fid, obs_vectors[1]["scan_key"], obs_vectors[0]["expected_evidence_set_hash"]) not in computed_obs
# Identity separation negatives: different asset or different CVE => different
# state identity; evidence hash must not enter the state identity.
assert state_finding_id(scope, sf["rule_id"], sf["subject_id"].replace("lab-host-1", "lab-host-2")) != fid
assert state_finding_id(scope, sf["rule_id"], sf["subject_id"].replace("CVE-2026-12345", "CVE-2026-99999")) != fid
wrong = framed(b"GammaRay:finding-id:state:v2\x00", scope, sf["rule_id"], sf["subject_id"], obs_vectors[0]["expected_evidence_set_hash"])
assert wrong != fid
# Occurrence model: distinct occurrence keys are distinct findings; replay is
# stable; occurrence identity differs from state identity on the same inputs.
occ = identity["occurrence_finding"]
occ_fid = occurrence_finding_id(scope, occ["rule_id"], occ["subject_id"], occ["occurrence_key"])
assert occ_fid == occ["expected_finding_id"]
assert occurrence_finding_id(scope, occ["rule_id"], occ["subject_id"], occ["occurrence_key"] + ":replay") != occ_fid
assert occurrence_finding_id(scope, occ["rule_id"], occ["subject_id"], occ["occurrence_key"]) == occ_fid
assert occ_fid != state_finding_id(scope, occ["rule_id"], occ["subject_id"])
# Retired v1 formula: preserved vector validates, and demonstrates the defect
# (a rule-version change alone used to re-key the finding).
rv1 = identity["retired_v1_vector"]
ev1, fid1 = retired_v1_finding_id(rv1["supporting_raw_refs"], rv1["rule_id"], rv1["rule_version"], rv1["subject_id"])
assert (ev1, fid1) == (rv1["expected_evidence_set_hash"], rv1["expected_finding_id"])
assert retired_v1_finding_id(rv1["supporting_raw_refs"], rv1["rule_id"], "1.0.1", rv1["subject_id"])[1] != fid1
assert fid1 != state_finding_id(scope, rv1["rule_id"], "asset:lab-host-1:software:example-browser@3.2.1:cve:CVE-2026-12345")

# --- Derived-record schemas: positives and evidence-cap negatives ------------
finding_fixture = load("D03_example_finding.json")
observation_fixture = load("D03_example_finding_observation.json")
finding_validator.validate(finding_fixture)
observation_validator.validate(observation_fixture)
assert finding_fixture["finding_id"] == fid and observation_fixture["finding_id"] == fid
assert observation_fixture["observation_id"] == computed_obs[1]

refs64 = [f"raw:lab:bulk:{i:04d}" for i in range(64)]
obs64 = copy.deepcopy(observation_fixture)
obs64["supporting_raw_refs"] = refs64
obs64["evidence_set_hash"] = evidence_set_hash(refs64)
observation_validator.validate(obs64)
obs_negatives = {
    "65 supporting refs": {**observation_fixture, "supporting_raw_refs": refs64 + ["raw:lab:bulk:0064"]},
    "duplicate refs": {**observation_fixture, "supporting_raw_refs": ["raw:lab:x", "raw:lab:x"]},
    "empty ref set": {**observation_fixture, "supporting_raw_refs": []},
    "malformed ref (space)": {**observation_fixture, "supporting_raw_refs": ["raw lab bad"]},
    "malformed ref (too long)": {**observation_fixture, "supporting_raw_refs": ["r" * 129]},
    "bad evidence hash": {**observation_fixture, "evidence_set_hash": "XYZ"},
    "unknown coverage": {**observation_fixture, "scan": {"scan_key": "scan:x", "coverage": "total"}},
    "extra property": {**observation_fixture, "message": "raw text must not ride along"},
}
for label, obs in obs_negatives.items():
    assert not observation_validator.is_valid(obs), f"Observation validator accepted prohibited {label}"
finding_negatives = {
    "state finding with occurrence key": {**finding_fixture, "occurrence_key": "win:4625:x"},
    "bad status": {**finding_fixture, "status": "closed"},
    "identity version drift": {**finding_fixture, "identity_version": 1},
    "resolved without resolved_at": {**finding_fixture, "status": "resolved"},
}
for label, rec in finding_negatives.items():
    assert not finding_validator.is_valid(rec), f"Finding validator accepted prohibited {label}"
occ_fixture = {
    **finding_fixture,
    "finding_id": occ_fid,
    "identity_model": "occurrence",
    "rule_id": occ["rule_id"],
    "subject_id": occ["subject_id"],
    "occurrence_key": occ["occurrence_key"],
}
finding_validator.validate(occ_fixture)
assert not finding_validator.is_valid({k: v for k, v in occ_fixture.items() if k != "occurrence_key"})
# Separation of source events and derived findings (D03 section 3/9).
assert not finding_validator.is_valid(vuln), "A source vulnerability event must not validate as a finding"
assert not validator.is_valid(finding_fixture), "A finding record must not validate as a normalized event"


# --- State-transition reference projection (D03 section 9.4) ------------------
def project_state(observations: list[dict]) -> dict:
    """Reference projection over observation dicts with keys:
    result, coverage (of the producing scan), observed_at."""
    status, first_seen, last_seen, resolved_at = "unknown", None, None, None
    for o in sorted(observations, key=lambda x: x["observed_at"]):
        if o["result"] == "present":
            if first_seen is None:
                first_seen = o["observed_at"]
                status = "open"
            elif status == "resolved":
                status = "reopened"
                resolved_at = None
            elif status == "unknown":
                status = "open"
            last_seen = o["observed_at"]
        elif o["result"] == "absent_verified" and o["coverage"] == "complete":
            if status in {"open", "reopened"}:
                status = "resolved"
                resolved_at = o["observed_at"]
        elif o["result"] == "unknown":
            if status == "unknown":
                pass
    return {"status": status, "first_seen": first_seen, "last_seen": last_seen, "resolved_at": resolved_at}


T1, T2, T3, T4 = ("2026-10-12T06:00:00Z", "2026-10-13T06:00:00Z", "2026-10-14T06:00:00Z", "2026-10-15T06:00:00Z")
present = lambda t, cov="complete": {"result": "present", "coverage": cov, "observed_at": t}
absent = lambda t, cov: {"result": "absent_verified", "coverage": cov, "observed_at": t}
s = project_state([present(T1)])
assert s == {"status": "open", "first_seen": T1, "last_seen": T1, "resolved_at": None}
s = project_state([present(T1), present(T2)])
assert s["status"] == "open" and s["first_seen"] == T1 and s["last_seen"] == T2
# Incomplete coverage must never resolve (negative control).
s = project_state([present(T1), absent(T2, "partial")])
assert s["status"] == "open" and s["resolved_at"] is None
s = project_state([present(T1), absent(T2, "unknown")])
assert s["status"] == "open" and s["resolved_at"] is None
# Complete-coverage verified absence resolves; TTR inputs are preserved.
s = project_state([present(T1), absent(T3, "complete")])
assert s["status"] == "resolved" and s["resolved_at"] == T3 and s["first_seen"] == T1 and s["last_seen"] == T1
# A later present observation reopens.
s = project_state([present(T1), absent(T3, "complete"), present(T4)])
assert s["status"] == "reopened" and s["first_seen"] == T1 and s["last_seen"] == T4


# --- D07 section 5.1 disclosure reference checks ------------------------------
MIN_GROUP = 5  # synthetic reference threshold; the production threshold is a disclosure-policy parameter


def exsum_aggregate(asset_cve_rows: list[tuple[str, str]]) -> dict[str, int]:
    """Aggregate CVE counts over distinct assets; sparse groups are suppressed."""
    by_cve: dict[str, set[str]] = {}
    for asset, cve in asset_cve_rows:
        by_cve.setdefault(cve, set()).add(asset)
    return {cve: len(assets) for cve, assets in by_cve.items() if len(assets) >= MIN_GROUP}


def disclose_asset_linked(rows, *, sensitive_grant: bool):
    """Asset-linked vulnerability statements are sensitive: denied without grant."""
    if not sensitive_grant:
        return "DENIED"
    return rows


rows = [(f"asset-{i}", "CVE-2026-12345") for i in range(6)] + [(f"asset-{i}", "CVE-2026-99999") for i in range(3)]
agg = exsum_aggregate(rows)
assert agg == {"CVE-2026-12345": 6}, "operational aggregate with sparse-group suppression failed"
assert disclose_asset_linked(rows, sensitive_grant=False) == "DENIED"
assert disclose_asset_linked(rows, sensitive_grant=True) == rows

print(
    f"PASS: {len(families) + 3} JSON Schemas valid; {len(positives)} positive event fixtures; "
    "11 family alternatives; CVE boundaries 1/32 accepted, 33/empty/duplicate/lowercase rejected; "
    f"{len(negatives)} event negative fixtures rejected; {len(entries)} observable registry fields matched (registry v2); "
    "event ID vectors confirmed; finding identity v2 vectors confirmed (state stability across evidence and rule "
    "revisions, occurrence uniqueness, retired v1 vector preserved); observation determinism and replay dedupe confirmed; "
    f"evidence cap 64 accepted / {len(obs_negatives)} observation negatives rejected; "
    f"{len(finding_negatives)} finding negatives rejected; state-transition reference tests passed "
    "(incomplete scans never resolve); D07 5.1 aggregate/disclosure reference checks passed. "
    f"Reference resolution: {RESOLUTION}."
)

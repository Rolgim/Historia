#!/usr/bin/env python3
"""
Validates data/events/*.json against schemas/event.schema.json and checks
that every event's "territory" matches a real political entity.

This project has no data/regions.json — political entities come from
data/historical-enrichment.json, which is itself built from Aourednik's
historical-basemaps GeoJSON (the SUBJECTO/NAME properties of each
historical map snapshot), enriched with Wikidata. An event's "territory"
field must exactly match one of those entity names, otherwise the map
cannot color the event marker the same as the country polygon beneath it
(see app.js: findPolygonSubjectAt / getDeterministicColor).
"""
import json
from pathlib import Path
import sys

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("ERROR: jsonschema is not installed. Run: python -m pip install jsonschema")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SCHEMAS = ROOT / "schemas"


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"{path.relative_to(ROOT)}: invalid JSON: {exc}")


event_schema = load_json(SCHEMAS / "event.schema.json")

enrichment_path = DATA / "historical-enrichment.json"
enrichment = load_json(enrichment_path)
valid_entity_names = set(enrichment.get("names", {}).keys())

if not valid_entity_names:
    print(
        f"ERROR: {enrichment_path.relative_to(ROOT)} contains no usable "
        f"entities under \"names\" — cannot validate the \"territory\" field."
    )
    sys.exit(1)

events_dir = DATA / "events"
manifest_path = events_dir / "manifest.json"
manifest = load_json(manifest_path)

listed = manifest.get("files", [])
actual = sorted(p.name for p in events_dir.glob("*.json") if p.name != "manifest.json")

errors = []
warnings = []

if sorted(listed) != actual:
    only_in_manifest = sorted(set(listed) - set(actual))
    only_on_disk = sorted(set(actual) - set(listed))
    errors.append("events/manifest.json does not match the files present in data/events/")
    if only_in_manifest:
        errors.append(f"  listed in manifest but missing on disk: {only_in_manifest}")
    if only_on_disk:
        errors.append(f"  present on disk but missing from manifest.json: {only_on_disk}")

event_ids = set()
count = 0

for filename in actual:
    path = events_dir / filename
    event = load_json(path)

    for error in Draft202012Validator(event_schema).iter_errors(event):
        errors.append(f"{path.relative_to(ROOT)}: {error.message}")

    eid = event.get("id")
    if eid in event_ids:
        errors.append(f"{path.relative_to(ROOT)}: duplicate event id: {eid}")
    event_ids.add(eid)

    if eid and eid != path.stem:
        warnings.append(
            f"{path.relative_to(ROOT)}: id \"{eid}\" does not match filename \"{path.stem}\""
        )

    territory = event.get("territory")
    if territory and territory not in valid_entity_names:
        errors.append(
            f"{path.relative_to(ROOT)}: territory \"{territory}\" does not match any "
            f"entity in data/historical-enrichment.json. Check the exact spelling — "
            f"run scripts/list_entities.py \"<keyword>\" to search for the correct name."
        )

    count += 1

if warnings:
    print("WARNINGS:")
    for warning in warnings:
        print(f"- {warning}")
    print()

if errors:
    print("VALIDATION FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"OK — {count} events validated against {len(valid_entity_names)} known political entities.")

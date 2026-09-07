#!/usr/bin/env python3
"""
Searches data/historical-enrichment.json for political-entity names matching
a keyword. Use this to find the exact "territory" spelling to put in an
event, since it must match one of these names exactly (case-sensitive).

Usage:
    python scripts/list_entities.py france
    python scripts/list_entities.py ming
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENRICHMENT = ROOT / "data" / "historical-enrichment.json"

if len(sys.argv) != 2:
    print("Usage: python scripts/list_entities.py <keyword>")
    sys.exit(1)

keyword = sys.argv[1].lower()

data = json.loads(ENRICHMENT.read_text(encoding="utf-8"))
names = sorted(data.get("names", {}).keys())

matches = [n for n in names if keyword in n.lower()]

if not matches:
    print(f"No entity name contains \"{sys.argv[1]}\".")
    sys.exit(0)

print(f"{len(matches)} match(es):")
for m in matches:
    print(f"  {m}")

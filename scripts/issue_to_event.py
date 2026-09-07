#!/usr/bin/env python3
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVENTS_DIR = ROOT / "data" / "events"

body = os.environ.get("ISSUE_BODY", "")
if not body.strip():
    print("ERROR: the issue body is empty.")
    sys.exit(1)


def field(label):
    # GitHub issue forms render headings as "### Label" followed by the answer.
    pattern = rf"###\s+{re.escape(label)}\s*\n+([\s\S]*?)(?=\n###\s+|\Z)"
    match = re.search(pattern, body, re.IGNORECASE)
    if not match:
        raise ValueError(f"Field not found: {label}")
    value = match.group(1).strip()
    if not value or value in {"_No response_", "_no response_"}:
        return ""
    return value


def number(label):
    value = field(label).replace(",", ".")
    return float(value)


def integer(label):
    value = field(label)
    return int(value)


def slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def parse_sources(text):
    # Accepts one source per line, each line containing a URL. The part of
    # the line before the URL (if any) becomes the source title. Lines
    # without a URL are skipped — the schema requires both title and url.
    sources = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.search(r"(https?://\S+)", line)
        if not match:
            continue
        url = match.group(1)
        title = line.replace(url, "").strip(" -\u2013:") or url
        sources.append({"title": title, "url": url})
    return sources


try:
    year = integer("Year")
    title = field("Title")
    longitude = number("Longitude")
    latitude = number("Latitude")
    region_id = field("Region ID")
    religion = field("Religion")
    territory = field("Territory")
    language = field("Language")
    ethnicity = field("Ethnicity")
    description = field("Description")
    sources_text = field("Sources")
except (ValueError, TypeError) as exc:
    print(f"ERROR: {exc}")
    sys.exit(1)

if not -2000 <= year <= 2000:
    print("ERROR: the year must be between -2000 and 2000 (the map's timeline range).")
    sys.exit(1)
if not title:
    print("ERROR: title is required.")
    sys.exit(1)
if not -90 <= latitude <= 90:
    print("ERROR: latitude out of range.")
    sys.exit(1)
if not -180 <= longitude <= 180:
    print("ERROR: longitude out of range.")
    sys.exit(1)
if not region_id:
    print("ERROR: Region ID is required.")
    sys.exit(1)
if not religion:
    print("ERROR: Religion is required.")
    sys.exit(1)
if not territory:
    print("ERROR: Territory is required.")
    sys.exit(1)
if not language:
    print("ERROR: Language is required.")
    sys.exit(1)
if not ethnicity:
    print("ERROR: Ethnicity is required.")
    sys.exit(1)
if not description or len(description) < 10:
    print("ERROR: Description is required and must be at least 10 characters.")
    sys.exit(1)

slug = slugify(title)
if not slug:
    print("ERROR: could not build an id from the title.")
    sys.exit(1)

event_id = f"{year}-{slug}"
output = EVENTS_DIR / f"{event_id}.json"

# Refuse an automatic overwrite: a human must resolve duplicate IDs.
if output.exists():
    print(f"ERROR: {output.name} already exists.")
    sys.exit(1)

event = {
    "id": event_id,
    "year": year,
    "title": title,
    "lon": longitude,
    "lat": latitude,
    "regionId": region_id,
    "religion": religion,
    "territory": territory,
    "language": language,
    "ethnicity": ethnicity,
    "desc": description,
}

sources = parse_sources(sources_text) if sources_text else []
if sources:
    event["sources"] = sources

EVENTS_DIR.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(event, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Event created: {output.relative_to(ROOT)}")

# Keep manifest.json in sync — otherwise the very next step
# (scripts/validate_data.py) fails because the new file isn't listed.
manifest_path = EVENTS_DIR / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
files = sorted(set(manifest.get("files", [])) | {output.name})
manifest["files"] = files
manifest_path.write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Updated: {manifest_path.relative_to(ROOT)}")

# Note: scripts/validate_data.py (run right after this in the workflow) is
# what actually checks that "territory" matches a real entity in
# data/historical-enrichment.json — this script cannot do that check itself
# without loading and searching that whole file, so a bad "territory" value
# will be caught there instead, and the workflow will fail before opening
# a Pull Request.

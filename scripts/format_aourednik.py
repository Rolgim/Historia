import json
import re
from pathlib import Path

GEOJSON_DIR = Path(".aourednik-data/geojson")
OUTPUT = Path("data/historical-names.json")


def year_from_file(path):
    name = path.stem.lower()

    m = re.search(r"_bc(\d+)$", name)
    if m:
        return -int(m.group(1))

    m = re.search(r"_(\d+)$", name)
    if m:
        return int(m.group(1))

    return None


names = {}

for path in GEOJSON_DIR.glob("world_*.geojson"):

    year = year_from_file(path)

    if year is None:
        continue

    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    for feature in data.get("features", []):

        props = feature.get("properties", {})

        name = props.get("NAME")

        if not isinstance(name, str):
            continue

        name = name.strip()

        if not name:
            continue

        names.setdefault(name, set()).add(year)


result = {
    name: sorted(years)
    for name, years in sorted(names.items())
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with OUTPUT.open("w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"{len(result)} names -> {OUTPUT}")
**# Contribution Guide for Teachers**

**## Adding an Event**

1. Copy `examples/event.example.json`.

2. Rename the file, for example `1066-hastings.json`.

3. Fill in the year, title, coordinates, and description.

4. Use a `regionId` that already exists in `data/regions.json`.

5. Add at least one source whenever possible.

6. Create a Merge Request.

**### Minimal Example**

```json
{
  "id": "1066-hastings",
  "year": 1066,
  "title": "Battle of Hastings",
  "lon": 0.49,
  "lat": 50.91,
  "regionId": "british-isles",
  "religion": "Catholic Christianity",
  "territory": "Norman England",
  "language": "Old French",
  "ethnicity": "Normans",
  "desc": "A short, properly sourced historical description."
}
```

**## Historical Best Practices**

* Distinguish established facts from interpretations.
* Provide a precise date when known.
* Avoid anachronistic wording.
* Prefer identifiable and verifiable sources.
* A contribution may be discussed or corrected in the Merge Request: this is normal and encouraged.

**## Adding a Region**

Use `examples/region.example.json`. A region has one or more `snapshots`, each describing its state during a given period.

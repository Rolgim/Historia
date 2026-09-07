# Contribution Guide for Teachers

## Adding an Event

1. Copy `examples/event.example.json`.
2. Rename the file to `YEAR-short-title.json`, for example `1066-battle-of-hastings.json`.
3. Fill in the year (between -2000 and 2000), title, coordinates, and description.
4. Set `territory` to the exact name of an existing political entity — see below.
5. Add at least one source whenever possible.
6. Add the new filename to `data/events/manifest.json`.
7. Create a Merge Request.

### Minimal Example

```json
{
  "id": "1066-battle-of-hastings",
  "year": 1066,
  "title": "Battle of Hastings",
  "lon": 0.49,
  "lat": 50.91,
  "regionId": "british-isles",
  "religion": "Catholic Christianity",
  "territory": "English territory",
  "language": "Old English",
  "ethnicity": "English",
  "desc": "A short, properly sourced historical description."
}
```

### Finding a valid "territory" name

The `territory` field must exactly match a political-entity name from
`data/historical-enrichment.json` (derived from the historical map data
and Wikidata) — not just any country name you might think of. Search for
the correct spelling with:

```bash
python scripts/list_entities.py "england"
```

If `territory` doesn't match a known entity, the automated validation
will reject the contribution, and the event's marker would otherwise show
up in a color unrelated to the country beneath it on the map.

## Historical Best Practices

* Distinguish established facts from interpretations.
* Provide a precise date when known.
* Avoid anachronistic wording.
* Prefer identifiable and verifiable sources.
* A contribution may be discussed or corrected in the Merge Request: this is normal and encouraged.

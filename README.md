<div align="center">
  <h1>Historia</h1>
  <img src="img/historia-512.png" alt="Historia logo" width="120"/>
  <p>Interactive historical map of the world.</p>
  <h2>Screenshots</h2>
</div>

<img width="1855" height="962" alt="image" src="https://github.com/user-attachments/assets/decb26ad-1ead-4bf7-99dd-de7c4d9ee067" />
<img width="1855" height="962" alt="image" src="https://github.com/user-attachments/assets/b39917c8-7cfe-44c8-9b5c-288e611d9504" />



## Architecture

```text
index.html
src/                    # application code
data/
  historical-enrichment.json   # political-entity data (religion, language, ethnicity, etc.)
  events/               # 1 event = 1 JSON file
    manifest.json       # list of event files loaded by the browser
schemas/
  event.schema.json     # validation rules for events
examples/               # templates for contributors
scripts/
  validate_data.py      # checks schema + manifest + entity consistency
  issue_to_event.py      # turns a GitHub issue form into an event file
  list_entities.py      # search valid political-entity names
docs/                   # educational and technical documentation
.github/
  ISSUE_TEMPLATE/       # GitHub contribution form
  workflows/            # automated validation
```

### Why one file per event?

To prevent a contribution from modifying a large shared file:

```text
data/events/1066-battle-of-hastings.json
```

One person can work on Hastings while another adds Kyiv, without modifying the same file.

The browser loads the list from `data/events/manifest.json` — if you add or rename a file directly with Git, remember to update this list too, or the new event won't appear on the map.

### Where do political entities come from?

There is no `data/regions.json` in this project. Every event's `territory`
field must exactly match an entity name in `data/historical-enrichment.json`
— a set of political entities (kingdoms, empires, peoples) derived from
Aourednik's historical-basemaps GeoJSON (the map polygons rendered on the
timeline) and enriched with Wikidata data on religion, language, and
ethnicity.

This match matters for more than validation: it's how the map colors an
event marker the same as the country polygon beneath it. Find the correct
spelling for an entity with:

```bash
python scripts/list_entities.py "france"
```

## Test locally

From the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Do not open `index.html` directly via `file://`, because the application loads the JSON files using `fetch()`.

## Validate the data

Install the dependency:

```bash
python -m pip install jsonschema
```

Then run:

```bash
python scripts/validate_data.py
```

This checks that every event matches `schemas/event.schema.json`, that
`data/events/manifest.json` matches the files actually on disk, that there
are no duplicate event ids, and that every `territory` matches a real
entity in `data/historical-enrichment.json`.

The same validation is automatically run on GitHub Pull Requests.

## Add an event

The recommended method for teachers is the GitHub form:

**Issues → Add a historical event**

The application code does not need to be modified.

For a direct Git contribution, copy `examples/event.example.json`, rename
it `YEAR-slug.json`, fill in the year (between -2000 and 2000), coordinates,
`religion`/`territory`/`language`/`ethnicity`/`desc`, add it to
`data/events/manifest.json`, then run the validation.

## License / sources
 
Code is licensed under the [Apache License 2.0](LICENSE).
 
Map data comes from [Aourednik's historical-basemaps](https://github.com/aourednik/historical-basemaps)
and [Wikidata](https://www.wikidata.org/), each under their own respective
licenses — check those projects for details before reusing the historical
map data itself outside of this project.

## Automated contribution workflow

A contributor can propose an event via **Issues → Add a historical event**.

A GitHub Action automatically converts the form into a JSON file, updates
`data/events/manifest.json`, runs the validation (including the entity
check above), and opens a Pull Request.

See `docs/WORKFLOW_GITHUB.md`.

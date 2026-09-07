# Contributing to Historia

The project separates **code** from **historical data**.

## Adding an event

The recommended method for a teacher or historian is:

1. Open the **Issues** tab of the GitHub repository.
2. Select **Add a historical event**.
3. Fill out the form.
4. GitHub Actions automatically turns the proposal into a `data/events/YEAR-slug.json` file and opens a Pull Request.
5. The Pull Request is automatically checked by GitHub Actions.

You therefore do not need to modify `src/`.

## For contributors working directly with Git

Each event has its own file:

```text
data/events/
├── 793-viking-raid-on-lindisfarne.json
├── 860-rus-byzantine-war-siege-of-constantinople.json
├── 882-oleg-unites-novgorod-and-kiev.json
└── ...
```

A historical contribution should ideally modify a single file. This reduces Git merge conflicts between contributors.

After adding or modifying an event, update `data/events/manifest.json` to list the new filename, then run:

```bash
python scripts/validate_data.py
```

Then test locally:

```bash
python -m http.server 8000
```

and open `http://localhost:8000/`.

## The "territory" field

This project has no `data/regions.json`. Political entities come from
`data/historical-enrichment.json`, itself built from Aourednik's
historical-basemaps GeoJSON (the map polygons shown on the timeline),
enriched with Wikidata.

Your event's `territory` field **must exactly match one of those entity
names**, or the event marker won't be colored the same as the country
polygon underneath it on the map. To find the correct spelling:

```bash
python scripts/list_entities.py "france"
```

`scripts/validate_data.py` checks this automatically and will fail the
build if `territory` doesn't match a known entity.

## Do not modify

Unless you are developing the map itself, avoid modifying:

```text
src/
index.html
```

## Before submitting a Pull Request

* verify the year (must be between -2000 and 2000);
* verify the latitude/longitude;
* verify that `territory` matches a real entity (see above);
* provide sources whenever possible;
* run the validation;
* test the display.

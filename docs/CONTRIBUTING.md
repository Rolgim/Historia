**# Contributing to Around the Year 1000**

The project separates **code** from **historical data**.

**## Adding an event**

The recommended method for a teacher or historian is:

1. Open the **Issues** tab of the GitHub repository.

2. Select **Add a historical event**.

3. Fill out the form.

4. A maintainer converts the proposal into a `data/events/YYYY-slug.json` file.

5. The Pull Request is automatically checked by GitHub Actions.

You therefore do not need to modify `src/`.

**## For contributors working directly with Git**

Each event has its own file:

```text
data/events/

├── 0793-lindisfarne.json

├── 0860-constantinople.json

├── 0882-kiev.json

└── ...
```

A historical contribution should ideally modify a single file. This reduces Git merge conflicts between contributors.

After adding or modifying an event:

```bash
python scripts/validate_data.py
```

Then test locally:

```bash
python -m http.server 8000
```

and open `http://localhost:8000/`.

**## Do not modify**

Unless you are developing the map itself, avoid modifying:

```text
src/

index.html
```

**## Before submitting a Pull Request**

* verify the year;
* verify the latitude/longitude;
* verify `regionId`;
* provide sources;
* run the validation;
* test the display.

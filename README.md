**# Histories**

Interactive historical map of the world.

**## Architecture**

```text
index.html
src/                    # application code
data/
  events/               # 1 event = 1 JSON file
schemas/                # validation rules
examples/               # templates for contributors
scripts/                # validation and control tools
docs/                   # educational and technical documentation
.github/
  ISSUE_TEMPLATE/       # GitHub contribution form
  workflows/            # automated validation
```

**### Why one file per event?**

To prevent a contribution from modifying a large shared file:

```text
data/events/1066-battle-of-hastings.json
```

One person can work on Hastings while another adds Kyiv, without modifying the same file.

The browser loads the list from `data/events/manifest.json`.

**## Test locally**

From the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Do not open `index.html` directly via `file://`, because the application loads the JSON files using `fetch()`.

**## Validate the data**

Install the dependency:

```bash
python -m pip install jsonschema
```

Then run:

```bash
python scripts/validate_data.py
```

The same validation is automatically run on GitHub Pull Requests.

**## Add an event**

The recommended method for teachers is the GitHub form:

**Issues → Add a historical event**

The application code does not need to be modified.

For a direct Git contribution, copy `examples/event.example.json`, rename it using a unique identifier, and place the file in `data/events/`. Then run the validation.

**## License / sources**

To be completed according to the project's editorial choices.

**## Automated contribution workflow**

A contributor can propose an event via **Issues → Add a historical event**.

A GitHub Action automatically converts the form into a JSON file, runs the validation, and opens a Pull Request.

See `docs/WORKFLOW_GITHUB.md`.

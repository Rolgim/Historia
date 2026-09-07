# Automated GitHub Workflow

The project can automatically turn an event proposal into a Pull Request.

## Contributor Workflow

1. In GitHub, open **Issues**.
2. Click **Add a historical event**.
3. Fill out the form.
4. Click **Submit new issue**.
5. GitHub Actions reads the fields from the form.
6. A file is created in `data/events/`, and `data/events/manifest.json` is updated to list it.
7. JSON schema validation is run, including a check that `territory` matches a real political entity.
8. A Pull Request is created automatically.
9. A maintainer reviews the sources and historical content.
10. Once approved, the Pull Request can be merged.

The contributor therefore does not need Git, JSON, HTML, or JavaScript.

## Security and Editorial Control

The workflow never merges a contribution automatically.

It only creates a Pull Request. A human retains editorial control over the final decision.

The script:

* limits the year to -2000–2000 (the map's timeline range);
* validates the coordinates;
* generates a filename from the year and title;
* refuses to overwrite an existing event;
* then runs `scripts/validate_data.py`, which checks the JSON schema and that
  `territory` matches an entity in `data/historical-enrichment.json`.

## Activation

The workflow uses `GITHUB_TOKEN`. In the repository settings, make sure that Actions are allowed to create and modify repository contents and Pull Requests.

The repository must also retain the `contribution` and `event` labels used by the form and the workflow.

## If the Repository Is Public

The form can be submitted by external users. The proposal initially remains an **Issue**, after which the automation creates a branch and a Pull Request in the repository.

Merging remains restricted to maintainers.

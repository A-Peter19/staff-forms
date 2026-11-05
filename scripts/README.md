Run the realtime baseline from the repository root with Node.js (no package installation required):

```sh
node scripts/realtime-sync-test.js
```

The runner exercises shared-module checkbox propagation and event isolation using an in-memory database and minimal DOM fixtures. It also checks selected route and wiring declarations in the source. It resolves files relative to the script, so an absolute script path works from another directory too.

Each check appears in `qa/realtime-sync-report.md`, with a run timestamp and pass/fail totals. The runner creates the directory, replaces the report on each completed run, and exits nonzero for any failed check or report-writing error. The generated report is ignored by Git.

Verify the test runner itself with:

```sh
node --test scripts/realtime-sync-runner.test.js
```

These regression tests cover snapshot behaviour, metadata handling, execution from another directory, report creation, failed assertions, read errors and write errors. Failure probes edit disposable copies of the relevant files in a temporary directory.

Passing this baseline does not establish that complete forms, notes, custom tasks, simultaneous/offline edits or live Firebase permissions work. Those require the broader tests and application fixes identified in the audit. Source wiring checks are labelled separately from in-memory behavioural checks in the report.

Synthetic examples of the existing saved-data formats are documented in [fixtures/saved-data](fixtures/saved-data/README.md). Validate their catalog and supported shared-module read/save behaviour with:

```sh
node --test scripts/saved-data-fixtures.test.js
```

Setup-form browser checks (Feast and Foundation):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node --test scripts/setup-forms.test.js
```

The test uses an in-memory Firebase adapter and loads the actual HTML/scripts in
Chromium. It covers multiple staff screens, saving/reopening notes and quantities,
stage-specific staffing, repeated removal, checkbox updates, manager tasks,
hiding/unhiding, retry after a failed write, and Feast event details. Set
`CHROMIUM_PATH` to use another installed Chromium; `/usr/bin/chromium` is detected
automatically. These checks do not verify production Firebase rules or offline
reconnection. The transaction mock does not simulate Firestore conflict retries.

The same browser suite also covers Wake setup, during and clear-up, including
nested and flat legacy saves, explicit unticking without resurrecting old ticks,
conflict choices, stage isolation and shared guest counts. Wake compatibility
rules are documented in `docs/wake-form-autosave.md`.

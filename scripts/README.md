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

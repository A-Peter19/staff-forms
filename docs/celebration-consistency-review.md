# Celebration consistency review

The three Celebration pages now use the shared stage controller and checklist UI.
The review found whole-checklist writes, staff saving tied to Save, duplicate
loaders and one-time manager task loading. Those paths have been replaced with
individual realtime tick saves, stage-specific staffing transactions, live
manager task changes, retry status and pending-edit navigation protection.

All 85 original tasks and the existing note/quantity fields remain, along with
Celebration's styling and event-prefixed RTDB keys. Old positional Firestore
checkbox backups are preserved and available for review rather than being guessed
onto current tasks.

Hall access, bar time and table style now autosave the shared event fields. When
an event-level field is absent, the loader falls back to the older value saved
inside the stage (then setup). An explicitly cleared shared value takes precedence,
so an old stage value cannot reappear. Older stage values are not deleted.

## Full form verification scope

`scripts/setup-forms.test.js` includes all 21 pages (seven families, three stages).
It loads the actual HTML and JavaScript in Chromium against simulated Firebase.
The workflow checks multiple sessions, checkbox propagation, note/quantity saves,
staff changes and repeated removal, stage isolation, stable manager tasks,
hiding/unhiding, reopening, failed writes/retry and missing-event protection.
Family-specific checks exercise legacy formats, shared details, final handovers,
and reset excluding hidden tasks. The 43 existing regression checks cover shared
save behaviour, fixtures, compatibility reading and the CLI runner.

This is not live Firebase validation. The test transaction adapter does not model
Firestore transaction retries, and write-failure simulation does not establish
SDK offline-reconnection behaviour.

## Live verification blockers

The current managed environment has no configured Firebase credentials and its
network allowlist excludes Firebase/Firestore and gstatic SDK hosts. The repository
contains hosting configuration but no database security rules or Firebase Auth
sign-in flow. Staff pages omit manager task-editing controls, but server-enforced
manager permissions cannot be established from the available source/configuration.

An accessible test Firebase project with its deployed rules and staff/manager test
identities is required to verify production-equivalent permissions, simultaneous
writes and disconnect/reconnect behaviour. Use isolated test events, verify that
staff cannot modify manager-only fields, and confirm pending changes synchronize
when each browser reconnects. Do not declare customer delivery complete based only
on the simulated tests. Reload old open forms after deployment to stop old writers.

## Recorded local result — 5 November 2026

- Complete Chromium workflow suite: 21 passed, 0 failed.
- Existing runner/fixture/compatibility suite: 43 passed, 0 failed.
- All 85 Celebration task labels and existing task rows/notes preserved.
- `git diff --check`: passed.
- Live Firebase, deployed security rules and real offline reconnects: blocked,
  not run; prerequisites are listed above.

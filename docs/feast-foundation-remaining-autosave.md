# Feast and Foundation during / clear-up

All four pages now use the shared stage controller and checklist UI. Original
styling, 98 task labels, note fields and any quantity controls remain. Duplicate
loaders, whole-checklist writes and manual Save buttons have been removed.

## Compatibility and behaviour

- Existing unprefixed RTDB task IDs (`during_sN_I`, `clearup_sN_I`) remain in use
  on these four pages. Setup pages retain their existing event-prefixed IDs.
  Event isolation comes from the parent `events/{event}/{stage}` path.
- Each checkbox writes only its own task, with initials/time. Manager hidden-task
  IDs are recognized with or without the event-type prefix. Hidden tasks are
  excluded from progress and visible-task reset.
- Section/final notes in notes rows save individual fields in `{stage}_notes`.
  Quantity inputs use `{stage}_quantities`. Staff and team leaders save within
  their Firestore stage, maintaining legacy staff arrays alongside stable IDs.
- Feast sash and runner fields update the shared event details. Guest count and
  weekday are dashboard-controlled. Feast's special hall-access control remains
  confined to setup.
- Manager custom tasks use stable IDs and update live. Staff screens expose no
  custom-task creation or hiding controls.
- Old positional Firestore checkbox backups remain untouched in the review panel;
  they are not guessed onto current tasks. Existing RTDB tick records continue
  to hydrate directly without a migration.
- Failed saves retain drafts with Retry; pending changes warn before navigation.

Browser checks cover all six Feast/Foundation pages with simulated Firebase,
including saved task keys, note reopening, staff edits/removal, concurrent ticks,
manager changes, retries and a reset that preserves hidden completions. Production
Firebase permissions and offline reconnection still require live verification.
Reload already-open old forms when deploying so their old writers stop running.

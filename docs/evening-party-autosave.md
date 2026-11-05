# Evening Party realtime forms

Setup, during and clear-up now use the shared stage controller with
`public/js/evening-party-form.js`. Manual Save buttons, duplicate initializers and
whole-checklist backup writes have been removed. Existing task content and blue
styling remain.

- Individual realtime ticks retain their existing event-prefixed task keys and
  completion initials/time. Unticking/resetting affects only selected visible
  tasks. Manager-hidden tasks are excluded from progress/reset.
- Section notes and quantity/detail fields now use per-field realtime autosave
  in `{stage}_notes` and `{stage}_quantities`.
- Staff entries and team leaders save within their own Firestore stage, using
  stable staff IDs and transactions while maintaining the legacy staff array.
- Hall access, bar time and table style save event fields `accessTime`, `barTime`
  and `tableStyle`; other pages showing those fields update live. Previously saved
  select values absent from today's options remain selectable and visible.
- Guest count and weekday remain dashboard-controlled, read-only event details.
- Manager custom tasks use stable IDs and live updates. Staff cannot add/hide
  tasks. Failed saves offer Retry; pending edits warn before leaving the page.

## Compatibility

Existing RTDB task records and Firestore staffing/event details continue to load.
Old Firestore `checkboxes.cb_N` and `initialsData.cb_N` backups are retained and
shown in a read-only review panel. These positional records may include historical
custom tasks, so they cannot reliably identify current tasks. They are not applied
over current realtime values. No saved records are deleted on load. Historical
random custom-task keys remain untouched rather than being guessed into new IDs.

All three actual pages are covered by `scripts/setup-forms.test.js`, including
reopening, notes, quantities, staff edits/removal, manager tasks, hidden tasks,
retry, stage isolation, shared details and legacy backup preservation. Production
Firebase permissions and offline reconnection still need live verification.
Already-open old pages should be reloaded when deploying so their old writers stop.

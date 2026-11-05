# Twilight realtime autosave

Setup, during and clear-up now use the shared stage controller and checklist UI.
Their existing styling, task content and explicit task IDs remain. Manual Save
buttons, whole-stage writers and duplicate initializers have been removed.

Ticks save individually under the existing event-prefixed task IDs, with initials
and time. Staff entries and team leaders autosave within their own Firestore stage.
Manager-added tasks use stable IDs and update live, as do hidden-task changes.
Hidden tasks do not contribute to progress and are not reset.

## Notes and details

Twilight uses individual Firestore field updates for section notes at
`{stage}.sectionNotes.ta_N`, preserving the existing during-event notes and their
fixed section order. Custom tasks do not add note fields or change that order.
Setup and clear-up use the same layout for their newly saved section notes.
Final handover notes retain `{stage}.finalNotes`; during-event bar fields retain
`during.barOpen` and `during.barClose`. Clearing a value saves an explicit empty
string so an old value cannot reappear. Quantity fields use the shared RTDB
`{stage}_quantities` format. Guest/day and existing read-only event details retain
their dashboard-controlled behaviour.

## Older checkbox data

Previous RTDB `cb_N` records have positional identities and may include historical
custom tasks. They remain untouched and appear in a review panel with their saved
completion attribution. Users can explicitly select the corresponding current task
and apply the saved value; the write updates only that task's stable key. Loading
never guesses a mapping or applies old positional values over current ticks.
Old entries remain visible after application; applying them again is an explicit
write, not an automatic migration. Unknown/malformed records are retained.

Retry controls preserve failed drafts, and navigation warns while changes are
pending. Same-field edits follow database write order; text merging and durable
offline drafts after closing the page are not provided. Live Firebase permissions
and offline reconnects still need deployment-environment verification. Reload old
open Twilight pages after deployment so their whole-stage writers stop running.

Browser checks cover the three actual pages with simulated Firebase, including
legacy review/application, preservation of old records, note restoration, clearing
handover notes, bar times, staff edits, manager updates, reopening and retries.

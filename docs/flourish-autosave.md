# Flourish realtime autosave

Setup, during and clear-up use the shared stage controller and
`public/js/checklist-form-ui.js`. That UI helper is also used by Evening Party;
Flourish keeps its original styles and staff-field background. All 151 original
task labels, notes and quantity controls remain in place.

The duplicate loaders, whole-checklist writers and manual Save buttons have been
removed. Each task now saves independently with completion initials/time. Staff
and team-leader changes autosave to their own stage, while sash/runner edits save
the shared event fields and update across pages. Guest count and weekday are
read-only dashboard details.

Existing event-prefixed task IDs, `section_sN` note keys and quantity keys are
unchanged. Saved notes and quantities, including zero and centrepiece selections,
continue to hydrate before editing is enabled. Manager custom tasks have stable
IDs, update live and are injected once. Hidden tasks are excluded from progress
and reset. Staff have no task creation/hiding controls.

Staff transactions preserve other entries and stages and maintain legacy staff
arrays. Old positional Firestore checkbox backups remain untouched and available
in a read-only review panel. They are not applied over current realtime ticks:
historical custom-task insertion makes their task identities uncertain. Old
random custom-task records are likewise retained without guessing a mapping.

Failed writes retain drafts and offer Retry. Navigation warns while edits are
pending. Same-field edits follow database write order; durable offline drafts and
collaborative text merging are not provided.

The browser suite covers all three Flourish pages with simulated Firebase,
including existing note/quantity fixtures, cross-stage sash/runner updates,
staff editing/removal, reopening, manager changes and failed-write retries. Live
Firebase permissions and offline reconnects still require verification. Reload
old open pages when deploying so their previous writers stop running.

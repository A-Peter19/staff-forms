# Feast and Foundation setup autosave

Both pages opt into `public/js/setup-form-sync.js`, preserving their existing
styles and task content. Other form families keep their existing controller.

- Checkboxes patch one task in `events/{event}/setup`, with initials and time.
  Reset clears visible tasks only. Progress excludes manager-hidden tasks.
- Notes and quantities use the existing shared, per-field RTDB saves under
  `setup_notes` and `setup_quantities`. Initial loading must succeed before editing.
- Staff and team leader stay in Firestore's `setup` stage. Staff entries gain
  stable keys in `setup.staffEntries`; transactions also maintain the existing
  `setup.staffMembers` array for older readers. Team-leader saves patch only
  `setup.teamLeader`. No during/clear-up assignments are changed.
- Guest count and weekday are dashboard-controlled, read-only event details.
  Feast catering, sash, runner and hall access time save event fields `catering`,
  `sash`, `runner` and `feastSetupHallAccessTime` respectively.
- Firestore snapshots refresh staffing, event details, custom tasks and hidden
  tasks. Staff screens expose no custom-task creation or hiding controls.
- The dashboard preserves custom-task IDs on edit. Existing tasks without IDs
  get deterministic IDs from their form, section, label and duplicate occurrence;
  the dashboard saves that identity before a label edit. Old randomly generated
  custom-task checkbox keys cannot be reliably mapped to their original labels;
  this change retains those records without guessing a migration.

Failed writes retain drafts and expose Retry. Pending saves warn before navigating
away. Simultaneous edits to different fields/tasks/staff entries are independent;
competing edits to the same field use database write order (last write wins).
There is no text merging or durable offline draft storage after closing the page.
Production security rules remain responsible for enforcing manager permissions.

Validation: `scripts/setup-forms.test.js` runs both actual pages in Chromium with
an in-memory Firebase adapter. Live Firebase permissions and offline reconnects
still need deployment-environment verification.

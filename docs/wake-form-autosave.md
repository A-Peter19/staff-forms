# Wake realtime forms

Wake setup, during and clear-up use the shared stage controller in
`public/js/setup-form-sync.js` with the Wake adapter in `public/js/wake-form.js`.
The old whole-record writers and duplicate checkbox listeners have been removed.
All original task labels and Wake styling remain; each section now includes notes,
and setup now has the same stage-specific staff controls as during and clear-up.

## Saved-data compatibility

- Stage paths remain `events/{event}/{setup|during|clearup}` in Realtime Database.
- Each built-in row has an explicit task ID matching the dashboard task manifest.
  New checkbox writes patch only `wake_{stage}_{section}_{index}` and include
  completion initials/time. An unchecked task is stored as `{ checked: false }`.
- If no new record exists, the adapter reads the row's known former flat ID
  (`{stage}_s0_{index}`) or its nested `tasks[section-task]` record. Nested booleans
  have no invented completion initials/time. Conflicting flat and nested values
  expose an explicit choice on that task; choosing writes the new key only.
- Existing nested records, former flat keys, legacy staffing, timestamps and
  unknown fields are not deleted or rewritten by loading, editing or reset.
  Explicit unchecked records prevent retained legacy ticks from reappearing.
- Custom-task IDs use the shared dashboard identity helper. Old random custom
  task IDs cannot be reliably mapped to labels and are retained without guessing.

Notes use `setup_notes`, `during_notes` and `clearup_notes`, with one field per
section. Staffing uses the matching Firestore stage's `teamLeader`, `staffEntries`
and compatible `staffMembers` array. When a canonical staff field is absent,
legacy RTDB `teamLeader`/`staffNames` provide the initial values; explicit empty
canonical values take precedence. Staff transactions preserve other entries and
stages. Legacy RTDB staffing remains untouched.

Guest buttons now save the shared Firestore event `guests` field, so all three
pages update together. Legacy stage guest counts are only a fallback when that
field is absent. Quantity and staffing recommendations retain the existing tiers;
counts between tiers use the next tier, and unsupported counts show “Confirm”.

## Behaviour and validation

- Live manager task additions, edits, hiding and unhiding; no staff task-edit or
  hide controls. Hidden tasks do not count toward progress and are not reset.
- Autosave status/retry, protection of pending notes, and a navigation warning
  while saves are pending. Forms stay disabled until required data is loaded.
- Same-field edits follow database write order; there is no collaborative text
  merge or durable offline draft storage after closing the page.
- `scripts/setup-forms.test.js` exercises all three actual Wake pages plus Feast
  and Foundation against simulated Firebase, including old data, conflicts,
  reopening, staff removal, manager changes, retries and cross-stage guest updates.
- Live Firebase permissions and offline reconnects still require verification.
  Staff must reload already-open legacy Wake pages when deploying: an old page
  still running its old whole-record writer can overwrite the stage root.

These fixtures are synthetic examples of the saved formats found in the source audit at commit `4f5823563c6fd2beecf80196690eeaa9a2a48539`. No customer records, credentials or live database exports were used.

Each snapshot contains two separate trees: `firestore.events[eventId]` represents Firestore document contents, and `realtimeDatabase.events[eventId]` represents RTDB nodes. Missing properties/nodes are omitted. This wrapper is a test convention, not a Firebase import/export format. Do not upload these files into a live project.

| Fixture | Format and compatibility concern |
|---|---|
| `celebration` | Three stages, distinct staff/notes, hidden task, random custom-task key, and a Firestore checkbox backup that disagrees with RTDB. |
| `evening-party` | Event-wide access/bar/table fields and a guest count saved as a string. |
| `feast` | Dedicated `feastSetupHallAccessTime` and absent optional data. |
| `flourish` | Notes and string quantity values, including `"0"` and multiple fields on a task. |
| `foundation` | Unprefixed task IDs and Firestore `checkboxes`/`initialsData` backups. |
| `twilight` | Positional `cb_i` task IDs, `ta_i` notes, final notes and stage-local bar times. |
| `wake-nested` | Nested task objects in setup and booleans in during/clear-up, with stage-specific staff. |
| `wake-overwritten` | Remaining flat task map after the competing writer has removed the legacy stage envelope. |
| `event-isolation` | Two events with identical task IDs but different actors and staff. |
| `ambiguous-custom-tasks` | Duplicate custom labels, random completion IDs and conflicting event/stage time aliases. |
| `sparse-and-orphaned` | New, legacy and archived events, plus RTDB data with no corresponding Firestore document. |

`manifest.json` records provenance, source files, coverage tags, current shared-module read cases and migration requirements. All IDs start with `fixture-`. Names, times, notes and quantities are invented examples; the formats come from source, not confirmed production samples.

Load an independent copy for each test:

```js
const { loadFixture, listFixtures } = require('./scripts/fixtures/saved-data');
const fixture = loadFixture('celebration');
const event = fixture.firestore.events['fixture-celebration'];
```

The loader preserves both database trees exactly. It performs no normalization, merging, automatic ID conversion or conflict resolution. Keep these inputs unchanged when building a compatibility adapter; assert against the adapter's separate output.

Run the fixture checks from the repository root:

```sh
node --test scripts/saved-data-fixtures.test.js
```

The tests validate catalog completeness and independent loading, then exercise current shared-module hydration for supported flat maps, event isolation, and note/quantity save/reload. They do not claim the legacy Wake/Twilight data can already be migrated or that complete pages work. Minimal DOM fixtures do not test actual user-input events, permissions or network behaviour.

For the next compatibility step, explicitly test these requirements:

- Preserve each event/stage's staff, notes, completions and original actor/time.
- Preserve blank strings, zero quantities, multiline text and literal punctuation.
- Reconcile old checkbox/note positions using original task order, including custom-task insertion.
- Preserve conflicting values until a documented resolution policy is applied.
- Do not infer task identity from duplicate labels or invent actors/timestamps for boolean records.
- Missing fields in an overwritten Wake record are unknown, not recoverable defaults.
- Do not recreate deleted event documents from orphaned RTDB nodes or unarchive events automatically.

Actual production compatibility still requires sanitized examples or authorized inspection of deployed data and rules. These snapshots intentionally preserve known defects rather than silently correcting them.

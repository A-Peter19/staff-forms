The compatibility reader in `public/js/saved-data-reader.js` interprets JSON snapshots without fetching, changing or writing database records. It is not yet loaded by the forms.

```js
const { readEvent } = require('../public/js/saved-data-reader');
const result = readEvent({ eventId, firestore, realtimeDatabase, mappings });
```

`firestore` and `realtimeDatabase` use the fixture trees documented in [fixtures/saved-data](fixtures/saved-data/README.md). The browser export is `window.StaffSavedData.readEvent`.

The result contains `exists`, detached `raw` records, shared event fields, separate stage fields, and `issues`. Task, note, quantity and staff fields retain source/value `candidates`. A `resolved` field has a `value`; a `conflict` or `unresolved` field deliberately has no selected value. Callers must check status before displaying or writing a value. `exists: false` must prevent normal event editing; orphaned data remains available for investigation.

Known task IDs such as `wedding_setup_s1_0` and `setup_s1_0` are interpreted as the same stage-local key. Positional IDs, random custom IDs, Wake keys and generated `s0` IDs need explicit, evidence-based mappings:

```js
const mappings = {
  during: {
    tasks: { cb_0: 'during_s1_0', 'bar-bar-1': 'bar-service' },
    notes: { ta_0: 'section_s1' }
  }
};
```

These examples illustrate the API, not approved production mappings. Mappings must come from the historical form order or another reliable record. Duplicate labels alone are insufficient evidence. The reader does not allocate permanent custom-task IDs or resolve their identity automatically.

Missing actor/time metadata remains null. Zero quantity strings, blank notes and separate stage staff are preserved. Numeric guest strings are interpreted as numbers where safe; original values remain in `raw`. Shared time aliases are collected together and disagreements are flagged. Dates, hidden-task lists, custom-task definitions, archive state and unrecognized fields remain unchanged in `raw.firestore`. The reader does not normalize visibility or invent missing fields.

An older Firestore task with no counterpart in an existing RTDB stage remains unresolved, since an absent entry can represent an untick. Missing records and malformed task entries are flagged. Full raw snapshots retain information outside supported formats; this is not a complete schema validator.

Run focused checks with:

```sh
node --test scripts/saved-data-reader.test.js
```

The reader is a foundation for a future UI adapter and per-field autosave layer. It is not a migration command, write authorization mechanism, or proof that real production data can be reconciled automatically.

**Staff Forms — complete source audit and implementation checklist**

Audit date: 5 November 2026. Repository: A-Peter19/staff-forms. Local HEAD and remote main both verified as `4f5823563c6fd2beecf80196690eeaa9a2a48539`.

Scope: read-only application review of every staff form, the dashboard, shared JavaScript, hosting configuration and the existing test runner. Audit artifacts were originally generated outside the checkout and are now preserved in this documentation folder. No application, dependency, test, configuration or database changes were made.

This is a source-level audit, with syntax checks and an existing-test baseline. “Realtime” below means the source contains listeners and save wiring; it is not a claim that production Firebase was tested successfully. Findings involving asynchronous ordering or concurrent writes are risks demonstrated by the code, with browser reproduction still required.

**Coverage and inventory**

There are 21 staff forms (7 packages × 3 stages), the dashboard and a static 404 page. All 26 public files were enumerated, including the shared script and logo assets. The 21 forms contain 895 static input/select/textarea controls: 649 task checkboxes, 117 section-note textareas, 2 final-note textareas, 47 item/detail fields (45 under `.item-qty` plus 2 Twilight clear-up counts), 58 header/event fields, and 22 static staff fields. The dashboard adds 10 static controls. These are control occurrences, not unique database fields.

Dynamic controls are inventoried separately below: staff-list entries, manager custom-task rows, task-visibility toggles, the Feast hall-access time field, and 12 Wake guest-count buttons. No static count includes arbitrary runtime custom tasks or repeated staff-list rows.

Detailed artifacts:

- [Field audit — every static control, source line, current storage/trigger/read path and intended scope](field-audit.csv)
- [Per-form functionality matrix](form-matrix.csv)
- [Raw structure, buttons and external scripts](inventory.json)
- [Syntax results](syntax-results.json)
- [Existing test failure](existing-test-result.txt)

**Per-form coverage**

“Not saved” means no effective write connection was found for that field group. Counts exclude dynamic custom tasks and staff inputs. “Missing UI” means controls need adding in the existing form style. Twilight final notes and stored counts are covered separately below; their section-note/item-detail counts in this table follow the existing CSS containers.

| Package | Stage | Tasks | Section notes | Note behaviour | Item details | Detail behaviour | Staff behaviour |
|---|---|---:|---:|---|---:|---|---|
| [celebration](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html) | setup | 33 | 6 | Realtime | 7 | Not saved | Manual |
| [celebration](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-during.html) | during | 30 | 6 | Realtime | 0 | Not present | Manual |
| [celebration](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-clear.html) | clearup | 22 | 5 | Realtime | 2 | Not saved | Manual |
| [evening-party](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/evening-party/evening-party-setup.html) | setup | 31 | 6 | Not saved | 7 | Not saved | Manual |
| [evening-party](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/evening-party/evening-party-during.html) | during | 25 | 5 | Not saved | 0 | Not present | Manual |
| [evening-party](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/evening-party/evening-party-clear.html) | clearup | 34 | 7 | Not saved | 2 | Not saved | Manual |
| [feast](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-flourish-setup.html) | setup | 38 | 9 | Not saved | 9 | Not saved | Not saved |
| [feast](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-during.html) | during | 31 | 7 | Not saved | 0 | Not present | Manual |
| [feast](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-clearup.html) | clearup | 30 | 6 | Not saved | 1 | Not saved | Manual |
| [flourish](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-setup.html) | setup | 44 | 9 | Realtime | 10 | Realtime | Manual |
| [flourish](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-during.html) | during | 62 | 10 | Realtime | 0 | Not present | Manual |
| [flourish](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-clearup.html) | clearup | 45 | 7 | Realtime | 1 | Realtime | Manual |
| [foundation](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-setup.html) | setup | 26 | 6 | Not saved | 3 | Not saved | Not saved |
| [foundation](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-during.html) | during | 15 | 5 | Not saved | 0 | Not present | Manual |
| [foundation](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-clearup.html) | clearup | 22 | 7 | Not saved | 1 | Not saved | Manual |
| [twilight](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-setup.html) | setup | 21 | 5 | Not saved | 2 | Not saved | Manual |
| [twilight](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-during.html) | during | 32 | 5 | Manual | 0 | Not present | Manual |
| [twilight](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-clearup.html) | clearup | 35 | 6 | Not saved | 0 | Not present | Manual |
| [wake](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-setup.html) | setup | 35 | 0 | Missing UI | 0 | Not present | Missing UI |
| [wake](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html) | during | 12 | 0 | Missing UI | 0 | Not present | Conflicting realtime |
| [wake](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-clear.html) | clearup | 26 | 0 | Missing UI | 0 | Not present | Conflicting realtime |

**Current data locations and intended ownership**

| Information | Current location(s) | Required ownership/behaviour |
|---|---|---|
| Event name, date, package/type, guest count, sash, runner | Firestore `events/{eventId}`; multiple legacy aliases | One event record; reflect changes in all relevant views. Weekday derives from date. |
| Access time, bar times, table style | Top-level Firestore fields in Evening Party; stage fields in Celebration/Twilight; unsaved item controls elsewhere | Share only values with the same meaning. Consolidate aliases with compatibility handling. |
| Feast hall access | Firestore `feastSetupHallAccessTime` | Persist existing values and reconcile with any canonical hall-access field deliberately. |
| Checklist state | RTDB `events/{eventId}/{stage}`; task-keyed map, `cb_i` map or nested Wake `tasks` object | Event + stage + stable task ID; change only the affected task. |
| Legacy checkbox backups | Firestore `{stage}.checkboxes.cb_i` and `{stage}.initialsData.cb_i` | Compatibility input only; must not overwrite newer realtime state. |
| Section notes | RTDB `{stage}_notes.section_sN` on 6 forms; Firestore `during.sectionNotes.ta_i` in Twilight; absent elsewhere | Event + stage + stable section ID; realtime autosave and reload restoration. |
| Final notes | Firestore `{during|clearup}.finalNotes` in Twilight | Separate stage field; same autosave/realtime expectations. |
| Quantities and styles | RTDB `{stage}_quantities` in Flourish; absent elsewhere | Stage/task-specific unless explicitly an event-wide time/detail. Setup counts and clear-up counts must stay independent. |
| Team leader/staff | Firestore `{stage}.teamLeader/staffMembers[]`; Wake RTDB stage `teamLeader/staffNames[]` | Event + stage; live updates with stable staff-entry identity. |
| Custom tasks | Firestore `customTasks[]` containing only `form`, `section`, `label` | Manager-owned structure; persistent task ID, live insertion/edit/removal without shifting existing completions. |
| Hidden tasks | Firestore `hiddenTasks[]` | Manager-owned visibility; stable IDs matching those used by every form. Preserve completion if hidden/restored. |
| Staff initials | Browser `localStorage.staffInitials` plus client-clock strings | Device identity preference; record actor/time on the individual task change. Initials are not authentication. |

The same bar opening time appearing in a header and a checklist detail should share an event value. Counts such as “chairs placed” and “chairs stored” represent different work and must not be linked merely because their labels are similar. Exact data structure design belongs to the next implementation stage.

**Priority findings — data correctness and missing functionality**

**F01 — Critical: incompatible Wake writers.** All three Wake forms run `saveState()` and `saveRealtimeChecklist()` against the same stage path. One writes `{guests,tasks,teamLeader,staffNames,timestamp}` (setup omits staff); the other replaces the path with a flat checkbox map. Both listeners also interpret that location differently. A checkbox change can erase unrelated fields and reset visible checkbox state.

Evidence: [public/wake-during.html:714](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L714), [public/wake-during.html:767](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L767), [public/wake-during.html:815](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L815), [public/js/form-shared.js:211](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L211).

**F02 — High: full-map saves can discard another staff member’s edits.** Shared checkbox, notes and quantity saves replace their whole map with the current browser state. Reading once before a write is not an atomic merge. Twilight and Wake also replace whole structures. Concurrent users editing different tasks/notes can overwrite each other; incoming note snapshots overwrite the active editor when text differs.

Evidence: [public/js/form-shared.js:211](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L211), [public/js/form-shared.js:270](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L270), [public/js/form-shared.js:285](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L285), [public/js/form-shared.js:345](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L345), [public/twilight/twilight-setup.html:551](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-setup.html#L551).

**F03 — High: notes and details are widely unsaved.** Of 117 section-note boxes, 43 have realtime wiring (Celebration/Flourish), 5 require manual Save (Twilight during), and 69 have no save path. The 2 Twilight final-note boxes require manual Save. Of 47 item/detail controls, 11 have wiring (Flourish) and 36 have no save path. All 3 Wake forms lack notes UI entirely.

Evidence: [public/js/form-shared.js:297](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L297), [public/celebration/celebration-setup.html:716](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L716), [public/flourish/flourish-setup.html:1137](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-setup.html#L1137), [public/twilight/twilight-during.html:667](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-during.html#L667).

**F04 — High: staff saving is incomplete and not consistently live.** Feast setup and Foundation setup display staff fields and can load staff records, but never call their saveStaffSection wrappers and offer no save/autosave path. Most other forms require manual Save and a reload to see another person’s staff edits. Wake during/clear-up use the conflicting realtime structure; Wake setup has no staff-assignment UI.

Evidence: [public/feast/feast-flourish-setup.html:817](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-flourish-setup.html#L817), [public/foundation/foundation-setup.html:655](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-setup.html#L655), [public/js/form-shared.js:148](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L148), [public/js/form-shared.js:248](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L248), [public/wake-during.html:484](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L484).

**F05 — High: custom tasks have no durable identity.** The dashboard saves form/section/label but no task ID. Shared injection generates a new random ID on every load. Other pages rely on positional IDs or assign missing IDs after insertion; completion can be orphaned or associated with the wrong item after task changes. Existing random or positional data requires careful migration, and some old custom-task attribution may be impossible to reconstruct without database evidence.

Evidence: [public/index.html:463](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L463), [public/js/form-shared.js:162](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L162), [public/js/form-shared.js:28](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L28), [public/twilight/twilight-setup.html:526](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-setup.html#L526).

**F06 — High: dashboard changes do not propagate live to forms.** The dashboard listens to Firestore; the forms load event metadata, custom tasks and visibility with one-time gets. Manager edits made while staff forms remain open do not automatically insert/remove/hide/restore items or update shared event details.

Evidence: [public/index.html:791](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L791), [public/js/form-shared.js:125](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L125), [public/celebration/celebration-setup.html:716](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L716), [public/twilight/twilight-clearup.html:625](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-clearup.html#L625).

**F07 — High: hidden-task support is inconsistent.** Foundation during/clear-up and Feast during/clear-up never apply hiddenTasks. Wake shared task-ID generation uses row section s0 while the dashboard reads checkbox sections, and the hide/prefix loop only handles .checklist-item rather than Wake .task rows. These paths cannot consistently apply manager visibility.

Evidence: [public/foundation/foundation-during.html:300](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-during.html#L300), [public/feast/feast-during.html:364](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-during.html#L364), [public/js/form-shared.js:28](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L28), [public/js/form-shared.js:134](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L134), [public/index.html:873](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L873).

**F08 — High: injected custom tasks can lack working handlers.** Feast setup and Foundation setup bind checkbox save listeners to the original elements before custom tasks are inserted. Shared injection binds attribution styling only; these pages do not use delegated save handling. Wake injects .checklist-item rows into pages whose local handlers/progress expect .task rows and checkbox data-section attributes.

Evidence: [public/feast/feast-flourish-setup.html:797](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-flourish-setup.html#L797), [public/foundation/foundation-setup.html:633](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-setup.html#L633), [public/js/form-shared.js:162](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L162), [public/wake-during.html:804](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L804).

**F09 — High: competing startup loads and identity changes.** Several pages restore old Firestore checkbox snapshots while independently listening to RTDB. Flourish starts its listeners before the asynchronous event-type prefix is applied; quantity keys can be cached before the identity changes. Depending on response order, stale state or an identity mismatch can be shown. Custom tasks inserted after a first snapshot may miss initial hydration.

Evidence: [public/flourish/flourish-setup.html:1006](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-setup.html#L1006), [public/flourish/flourish-setup.html:1133](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-setup.html#L1133), [public/celebration/celebration-during.html:565](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-during.html#L565), [public/js/form-shared.js:314](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L314).

**F10 — High: Wake callback mismatch and missing-event writes.** Shared checkbox hydration invokes updateProgress() with no argument; Wake updateProgress(section) looks up section-specific DOM IDs and dereferences them. That path can throw on undefinedProgress. Wake legacy saveState/loadState also lack event-ID guards and construct events/null/{stage} when opened without an event. Other forms need missing/deleted event handling before accepting writes.

Evidence: [public/js/form-shared.js:206](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L206), [public/wake-during.html:821](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L821), [public/wake-during.html:714](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L714), [public/wake-during.html:777](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L777).

**F11 — High: no dependable global saved/error state.** Most automatic writes are neither awaited by their handlers nor given a catch/status path. There is no shared connected/pending/rejected indicator or app-level persisted pending-edit recovery. Wake Save Progress only displays a success assertion. Firebase client buffering alone does not prove a server acknowledgement or survival after closing the page.

Evidence: [public/js/form-shared.js:303](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L303), [public/js/form-shared.js:380](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L380), [public/wake-during.html:873](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L873), [public/js/form-shared.js:483](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L483).

**F12 — High: shared event fields have divergent schemas.** Evening Party manually writes event-level accessTime/barTime/tableStyle, Celebration writes those under its stage, Twilight uses during.barOpen/barClose, and Feast has a separate hall-access field. Many other header inputs display initial data but never save edits. There is no live shared event subscription in the forms.

Evidence: [public/evening-party/evening-party-setup.html:703](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/evening-party/evening-party-setup.html#L703), [public/celebration/celebration-setup.html:752](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L752), [public/twilight/twilight-during.html:667](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-during.html#L667), [public/js/form-shared.js:483](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L483).

**F13 — Medium: checkbox authorship can be misleading.** Only the delegated shared handler marks the newly changed task with lastActorInitials/lastCheckedAt. Older handlers may preserve stale actor metadata when checking a task already completed remotely. Twilight rewrites every checked task with the current staff initials; Wake setup stamps every checked task with the current time. Feast/Foundation setup and Wake during/clear-up have no local initials-entry UI and can rely on a prior page’s localStorage or show ?.

Evidence: [public/js/form-shared.js:226](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L226), [public/js/form-shared.js:380](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L380), [public/twilight/twilight-clearup.html:591](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/twilight/twilight-clearup.html#L591), [public/wake-setup.html:712](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-setup.html#L712).

**F14 — Medium: progress and reset behaviour vary.** Progress generally counts hidden rows, preventing a checklist of visible work from reaching the expected total. Reset is local-only in 7 forms: all Flourish, Feast during/clear-up and Foundation during/clear-up. It can therefore disagree with other devices and revert on the next snapshot. Other pages reset through a whole-map write with concurrency implications.

Evidence: [public/celebration/celebration-setup.html:692](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L692), [public/flourish/flourish-setup.html:1175](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-setup.html#L1175), [public/feast/feast-clearup.html:586](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/feast/feast-clearup.html#L586), [public/foundation/foundation-clearup.html:374](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/foundation/foundation-clearup.html#L374).

**F15 — Medium: staff removal can stop working.** The shared UI code copied into each page installs a document click listener with once:true. That listener is consumed by the first click anywhere. Pages relying on .js-remove-staff (Celebration, Feast/Foundation setup, Wake during/clear-up) can then fail to remove rows. In Wake the generic removal path also bypasses the saveState call in removeStaff. Other pages have separate direct handlers and are less affected.

Evidence: [public/celebration/celebration-setup.html:841](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L841), [public/wake-during.html:852](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L852), [public/wake-during.html:936](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L936).

**F16 — Medium: manager actions need stable merging and lifecycle handling.** Custom tasks and hidden IDs are replaced as entire arrays. The visibility manifest only enumerates built-in HTML tasks, so custom tasks are not included in the hide/restore list. Event creation derives an ID from type/name/date and overwrites that document without a duplicate check. Event deletion removes only Firestore metadata, leaving RTDB state; recreating the same event ID can expose old checklist data. These are real dashboard paths to consider in safe data handling.

Evidence: [public/index.html:558](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L558), [public/index.html:594](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L594), [public/index.html:799](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L799), [public/index.html:850](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L850), [public/index.html:873](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L873), [public/index.html:1062](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L1062).

**F17 — Release limitation: manager-only access is not evidenced in this checkout.** There is no Firebase Auth SDK/sign-in/role check in the code and no Firestore/RTDB rules file. Hiding editing controls from staff forms does not establish manager authorization on the dashboard or backend. Current deployed rules or external access protection must be verified before claiming manager-only enforcement. This audit does not assert that production rules are open.

Evidence: [firebase.json:1](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/firebase.json#L1), [public/index.html:7](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L7), [public/index.html:562](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/index.html#L562).

**F18 — Medium: stored values are sometimes inserted as HTML.** Some staff inputs interpolate stored names into innerHTML attributes, and task initials are inserted with innerHTML. Quotes/markup can break rendering; untrusted stored values could also become executable markup depending on access. Use text/value assignment as part of the shared field work and include literal punctuation/markup input in tests.

Evidence: [public/celebration/celebration-setup.html:728](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L728), [public/wake-during.html:742](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/wake-during.html#L742), [public/js/form-shared.js:201](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/js/form-shared.js#L201).

**F19 — Test foundation is currently insufficient.** The existing runner fails at ref.once because FakeRTDB implements on/set only. If that is fixed, the runner writes to a qa directory it does not create, and FAIL rows in its report do not independently produce a failing exit code. It uses fake DOM/database objects and string-presence checks; it does not validate real page startup, browser events, notes, concurrent writes, manager changes or Firebase permissions.

Evidence: [scripts/realtime-sync-test.js:85](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/scripts/realtime-sync-test.js#L85), [scripts/realtime-sync-test.js:127](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/scripts/realtime-sync-test.js#L127), [scripts/realtime-sync-test.js:216](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/scripts/realtime-sync-test.js#L216).

**F20 — External dependency consistency needs a release check.** The pages load mixed Firebase compat SDK versions (9.22.0, 9.22.2 and 10.12.5). Flourish clear-up includes an unexplained external script from ppl-ai-code-interpreter-files.s3.amazonaws.com. Its contents/availability were not fetched; its role must be checked before customer release. No package lockfile/build pipeline or CI workflow is present.

Evidence: [public/celebration/celebration-clear.html:449](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-clear.html#L449), [public/celebration/celebration-setup.html:606](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/celebration/celebration-setup.html#L606), [public/flourish/flourish-clearup.html:3](https://github.com/A-Peter19/staff-forms/blob/4f5823563c6fd2beecf80196690eeaa9a2a48539/public/flourish/flourish-clearup.html#L3).

**Dynamic controls and functionality outside the static field count**

| Control | Current behaviour | Required handling |
|---|---|---|
| Repeated staff rows | Generated in 20 staff forms; Wake setup has none | Stable entry IDs; add/edit/remove autosave; stage separation; add Wake setup controls in its own style. |
| Initials entry/change | Present on 17 forms; localStorage carries it between pages | Consistent staff attribution setup on all forms; initials remain a preference, not a manager role. |
| Custom-task editor rows | Dashboard form/stage selector, section selector, label, remove action; saves array manually | Keep manager controls on dashboard, persist stable task identities, synchronize existing staff forms. |
| Hide/restore toggles | Dashboard parses built-in tasks from HTML routes; writes hiddenTasks array manually | Match all form identities including Wake; include custom tasks if managers must hide/restore them; preserve completion. |
| Feast hall access time | Added by shared JS; defaults to 13:00; loads once, saves on change with retry | Preserve existing feature and value; add realtime propagation and resolve shared-field mapping. |
| Wake guest selection | 60/80/100/120 buttons on each stage; changes stage-local guests and derived quantities/staff recommendations | Link to canonical event guest count; handle counts outside the presets deliberately; keep derived displays coherent. |
| Save buttons | 16 forms have manual Save; Wake has an alert-only Save Progress; Feast/Foundation setup have no Save | Automatic saving for all editable form data; pending/saved/retry status replaces reliance on a button. |
| Reset buttons | Present on all staff forms; inconsistent local/live effects | Make semantics explicit and consistent, preserve unrelated notes/staff, verify interaction with concurrent updates. |
| Collapsible sections | Copied event-wiring helpers and family-specific functions | Preserve layout and keyboard operation while consolidating behaviour. |
| Dashboard lifecycle | Create/filter/search/sort/archive/delete; realtime event list | Keep working while replacing data access; guard duplicate creation and orphaned state. |
| Routes | Wedding packages, Wake, two party variants; Baby Shower and legacy Party default to Wake pages | Include fallback routes in validation; no separate Baby Shower form files exist. |

Dashboard Create Event is an intentional creation action; manager task editing/hiding currently uses explicit commit buttons. The agreed no-Save requirement clearly covers staff forms. Whether manager editor drafts should also commit on each keystroke can be settled during dashboard design without blocking the core audit.

**Implementation checklist derived from the audit**

- [ ] Establish one authoritative shape for each data type, with a documented compatibility adapter for each current format.
- [ ] Keep immutable IDs for existing built-in tasks; give custom tasks and staff rows persistent IDs. Map legacy cb_i/ta_i/section keys before changing markup or task order.
- [ ] Load valid event metadata, build/hydrate controls and establish identities before accepting edits. Handle missing, deleted and malformed events explicitly.
- [ ] Replace whole-map writes with writes for the changed field/task/entry; distinguish remote hydration from user input to avoid write loops.
- [ ] Define behaviour for two people editing the very same note. Per-field saves prevent unrelated overwrites but do not merge competing text automatically; retain conflicting drafts or use explicit conflict resolution.
- [ ] Add reliable notes and detail autosave to every form, including new Wake notes controls and Wake setup staff controls.
- [ ] Add live per-stage staff assignments and event-wide shared fields; keep counts and notes with different meanings separate.
- [ ] Add live manager task/visibility subscriptions with insertion, deletion, rename, move and restore reconciliation.
- [ ] Fix hidden-task progress counting, reset persistence, attribution and staff-removal controls.
- [ ] Preserve the existing package-specific styling, content, responsive layout, focus/caret behaviour and accessibility.
- [ ] Expose pending/saved/offline/rejected/retry states based on actual write results. Never present an alert as evidence of server persistence.
- [ ] Make pending edits recoverable as agreed; realtime visibility cannot occur between disconnected devices until connectivity returns. Define recovery after a tab/browser closes while offline.
- [ ] Verify the real manager/staff authorization boundary and required rules without treating initials or URL access as authentication.
- [ ] Repair and extend the existing regression harness, add real DOM/browser interaction tests and isolated Firebase/emulator coverage.
- [ ] Verify old events against compatibility fixtures and a recoverable backup before deployment. An old value already overwritten by the current code cannot be reconstructed from source alone.

**Acceptance scenarios for the next testing step**

| Scenario | Required result |
|---|---|
| Two staff tick different tasks concurrently | Both changes remain, with correct initials/time. |
| Tick then untick/re-tick | Latest intended state persists; attribution reflects the actual actor of the latest completion. |
| Two staff edit different notes or quantities | Neither update removes the other. |
| Two staff edit the same note | Defined conflict behaviour; no silent loss of an unsaved local draft. |
| Blank a note, zero a quantity, change a dropdown | Clearing/zero values persist correctly and propagate. |
| Type a note then navigate/refresh immediately | Pending-save behaviour is explicit; no silent loss presented as success. |
| Add/remove/rename staff in one stage | Other clients of that stage update; other stages retain their own staff. |
| Change a shared event time | Every relevant instance updates; unrelated stage counts remain independent. |
| Manager adds/renames/moves/removes a custom task | Open forms reconcile live; existing tasks retain their identity/completion. |
| Manager hides/restores a task | Every relevant client updates; visible progress is correct; completion is preserved. |
| Open another event or another stage | No leakage of tasks, notes, staff or pending changes. |
| Load old records in each known format | Compatible hydration without resetting newer data. |
| Firebase permission denied / event missing | Clear error and no misleading success or events/null writes. |
| Drop/reconnect network; close/reopen offline tab | Clearly identified pending work and verified recovery strategy; no promise of instantaneous remote visibility while disconnected. |
| Reset with another client open | Consistent checklist-only semantics and live result; notes/staff preserved. |
| Mobile/keyboard use | Typing focus, caret, collapse controls and editable fields remain usable. |
| Staff accesses dashboard endpoints | Deployed permissions enforce the agreed role boundary, verified with separate roles. |

**Checks actually performed and limitations**

- All 21 staff forms and the dashboard were inventoried and their read/write/event-wiring paths reviewed; the 404 page and hosting/config/test files were also inspected or enumerated as appropriate.
- 905 static controls are recorded with file/line references; dynamic controls and derived displays are listed separately. Source extraction is not a browser-rendered DOM snapshot.
- All 48 syntax units passed: inline JavaScript blocks plus the shared file. Syntax success does not prove functional correctness.
- `node scripts/realtime-sync-test.js` exited 1 at `ref.once is not a function` before completing its realtime scenarios. No realtime scenario was counted as passed.
- Read-only Git access succeeded; remote main matched the local commit at audit time.
- A read-only Firebase SDK HEAD request through the configured proxy returned 403. Required Firebase domains are absent from the currently enforced custom allowlist. No network configuration was changed for this audit.
- Live event records, deployed Firestore/RTDB rules, manager identities, permission boundaries and the hosted production app were not inspected. Existing configuration exposes no app credential bindings. These limitations do not prevent source changes later, but they prevent a production-readiness claim now.
- No live writes, Firebase deployment, migration, package installation or browser multi-session checks were performed. Those belong to the next authorized implementation/testing stages.
- Repository source and tests remain unchanged. This folder preserves the audit reports, inventories and helper scripts; the audit itself did not modify application files.

The audit is complete for the available source. The safest next step is to build representative compatibility fixtures and repair the failing test baseline, then consolidate the shared sync layer before rolling changes across the forms.

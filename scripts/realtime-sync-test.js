const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class FakeClassList {
  constructor() { this.set = new Set(); }
  toggle(name, force) {
    const shouldHave = force === undefined ? !this.set.has(name) : !!force;
    if (shouldHave) this.set.add(name); else this.set.delete(name);
  }
  contains(name) { return this.set.has(name); }
}

class FakeMetaNode {
  constructor() { this.className = 'task-meta'; this.innerHTML = ''; }
  querySelector(sel) {
    if (sel === '.task-time') {
      const m = this.innerHTML.match(/<span class="task-time">([^<]*)<\/span>/);
      return m ? { textContent: m[1] } : null;
    }
    return null;
  }
}

class FakeHolder { appendChild(node) { this._meta = node; } }

class FakeRow {
  constructor(taskId) {
    this.dataset = { taskId };
    this.classList = new FakeClassList();
    this.style = {};
    this._meta = null;
    this._holder = new FakeHolder();
  }
  querySelector(sel) {
    if (sel === '.item-content, .task-content') return this._holder;
    if (sel === '.task-meta') return this._meta;
    return null;
  }
}

class FakeCheckbox {
  constructor(row) {
    this.dataset = {};
    this.checked = false;
    this._row = row;
  }
  closest(sel) {
    if (sel === '.checklist-item, .task') return this._row;
    return null;
  }
  addEventListener() {}
}

class FakeDocument {
  constructor(taskIds) {
    this.boxes = taskIds.map((id) => {
      const row = new FakeRow(id);
      const cb = new FakeCheckbox(row);
      row.cb = cb;
      return cb;
    });
  }
  querySelectorAll(sel) {
    if (sel === '.checklist-item input[type="checkbox"], .task input[type="checkbox"]') return this.boxes;
    return [];
  }
  getElementById() { return null; }
  createElement(tag) {
    if (tag === 'div') return new FakeMetaNode();
    return {};
  }
  querySelector() { return null; }
}

class FakeSnapshot {
  constructor(v) { this._v = v; }
  val() { return this._v; }
}

class FakeRTDB {
  constructor() { this.data = {}; this.listeners = {}; }
  ref(path) {
    const self = this;
    return {
      on(evt, cb) {
        if (evt !== 'value') throw new Error('only value supported');
        self.listeners[path] = self.listeners[path] || [];
        self.listeners[path].push(cb);
        cb(new FakeSnapshot(self.data[path]));
      },
      set(payload) {
        self.data[path] = payload;
        (self.listeners[path] || []).forEach((cb) => cb(new FakeSnapshot(payload)));
        return Promise.resolve();
      }
    };
  }
}

function buildSession({ eventId, rtdb, taskIds }) {
  const document = new FakeDocument(taskIds);
  const localStorage = { getItem() { return 'qa'; } };
  const location = { search: `?event=${eventId}` };
  const URLSearchParamsRef = URLSearchParams;

  const window = { document, localStorage, location, rtdb, URLSearchParams: URLSearchParamsRef, staffInitials: 'qa' };
  window.window = window;

  const code = fs.readFileSync('public/js/form-shared.js', 'utf8');
  vm.createContext(window);
  vm.runInContext(code, window);

  return { window, document };
}

async function run() {
  const results = [];
  const sharedDb = new FakeRTDB();

  // Multi-session realtime sync test (wedding/wake use same shared module behavior)
  const s1 = buildSession({ eventId: 'evt-wedding', rtdb: sharedDb, taskIds: ['wedding_task1', 'wedding_task2'] });
  const s2 = buildSession({ eventId: 'evt-wedding', rtdb: sharedDb, taskIds: ['wedding_task1', 'wedding_task2'] });
  s1.window.StaffFormSync.loadRealtimeChecklist('setup');
  s2.window.StaffFormSync.loadRealtimeChecklist('setup');
  s1.document.boxes[0].checked = true;
  await s1.window.StaffFormSync.saveRealtimeChecklist('setup');
  assert.equal(s2.document.boxes[0].checked, true);
  assert.equal(s2.document.boxes[1].checked, false);
  results.push({ eventType: 'wedding', status: 'PASS', detail: 'Realtime checkbox update propagated across two sessions.' });

  const w1 = buildSession({ eventId: 'evt-wake', rtdb: sharedDb, taskIds: ['wake_task1'] });
  const w2 = buildSession({ eventId: 'evt-wake', rtdb: sharedDb, taskIds: ['wake_task1'] });
  w1.window.StaffFormSync.loadRealtimeChecklist('during');
  w2.window.StaffFormSync.loadRealtimeChecklist('during');
  w1.document.boxes[0].checked = true;
  await w1.window.StaffFormSync.saveRealtimeChecklist('during');
  assert.equal(w2.document.boxes[0].checked, true);
  results.push({ eventType: 'wake', status: 'PASS', detail: 'Realtime checkbox update propagated across two sessions.' });

  const c1 = buildSession({ eventId: 'evt-celebration', rtdb: sharedDb, taskIds: ['celebration_task1', 'celebration_task2'] });
  const c2 = buildSession({ eventId: 'evt-celebration', rtdb: sharedDb, taskIds: ['celebration_task1', 'celebration_task2'] });
  c1.window.StaffFormSync.loadRealtimeChecklist('setup');
  c2.window.StaffFormSync.loadRealtimeChecklist('setup');
  c2.document.boxes[1].checked = true;
  await c2.window.StaffFormSync.saveRealtimeChecklist('setup');
  assert.equal(c1.document.boxes[0].checked, false);
  assert.equal(c1.document.boxes[1].checked, true);
  results.push({ eventType: 'celebration', status: 'PASS', detail: 'Realtime checkbox update propagated across two sessions.' });

  // Isolation by event id
  const isoA = buildSession({ eventId: 'evt-a', rtdb: sharedDb, taskIds: ['task1'] });
  const isoB = buildSession({ eventId: 'evt-b', rtdb: sharedDb, taskIds: ['task1'] });
  isoA.window.StaffFormSync.loadRealtimeChecklist('clearup');
  isoB.window.StaffFormSync.loadRealtimeChecklist('clearup');
  isoA.document.boxes[0].checked = true;
  await isoA.window.StaffFormSync.saveRealtimeChecklist('clearup');
  assert.equal(isoA.document.boxes[0].checked, true);
  assert.equal(isoB.document.boxes[0].checked, false);

  const indexHtml = fs.readFileSync('public/index.html', 'utf8');
  const hasPartyRoutes = /FORM_ROUTES[\s\S]*\bparty\s*:\s*\{/.test(indexHtml);
  const hasBabyRoutes = /FORM_ROUTES[\s\S]*['"]baby-shower['"]\s*:\s*\{/.test(indexHtml);
  const makeEventIdScopedByType = /function makeEventId\(eventType,\s*couple,\s*date\)\s*\{[\s\S]*normalizeEventType\(eventType\)\s*\+\s*'-'\s*\+\s*couple\s*\+\s*'-'\s*\+\s*date/.test(indexHtml);

  results.push({
    eventType: 'party',
    status: hasPartyRoutes ? 'PASS' : 'FAIL',
    detail: hasPartyRoutes ? 'Party routes found.' : 'No party entry in FORM_ROUTES, so no forms/listeners can open.'
  });
  results.push({
    eventType: 'baby-shower',
    status: hasBabyRoutes ? 'PASS' : 'FAIL',
    detail: hasBabyRoutes ? 'Baby shower routes found.' : 'No baby-shower entry in FORM_ROUTES, so no forms/listeners can open.'
  });

  results.push({
    eventType: 'cross-event-isolation',
    status: makeEventIdScopedByType ? 'PASS' : 'FAIL',
    detail: makeEventIdScopedByType
      ? 'Event ID generation is scoped by event type, reducing accidental cross-type overwrites.'
      : 'Event ID generation is not scoped by event type; same host/date across types can collide.'
  });

  // Feast setup page wiring sanity check
  const feastSetup = fs.readFileSync('public/feast/feast-flourish-setup.html', 'utf8');
  const hasSharedModule = feastSetup.includes('form-shared.js');
  const hasRealtimeLoad = feastSetup.includes('loadRealtimeChecklist');
  results.push({
    eventType: 'wedding-feast-setup',
    status: hasSharedModule && hasRealtimeLoad ? 'PASS' : 'FAIL',
    detail: hasSharedModule && hasRealtimeLoad
      ? 'Realtime shared module wiring found.'
      : 'Feast setup page is missing StaffFormSync wiring, so checkboxes are local-only and not synced.'
  });

  const celebrationPages = [
    'public/celebration/celebration-setup.html',
    'public/celebration/celebration-during.html',
    'public/celebration/celebration-clear.html'
  ];
  const celebrationGlobalDbWiring = celebrationPages.every((path) => {
    const html = fs.readFileSync(path, 'utf8');
    return html.includes('window.db = firebase.firestore();') && html.includes('window.rtdb = firebase.database();');
  });
  results.push({
    eventType: 'celebration-global-wiring',
    status: celebrationGlobalDbWiring ? 'PASS' : 'FAIL',
    detail: celebrationGlobalDbWiring
      ? 'Celebration pages expose Firestore/Realtime DB on window for shared realtime sync.'
      : 'At least one celebration page does not expose db/rtdb on window, so shared realtime sync can no-op.'
  });

  console.table(results);

  const lines = [];
  lines.push('# Realtime Checkbox Sync QA Report');
  lines.push('');
  lines.push('Generated by `node scripts/realtime-sync-test.js`.');
  lines.push('');
  for (const r of results) {
    lines.push(`- **${r.eventType}**: ${r.status} — ${r.detail}`);
  }
  fs.writeFileSync('qa/realtime-sync-report.md', lines.join('\n') + '\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const REPO_ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(REPO_ROOT, 'qa/realtime-sync-report.md');
const readSource = (file) => fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');

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

class FakeHolder {
  constructor(row) { this.row = row; }
  appendChild(node) { this.row._meta = node; }
}

class FakeRow {
  constructor(taskId) {
    this.dataset = { taskId };
    this.classList = new FakeClassList();
    this.style = {};
    this._meta = null;
    this._holder = new FakeHolder(this);
  }
  querySelector(sel) {
    if (sel === '.item-content, .task-content') return this._holder;
    if (sel === '.task-meta') return this._meta;
    if (sel === 'input[type="checkbox"]') return this.cb;
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
    if (sel === '.checklist-item, .task') return this.boxes.map((cb) => cb._row);
    return [];
  }
  getElementById() { return null; }
  createElement(tag) {
    if (tag === 'div') return new FakeMetaNode();
    return {};
  }
  querySelector() { return null; }
}

// Only JSON values are used by these fixtures. Missing Firebase data reads as null.
const copyValue = (value) => value == null ? null : JSON.parse(JSON.stringify(value));

class FakeSnapshot {
  constructor(v) { this._v = copyValue(v); }
  val() { return copyValue(this._v); }
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
      once(evt) {
        if (evt !== 'value') throw new Error('only value supported');
        return Promise.resolve(new FakeSnapshot(self.data[path]));
      },
      set(payload) {
        self.data[path] = copyValue(payload);
        (self.listeners[path] || []).forEach((cb) => cb(new FakeSnapshot(self.data[path])));
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

  const code = readSource('public/js/form-shared.js');
  vm.createContext(window);
  vm.runInContext(code, window);

  return { window, document };
}

// These fixtures exercise the shared module directly, not complete HTML pages or Firebase.
async function run() {
  const results = [];

  async function check(eventType, kind, detail, test) {
    try {
      await test();
      results.push({ eventType, kind, status: 'PASS', detail });
    } catch (error) {
      // Keep independent checks running so the report also explains partial failures.
      results.push({ eventType, kind, status: 'FAIL', detail: String(error.stack || error) });
    }
  }

  const syncCases = [
    { eventType: 'wedding', formKey: 'setup', taskIds: ['wedding_task1', 'wedding_task2'], changedIndex: 0 },
    { eventType: 'wake', formKey: 'during', taskIds: ['wake_task1'], changedIndex: 0 },
    { eventType: 'celebration', formKey: 'setup', taskIds: ['celebration_task1', 'celebration_task2'], changedIndex: 1 }
  ];
  for (const { eventType, formKey, taskIds, changedIndex } of syncCases) {
    await check(eventType, 'in-memory', 'Shared-module checkbox state and initials propagated across two sessions.', async () => {
      const rtdb = new FakeRTDB();
      const first = buildSession({ eventId: `evt-${eventType}`, rtdb, taskIds });
      const second = buildSession({ eventId: `evt-${eventType}`, rtdb, taskIds });
      first.window.StaffFormSync.loadRealtimeChecklist(formKey);
      second.window.StaffFormSync.loadRealtimeChecklist(formKey);
      first.document.boxes[changedIndex].checked = true;
      await first.window.StaffFormSync.saveRealtimeChecklist(formKey);
      second.document.boxes.forEach((cb, index) => {
        assert.equal(cb.checked, index === changedIndex, `Unexpected checkbox state for ${taskIds[index]}`);
      });
      const meta = second.document.boxes[changedIndex]._row.querySelector('.task-meta');
      assert.ok(meta, 'Completion metadata should be attached to the task row');
      assert.match(meta.innerHTML, /class="task-initials">QA<\/span>/);
    });
  }

  await check('event-id-isolation', 'in-memory', 'Saving one event did not change another event with the same task ID.', async () => {
    const rtdb = new FakeRTDB();
    const first = buildSession({ eventId: 'evt-a', rtdb, taskIds: ['task1'] });
    const second = buildSession({ eventId: 'evt-b', rtdb, taskIds: ['task1'] });
    first.window.StaffFormSync.loadRealtimeChecklist('clearup');
    second.window.StaffFormSync.loadRealtimeChecklist('clearup');
    first.document.boxes[0].checked = true;
    await first.window.StaffFormSync.saveRealtimeChecklist('clearup');
    assert.equal(first.document.boxes[0].checked, true);
    assert.equal(second.document.boxes[0].checked, false);
  });

  await check('party', 'source', 'Party route declaration found.', () => {
    assert.match(readSource('public/index.html'), /FORM_ROUTES[\s\S]*\bparty\s*:\s*\{/,
      'No party entry found in FORM_ROUTES');
  });
  await check('baby-shower', 'source', 'Baby shower route declaration found.', () => {
    assert.match(readSource('public/index.html'), /FORM_ROUTES[\s\S]*['"]baby-shower['"]\s*:\s*\{/,
      'No baby-shower entry found in FORM_ROUTES');
  });
  await check('cross-event-isolation', 'source', 'Event ID generation includes the event type.', () => {
    assert.match(readSource('public/index.html'),
      /function makeEventId\(eventType,\s*couple,\s*date\)\s*\{[\s\S]*normalizeEventType\(eventType\)\s*\+\s*'-'\s*\+\s*couple\s*\+\s*'-'\s*\+\s*date/,
      'Event ID generation is not scoped by event type');
  });
  await check('wedding-feast-setup', 'source', 'Feast setup references the shared module and realtime loader.', () => {
    const html = readSource('public/feast/feast-flourish-setup.html');
    assert.ok(html.includes('form-shared.js') && html.includes('loadRealtimeChecklist'),
      'Feast setup is missing shared-module or realtime-loader references');
  });
  await check('celebration-global-wiring', 'source', 'All three Celebration pages expose Firestore and Realtime Database globals.', () => {
    const pages = [
      'public/celebration/celebration-setup.html',
      'public/celebration/celebration-during.html',
      'public/celebration/celebration-clear.html'
    ];
    for (const file of pages) {
      const html = readSource(file);
      assert.ok(html.includes('window.db = firebase.firestore();') && html.includes('window.rtdb = firebase.database();'),
        `${file} does not expose both database globals`);
    }
  });

  const failed = results.filter((result) => result.status === 'FAIL').length;
  const summary = `${results.length} checks: ${results.length - failed} passed, ${failed} failed.`;
  console.table(results.map((result) => ({ ...result, detail: result.detail.split('\n')[0] })));
  console.log(summary);

  const lines = [
    '# Realtime Checkbox Sync QA Report',
    '',
    'Generated by `node scripts/realtime-sync-test.js`.',
    `Run time (UTC): ${new Date().toISOString()}`,
    '',
    summary,
    '',
    'Scope: in-memory checks exercise the shared module directly; source checks inspect declarations only.',
    'This does not validate complete form behaviour, concurrent/offline edits, or live Firebase permissions.',
    ''
  ];
  for (const result of results) {
    lines.push(`- **${result.eventType}** (${result.kind}): ${result.status}`);
    if (result.status === 'FAIL') {
      lines.push('', ...result.detail.split('\n').map((line) => `    ${line}`), '');
    } else {
      lines.push(`  ${result.detail}`);
    }
  }
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
  console.log(`Report: ${REPORT_PATH}`);
  return failed;
}

if (require.main === module) {
  run().then((failed) => {
    process.exitCode = failed ? 1 : 0;
  }).catch((error) => {
    console.error('Realtime test runner failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { FakeRTDB, buildSession };

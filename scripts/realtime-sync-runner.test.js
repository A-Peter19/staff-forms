const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { FakeRTDB, buildSession } = require('./realtime-sync-test');

const repoRoot = path.resolve(__dirname, '..');

// Exercise the CLI against isolated copies so failure probes never edit real forms.
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'staff-forms-runner-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = [
    'scripts/realtime-sync-test.js',
    'public/js/form-shared.js',
    'public/index.html',
    'public/feast/feast-flourish-setup.html',
    'public/celebration/celebration-setup.html',
    'public/celebration/celebration-during.html',
    'public/celebration/celebration-clear.html'
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, file), path.join(root, file));
  }
  const cwd = path.join(root, 'unrelated-working-directory');
  fs.mkdirSync(cwd);
  return {
    root,
    report: path.join(root, 'qa/realtime-sync-report.md'),
    run() {
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/realtime-sync-test.js')], {
        cwd,
        encoding: 'utf8',
        timeout: 10000
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null, result.stderr);
      return result;
    }
  };
}

test('database reads use detached snapshots and once does not subscribe', async () => {
  const ref = new FakeRTDB().ref('events/example/setup');
  assert.equal((await ref.once('value')).val(), null);
  const updates = [];
  ref.on('value', (snapshot) => updates.push(snapshot.val()));
  const payload = { task1: { checked: true, initials: 'AB' } };
  await ref.set(payload);
  payload.task1.initials = 'changed outside the database';
  const snapshot = await ref.once('value');
  assert.equal(snapshot.val().task1.initials, 'AB');
  const value = snapshot.val();
  value.task1.checked = false;
  assert.equal((await ref.once('value')).val().task1.checked, true);
  await ref.set({ task1: { checked: false } });
  assert.equal(snapshot.val().task1.checked, true);
  assert.equal(updates.length, 3); // Initial state and two writes; once adds no listener.
  assert.equal(updates[1].task1.checked, true);
});

test('the fake task row retains the metadata node across incoming updates', async () => {
  const rtdb = new FakeRTDB();
  const session = buildSession({ eventId: 'metadata', rtdb, taskIds: ['task1'] });
  session.window.StaffFormSync.loadRealtimeChecklist('setup');
  const row = session.document.boxes[0]._row;
  const meta = row.querySelector('.task-meta');
  assert.ok(meta);
  await rtdb.ref('events/metadata/setup').set({ task1: { checked: true, initials: 'AB', time: '12:34' } });
  assert.equal(row.querySelector('.task-meta'), meta);
  assert.equal(meta.querySelector('.task-time').textContent, '12:34');
  await rtdb.ref('events/metadata/setup').set({});
  assert.equal(row.querySelector('.task-meta'), meta);
  assert.equal(meta.innerHTML, '');
});

test('CLI succeeds from another directory and creates its report directory', (t) => {
  const f = fixture(t);
  assert.equal(fs.existsSync(path.dirname(f.report)), false);
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = fs.readFileSync(f.report, 'utf8');
  assert.match(report, /9 checks: 9 passed, 0 failed\./);
  assert.match(report, /\*\*event-id-isolation\*\* \(in-memory\): PASS/);
  assert.match(report, /source checks inspect declarations only/);
  assert.equal(fs.existsSync(path.join(f.root, 'unrelated-working-directory/qa')), false);
});

test('a failed source check exits nonzero, replaces a stale report and continues', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.dirname(f.report));
  fs.writeFileSync(f.report, 'STALE REPORT');
  const page = path.join(f.root, 'public/feast/feast-flourish-setup.html');
  fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replaceAll('startSetupFormSync', 'removedRealtimeLoader'));
  const result = f.run();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = fs.readFileSync(f.report, 'utf8');
  assert.doesNotMatch(report, /STALE REPORT/);
  assert.match(report, /9 checks: 8 passed, 1 failed\./);
  assert.match(report, /\*\*wedding-feast-setup\*\* \(source\): FAIL/);
  assert.match(report, /\*\*celebration-global-wiring\*\* \(source\): PASS/);
});

test('broken checkbox propagation fails the behavioural checks without hiding source results', (t) => {
  const f = fixture(t);
  const modulePath = path.join(f.root, 'public/js/form-shared.js');
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.ok(source.includes('cb.checked = checked;'), 'Failure probe must disable remote checkbox hydration');
  fs.writeFileSync(modulePath, source.replace('cb.checked = checked;', 'cb.checked = false;'));
  const result = f.run();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = fs.readFileSync(f.report, 'utf8');
  assert.match(report, /9 checks: 5 passed, 4 failed\./);
  assert.match(report, /\*\*wedding\*\* \(in-memory\): FAIL/);
  assert.match(report, /\*\*celebration-global-wiring\*\* \(source\): PASS/);
});

test('a source read exception appears in the report and remaining checks run', (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, 'public/feast/feast-flourish-setup.html'));
  const result = f.run();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = fs.readFileSync(f.report, 'utf8');
  assert.match(report, /9 checks: 8 passed, 1 failed\./);
  assert.match(report, /ENOENT/);
  assert.match(report, /\*\*celebration-global-wiring\*\* \(source\): PASS/);
});

test('report creation failure makes the CLI fail even when its checks pass', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'qa'), 'A file blocks report directory creation');
  const result = f.run();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /9 checks: 9 passed, 0 failed\./);
  assert.match(result.stderr, /Realtime test runner failed:/);
});

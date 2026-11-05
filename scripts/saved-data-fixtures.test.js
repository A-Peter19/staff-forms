const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { listFixtures, loadFixture } = require('./fixtures/saved-data');
const { FakeRTDB, buildSession } = require('./realtime-sync-test');

const root = path.resolve(__dirname, '..');

test('catalog covers every form family and references valid source files and snapshots', () => {
  const definitions = listFixtures();
  const ids = definitions.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  const coverage = new Set(definitions.flatMap((entry) => entry.coverage));
  for (const required of ['celebration', 'evening-party', 'feast', 'flourish', 'foundation', 'twilight', 'wake',
    'nested-task-objects', 'nested-task-booleans', 'positional-task-id', 'legacy-firestore-checkboxes',
    'zero-value', 'random-custom-id', 'duplicate-custom-label', 'event-isolation', 'stage-isolation',
    'orphaned-rtdb', 'conflicting-time-aliases', 'overwritten-wake-data']) {
    assert.ok(coverage.has(required), `Missing fixture coverage: ${required}`);
  }
  for (const entry of definitions) {
    assert.match(entry.file, /^[a-z-]+\.json$/);
    const fixture = loadFixture(entry.id);
    assert.ok(fixture.firestore.events);
    assert.ok(fixture.realtimeDatabase.events);
    assert.ok(entry.migrationRequirements.length);
    for (const file of entry.sourceFiles) assert.ok(fs.existsSync(path.join(root, file)), file);
    for (const id of new Set([...Object.keys(fixture.firestore.events), ...Object.keys(fixture.realtimeDatabase.events)])) {
      assert.match(id, /^fixture-/); // Keep synthetic identifiers visibly distinct from customer records.
    }
  }
  const directory = path.join(__dirname, 'fixtures/saved-data');
  const snapshots = fs.readdirSync(directory).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
  assert.deepEqual(snapshots.sort(), definitions.map((entry) => entry.file).sort());
});

test('fixture loads are independent and unknown names are rejected', () => {
  const first = loadFixture('celebration');
  const before = loadFixture('celebration');
  first.firestore.events['fixture-celebration'].setup.staffMembers.push('Temporary test edit');
  first.definition.sharedModuleChecks.length = 0;
  assert.deepEqual(loadFixture('celebration'), before);
  assert.throws(() => loadFixture('../manifest'), /Unknown saved-data fixture/);
});

// These are current shared-module reads only. They do not claim legacy migration works.
for (const definition of listFixtures()) {
  for (const check of definition.sharedModuleChecks) {
    test(`shared checklist hydration: ${definition.id}/${check.eventId}/${check.stage}`, async () => {
      const fixture = loadFixture(definition.id);
      const state = fixture.realtimeDatabase.events[check.eventId][check.stage];
      const rtdb = new FakeRTDB();
      await rtdb.ref(`events/${check.eventId}/${check.stage}`).set(state);
      const session = buildSession({ eventId: check.eventId, rtdb, taskIds: check.taskIds });
      session.window.StaffFormSync.loadRealtimeChecklist(check.stage);
      session.document.boxes.forEach((cb, index) => {
        const expected = state[check.taskIds[index]];
        assert.equal(cb.checked, !!expected?.checked);
        const meta = cb._row.querySelector('.task-meta');
        assert.ok(meta);
        if (expected?.checked) {
          assert.ok(meta.innerHTML.includes(`>${expected.initials}</span>`));
          assert.equal(meta.querySelector('.task-time').textContent, expected.time);
        } else {
          assert.equal(meta.innerHTML, '');
        }
      });
    });
  }
}

test('editing a loaded event leaves the same task in another event and the fixture untouched', async () => {
  const fixture = loadFixture('event-isolation');
  const rtdb = new FakeRTDB();
  const sessions = [];
  for (const [eventId, stages] of Object.entries(fixture.realtimeDatabase.events)) {
    await rtdb.ref(`events/${eventId}/setup`).set(stages.setup);
    const session = buildSession({ eventId, rtdb, taskIds: ['wedding_setup_s1_0'] });
    session.window.StaffFormSync.loadRealtimeChecklist('setup');
    sessions.push(session);
  }
  sessions[0].document.boxes[0].checked = false;
  await sessions[0].window.StaffFormSync.saveRealtimeChecklist('setup');
  assert.equal(sessions[0].document.boxes[0].checked, false);
  assert.equal(sessions[1].document.boxes[0].checked, true);
  assert.deepEqual((await rtdb.ref('events/fixture-isolation-b/setup').once('value')).val(),
    fixture.realtimeDatabase.events['fixture-isolation-b'].setup);
  assert.deepEqual(fixture, loadFixture('event-isolation'));
});

test('Flourish notes and quantity strings hydrate and survive a save/reload, including zero', async () => {
  const eventId = 'fixture-flourish';
  const fixture = loadFixture('flourish');
  const data = fixture.realtimeDatabase.events[eventId];
  const rtdb = new FakeRTDB();
  for (const key of ['setup_notes', 'setup_quantities']) {
    await rtdb.ref(`events/${eventId}/${key}`).set(data[key]);
  }
  function open() {
    const session = buildSession({ eventId, rtdb, taskIds: [] });
    const notes = Object.keys(data.setup_notes).map((key) => ({ dataset: { noteKey: key }, value: '' }));
    const quantities = Object.keys(data.setup_quantities).map((key) => ({
      dataset: { qtyKey: key }, value: '', closest() { return null; }
    }));
    const original = session.document.querySelectorAll.bind(session.document);
    session.document.querySelectorAll = (selector) => {
      if (selector === '.notes-row textarea') return notes;
      if (selector.startsWith('.checklist-item .item-qty input')) return quantities;
      return original(selector);
    };
    session.window.StaffFormSync.loadRealtimeSectionNotes('setup');
    session.window.StaffFormSync.loadRealtimeItemQuantities('setup');
    return { session, notes, quantities };
  }
  const first = open();
  assert.deepEqual(first.quantities.map((field) => field.value), Object.values(data.setup_quantities));
  assert.equal(first.quantities[0].value, '0');
  first.notes[0].value = 'Synthetic multiline note\nCafé & "quotes" <literal text>';
  await first.session.window.StaffFormSync.saveRealtimeSectionNotes('setup');
  await first.session.window.StaffFormSync.saveRealtimeItemQuantities('setup');
  const reopened = open();
  assert.equal(reopened.notes[0].value, first.notes[0].value);
  assert.deepEqual(reopened.quantities.map((field) => field.value), Object.values(data.setup_quantities));
});

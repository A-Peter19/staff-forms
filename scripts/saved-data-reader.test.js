const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readEvent } = require('../public/js/saved-data-reader');
const { listFixtures, loadFixture } = require('./fixtures/saved-data');
const read = (name, eventId, mappings) => readEvent({ ...loadFixture(name), eventId, mappings });

for (const entry of listFixtures()) {
  test(`preserves both raw records without modifying fixture: ${entry.id}`, () => {
    const fixture = loadFixture(entry.id);
    for (const eventId of new Set([...Object.keys(fixture.firestore.events), ...Object.keys(fixture.realtimeDatabase.events)])) {
      const result = readEvent({ ...fixture, eventId });
      assert.deepEqual(result.raw.firestore, fixture.firestore.events[eventId] ?? null);
      assert.deepEqual(result.raw.realtimeDatabase, fixture.realtimeDatabase.events[eventId] ?? null);
      if (result.raw.firestore) result.raw.firestore.changed = true;
    }
    assert.deepEqual(fixture, loadFixture(entry.id));
  });
}

test('reads current task state, stage staff and notes with source attribution', () => {
  const r = read('celebration', 'fixture-celebration');
  assert.deepEqual(r.stages.setup.tasks.setup_s1_0.value, { checked: true, initials: 'FX', time: '12:34' });
  assert.equal(r.stages.setup.staff.teamLeader.value, 'Fixture Setup Lead');
  assert.equal(r.stages.during.staff.teamLeader.value, 'Fixture During Lead');
  assert.match(r.stages.setup.notes.section_s1.value, /\nKeep both lines/);
  assert.equal(r.stages.setup.unresolved.length, 2); // cb_0 and random custom key.
  assert.ok(r.issues.some((issue) => issue.code === 'custom-task-needs-id'));
});

test('explicit task mapping reveals conflicting stores without choosing a winner', () => {
  const r = read('celebration', 'fixture-celebration', { setup: { tasks: { cb_0: 'setup_s1_0' } } });
  const field = r.stages.setup.tasks.setup_s1_0;
  assert.equal(field.status, 'conflict');
  assert.equal(Object.hasOwn(field, 'value'), false);
  assert.equal(field.candidates.length, 2);
});

test('interprets positional Twilight records only with supplied historical mappings', () => {
  const before = read('twilight', 'fixture-twilight');
  assert.equal(Object.keys(before.stages.during.tasks).length, 0);
  const r = read('twilight', 'fixture-twilight', { during: {
    tasks: { cb_0: 'during_s1_0', cb_2: 'during_s1_2' },
    notes: { ta_0: 'section_s1', ta_1: 'section_s2' }
  } });
  assert.equal(r.stages.during.tasks.during_s1_0.value.initials, 'TD');
  assert.equal(r.stages.during.notes.section_s2.value, '');
  assert.equal(r.stages.clearup.fields.finalNotes.value, 'Synthetic close-down');
  assert.equal(r.shared.barTime.value, '18:30');
});

test('reads nested Wake booleans without inventing actor/time or merging stage staff', () => {
  const r = read('wake-nested', 'fixture-wake', {
    setup: { tasks: { 'hall-buffet-1': 'hall-buffet-1' } },
    during: { tasks: { 'bar-bar-1': 'bar-bar-1' } }
  });
  assert.equal(r.stages.setup.tasks['hall-buffet-1'].value.initials, 'WS');
  assert.deepEqual(r.stages.during.tasks['bar-bar-1'].value, { checked: true, initials: null, time: null });
  assert.deepEqual(r.stages.during.staff.staffMembers.value, ['Fixture During Staff']);
  assert.deepEqual(r.stages.clearup.staff.staffMembers.value, ['Fixture Clear Staff']);
  assert.deepEqual(read('wake-overwritten', 'fixture-wake-overwritten').stages.during.staff, {});
});

test('preserves zero quantity strings and maps known event-prefix aliases', () => {
  const r = read('flourish', 'fixture-flourish');
  assert.equal(r.stages.setup.quantities.setup_s3_0__field_0.value, '0');
  assert.equal(r.stages.setup.quantities.setup_s5_0__field_1.value, 'Fishbowl');
  assert.equal(read('foundation', 'fixture-foundation').stages.during.tasks.during_s1_0.value.initials, 'FL');
});

test('recognizes event-level aliases but flags conflicting times and ambiguous custom tasks', () => {
  assert.equal(read('evening-party', 'fixture-evening-party').shared.guests.value, 80);
  assert.equal(read('feast', 'fixture-feast').shared.accessTime.value, '13:45');
  const r = read('ambiguous-custom-tasks', 'fixture-ambiguous');
  assert.equal(r.shared.barTime.status, 'conflict');
  assert.deepEqual(r.shared.barTime.candidates.map((c) => c.value), ['18:00', '17:00']);
  assert.equal(r.stages.setup.unresolved.length, 2);
  assert.equal(r.issues.filter((i) => i.code === 'custom-task-needs-id').length, 2);
});

test('event selection, missing events and sparse records cannot leak or fabricate state', () => {
  assert.equal(read('event-isolation', 'fixture-isolation-a').stages.setup.tasks.setup_s1_0.value.initials, 'AA');
  assert.equal(read('event-isolation', 'fixture-isolation-b').stages.setup.tasks.setup_s1_0.value.initials, 'BB');
  const r = read('sparse-and-orphaned', 'fixture-orphan');
  assert.equal(r.exists, false);
  assert.equal(r.raw.firestore, null);
  assert.ok(r.issues.some((i) => i.code === 'missing-event'));
  assert.deepEqual(read('sparse-and-orphaned', 'fixture-new').stages.setup.staff, {});
  assert.throws(() => read('celebration', ''), /event ID/);
});

test('malformed records remain available for review rather than becoming completed tasks', () => {
  const r = readEvent({ eventId: 'bad', firestore: { events: { bad: 'invalid' } },
    realtimeDatabase: { events: { bad: { setup: { task: { checked: 'yes' } } } } } });
  assert.equal(r.exists, false);
  assert.equal(r.stages.setup.unresolved[0].value.checked, 'yes');
  assert.ok(r.issues.some((i) => i.code === 'invalid-task'));
});

test('an old Firestore tick cannot resurrect a task missing from an existing realtime map', () => {
  const r = readEvent({ eventId: 'legacy', firestore: { events: { legacy: {
    setup: { checkboxes: { cb_0: true } }
  } } }, realtimeDatabase: { events: { legacy: { setup: {} } } },
  mappings: { setup: { tasks: { cb_0: 'setup_s1_0' } } } });
  assert.equal(r.stages.setup.tasks.setup_s1_0.status, 'unresolved');
  assert.equal(Object.hasOwn(r.stages.setup.tasks.setup_s1_0, 'value'), false);
});

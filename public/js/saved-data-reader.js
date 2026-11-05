(function (root) {
  'use strict';
  const stages = ['setup', 'during', 'clearup'];
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const copy = (value) => JSON.parse(JSON.stringify(value));

  // Pure interpretation of JSON snapshots. No database access or writes.
  function readEvent({ eventId, firestore, realtimeDatabase, mappings = {} }) {
    if (typeof eventId !== 'string' || !eventId.trim()) throw new TypeError('An event ID is required');
    const select = (store) => record(store?.events) && own(store.events, eventId) ? store.events[eventId] : null;
    const rawEvent = select(firestore);
    const rawRealtime = select(realtimeDatabase);
    const event = record(rawEvent) ? rawEvent : {};
    const realtime = record(rawRealtime) ? rawRealtime : {};
    const result = {
      eventId, exists: record(rawEvent),
      raw: { firestore: copy(rawEvent), realtimeDatabase: copy(rawRealtime) },
      shared: {}, stages: {}, issues: []
    };
    const issue = (code, source) => result.issues.push({ code, source });
    if (!result.exists) issue('missing-event', `firestore.events.${eventId}`);
    if (rawEvent !== null && !record(rawEvent)) issue('invalid-event', 'firestore');
    if (rawRealtime !== null && !record(rawRealtime)) issue('invalid-realtime-data', 'realtimeDatabase');

    // Each field retains all source candidates; disagreements have no chosen value.
    function add(target, key, value, source) {
      if (!own(target, key)) Object.defineProperty(target, key, {
        value: { status: 'resolved', candidates: [] }, enumerable: true
      });
      target[key].candidates.push({ source, value: copy(value) });
    }
    function readFields(source, target, keys, prefix) {
      for (const key of keys) if (own(source, key)) add(target, key, source[key], `${prefix}.${key}`);
    }
    function shared(source, prefix) {
      const aliases = { guests: 'guests', accessTime: 'accessTime', feastSetupHallAccessTime: 'accessTime',
        barTime: 'barTime', barOpen: 'barTime', barClose: 'barClose', tableStyle: 'tableStyle',
        sash: 'sash', runner: 'runner' };
      for (const [key, canonical] of Object.entries(aliases)) {
        if (!own(source, key)) continue;
        let value = source[key];
        if (canonical === 'guests' && typeof value === 'string' && /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value))) {
          value = Number(value);
        }
        add(result.shared, canonical, value, `${prefix}.${key}`);
      }
    }
    shared(event, 'firestore');
    for (const stage of stages) {
      const saved = record(event[stage]) ? event[stage] : {};
      const live = record(realtime[stage]) ? realtime[stage] : {};
      const out = result.stages[stage] = { tasks: {}, notes: {}, quantities: {}, staff: {}, fields: {}, unresolved: [] };
      const map = record(mappings[stage]) ? mappings[stage] : {};
      function identity(key, kind, source) {
        const explicit = record(map[kind]) && own(map[kind], key) ? map[kind][key] : null;
        if (typeof explicit === 'string' && explicit) return explicit;
        if (kind === 'tasks') {
          const type = typeof event.eventType === 'string' ? event.eventType : 'wedding';
          const base = key.startsWith(type + '_') ? key.slice(type.length + 1) : key;
          if (base.startsWith(stage + '_s') && new RegExp('^' + stage + '_s\\d+_\\d+$').test(base)) {
            // s0 IDs are assigned to Wake rows without a section; their identity needs evidence.
            if (!base.startsWith(stage + '_s0_')) return base;
          }
        } else if (kind === 'notes' && /^section_.+/.test(key)) return key;
        issue('unmapped-' + kind, source);
        return null;
      }
      function taskEntries(values, metadata, prefix) {
        if (!record(values)) return;
        for (const [key, raw] of Object.entries(values)) {
          const source = `${prefix}.${key}`;
          let value;
          if (typeof raw === 'boolean') {
            const meta = record(metadata?.[key]) ? metadata[key] : {};
            value = { checked: raw, initials: meta.initials ?? null, time: meta.time ?? null };
          } else if (record(raw) && typeof raw.checked === 'boolean') {
            value = { checked: raw.checked, initials: raw.initials ?? null, time: raw.time ?? null };
          } else {
            issue('invalid-task', source);
            out.unresolved.push({ kind: 'tasks', key, source, value: copy(raw) });
            continue;
          }
          const id = identity(key, 'tasks', source);
          if (id) add(out.tasks, id, value, source);
          else out.unresolved.push({ kind: 'tasks', key, source, value: copy(raw) });
        }
      }
      taskEntries(saved.checkboxes, saved.initialsData, `firestore.${stage}.checkboxes`);
      if (own(live, 'tasks')) {
        taskEntries(live.tasks, null, `realtime.${stage}.tasks`);
        if (!record(live.tasks)) issue('invalid-task-map', `realtime.${stage}.tasks`);
      }
      // Also retain any flat records alongside a legacy envelope.
      const flat = Object.fromEntries(Object.entries(live).filter(([key]) =>
        !['tasks', 'guests', 'teamLeader', 'staffNames', 'timestamp'].includes(key)));
      taskEntries(flat, null, `realtime.${stage}`);
      for (const [values, prefix] of [[saved.sectionNotes, `firestore.${stage}.sectionNotes`],
        [realtime[stage + '_notes'], `realtime.${stage}_notes`]]) {
        if (!record(values)) continue;
        for (const [key, value] of Object.entries(values)) {
          const source = `${prefix}.${key}`;
          const id = identity(key, 'notes', source);
          if (id && typeof value === 'string') add(out.notes, id, value, source);
          else {
            out.unresolved.push({ kind: 'notes', key, source, value: copy(value) });
            if (typeof value !== 'string') issue('invalid-note', source);
          }
        }
      }
      const quantities = realtime[stage + '_quantities'];
      if (record(quantities)) for (const [key, value] of Object.entries(quantities)) {
        const source = `realtime.${stage}_quantities.${key}`;
        const split = key.lastIndexOf('__');
        const taskId = split > 0 ? identity(key.slice(0, split), 'tasks', source) : null;
        if (taskId && split < key.length - 2) add(out.quantities, taskId + key.slice(split), value, source);
        else {
          issue('unmapped-quantities', source);
          out.unresolved.push({ kind: 'quantities', key, source, value: copy(value) });
        }
      }
      readFields(saved, out.staff, ['teamLeader', 'staffMembers'], `firestore.${stage}`);
      readFields(live, out.staff, ['teamLeader'], `realtime.${stage}`);
      if (own(live, 'staffNames')) add(out.staff, 'staffMembers', live.staffNames, `realtime.${stage}.staffNames`);
      readFields(saved, out.fields, ['finalNotes'], `firestore.${stage}`);
      shared(saved, `firestore.${stage}`);
      shared(live, `realtime.${stage}`);
    }
    for (const [index, task] of (Array.isArray(event.customTasks) ? event.customTasks : []).entries()) {
      if (!record(task) || typeof task.id !== 'string' || !task.id) issue('custom-task-needs-id', `firestore.customTasks.${index}`);
    }
    const groups = [result.shared, ...Object.values(result.stages).flatMap((stage) =>
      [stage.tasks, stage.notes, stage.quantities, stage.staff, stage.fields])];
    for (const group of groups) for (const field of Object.values(group)) {
      const [first, ...rest] = field.candidates;
      if (rest.some((candidate) => JSON.stringify(candidate.value) !== JSON.stringify(first.value))) {
        field.status = 'conflict';
        issue('conflicting-values', field.candidates.map((candidate) => candidate.source).join(', '));
      } else field.value = copy(first.value);
    }
    // A missing RTDB task can mean an untick. Do not revive an older Firestore tick.
    for (const stage of stages) if (own(realtime, stage)) {
      for (const field of Object.values(result.stages[stage].tasks)) {
        if (field.candidates.every((candidate) => candidate.source.startsWith('firestore.'))) {
          field.status = 'unresolved';
          delete field.value;
          issue('legacy-task-without-realtime-match', field.candidates[0].source);
        }
      }
    }
    return result;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { readEvent };
  else root.StaffSavedData = { readEvent };
})(typeof window === 'undefined' ? globalThis : window);

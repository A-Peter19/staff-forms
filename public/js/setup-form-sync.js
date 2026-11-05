// Opt-in stage controller. Existing form families can provide compatibility adapters.
(function (global) {
  'use strict';
  global.startSetupFormSync = function () { return global.startStageFormSync(); };
  global.startStageFormSync = function (options = {}) {
    const stage = options.stage || 'setup';
    const sync = global.StaffFormSync;
    const eventId = sync.getEventId();
    const controls = () => [...document.querySelectorAll('input, select, textarea, .js-add-staff, .js-remove-staff, #btn-reset, .guest-btn')];
    const banner = document.createElement('div');
    banner.className = 'staff-banner';
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    banner.appendChild(message);
    document.querySelector('header, .header').after(banner);
    const initials = document.createElement('input');
    initials.placeholder = 'Your initials';
    initials.maxLength = 8;
    initials.setAttribute('aria-label', 'Your initials for completed tasks');
    initials.value = localStorage.getItem('staffInitials') || '';
    global.staffInitials = initials.value;
    initials.addEventListener('input', () => {
      global.staffInitials = initials.value.trim().toUpperCase();
      localStorage.setItem('staffInitials', global.staffInitials);
    });
    banner.appendChild(initials);
    let ready = false, eventLoaded = false, checklistLoaded = false, notesLoaded = false, quantitiesLoaded = false;
    let checklist = {}, latestEvent = {};
    const pendingTasks = new Map(), dirty = new Map(), timers = new Map();
    const statuses = new Map();
    function status(field, text, retry) {
      field.dataset.unsaved = dirty.has(field) ? 'true' : 'false';
      let node = statuses.get(field);
      if (!node) {
        node = document.createElement('span');
        node.setAttribute('role', 'status');
        field.after(node);
        statuses.set(field, node);
      }
      node.textContent = text;
      if (retry) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = 'Retry';
        button.addEventListener('click', retry); node.appendChild(button);
      }
    }
    function lock(text) {
      ready = false; controls().forEach(field => { field.disabled = true; });
      message.textContent = text;
    }
    function enable() {
      if (!eventLoaded || !checklistLoaded || !notesLoaded || !quantitiesLoaded) return;
      ready = true;
      controls().forEach(field => { field.disabled = false; });
      document.querySelectorAll('#meta-guests, #meta-day, [data-conflict="true"]').forEach(field => { field.disabled = true; });
      message.textContent = 'Changes save automatically. Enter your initials before ticking tasks.';
    }
    lock('Loading saved form…');
    if (!eventId) { lock('Open an event from the dashboard to use this form.'); return; }
    const eventRef = global.db.collection('events').doc(eventId);
    const taskRef = global.rtdb.ref('events/' + eventId + '/' + stage);
    sync.assignMissingTaskIds(stage);
    const baseRows = [...document.querySelectorAll('.checklist-item')];
    baseRows.forEach(row => { row.dataset.baseTaskId = row.dataset.taskId; });
    const boxes = () => [...document.querySelectorAll('.checklist-item input[type="checkbox"]')];
    function paintTasks() {
      boxes().forEach(cb => {
        const key = cb.closest('.checklist-item').dataset.taskId;
        const value = pendingTasks.has(key) ? pendingTasks.get(key).value :
          (options.readTask ? options.readTask(checklist, cb) : checklist[key]);
        cb.checked = !!(value && value.checked);
        const row = cb.closest('.checklist-item');
        row.classList.toggle('done', cb.checked);
        row.classList.toggle('completed', cb.checked);
        let meta = row.querySelector('.task-meta');
        if (!meta) { meta = document.createElement('div'); meta.className = 'task-meta'; row.appendChild(meta); }
        meta.textContent = cb.checked ? [value.initials, value.time].filter(Boolean).join(' · ') : '';
        cb.dataset.conflict = value && value.conflict ? 'true' : 'false';
        cb.disabled = !ready || cb.dataset.conflict === 'true';
        if (value && value.conflict) {
          meta.textContent = 'Saved records disagree. Choose the correct value: ';
          value.candidates.forEach((candidate, index) => {
            const button = document.createElement('button'); button.type = 'button';
            button.textContent = (index ? 'Legacy record: ' : 'Flat record: ') + (candidate.checked ? 'complete' : 'incomplete');
            button.addEventListener('click', () => { if (ready) writeTask(cb, candidate); });
            meta.appendChild(button);
          });
        }
      });
      global.updateProgress();
    }
    function writeTask(cb, value) {
      if (value === null && options.preserveLegacy) value = { checked: false };
      const key = cb.closest('.checklist-item').dataset.taskId;
      const edit = { value };
      pendingTasks.set(key, edit); paintTasks(); status(cb, 'Saving…');
      taskRef.update({ [key]: value }).then(() => {
        if (pendingTasks.get(key) !== edit) return;
        pendingTasks.delete(key); status(cb, 'Saved'); paintTasks();
      }).catch(() => {
        if (pendingTasks.get(key) === edit) status(cb, 'Not saved. ', () => writeTask(cb, edit.value));
      });
    }
    document.addEventListener('change', event => {
      const cb = event.target;
      if (!cb.matches('.checklist-item input[type="checkbox"]') || !ready) return;
      if (cb.checked && !global.staffInitials.trim()) {
        cb.checked = false; initials.focus(); message.textContent = 'Enter your initials before ticking a task.'; return;
      }
      writeTask(cb, cb.checked ? { checked: true, initials: global.staffInitials,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } : null);
    });
    global.resetAll = function () {
      if (!ready || !confirm('Reset visible checkboxes? This cannot be undone.')) return;
      boxes().filter(cb => !cb.closest('.checklist-item').hidden).forEach(cb => writeTask(cb, null));
    };
    // Legacy tasks without IDs use a deterministic content key; never guess old random IDs.
    function customKey(task, occurrence) {
      return 'custom_' + global.customTaskId(task, occurrence);
    }
    function renderTasks(ev) {
      const type = ev.eventType || 'wedding';
      baseRows.forEach(row => { row.dataset.taskId = options.unscopedTasks ? row.dataset.baseTaskId : type + '_' + row.dataset.baseTaskId; });
      const wanted = new Set(), seen = new Map();
      (ev.customTasks || []).filter(t => t.form === stage).forEach(task => {
        const signature = JSON.stringify([task.form, task.section, task.label]);
        const occurrence = seen.get(signature) || 0; seen.set(signature, occurrence + 1);
        const key = customKey(task, occurrence); wanted.add(key);
        let row = [...document.querySelectorAll('.custom-task')].find(r => r.dataset.taskId === key);
        if (!row) {
          const anchor = baseRows.find(r => r.dataset.section === task.section);
          if (!anchor) return;
          row = document.createElement('div'); row.className = options.wake ? 'task checklist-item custom-task' : 'checklist-item custom-task';
          row.dataset.section = task.section; row.dataset.taskId = key;
          row.innerHTML = '<input type="checkbox"><div class="item-content"><div class="item-label"></div></div>';
          const body = anchor.closest('.section').querySelector('.section-body, .section-content');
          if (options.wake) {
            row.querySelector('.item-content').classList.add('task-content');
            row.querySelector('.item-label').classList.add('task-title');
          }
          body.insertBefore(row, body.querySelector('.notes-row'));
        }
        row.querySelector('.item-label').textContent = task.label;
      });
      document.querySelectorAll('.custom-task').forEach(row => { if (!wanted.has(row.dataset.taskId)) row.remove(); });
      const hidden = new Set(ev.hiddenTasks || []);
      document.querySelectorAll('.checklist-item').forEach(row => {
        row.hidden = hidden.has(row.dataset.taskId) || hidden.has(row.dataset.baseTaskId) || hidden.has(type + '_' + row.dataset.baseTaskId);
        row.style.display = row.hidden ? 'none' : '';
      });
      paintTasks();
    }
    function staffEntries(ev) {
      if (ev[stage] && ev[stage].staffEntries) return ev[stage].staffEntries;
      const names = Object.hasOwn(ev[stage] || {}, 'staffMembers') ? ev[stage].staffMembers :
        (options.preserveLegacy && Array.isArray(checklist.staffNames) ? checklist.staffNames : []);
      return Object.fromEntries((names || []).map((name, i) => ['legacy_' + i, name]));
    }
    function renderStaff(ev) {
      const entries = staffEntries(ev);
      const list = document.getElementById('staff-list');
      [...list.children].forEach(row => {
        const input = row.querySelector('input');
        if (!Object.hasOwn(entries, row.dataset.staffId) && !dirty.has(input)) row.remove();
      });
      Object.entries(entries).forEach(([id, name]) => {
        let row = [...list.children].find(r => r.dataset.staffId === id);
        if (!row) { global.addStaffMember(name, id); row = list.lastElementChild; }
        const input = row.querySelector('input');
        if (!dirty.has(input)) input.value = name;
      });
      global.updateStaffBadge();
    }
    function writeField(field, operation) {
      const edit = {};
      dirty.set(field, edit); status(field, 'Saving…');
      operation().then(() => {
        if (dirty.get(field) !== edit) return;
        dirty.delete(field); status(field, 'Saved');
      }).catch(() => { if (dirty.get(field) === edit) status(field, 'Not saved. ', () => writeField(field, operation)); });
    }
    function saveStaff(input, remove) {
      const id = input.parentElement.dataset.staffId;
      const value = input.value;
      writeField(input, () => global.db.runTransaction(async transaction => {
        const snap = await transaction.get(eventRef);
        if (!snap.exists) throw new Error('Event missing');
        const entries = { ...staffEntries(snap.data()) };
        if (remove) delete entries[id]; else entries[id] = value;
        transaction.update(eventRef, { [stage + '.staffEntries']: entries,
          [stage + '.staffMembers']: Object.values(entries).filter(Boolean) });
      }).then(() => { if (remove) input.parentElement.remove(); global.updateStaffBadge(); }));
    }
    // Hall access is an event detail, separate from the checklist tick.
    if (/\/feast\/feast-flourish-setup\.html$/.test(global.location.pathname)) {
      const label = baseRows[0].querySelector('.item-label');
      label.textContent = 'Main Hall unlocked and accessible from ';
      const field = document.createElement('input');
      field.type = 'time'; field.id = 'feast-hall-access-time'; field.required = true;
      field.setAttribute('aria-label', 'Main Hall access time');
      label.appendChild(field);
    }
    const metadata = { ...options.metadata, 'feast-hall-access-time': 'feastSetupHallAccessTime', 'team-leader': stage + '.teamLeader', 'meta-catering': 'catering', 'meta-sash': 'sash', 'meta-runner': 'runner' };
    function queue(field, save) {
      dirty.set(field, {}); status(field, 'Unsaved…'); clearTimeout(timers.get(field));
      timers.set(field, setTimeout(() => { timers.delete(field); save(); }, 250));
    }
    document.addEventListener('input', event => {
      if (!ready) return;
      const field = event.target;
      if (field.matches('.staff-input')) queue(field, () => saveStaff(field, false));
      else if (metadata[field.id]) {
        if (!field.checkValidity()) {
          clearTimeout(timers.get(field)); timers.delete(field);
          dirty.set(field, {}); status(field, 'Enter a valid value.'); return;
        }
        queue(field, () => {
          const value = field.value;
          writeField(field, () => eventRef.update({ [metadata[field.id]]: value }));
        });
      }
    });
    document.addEventListener('click', event => {
      const button = event.target.closest('.js-remove-staff');
      if (!button || !ready) return;
      const input = button.parentElement.querySelector('input');
      clearTimeout(timers.get(input)); timers.delete(input); saveStaff(input, true);
    });
    global.addEventListener('beforeunload', event => {
      if (dirty.size || pendingTasks.size || document.querySelector('[data-unsaved="true"]')) {
        event.preventDefault(); event.returnValue = '';
      }
    });
    if (options.bindDetails) options.bindDetails((field, key, value) => {
      if (ready) writeField(field, () => eventRef.update({ [key]: value }));
    });
    let notesStarted = false;
    function renderEvent() {
      document.querySelectorAll('#meta-guests, #meta-day').forEach(field => { field.value = ''; });
      sync.applyEventSummary(latestEvent);
      renderTasks(latestEvent); renderStaff(latestEvent);
      Object.entries(metadata).forEach(([id, key]) => {
        const field = document.getElementById(id);
        let value = key === stage + '.teamLeader' ?
          (Object.hasOwn(latestEvent[stage] || {}, 'teamLeader') ? latestEvent[stage].teamLeader :
            (options.preserveLegacy ? checklist.teamLeader : '')) : key.split('.').reduce((value, part) => value == null ? undefined : value[part], latestEvent);
        if (value === undefined && options.metadataFallbacks && options.metadataFallbacks[key]) {
          for (const path of options.metadataFallbacks[key]) {
            value = path.split('.').reduce((record, part) => record == null ? undefined : record[part], latestEvent);
            if (value !== undefined) break;
          }
        }
        if (field && !dirty.has(field)) {
          const next = value == null ? (id === 'feast-hall-access-time' ? '13:00' : '') : String(value);
          if (field.tagName === 'SELECT' && next && !Array.from(field.options).some(option => option.value === next)) {
            const option = document.createElement('option'); option.value = next; option.textContent = next; field.appendChild(option);
          }
          field.value = next;
        }
      });
      if (options.renderDetails) options.renderDetails(latestEvent, checklist, (cb, value) => { if (ready) writeTask(cb, value); });
    }
    eventRef.onSnapshot(snap => {
      if (!snap.exists) { eventLoaded = false; lock('Event not found. Return to the dashboard.'); return; }
      latestEvent = snap.data();
      eventLoaded = true;
      renderEvent();
      if (!notesStarted) {
        notesStarted = true;
        if (options.notesInFirestore) notesLoaded = true;
        else {
        sync.loadRealtimeSectionNotes(stage, () => { notesLoaded = true; enable(); },
          () => { notesLoaded = false; lock('Could not load notes. Reload to reconnect.'); });
        sync.bindRealtimeSectionNotesSync(stage);
        }
        sync.loadRealtimeItemQuantities(stage, () => { quantitiesLoaded = true; enable(); },
          () => { quantitiesLoaded = false; lock('Could not load details. Reload to reconnect.'); });
        sync.bindRealtimeItemQuantitiesSync(stage);
      }
      enable();
    }, () => { eventLoaded = false; lock('Could not load event details. Reload to reconnect.'); });
    taskRef.on('value', snap => { checklist = snap.val() || {}; checklistLoaded = true; if (eventLoaded) renderEvent(); else paintTasks(); enable(); },
      () => { checklistLoaded = false; lock('Could not load checklist. Reload to reconnect.'); });
  };
})(window);

(function (global) {
  function getEventId() {
    return new URLSearchParams(window.location.search).get('event');
  }

  function readTaskKey(cb, index) {
    var row = cb.closest('.checklist-item, .task');
    if (row && row.dataset && row.dataset.taskId) return row.dataset.taskId;
    if (cb.dataset && cb.dataset.taskId) return cb.dataset.taskId;
    if (cb.dataset && cb.dataset.section && cb.dataset.task) return cb.dataset.section + '-' + cb.dataset.task;
    return 'cb_' + index;
  }

  function ensureMetaNode(cb) {
    var row = cb.closest('.checklist-item, .task');
    if (!row) return null;
    var holder = row.querySelector('.item-content, .task-content') || row;
    var meta = row.querySelector('.task-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'task-meta';
      holder.appendChild(meta);
    }
    return meta;
  }


  function assignMissingTaskIds(formKey) {
    var sectionCounters = {};
    document.querySelectorAll('.checklist-item, .task').forEach(function (row) {
      if (row.dataset && row.dataset.taskId) return;
      var section = (row.dataset && row.dataset.section) || 's0';
      var counter = sectionCounters[section] || 0;
      sectionCounters[section] = counter + 1;
      var generatedId = (formKey || 'form') + '_' + section + '_' + counter;
      row.setAttribute('data-task-id', generatedId);
      var cb = row.querySelector('input[type="checkbox"]');
      if (cb && cb.dataset && !cb.dataset.taskId) cb.dataset.taskId = generatedId;
    });
  }

  function bindCheckboxMeta() {
    document.querySelectorAll('.checklist-item input[type="checkbox"], .task input[type="checkbox"]').forEach(function (cb) {
      if (cb.dataset.metaBound === '1') return;
      cb.dataset.metaBound = '1';
      cb.addEventListener('change', function () {
        var meta = ensureMetaNode(cb);
        var row = cb.closest('.checklist-item, .task');
        if (row) {
          row.classList.toggle('done', cb.checked);
          row.classList.toggle('completed', cb.checked);
        }
        if (!meta) return;
        if (cb.checked) {
          var initials = (global.staffInitials || localStorage.getItem('staffInitials') || '?').toUpperCase();
          var time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          meta.innerHTML = '<span class="task-initials">' + initials + '</span><span class="task-time">' + time + '</span>';
        } else {
          meta.innerHTML = '';
        }
      });
    });
  }

  function setFieldValue(field, value) {
    if (!field || value === undefined || value === null || value === '') return;
    var textValue = String(value);
    if (field.tagName && field.tagName.toLowerCase() === 'select') {
      var hasOption = Array.from(field.options || []).some(function (option) { return option.value === textValue; });
      if (!hasOption) {
        var option = document.createElement('option');
        option.value = textValue;
        option.textContent = textValue;
        field.appendChild(option);
      }
    }
    field.value = textValue;
  }

  function formatGuestCount(guests) {
    if (guests === undefined || guests === null || guests === '') return '';
    var count = Number(guests);
    var guestText = Number.isFinite(count) ? String(count) : String(guests);
    return guestText + ' guest' + (guestText === '1' ? '' : 's');
  }

  function parseLocalDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    var parts = dateString.split('-').map(function (part) { return Number(part); });
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatEventDate(dateString) {
    var date = parseLocalDate(dateString);
    return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  function formatEventDay(dateString) {
    var date = parseLocalDate(dateString);
    return date ? date.toLocaleDateString('en-GB', { weekday: 'long' }) : '';
  }

  function readEventDay(ev) {
    if (!ev) return '';
    return formatEventDay(ev.date) || ev.dayOfWeek || ev.day || '';
  }

  function applyEventSummary(ev) {
    if (!ev) return;
    var headerSub = document.getElementById('header-sub') || document.querySelector('header p');
    var title = ev.displayName || ev.coupleOrHost || ev.couple || ev.host || ev.name || '';
    if (headerSub && title) {
      var dateFmt = formatEventDate(ev.date);
      var parts = [title];
      if (dateFmt) parts.push(dateFmt);
      var guestText = formatGuestCount(ev.guests);
      if (guestText) parts.push(guestText);
      headerSub.textContent = parts.join('  ·  ');
    }
    setFieldValue(document.getElementById('meta-guests'), ev.guests);
    setFieldValue(document.getElementById('meta-day'), readEventDay(ev));
  }

  function loadEventMetaAndApplyHiddenTasks(formKey) {
    assignMissingTaskIds(formKey);
    var eventId = getEventId();
    if (!eventId || !global.db || !global.db.collection) return Promise.resolve(null);
    return global.db.collection('events').doc(eventId).get().then(function (snap) {
      if (!snap.exists) return null;
      var ev = snap.data();
      var eventType = ev.eventType || 'wedding';

      document.querySelectorAll('.checklist-item[data-task-id]').forEach(function (row) {
        var baseTaskId = row.getAttribute('data-base-task-id') || row.getAttribute('data-task-id');
        row.setAttribute('data-base-task-id', baseTaskId);
        row.setAttribute('data-task-id', eventType + '_' + baseTaskId);
      });

      (ev.hiddenTasks || []).forEach(function (tid) {
        var scoped = tid.indexOf(eventType + '_') === 0 ? tid : eventType + '_' + tid;
        var el = document.querySelector('[data-task-id="' + scoped + '"]');
        if (el) el.style.display = 'none';
      });

      applyEventSummary(ev);

      if (ev[formKey]) {
        if (ev[formKey].teamLeader && document.getElementById('team-leader')) {
          document.getElementById('team-leader').value = ev[formKey].teamLeader;
        }
        if (Array.isArray(ev[formKey].staffMembers) && document.getElementById('staff-list') && typeof global.addStaffMember === 'function') {
          document.getElementById('staff-list').innerHTML = '';
          ev[formKey].staffMembers.forEach(function (n) { global.addStaffMember(n); });
        }
      }

      return ev;
    });
  }

  function injectCustomTasks(formKey, ev) {
    if (!ev) return;
    var customTasks = (ev.customTasks || []).filter(function (t) { return t.form === formKey; });
    customTasks.forEach(function (task) {
      document.querySelectorAll('.section-body, .section-content').forEach(function (body) {
        var anchor = body.querySelector('.checklist-item[data-section="' + task.section + '"], .task input[data-section="' + task.section + '"]');
        if (!anchor) return;
        var item = document.createElement('div');
        item.className = 'checklist-item custom-task';
        item.setAttribute('data-section', task.section);
        item.setAttribute('data-task-id', 'custom_' + formKey + '_' + task.section + '_' + Math.random().toString(36).slice(2, 8));
        item.innerHTML = '<input type="checkbox" /><div class="item-content"><div class="item-label"></div></div>';
        item.querySelector('.item-label').textContent = task.label;
        var notes = body.querySelector('.notes-row');
        if (notes) body.insertBefore(item, notes); else body.appendChild(item);
      });
    });
    bindCheckboxMeta();
  }

  function loadRealtimeChecklist(formKey) {
    assignMissingTaskIds(formKey);
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return;
    global.rtdb.ref('events/' + eventId + '/' + formKey).on('value', function (snapshot) {
      var state = snapshot.val() || {};
      var boxes = document.querySelectorAll('.checklist-item input[type="checkbox"], .task input[type="checkbox"]');
      boxes.forEach(function (cb, index) {
        var key = readTaskKey(cb, index);
        var taskData = state[key];
        var checked = !!(taskData && taskData.checked);
        cb.checked = checked;
        var row = cb.closest('.checklist-item, .task');
        if (row) {
          row.classList.toggle('done', checked);
          row.classList.toggle('completed', checked);
        }
        var meta = ensureMetaNode(cb);
        if (meta) {
          meta.innerHTML = (checked && taskData && taskData.initials)
            ? '<span class="task-initials">' + taskData.initials + '</span><span class="task-time">' + (taskData.time || '') + '</span>'
            : '';
        }
      });
      if (typeof global.updateProgress === 'function') global.updateProgress();
      if (typeof global.updateAllProgress === 'function') global.updateAllProgress();
    });
  }

  function saveRealtimeChecklist(formKey) {
    assignMissingTaskIds(formKey);
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return Promise.resolve();
    var ref = global.rtdb.ref('events/' + eventId + '/' + formKey);
    return ref.once('value').then(function (snapshot) {
      var remoteState = snapshot.val() || {};
      var payload = {};
      var boxes = document.querySelectorAll('.checklist-item input[type="checkbox"], .task input[type="checkbox"]');
      boxes.forEach(function (cb, index) {
        var key = readTaskKey(cb, index);
        if (!cb.checked) {
          delete payload[key];
          return;
        }
        var remoteTask = remoteState[key];
        var justCheckedByUser = cb.dataset && cb.dataset.lastActorInitials && cb.dataset.lastCheckedAt;
        var fallbackInitials = (global.staffInitials || localStorage.getItem('staffInitials') || '?').toUpperCase();
        var fallbackTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        payload[key] = {
          checked: true,
          initials: justCheckedByUser
            ? cb.dataset.lastActorInitials
            : (remoteTask && remoteTask.initials) || fallbackInitials,
          time: justCheckedByUser
            ? cb.dataset.lastCheckedAt
            : (remoteTask && remoteTask.time) || fallbackTime
        };
        if (justCheckedByUser) {
          delete cb.dataset.lastActorInitials;
          delete cb.dataset.lastCheckedAt;
        }
      });
      return ref.set(payload);
    });
  }

  function saveStaffSection(formKey) {
    var eventId = getEventId();
    if (!eventId || !global.db || !global.db.collection) return Promise.resolve();
    var data = {};
    data[formKey] = {
      teamLeader: (document.getElementById('team-leader') || {}).value || '',
      staffMembers: Array.from(document.querySelectorAll('.staff-input')).map(function (i) { return i.value; }).filter(Boolean),
      savedAt: new Date().toISOString()
    };
    return global.db.collection('events').doc(eventId).set(data, { merge: true });
  }

  function getSectionNoteKey(textarea, index) {
    if (textarea.dataset && textarea.dataset.noteKey) return textarea.dataset.noteKey;
    var section = textarea.closest('.section');
    var sectionTask = section && section.querySelector('.checklist-item[data-section], .task [data-section]');
    var sectionId = sectionTask && sectionTask.dataset ? sectionTask.dataset.section : null;
    var key = sectionId ? ('section_' + sectionId) : ('note_' + index);
    if (textarea.dataset) textarea.dataset.noteKey = key;
    return key;
  }

  function loadRealtimeSectionNotes(formKey) {
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return;
    global.rtdb.ref('events/' + eventId + '/' + formKey + '_notes').on('value', function (snapshot) {
      var state = snapshot.val() || {};
      var notes = document.querySelectorAll('.notes-row textarea');
      notes.forEach(function (textarea, index) {
        var key = getSectionNoteKey(textarea, index);
        var remoteValue = state[key] || '';
        if (document.activeElement === textarea && textarea.value === remoteValue) return;
        if (textarea.value !== remoteValue) textarea.value = remoteValue;
      });
    });
  }

  function saveRealtimeSectionNotes(formKey) {
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return Promise.resolve();
    var payload = {};
    var notes = document.querySelectorAll('.notes-row textarea');
    notes.forEach(function (textarea, index) {
      var key = getSectionNoteKey(textarea, index);
      if (textarea.value && textarea.value.trim()) payload[key] = textarea.value;
    });
    return global.rtdb.ref('events/' + eventId + '/' + formKey + '_notes').set(payload);
  }

  function bindRealtimeSectionNotesSync(formKey) {
    if (!formKey) return;
    var attr = 'realtimeNotesBound_' + formKey;
    if (document.body && document.body.dataset && document.body.dataset[attr] === '1') return;
    if (document.body && document.body.dataset) document.body.dataset[attr] = '1';
    var timers = {};
    document.addEventListener('input', function (event) {
      var target = event.target;
      if (!target || !target.matches || !target.matches('.notes-row textarea')) return;
      var key = getSectionNoteKey(target, 0);
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(function () {
        saveRealtimeSectionNotes(formKey);
      }, 250);
    });
  }

  function getItemQuantityKey(field, index) {
    if (!field || !field.closest) return 'qty_' + index;
    if (field.dataset && field.dataset.qtyKey) return field.dataset.qtyKey;
    var row = field.closest('.checklist-item, .task');
    if (!row) return 'qty_' + index;
    var checkbox = row.querySelector('input[type="checkbox"]');
    var rowKey = checkbox ? readTaskKey(checkbox, index) : ('row_' + index);
    var explicitFieldKey = (field.dataset && field.dataset.qtyField) || field.name || field.id;
    var siblingFields = row.querySelectorAll('.item-qty input, .item-qty select, .item-qty textarea');
    var fieldIndex = Array.prototype.indexOf.call(siblingFields, field);
    var suffix = explicitFieldKey ? explicitFieldKey : ('field_' + Math.max(fieldIndex, 0));
    var key = rowKey + '__' + suffix;
    if (field.dataset) field.dataset.qtyKey = key;
    return key;
  }

  function loadRealtimeItemQuantities(formKey) {
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return;
    global.rtdb.ref('events/' + eventId + '/' + formKey + '_quantities').on('value', function (snapshot) {
      var state = snapshot.val() || {};
      var fields = document.querySelectorAll('.checklist-item .item-qty input, .checklist-item .item-qty select, .checklist-item .item-qty textarea, .task .item-qty input, .task .item-qty select, .task .item-qty textarea');
      fields.forEach(function (field, index) {
        var key = getItemQuantityKey(field, index);
        var nextValue = Object.prototype.hasOwnProperty.call(state, key) ? state[key] : '';
        if (document.activeElement === field && String(field.value || '') === String(nextValue || '')) return;
        if (String(field.value || '') !== String(nextValue || '')) field.value = nextValue;
      });
    });
  }

  function saveRealtimeItemQuantities(formKey) {
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return Promise.resolve();
    var payload = {};
    var fields = document.querySelectorAll('.checklist-item .item-qty input, .checklist-item .item-qty select, .checklist-item .item-qty textarea, .task .item-qty input, .task .item-qty select, .task .item-qty textarea');
    fields.forEach(function (field, index) {
      var key = getItemQuantityKey(field, index);
      var value = (field.value || '').trim();
      if (value) payload[key] = value;
    });
    return global.rtdb.ref('events/' + eventId + '/' + formKey + '_quantities').set(payload);
  }

  function bindRealtimeItemQuantitiesSync(formKey) {
    if (!formKey) return;
    var attr = 'realtimeQuantitiesBound_' + formKey;
    if (document.body && document.body.dataset && document.body.dataset[attr] === '1') return;
    if (document.body && document.body.dataset) document.body.dataset[attr] = '1';
    var timers = {};
    document.addEventListener('input', function (event) {
      var target = event.target;
      if (!target || !target.matches || !target.matches('.checklist-item .item-qty input, .checklist-item .item-qty textarea, .task .item-qty input, .task .item-qty textarea')) return;
      var key = getItemQuantityKey(target, 0);
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(function () {
        saveRealtimeItemQuantities(formKey);
      }, 200);
    });
    document.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || !target.matches || !target.matches('.checklist-item .item-qty select, .task .item-qty select')) return;
      saveRealtimeItemQuantities(formKey);
    });
  }

  function bindRealtimeCheckboxSync(formKey, onCheckboxChanged) {
    if (!formKey) return;
    var attr = 'realtimeSyncBound_' + formKey;
    if (document.body && document.body.dataset && document.body.dataset[attr] === '1') return;
    if (document.body && document.body.dataset) document.body.dataset[attr] = '1';
    document.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || !target.matches || !target.matches('.checklist-item input[type="checkbox"], .task input[type="checkbox"]')) return;
      if (target.checked) {
        target.dataset.lastActorInitials = (global.staffInitials || localStorage.getItem('staffInitials') || '?').toUpperCase();
        target.dataset.lastCheckedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } else {
        delete target.dataset.lastActorInitials;
        delete target.dataset.lastCheckedAt;
      }
      if (typeof onCheckboxChanged === 'function') onCheckboxChanged(target);
      saveRealtimeChecklist(formKey);
    });
  }

  global.StaffFormSync = {
    getEventId: getEventId,
    loadEventMetaAndApplyHiddenTasks: loadEventMetaAndApplyHiddenTasks,
    injectCustomTasks: injectCustomTasks,
    loadRealtimeChecklist: loadRealtimeChecklist,
    saveRealtimeChecklist: saveRealtimeChecklist,
    saveStaffSection: saveStaffSection,
    loadRealtimeSectionNotes: loadRealtimeSectionNotes,
    saveRealtimeSectionNotes: saveRealtimeSectionNotes,
    bindRealtimeSectionNotesSync: bindRealtimeSectionNotesSync,
    loadRealtimeItemQuantities: loadRealtimeItemQuantities,
    saveRealtimeItemQuantities: saveRealtimeItemQuantities,
    bindRealtimeItemQuantitiesSync: bindRealtimeItemQuantitiesSync,
    bindCheckboxMeta: bindCheckboxMeta,
    bindRealtimeCheckboxSync: bindRealtimeCheckboxSync
  };
})(window);

// Feast setup only: keep the event's hall access time separate from checklist state.
(function (global) {
  if (!global.location || !/\/feast\/feast-flourish-setup\.html$/.test(global.location.pathname)) return;

  function initFeastHallAccessTime() {
    var row = document.querySelector('.checklist-item[data-section="s1"]');
    var label = row && row.querySelector('.item-label');
    if (!label || document.getElementById('feast-hall-access-time')) return;
    var section = row.closest('.section');
    var heading = section && section.querySelector('.section-header h2');
    if (heading) heading.textContent = '1 · Hall Access';

    label.textContent = 'Main Hall unlocked and accessible from ';
    var field = document.createElement('input');
    field.type = 'time';
    field.id = 'feast-hall-access-time';
    field.value = '13:00';
    field.required = true;
    field.disabled = true;
    field.setAttribute('aria-label', 'Main Hall access time for this event');
    field.setAttribute('aria-describedby', 'feast-hall-access-status');
    field.style.cssText = 'margin-left:6px;padding:6px 8px;border:1px solid #dbe3ee;border-radius:8px;font:inherit;background:#fbfcff;color:#1f2937;';
    label.appendChild(field);

    var status = document.createElement('div');
    status.id = 'feast-hall-access-status';
    status.className = 'item-note';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    label.parentNode.appendChild(status);
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Retry access time';
    retry.hidden = true;
    label.parentNode.appendChild(retry);

    var eventId = global.StaffFormSync.getEventId();
    if (!eventId || !global.db || !global.db.collection) {
      status.textContent = 'Open an event from the dashboard to edit its access time.';
      return;
    }
    var ref = global.db.collection('events').doc(eventId);
    var loaded = false;
    function validTime(value) { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }

    function load() {
      field.disabled = true;
      retry.hidden = true;
      status.textContent = 'Loading access time...';
      return ref.get().then(function (snapshot) {
        if (!snapshot.exists) {
          status.textContent = 'Event not found. Open an existing event from the dashboard.';
          return;
        }
        var saved = snapshot.data().feastSetupHallAccessTime;
        field.value = validTime(saved) ? saved : '13:00';
        loaded = true;
        field.disabled = false;
        status.textContent = 'Changes save automatically for this event.';
      }).catch(function () {
        status.textContent = 'Could not load access time. Retry before editing.';
        retry.hidden = false;
      });
    }

    function save() {
      if (!loaded || field.disabled) return;
      if (!validTime(field.value)) {
        status.textContent = 'Enter a valid access time.';
        field.reportValidity();
        return;
      }
      field.disabled = true;
      retry.hidden = true;
      status.textContent = 'Saving access time...';
      return ref.update({ feastSetupHallAccessTime: field.value }).then(function () {
        field.disabled = false;
        status.textContent = 'Access time saved for this event.';
      }).catch(function () {
        field.disabled = false;
        status.textContent = 'Access time not saved. Retry to save your change.';
        retry.hidden = false;
      });
    }

    field.addEventListener('change', save);
    retry.addEventListener('click', function () { return loaded ? save() : load(); });
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeastHallAccessTime);
  } else {
    initFeastHallAccessTime();
  }
})(window);

// Feast setup only: keep the event's catering access time separate from checklist state.
(function (global) {
  if (!global.location || !/\/feast\/feast-flourish-setup\.html$/.test(global.location.pathname)) return;

  function initFeastCateringAccessTime() {
    var rows = document.querySelectorAll('.checklist-item[data-section="s1"]');
    var row = rows[1];
    var label = row && row.querySelector('.item-label');
    if (!label || document.getElementById('feast-catering-access-time')) return;

    label.textContent = 'Catering partner access confirmed from ';
    var field = document.createElement('input');
    field.type = 'time';
    field.id = 'feast-catering-access-time';
    field.value = '12:00';
    field.required = true;
    field.disabled = true;
    field.setAttribute('aria-label', 'Catering partner access time for this event');
    field.setAttribute('aria-describedby', 'feast-catering-access-status');
    field.style.cssText = 'margin-left:6px;padding:6px 8px;border:1px solid #dbe3ee;border-radius:8px;font:inherit;background:#fbfcff;color:#1f2937;';
    label.appendChild(field);

    var status = document.createElement('div');
    status.id = 'feast-catering-access-status';
    status.className = 'item-note';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    label.parentNode.appendChild(status);
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Retry catering access time';
    retry.hidden = true;
    label.parentNode.appendChild(retry);

    var eventId = global.StaffFormSync.getEventId();
    if (!eventId || !global.db || !global.db.collection) {
      status.textContent = 'Open an event from the dashboard to edit its catering access time.';
      return;
    }
    var ref = global.db.collection('events').doc(eventId);
    var loaded = false;
    function validTime(value) { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }

    function load() {
      field.disabled = true;
      retry.hidden = true;
      status.textContent = 'Loading catering access time...';
      return ref.get().then(function (snapshot) {
        if (!snapshot.exists) {
          status.textContent = 'Event not found. Open an existing event from the dashboard.';
          return;
        }
        var saved = snapshot.data().feastSetupCateringAccessTime;
        field.value = validTime(saved) ? saved : '12:00';
        loaded = true;
        field.disabled = false;
        status.textContent = 'Changes save automatically for this event.';
      }).catch(function () {
        status.textContent = 'Could not load catering access time. Retry before editing.';
        retry.hidden = false;
      });
    }

    function save() {
      if (!loaded || field.disabled) return;
      if (!validTime(field.value)) {
        status.textContent = 'Enter a valid catering access time.';
        field.reportValidity();
        return;
      }
      field.disabled = true;
      retry.hidden = true;
      status.textContent = 'Saving catering access time...';
      return ref.update({ feastSetupCateringAccessTime: field.value }).then(function () {
        field.disabled = false;
        status.textContent = 'Catering access time saved for this event.';
      }).catch(function () {
        field.disabled = false;
        status.textContent = 'Catering access time not saved. Retry to save your change.';
        retry.hidden = false;
      });
    }

    field.addEventListener('change', save);
    retry.addEventListener('click', function () { return loaded ? save() : load(); });
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeastCateringAccessTime);
  } else {
    initFeastCateringAccessTime();
  }
})(window);

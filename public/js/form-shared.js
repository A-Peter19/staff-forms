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

      var headerSub = document.getElementById('header-sub');
      if (headerSub && ev.couple) {
        var dateFmt = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        headerSub.textContent = ev.couple + '  ·  ' + dateFmt + (ev.guests ? ('  ·  ' + ev.guests + ' guests') : '');
      }

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

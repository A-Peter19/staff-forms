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
    var eventId = getEventId();
    if (!eventId || !global.rtdb || !global.rtdb.ref) return Promise.resolve();
    var payload = {};
    var boxes = document.querySelectorAll('.checklist-item input[type="checkbox"], .task input[type="checkbox"]');
    boxes.forEach(function (cb, index) {
      if (!cb.checked) return;
      var key = readTaskKey(cb, index);
      var meta = ensureMetaNode(cb);
      var timeNode = meta && meta.querySelector('.task-time');
      payload[key] = {
        checked: true,
        initials: (global.staffInitials || localStorage.getItem('staffInitials') || '?').toUpperCase(),
        time: (timeNode && timeNode.textContent) || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    });
    return global.rtdb.ref('events/' + eventId + '/' + formKey).set(payload);
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

  global.StaffFormSync = {
    getEventId: getEventId,
    loadEventMetaAndApplyHiddenTasks: loadEventMetaAndApplyHiddenTasks,
    injectCustomTasks: injectCustomTasks,
    loadRealtimeChecklist: loadRealtimeChecklist,
    saveRealtimeChecklist: saveRealtimeChecklist,
    saveStaffSection: saveStaffSection,
    bindCheckboxMeta: bindCheckboxMeta
  };
})(window);

(function (global) {
  'use strict';
  // Normalize only known legacy shapes; no migration writes run while loading.
  function taskValue(value) {
    if (typeof value === 'boolean') return { checked: value };
    if (value && typeof value.checked === 'boolean') return value;
    return null;
  }
  global.readWakeTask = function (state, cb) {
    const row = cb.closest('.checklist-item');
    if (Object.hasOwn(state, row.dataset.taskId)) return taskValue(state[row.dataset.taskId]);
    const flat = taskValue(state[row.dataset.legacyFlatId]);
    const nested = taskValue((state.tasks || {})[cb.dataset.section + '-' + cb.dataset.task]);
    if (flat && nested && (flat.checked !== nested.checked ||
      (flat.initials && nested.initials && (flat.initials !== nested.initials || flat.time !== nested.time)))) {
      return { conflict: true, candidates: [flat, nested] };
    }
    return flat || nested;
  };
  global.addStaffMember = function (value = '', staffId) {
    const row = document.createElement('div'); row.className = 'staff-entry';
    row.dataset.staffId = staffId || ('staff_' + crypto.randomUUID());
    row.innerHTML = '<input type="text" class="staff-name-input staff-input" placeholder="Staff member name..."><button type="button" class="remove-staff-btn js-remove-staff" aria-label="Remove staff member">✕</button>';
    const field = row.querySelector('input'); field.value = value;
    document.getElementById('staff-list').appendChild(row);
    if (!staffId) { field.focus(); field.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  global.updateStaffBadge = function () {};
  global.updateProgress = function () {
    document.querySelectorAll('.section:not(.housekeeping-section)').forEach(section => {
      const name = section.querySelector('[data-toggle-section]').dataset.toggleSection;
      const boxes = [...section.querySelectorAll('.task input[type="checkbox"]')].filter(cb => !cb.closest('.task').hidden);
      const checked = boxes.filter(cb => cb.checked).length;
      document.getElementById(name + 'Progress').textContent = checked + '/' + boxes.length;
      document.getElementById(name + 'ProgressBar').style.width = (boxes.length ? checked / boxes.length * 100 : 0) + '%';
    });
  };
  document.addEventListener('DOMContentLoaded', function () {
    const stage = document.body.dataset.stage;
    document.querySelectorAll('.section-header').forEach(header => {
      header.tabIndex = 0; header.setAttribute('role', 'button'); header.setAttribute('aria-expanded', 'true');
      const toggle = () => {
        const collapsed = header.nextElementSibling.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', String(!collapsed));
      };
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
    });
    document.querySelector('.js-add-staff').addEventListener('click', () => global.addStaffMember());
    document.getElementById('btn-reset').addEventListener('click', () => global.resetAll());
    const quantities = {
      60: { tables: 6, chairs: 60, woodenTrays: 4, whiteTrays: 4, milkJugs: 12 },
      80: { tables: 8, chairs: 80, woodenTrays: 6, whiteTrays: 6, milkJugs: 16 },
      100: { tables: 10, chairs: 100, woodenTrays: 8, whiteTrays: 8, milkJugs: 20 },
      120: { tables: 10, chairs: 120, woodenTrays: 8, whiteTrays: 8, milkJugs: 20 }
    };
    global.startStageFormSync({
      stage, wake: true, preserveLegacy: true, readTask: global.readWakeTask,
      bindDetails(save) {
        document.querySelectorAll('.guest-btn').forEach(button => button.addEventListener('click', () => {
          save(button, 'guests', Number(button.dataset.count));
        }));
      },
      renderDetails(ev, legacy) {
        const guests = Object.hasOwn(ev, 'guests') ? ev.guests : legacy.guests;
        const count = Number(guests);
        const tier = count > 0 ? [60, 80, 100, 120].find(n => n >= count) : null;
        document.getElementById('currentGuests').textContent = guests === undefined ? 'Not set' : guests;
        document.querySelectorAll('.guest-btn').forEach(button => button.classList.toggle('active', Number(button.dataset.count) === count));
        const qty = quantities[tier];
        if (stage === 'setup') {
          ['tables', 'chairs', 'woodenTrays', 'whiteTrays', 'milkJugs'].forEach(key => {
            [key, key + 'Qty'].forEach(id => { document.getElementById(id).textContent = qty ? qty[key] : 'Confirm'; });
          });
        } else {
          document.getElementById('barStaff').textContent = qty ? '1' : 'Confirm';
          document.getElementById('eventStaff').textContent = qty ? (tier === 60 ? '1' : '2') : 'Confirm';
          document.getElementById('kitchenStaff').textContent = qty ? '1' : 'Confirm';
        }
      }
    });
  });
})(window);

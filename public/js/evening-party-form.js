function updateProgress() {
  var all = Array.from(document.querySelectorAll('.checklist-item input[type="checkbox"]')).filter(cb => !cb.closest('.checklist-item').hidden);
  var done = all.filter(cb => cb.checked);
  var pct = all.length ? Math.round((done.length / all.length) * 100) : 0;
  document.getElementById('progress-text').textContent = done.length + ' / ' + all.length + ' items complete';
  document.getElementById('bar-fill').style.width = pct + '%';
  document.querySelectorAll('.section').forEach(function(sec) {
    var item = sec.querySelector('.checklist-item');
    if (!item) return;
    var sid = item.dataset.section;
    var items = Array.from(sec.querySelectorAll('.checklist-item input[type="checkbox"]')).filter(cb => !cb.closest('.checklist-item').hidden);
    var checked = items.filter(cb => cb.checked);
    var badge = sec.querySelector('.badge');
    if (badge && sid) badge.textContent = checked.length + '/' + items.length;
  });
}

function addStaffMember(value, staffId) {
  value = value || '';
  var list = document.getElementById('staff-list');
  var row = document.createElement('div');
  row.dataset.staffId = staffId || ('staff_' + crypto.randomUUID());
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  var inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'staff-input'; inp.placeholder = 'Staff member name...'; inp.value = value;
  inp.style.cssText = 'flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.92rem;background:#f5f8ff;';
  inp.addEventListener('input', updateStaffBadge);
  var removeBtn = document.createElement('button');
  removeBtn.type = 'button'; removeBtn.textContent = '✕';
  removeBtn.style.cssText = 'width:38px;height:38px;background:#c0392b;border:none;border-radius:6px;color:white;font-size:1rem;cursor:pointer;flex-shrink:0;';
  removeBtn.className = 'js-remove-staff';
  removeBtn.setAttribute('aria-label', 'Remove staff member');
  row.appendChild(inp); row.appendChild(removeBtn);
  list.appendChild(row);
  if (!staffId) { inp.focus(); inp.dispatchEvent(new Event('input', { bubbles: true })); }
  updateStaffBadge();
}


function updateStaffBadge() {
  var inputs = document.querySelectorAll('.staff-input');
  var filled = Array.from(inputs).filter(function(i) { return i.value.trim() !== ''; }).length;
  var badge = document.getElementById('badge-staff');
  if (badge) badge.textContent = filled + ' staff';
}
document.addEventListener('DOMContentLoaded', function () {
  const stage = document.body.dataset.stage;
  document.querySelectorAll('.js-section-toggle').forEach(header => {
    header.tabIndex = 0; header.setAttribute('role', 'button'); header.setAttribute('aria-expanded', 'true');
    const toggle = () => {
      const body = header.nextElementSibling;
      body.hidden = !body.hidden;
      header.setAttribute('aria-expanded', String(!body.hidden));
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
    });
  });
  document.querySelector('.js-add-staff').addEventListener('click', () => addStaffMember());
  document.getElementById('btn-reset').addEventListener('click', () => window.resetAll());
  let backupPanel, backupSignature;
  window.startStageFormSync({
    stage,
    metadata: { 'meta-access': 'accessTime', 'meta-bar': 'barTime', 'meta-tables': 'tableStyle' },
    renderDetails(event) {
      // Positional backups may include historical custom tasks; never guess their names.
      const saved = event[stage] || {};
      const signature = JSON.stringify([saved.checkboxes, saved.initialsData]);
      if (signature === backupSignature) return;
      backupSignature = signature;
      if (backupPanel) backupPanel.remove();
      if (!saved.checkboxes || !Object.keys(saved.checkboxes).length) return;
      backupPanel = document.createElement('details');
      backupPanel.className = 'staff-section';
      const title = document.createElement('summary'); title.textContent = 'Previous saved checklist — review available';
      const explanation = document.createElement('p');
      explanation.textContent = 'These older entries have no stable task names. Review them against the current checklist; they have not been applied automatically.';
      const list = document.createElement('ul');
      Object.entries(saved.checkboxes).forEach(([key, checked]) => {
        const item = document.createElement('li');
        const attribution = (saved.initialsData || {})[key] || {};
        const label = /^cb_\d+$/.test(key) ? 'Saved item ' + (Number(key.slice(3)) + 1) : key;
        item.textContent = label + ': ' + (checked ? 'Complete' : 'Incomplete') +
          (checked ? ' ' + [attribution.initials, attribution.time].filter(Boolean).join(' · ') : '');
        list.appendChild(item);
      });
      backupPanel.append(title, explanation, list);
      document.querySelector('.staff-section').after(backupPanel);
    }
  });
});

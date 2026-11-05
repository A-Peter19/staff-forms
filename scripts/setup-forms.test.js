// Browser integration against an in-memory Firebase adapter; no live credentials required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../public');

for (const form of ['feast/feast-flourish-setup.html', 'foundation/foundation-setup.html', 'wake-setup.html', 'wake-during.html', 'wake-clear.html', 'evening-party/evening-party-setup.html', 'evening-party/evening-party-during.html', 'evening-party/evening-party-clear.html', 'flourish/flourish-setup.html', 'flourish/flourish-during.html', 'flourish/flourish-clearup.html', 'twilight/twilight-setup.html', 'twilight/twilight-during.html', 'twilight/twilight-clearup.html', 'feast/feast-during.html', 'feast/feast-clearup.html', 'foundation/foundation-during.html', 'foundation/foundation-clearup.html', 'celebration/celebration-setup.html', 'celebration/celebration-during.html', 'celebration/celebration-clear.html']) {
  test(`${form}: realtime stage workflow`, async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
    try {
      const context = await browser.newContext();
      context.setDefaultTimeout(6000);
      const wake = form.startsWith('wake');
      const evening = form.startsWith('evening-party/');
      const flourish = form.startsWith('flourish/');
      const twilight = form.startsWith('twilight/');
      const celebration = form.startsWith('celebration/');
      const stage = form.endsWith('-during.html') ? 'during' : (form.endsWith('-clear.html') || form.endsWith('-clearup.html')) ? 'clearup' : 'setup';
      const remaining = /^(feast|foundation)\//.test(form) && stage !== 'setup';
      const otherStage = stage === 'during' ? 'clearup' : 'during';
      const section = wake ? (stage === 'setup' ? 'hall' : 'bar') : (celebration || remaining || evening || flourish || twilight || form.startsWith('feast')) ? 's1' : 's2';
      let event = { eventType: wake ? 'wake' : celebration ? 'celebration' : evening ? 'party' : (flourish || twilight) ? 'wedding' : form.startsWith('feast') ? 'feast' : 'foundation', guests: 80, date: '2026-11-05',
        [otherStage]: { teamLeader: 'Other stage' },
        customTasks: [{ form: stage, section, label: 'Manager task' }], hiddenTasks: [] };
      const data = {};
      const taskPath = 'events/test/' + stage;
      const legacyKey = stage === 'setup' ? 'hall-buffet-1' : 'bar-bar-1';
      if (wake) {
        data[taskPath] = { tasks: { [legacyKey]: stage === 'setup' ? { checked: true, initials: 'OLD', time: '12:34' } : true },
          [stage + '_s0_1']: { checked: true, initials: 'FLAT', time: '12:35' },
          teamLeader: 'Alex', staffNames: ['Sam', 'Jo'], guests: 60 };
      } else event[stage] = { teamLeader: 'Alex', staffMembers: ['Sam', 'Jo'] };
      if (evening) {
        event[stage].checkboxes = { cb_0: false, cb_1: true };
        event[stage].initialsData = { cb_1: { initials: 'OLD', time: '12:34' } };
        event.accessTime = '15:00'; event.barTime = '18:00'; event.tableStyle = 'Round';
        data[taskPath] = { ['party_' + stage + '_s1_0']: { checked: true, initials: 'RT', time: '13:00' } };
      }
      if (flourish) {
        event.sash = 'Ivory'; event.runner = 'Lace';
        event[stage].checkboxes = { cb_0: false, cb_1: true };
        data[taskPath] = { ['wedding_' + stage + '_s1_0']: { checked: true, initials: 'FX', time: '12:34' } };
        data[taskPath + '_notes'] = { section_s1: 'Existing leader note' };
        if (stage === 'setup') {
          const fixture = require('./fixtures/saved-data/flourish.json').realtimeDatabase.events['fixture-flourish'];
          Object.assign(data[taskPath], fixture.setup);
          Object.assign(data[taskPath + '_notes'], fixture.setup_notes);
          data[taskPath + '_quantities'] = structuredClone(fixture.setup_quantities);
        }
      }
      if (twilight) {
        const fixture = require('./fixtures/saved-data/twilight.json');
        data[taskPath] = structuredClone(fixture.realtimeDatabase.events['fixture-twilight'][stage]);
        Object.assign(event[stage], { sectionNotes: { ta_0: 'Old section note' }, finalNotes: 'Old handover', barOpen: '18:30', barClose: '23:15' });
      }
      if (remaining) {
        data[taskPath] = { [stage + '_s1_0']: { checked: true, initials: 'OLD', time: '12:34' } };
        event[stage].checkboxes = { cb_0: true, cb_1: false };
      }
      if (celebration) {
        data[taskPath] = { ['celebration_' + stage + '_s1_0']: { checked: true, initials: 'CE', time: '12:34' } };
        data[taskPath + '_notes'] = { section_s1: 'Existing celebration note' };
        event[stage].barTime = '15:00'; event[stage].accessTime = '14:00'; event[stage].tableStyle = 'Legacy style';
      }
      const legacyBefore = structuredClone(data[taskPath]);
      let fail = false;
      const errors = [];
      const publish = async () => {
        for (const page of context.pages()) await page.evaluate(({ event, data }) => window.receive?.(event, data), { event, data });
      };
      await context.exposeBinding('readStore', () => ({ event, data }));
      await context.exposeBinding('writeStore', async (_, { kind, key, patch }) => {
        if (fail) throw new Error('Simulated denied write');
        if (kind === 'rtdb') {
          data[key] ||= {};
          for (const [name, value] of Object.entries(patch)) {
            if (value === null) delete data[key][name]; else data[key][name] = value;
          }
        } else {
          for (const [name, value] of Object.entries(patch)) {
            const keys = name.split('.'); let target = event;
            while (keys.length > 1) { const k = keys.shift(); target = target[k] ||= {}; }
            target[keys[0]] = value;
          }
        }
        await publish();
      });
      await context.addInitScript(() => {
        localStorage.setItem('staffInitials', 'QA');
        const listeners = new Map(); let eventCallback;
        let cached;
        window.receive = (event, data) => {
          cached = { event, data };
          eventCallback?.({ exists: true, data: () => event });
          listeners.forEach((callback, key) => callback({ val: () => data[key] || null }));
        };
        const ref = {
          onSnapshot(callback) { eventCallback = callback; readStore().then(({ event, data }) => receive(event, data)); },
          update(patch) { return writeStore({ kind: 'firestore', patch }); }
        };
        const db = {
          collection: () => ({ doc: () => ref }),
          async runTransaction(fn) {
            const { event } = await readStore(); let patch;
            await fn({ get: async () => ({ exists: true, data: () => event }), update: (_, value) => { patch = value; } });
            return ref.update(patch);
          }
        };
        const rtdb = { ref: key => ({
          on(_, callback) { listeners.set(key, callback); readStore().then(({ event, data }) => receive(event, data)); },
          update: patch => writeStore({ kind: 'rtdb', key, patch })
        }) };
        window.firebase = { initializeApp() {}, firestore: () => db, database: () => rtdb };
      });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'forms.test') return route.fulfill({ body: '', contentType: 'application/javascript' });
        const file = path.join(root, url.pathname);
        route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'application/javascript' : 'text/html' });
      });
      async function open(pageForm = form) {
        const page = await context.newPage();
        page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
        await page.goto(`https://forms.test/${pageForm}?event=test`);
        await page.waitForFunction(() => !document.getElementById('team-leader').disabled);
        return page;
      }
      const a = await open(), b = await open();
      assert.equal(await a.locator('.staff-input').first().inputValue(), 'Sam');
      if (evening) {
        assert.equal(await a.locator('.checklist-item input[type=checkbox]').first().isChecked(), true);
        await a.locator('details summary').click();
        assert.match(await a.locator('details').innerText(), /Saved item 2: Complete OLD/);
        if (stage === 'setup') assert.equal(await a.locator('#meta-tables').inputValue(), 'Round');
      }
      if (flourish) {
        assert.equal(await a.locator('.notes-row textarea').first().inputValue(), 'Existing leader note');
        assert.equal(await a.locator('.checklist-item input[type=checkbox]').first().isChecked(), true);
        if (stage === 'setup') {
          assert.equal(await a.locator('[data-note-key="section_s3"]').inputValue(), 'Synthetic furniture note');
          assert.equal(await a.locator('[data-qty-key="wedding_setup_s5_0__field_1"]').inputValue(), 'Fishbowl');
        }
      }
      if (twilight) {
        assert.equal(await a.locator('.notes-row textarea').first().inputValue(), 'Old section note');
        await a.locator('details summary').click();
        await a.getByLabel('Match cb_0 to current task').selectOption('0');
        await a.locator('details button').first().click();
        await b.waitForFunction(() => document.querySelector('.checklist-item input[type=checkbox]').checked);
        assert.deepEqual(data[taskPath].cb_0, legacyBefore.cb_0);
      }
      if (remaining) {
        assert.equal(await a.locator('.checklist-item input[type=checkbox]').first().isChecked(), true);
        assert.equal(await a.locator('.checklist-item').first().getAttribute('data-task-id'), stage + '_s1_0');
        assert.equal(await a.locator('#feast-hall-access-time').count(), 0);
      }
      if (celebration) {
        assert.equal(await a.locator('.notes-row textarea').first().inputValue(), 'Existing celebration note');
        assert.equal(await a.locator('.checklist-item input[type=checkbox]').first().isChecked(), true);
        if (stage !== 'clearup') assert.equal(await a.locator('#meta-bar').inputValue(), '15:00');
        if (stage === 'setup') assert.equal(await a.locator('#meta-tables').inputValue(), 'Legacy style');
      }
      const notes = '.notes-row textarea';
      await a.locator(notes).first().fill('Keep my notes');
      await a.waitForFunction(() => document.querySelector('.notes-row textarea').dataset.unsaved === 'false');
      assert.equal(await b.locator(notes).first().inputValue(), 'Keep my notes');
      if (await a.locator('.item-qty input').count()) {
      await a.locator('.item-qty input').first().fill('0');
      await a.waitForFunction(() => document.querySelector('.item-qty input').dataset.unsaved === 'false');
      assert.equal(await b.locator('.item-qty input').first().inputValue(), '0');
      }
      await a.locator('#team-leader').fill('New leader');
      await b.waitForFunction(() => document.getElementById('team-leader').value === 'New leader');
      await a.locator('.staff-input').first().fill('Updated Sam');
      await b.waitForFunction(() => document.querySelector('.staff-input').value === 'Updated Sam');
      assert.equal(event[otherStage].teamLeader, 'Other stage');
      await a.locator('.js-remove-staff').first().click();
      await b.waitForFunction(() => document.querySelectorAll('.staff-input').length === 1);
      await a.locator('.js-remove-staff').first().click();
      await b.waitForFunction(() => document.querySelectorAll('.staff-input').length === 0);
      await a.locator('.js-add-staff').click();
      await a.locator('.staff-input').fill('Added staff');
      await b.waitForFunction(() => document.querySelector('.staff-input')?.value === 'Added staff');
      const cb = '.checklist-item input[type=checkbox]';
      if (wake) {
        assert.equal(await a.locator(cb).first().isChecked(), true);
        assert.equal(await a.locator(cb).nth(1).isChecked(), true);
        await a.locator(cb).first().uncheck();
        await b.waitForFunction(() => !document.querySelector('.checklist-item input').checked);
        const reopened = await open();
        assert.equal(await reopened.locator(cb).first().isChecked(), false);
        await reopened.close();
      }
      await Promise.all([a.locator(cb).nth(0).check(), b.locator(cb).nth(1).check()]);
      await a.waitForFunction(() => [...document.querySelectorAll('.checklist-item input[type=checkbox]')].slice(0, 2).every(cb => cb.checked));
      await a.locator('.custom-task input').check();
      event.customTasks[0].id = await a.evaluate(task => customTaskId(task, 0), event.customTasks[0]);
      event.customTasks[0].label = 'Renamed manager task';
      await publish();
      const c = await open();
      assert.equal(await c.locator('.custom-task input').isChecked(), true);
      assert.equal(await c.locator('.staff-input').inputValue(), 'Added staff');
      const key = await a.locator('.checklist-item').first().getAttribute('data-task-id');
      event.hiddenTasks = [key]; event.customTasks.push({ id: 'new-manager-task', form: stage, section: (wake || twilight || remaining) ? section : 's2', label: 'New task' });
      await publish();
      assert.equal(await a.locator('.checklist-item').first().isVisible(), false);
      assert.equal(await b.locator('.custom-task').count(), 2);
      event.hiddenTasks = []; await publish();
      assert.equal(await a.locator('.checklist-item').first().isVisible(), true);
      fail = true;
      await a.locator(notes).first().fill('Failed draft');
      await a.getByRole('button', { name: 'Retry', exact: true }).waitFor();
      fail = false;
      await a.getByRole('button', { name: 'Retry', exact: true }).click();
      await b.waitForFunction(() => document.querySelector('.notes-row textarea').value === 'Failed draft');
      if (evening) {
        assert.deepEqual(event[stage].checkboxes, { cb_0: false, cb_1: true });
        if (stage !== 'clearup') {
          await a.locator('#meta-bar').fill('20:30');
          await b.waitForFunction(() => document.getElementById('meta-bar').value === '20:30');
          const other = await open(stage === 'setup' ? 'evening-party/evening-party-during.html' : 'evening-party/evening-party-setup.html');
          assert.equal(await other.locator('#meta-bar').inputValue(), '20:30');
          assert.equal(await other.locator('.notes-row textarea').first().inputValue(), '');
        }
        if (stage === 'setup') {
          await a.locator('#meta-access').fill('16:00');
          await b.waitForFunction(() => document.getElementById('meta-access').value === '16:00');
          await a.locator('#meta-tables').selectOption('Mixed');
          await b.waitForFunction(() => document.getElementById('meta-tables').value === 'Mixed');
        }
      }
      if (flourish) {
        await a.locator('#meta-sash').fill('Sage');
        await b.waitForFunction(() => document.getElementById('meta-sash').value === 'Sage');
        await a.locator('#meta-runner').fill('Hessian');
        await b.waitForFunction(() => document.getElementById('meta-runner').value === 'Hessian');
        const other = await open(stage === 'setup' ? 'flourish/flourish-during.html' : 'flourish/flourish-setup.html');
        assert.equal(await other.locator('#meta-sash').inputValue(), 'Sage');
        assert.equal(await other.locator('#meta-runner').inputValue(), 'Hessian');
        assert.equal(await other.locator('.notes-row textarea').first().inputValue(), '');
        assert.deepEqual(event[stage].checkboxes, { cb_0: false, cb_1: true });
      }
      if (twilight) {
        assert.equal(event[stage].sectionNotes.ta_0, 'Failed draft');
        if (stage !== 'setup') {
          assert.equal(await a.locator('#final-notes').inputValue(), 'Old handover');
          await a.locator('#final-notes').fill('Updated handover');
          await b.waitForFunction(() => document.getElementById('final-notes').value === 'Updated handover');
          await a.locator('#final-notes').fill('');
          await b.waitForFunction(() => document.getElementById('final-notes').value === '');
        }
        if (stage === 'during') {
          assert.equal(await a.locator('#meta-bar-open').inputValue(), '18:30');
          await a.locator('#meta-bar-close').fill('23:45');
          await b.waitForFunction(() => document.getElementById('meta-bar-close').value === '23:45');
        }
        assert.deepEqual(data[taskPath].cb_0, legacyBefore.cb_0);
      }
      if (form.startsWith('feast') && stage === 'setup') {
        await a.locator('#meta-catering').selectOption('Buffet');
        await b.waitForFunction(() => document.getElementById('meta-catering').value === 'Buffet');
        await a.locator('#meta-sash').fill('Ivory');
        await b.waitForFunction(() => document.getElementById('meta-sash').value === 'Ivory');
        await a.locator('#feast-hall-access-time').fill('14:30');
        await b.waitForFunction(() => document.getElementById('feast-hall-access-time').value === '14:30');
      }
      if (wake) {
        await a.locator('.guest-btn[data-count="120"]').click();
        await b.waitForFunction(() => document.getElementById('currentGuests').textContent === '120');
        assert.equal(event.guests, 120);
        if (stage === 'during') {
          const clearup = await open('wake-clear.html');
          assert.equal(await clearup.locator('#team-leader').inputValue(), 'Other stage');
          assert.equal(await clearup.locator('.notes-row textarea').first().inputValue(), '');
          assert.equal(await clearup.locator('#currentGuests').innerText(), '120');
          const setup = await open('wake-setup.html');
          assert.equal(await setup.locator('#currentGuests').innerText(), '120');
          assert.equal(await setup.locator('#chairs').innerText(), '120');
        }
        assert.deepEqual(data[taskPath].tasks, legacyBefore.tasks);
        assert.deepEqual(data[taskPath].staffNames, legacyBefore.staffNames);
        assert.deepEqual(data[taskPath][stage + '_s0_1'], legacyBefore[stage + '_s0_1']);
        assert.equal(data[taskPath].guests, 60);
        // A conflicting legacy pair is surfaced, never silently combined.
        const conflicting = await a.locator(cb).nth(2).evaluate(el => ({
          nested: el.dataset.section + '-' + el.dataset.task,
          flat: el.closest('.task').dataset.legacyFlatId
        }));
        data[taskPath].tasks[conflicting.nested] = true;
        data[taskPath][conflicting.flat] = { checked: false };
        await publish();
        assert.equal(await a.locator(cb).nth(2).isDisabled(), true);
        await a.getByRole('button', { name: 'Legacy record: complete', exact: true }).click();
        await b.waitForFunction(() => document.querySelectorAll('.checklist-item input[type=checkbox]')[2].checked);
        assert.equal(data[taskPath].tasks[conflicting.nested], true);
        assert.deepEqual(data[taskPath][conflicting.flat], { checked: false });
      }
      if (celebration && stage !== 'clearup') {
        await a.locator('#meta-bar').fill('16:30');
        await b.waitForFunction(() => document.getElementById('meta-bar').value === '16:30');
        await a.locator('#meta-bar').fill('');
        await b.waitForFunction(() => document.getElementById('meta-bar').value === '');
        assert.equal(event[stage].barTime, '15:00');
        const reopened = await open();
        assert.equal(await reopened.locator('#meta-bar').inputValue(), '');
      }
      if (remaining) {
        assert.deepEqual(event[stage].checkboxes, { cb_0: true, cb_1: false });
        event.hiddenTasks = [event.eventType + '_' + stage + '_s1_0'];
        await publish();
        assert.equal(await a.locator('.checklist-item').first().isVisible(), false);
        a.once('dialog', dialog => dialog.accept());
        await a.locator('#btn-reset').click();
        await b.waitForFunction(() => !document.querySelectorAll('.checklist-item input[type=checkbox]')[1].checked);
        assert.equal(data[taskPath][stage + '_s1_0'].checked, true);
        const reopened = await open();
        assert.equal(await reopened.locator('.notes-row textarea').first().inputValue(), 'Failed draft');
        assert.equal(await reopened.locator('.checklist-item input[type=checkbox]').nth(1).isChecked(), false);
        if (form.startsWith('feast')) {
          await a.locator('#meta-sash').fill('Ivory');
          await b.waitForFunction(() => document.getElementById('meta-sash').value === 'Ivory');
          await a.locator('#meta-runner').fill('Lace');
          await b.waitForFunction(() => document.getElementById('meta-runner').value === 'Lace');
        }
      }
      const missing = await context.newPage();
      await missing.goto(`https://forms.test/${form}`);
      assert.equal(await missing.locator('#team-leader').isDisabled(), true);
      assert.match(await missing.locator('.staff-banner').innerText(), /Open an event/);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}

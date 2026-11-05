// Browser integration against an in-memory Firebase adapter; no live credentials required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../public');

for (const form of ['feast/feast-flourish-setup.html', 'foundation/foundation-setup.html']) {
  test(`${form}: realtime setup workflow`, async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
    try {
      const context = await browser.newContext();
      context.setDefaultTimeout(6000);
      let event = { eventType: form.startsWith('feast') ? 'feast' : 'foundation', guests: 80, date: '2026-11-05',
        setup: { teamLeader: 'Alex', staffMembers: ['Sam', 'Jo'] }, during: { teamLeader: 'Other stage' },
        customTasks: [{ form: 'setup', section: form.startsWith('feast') ? 's1' : 's2', label: 'Manager task' }], hiddenTasks: [] };
      const data = {};
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
      async function open() {
        const page = await context.newPage();
        page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
        await page.goto(`https://forms.test/${form}?event=test`);
        await page.waitForFunction(() => !document.getElementById('team-leader').disabled);
        return page;
      }
      const a = await open(), b = await open();
      assert.equal(await a.locator('.staff-input').first().inputValue(), 'Sam');
      const notes = '.notes-row textarea';
      await a.locator(notes).first().fill('Keep my notes');
      await a.waitForFunction(() => document.querySelector('.notes-row textarea').dataset.unsaved === 'false');
      assert.equal(await b.locator(notes).first().inputValue(), 'Keep my notes');
      await a.locator('.item-qty input').first().fill('0');
      await a.waitForFunction(() => document.querySelector('.item-qty input').dataset.unsaved === 'false');
      assert.equal(await b.locator('.item-qty input').first().inputValue(), '0');
      await a.locator('#team-leader').fill('New leader');
      await b.waitForFunction(() => document.getElementById('team-leader').value === 'New leader');
      await a.locator('.staff-input').first().fill('Updated Sam');
      await b.waitForFunction(() => document.querySelector('.staff-input').value === 'Updated Sam');
      assert.equal(event.during.teamLeader, 'Other stage');
      await a.locator('.js-remove-staff').first().click();
      await b.waitForFunction(() => document.querySelectorAll('.staff-input').length === 1);
      await a.locator('.js-remove-staff').first().click();
      await b.waitForFunction(() => document.querySelectorAll('.staff-input').length === 0);
      await a.locator('.js-add-staff').click();
      await a.locator('.staff-input').fill('Added staff');
      await b.waitForFunction(() => document.querySelector('.staff-input')?.value === 'Added staff');
      const cb = '.checklist-item input[type=checkbox]';
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
      event.hiddenTasks = [key]; event.customTasks.push({ id: 'new-manager-task', form: 'setup', section: 's2', label: 'New task' });
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
      if (form.startsWith('feast')) {
        await a.locator('#meta-catering').selectOption('Buffet');
        await b.waitForFunction(() => document.getElementById('meta-catering').value === 'Buffet');
        await a.locator('#meta-sash').fill('Ivory');
        await b.waitForFunction(() => document.getElementById('meta-sash').value === 'Ivory');
        await a.locator('#feast-hall-access-time').fill('14:30');
        await b.waitForFunction(() => document.getElementById('feast-hall-access-time').value === '14:30');
      }
      const missing = await context.newPage();
      await missing.goto(`https://forms.test/${form}`);
      assert.equal(await missing.locator('#team-leader').isDisabled(), true);
      assert.match(await missing.locator('.staff-banner').innerText(), /Open an event/);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}

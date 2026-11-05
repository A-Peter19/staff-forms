const fs = require('node:fs');
const path = require('node:path');

const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));

function listFixtures() {
  return read('manifest.json').cases;
}

// Re-read JSON each time so a test cannot mutate another test's input.
function loadFixture(id) {
  const definition = listFixtures().find((entry) => entry.id === id);
  if (!definition) throw new Error(`Unknown saved-data fixture: ${id}`);
  return { definition, ...read(definition.file) };
}

module.exports = { listFixtures, loadFixture };

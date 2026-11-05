// Keep manager task identity independent of display order and later label edits.
(function (global) {
  global.customTaskId = function (task, occurrence) {
    if (task.id) return task.id;
    const text = JSON.stringify([task.form, task.section, task.label, occurrence || 0]);
    let hash = 14695981039346656037n;
    for (const byte of new TextEncoder().encode(text)) {
      hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
    }
    return 'legacy_' + hash.toString(16);
  };
})(window);

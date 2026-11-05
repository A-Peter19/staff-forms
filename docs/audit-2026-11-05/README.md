# Staff forms audit — 5 November 2026

Start with [the full audit and implementation checklist](audit.md).

This is a source audit of commit `4f5823563c6fd2beecf80196690eeaa9a2a48539`. Source links are pinned to that commit so evidence remains useful after implementation changes.

| File | Contents |
|---|---|
| [audit.md](audit.md) | Findings, per-form comparison, data ownership, implementation checklist, acceptance scenarios and limitations. |
| [field-audit.csv](field-audit.csv) | All 905 static controls with current persistence and intended scope. |
| [form-matrix.csv](form-matrix.csv) | Feature coverage across all 21 staff forms. |
| [field-inventory.csv](field-inventory.csv) | Raw control inventory with source lines and attributes. |
| [inventory.json](inventory.json) | Page structure, controls, buttons and external script references. |
| [annotated-inventory.json](annotated-inventory.json) | Field audit in JSON format. |
| [syntax-results.json](syntax-results.json) | Results of 48 JavaScript syntax checks. |
| [existing-test-result.txt](existing-test-result.txt) | Existing realtime test failure captured during the audit. |
| [inventory.py](inventory.py) | Static HTML inventory extractor. |
| [annotate.py](annotate.py) | Audit-specific field classification and matrix generator. |
| [write_report.py](write_report.py) | Report generator containing the reviewed findings. |

These helpers require Python 3 and the standard library. From the repository root, they can be run in this order:

```sh
python3 docs/audit-2026-11-05/inventory.py
python3 docs/audit-2026-11-05/annotate.py
python3 docs/audit-2026-11-05/write_report.py
```

The classifications and report findings are specific to the audited commit and require human review after source changes. Running these helpers rewrites the inventories/report; it does not rerun the recorded syntax checks or realtime test. Treat the checked-in results as a dated baseline, not proof of current application readiness.

The original test log retains its execution paths as historical evidence. No production database records or credentials were collected. Live Firebase behaviour and permissions were not verified; the report documents the access limitations.

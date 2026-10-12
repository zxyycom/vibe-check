# Actual execution status

Final preparation and formal outer shell used `set -euo pipefail` and returned exit 0.

- Strict: pinned Node `node_modules/.bin/tsc --project harness/tsconfig.json` inheriting project strict configuration; success (empty diagnostic log).
- Lint: Oxlint `--deny-warnings --config lint.json --format json *.ts`; success, 127 rules, zero diagnostics. Earlier pinned check explicitly included the C05 candidate owner (11 files); final helpers retained that same candidate file and passed strict import checking.
- Format: project .oxfmtrc.json, all matched helpers successful.
- Before/after-final smoke: 37 complete serialized outputs and ordered identity parity; success.
- Patch reconstruction: applied exact final src patch to independent baseline clone; reconstructed relative manifest equals after-final byte-for-byte.
- Formal comparison: 10 independent processes, 37 rows x7 batches each, exact AB/BA order, all stdout reports completion, all stderr files empty, summary output consistency checks passed, no omitted samples.
- Source/helper/config/pin identities: before and after successful checks, entire identity logs except timestamp agree byte-for-byte.

No full Gate, installation, network, Git writes or product/repository writes were performed by the measuring agent. Main-thread Gate status is separately reported in results.md, not claimed as measuring-agent execution.

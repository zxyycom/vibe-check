# Cleanup Evidence

## Scope and authorization

2026-09-07，用户明确授权仅清理已经确认**过期或失败产生、无人引用且可重建**的精确本地产物；不得删除 build/artifacts/cache/log 的父目录，不得触碰 current candidate、formal release evidence、活跃输出或无法恢复的历史诊断。本 Change metadata 仍为 `draft`。

## Removed

| Exact path | Size before removal | Origin and deletion basis | Recovery |
| --- | ---: | --- | --- |
| `artifacts/vibe-check/run.json` | 544 B | Contents identify the synthetic `fixture-command` Check, exit code `7`, and a 2026-09-07 invocation. No repository reference uses that invocation ID or records fingerprint. | Run the owning process-check test or a Product Run with the default machine-publication path. |
| `artifacts/vibe-check/records.ndjson` | 223 B | Its sole Record is the same synthetic failed `fixture-command`. Its `checks/.../process.log` reference belongs to the test's temporary root and is not a current workspace diagnostic. | Same as above. |

The two files were removed individually. `artifacts/vibe-check/` remains as an empty parent directory; no parent directory was recursively deleted.

## Preconditions and retained material

- `bun run package:status` reported `0.0.0-local.afada4b41fc8`, `current`, with the expected unpacked build, versioned tarball and installed entry. Those paths were retained.
- Process inspection found no active Bun, Project Gate or package build/release writer for this workspace at deletion time.
- Retained: `build/release-package/` and `build/releases/zxyycom-vibe-check-0.0.1.release.json`; the receipt binds that staging path and a formal versioned tarball path, so the staging/receipt have formal-release evidence value even though the referenced tarball is absent.
- Retained: `.cache/vibe-check/package-candidate/`, `scripts/project/node_modules/@zxyycom/vibe-check/`, and `.log/project-gate/`; they are current candidate state/installation or historical Gate diagnostics.

## Verification and boundary

- After deletion, `artifacts/vibe-check/` had no entries.
- A second `bun run package:status` still reported the same current candidate and paths.
- No build, package preparation, release preparation, Project Gate, installation or source modification was run; therefore this cleanup does not prove a subsequent rebuild or Gate execution.

## Dynamic regeneration follow-up

The unique `fixture-command` identity matches the `reports a safe failure Record and command-failed message for nonzero exit without copying child output` test in `scripts/project/gate/checks/process/process.test.ts` (lines 324–402). At lines 392–395 it supplies legacy `outputs.output`, while `defineConfig` reads only `outputs.machinePublication` (in `src/project-definition/project-definition.ts`, lines 208–216) and the default is enabled at `artifacts/vibe-check` (`src/project-definition/output-defaults.ts`, line 3). The invocation at lines 397–400 sets a Check-local artifact base but no `projectRoot`, so the default machine-publication pair is written under the workspace current directory.

This identifies why the deleted pair can recur; this one-time cleanup cannot prevent it. It is a test-isolation/source compatibility issue, not grounds for a broader deletion. No test or Gate was rerun because either could recreate the pair. Await explicit user authorization before changing the test or output-generation mechanism.

# Active Change Impact

本文件是 layout/naming Implementation 的跨 Change handoff。它不改变其它 Change 的产品契约、stage、任务进度或优先级；它只确定源码迁移时哪些 active artifacts 必须更新、延后恢复或无需动作。

## Portfolio Result

| Active Change / routing owner | Disposition | Evidence and required handoff |
| --- | --- | --- |
| `align-repository-layout-and-naming-with-module-owners` | `not-applicable` | 当前 Plan 是本次迁移 owner；它消费本目录的 baseline、ledger 和本影响清单。 |
| `publish-public-api-only-npm-package` | `update` | Draft 仍把 Product CLI removal 放在 registry-installed replacement 之后，与当前已确认的 pre-release CLI diagnostic removal 冲突。Implementation 1.11 必须把本 Change 的 exact candidate/layout handoff加入 release prerequisite，删除 release-side CLI retirement步骤，并继续保留 registry、credential、version、legal和publish的即时授权边界。 |
| `define-project-run-log-evidence-boundaries` | `not-applicable` | Draft 使用稳定 Architecture/Output/Script Tooling owner和 `.log/project-gate/<unique>` evidence contract，没有 current source-path handoff；本 Change不重写其 future logging判断。 |
| `add-file-policy-overrides` | `defer` | Plan 基线距当前 HEAD 117 commits / 296350 lines；proposal仍用 broad `src/product/**`。Implementation 1.11只增加显式 resume gate并链接本 ledger，不机械选择其未来 policy modules；恢复时完成当前 owner语义审阅并重新运行 `change-plan -- plan`。 |
| `add-json-schema-validation` | `defer` | Plan 基线距当前 HEAD 117 commits / 296348 lines；旧 `src/product/**` 和 schema-engine位置不是可执行 target。恢复时先按当前 Definition/Checks/Foundation owners重做 dependency和license审计，再刷新 Plan。 |
| `add-json-validation` | `defer` | Plan 基线距当前 HEAD 117 commits / 296348 lines，仍描述已退出的 JSON config/CLI和旧 capability/machine事实。Implementation不得机械换路径使其看似 current；恢复时先重审产品结果与 owner，再刷新 Plan。 |
| `add-markdown-link-validation` | `defer` | Plan 基线距当前 HEAD 117 commits / 296348 lines；future Markdown/link owner必须在新 Checks布局下重新确认。Implementation 1.11增加 resume gate，详细 parser/handoff不在本 Change决定。 |
| `add-markdown-structure-validation` | `defer` | Plan 基线距当前 HEAD 117 commits / 296348 lines；旧 `src/product/**` service路径不构成目标模块决定。恢复时先确认 shared document boundary仍成立，再刷新 Plan。 |
| `add-network-link-validation` | `defer` | Plan 基线距当前 HEAD 117 commits / 296342 lines；网络授权与 SSRF边界保持原 owner，具体 resolver/transport路径等待其自身恢复审阅。 |
| `add-path-reference-validation` | `defer` | Plan 基线距当前 HEAD 117 commits / 296344 lines；future segment/index/Check binding不能由本次目录 ledger代选。恢复时按新 Checks和input owners重做 handoff。 |
| `add-secret-detection` | `defer` | Plan 基线距当前 HEAD 117 commits / 296342 lines；安全边界继续有效，detector/policy/runtime位置等待 fresh semantic review，不能由机械 rename决定。 |
| `port-lizard-function-metrics-to-typescript` | `defer` | Plan 基线距当前 HEAD 117 commits / 296346 lines；current Lizard implementation将迁到 `src/checks/measurement/scanners/lizard/**`，但 future TypeScript analyzer仍受 fresh compatibility/provenance/license门禁。Implementation 1.11增加新 current path和 resume gate，不勾选其任务。 |
| `changes/active-change-portfolio.md` | `update` | Current routing必须加入本 layout/naming Plan，说明上述 deferred Plans在本 Change完成后必须消费新 ledger/current owners并刷新 baseline。 |
| `changes/vibe-check-package-and-gate-delivery.md` | `update` | Package delivery顺序必须在 publish Draft前插入本 Change；candidate input变化后重新 prepare/audit，不能使用本 baseline tarball作为未来 release evidence。 |

`defer` 不表示废弃、归档或降低优先级。它表示旧 Plan 的 detail 不是本次迁移的实施输入；Implementation 1.11只写入醒目的恢复门禁和确有唯一答案的 current owner/path，不替旧 feature作产品决定。

## Implementation Batches

| Batch | Owner cluster | Required close before next batch | Rollback boundary |
| --- | --- | --- | --- |
| A | Product root、`src/index.ts`、Definition、public inventory/defaults、CLI removal | public inventory/default tests、Definition tests、Product typecheck；`product:cli`、CLI test和Case同时退出 | 只回退本 cluster 的 moves/renames/imports与 CLI closure；不保留双入口。 |
| B | Checks、Core、Output、Run、Scheduler、Product Foundation | 每个 owner focused tests、machine fixture bytes、Product import graph和typecheck | 每个 owner cluster独立；不跨 cluster保留 barrel或 compatibility alias。 |
| C | scripts Foundation、Validation、Docs、Environment、Decision/Test Evidence commands | scripts focused tests、docs validation、Decision/Test Evidence checks、scripts typecheck | 每个 capability directory独立；root package command只在目标 entry可执行后切换。 |
| D | private `scripts/project` consumer、quality/Gate、package artifact/candidate | candidate rebuild、receipt invalidation、isolated consumer、quality和Gate focused tests | project consumer与package lifecycle分别闭合；失败时恢复同一 exact旧 consumer，不接受 ancestor install。 |
| E | configs、current owner docs、Cases、routing docs与 active Change handoffs | ledger completeness、Test Evidence closure、Decision/Change/docs checks、required/full Gate | 只同步 current references和defer notices；archive、formed Decision和investigation bytes不改。 |

每个 batch 使用 ledger 的 `verification` 加上受影响 owner tests作为最低证据。Batch 内允许 source 与直接消费者原子移动，但 batch结束时不能留下 TypeScript、root command、Case或owner-doc破损。

## Start Gate Review

| Condition | Result |
| --- | --- |
| Baseline commands and failures classified | passed；见 `baseline-evidence.md`，无未归因失败 |
| Every tracked source/test/config/current-doc/Case handoff covered | passed；ledger含 322 unique source entries并通过 strict schema和cross-field assertions |
| Target path uniqueness and naming policy | passed；320 unique non-delete targets，唯一 `index.ts` target为 `src/index.ts`，无未解释泛化 basename |
| Public rename or new first-level owner required | no；approved public inventory不变，一级 owners仍为 Decision确认集合 |
| Extra `index.ts` exception required | no |
| Active Change conflict classified | passed；publish Draft标记 `update`，旧 feature Plans标记 `defer`，log Draft为 `not-applicable` |
| External publish action required | no；registry、credential、version、legal和publish仍在独立 release Change |

**Readiness conclusion:** start gate passed for Implementation task 1.1 after this Plan snapshot is committed. This conclusion authorizes repository-local implementation only; it does not authorize registry reads/writes, credential access, release version selection or publish.

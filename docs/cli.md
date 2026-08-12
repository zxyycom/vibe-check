# CLI

## 产品入口

正式入口为 `bun run product:cli -- scan [project-root]` 与 `bun run product:cli -- init [project-root]`。`scan` 归一化 project root，先验证参数和 explicit baseline，再选择 configuration，最后调用 Product Core；`init` 不启动 scan work。

## Scan flags

| Flag | 当前行为 |
| --- | --- |
| `--profile <quick|full>` | 默认 full；quick 跳过 baseline comparison 与 duplicate detection。 |
| `--gate <all|changed|regressions>` | 选择 current adapter 的 named DecisionPolicy。 |
| `--baseline <revision>` | full comparison 的显式 locally available Git revision；在 work 前冻结为 commit identity。 |
| `--changed-files <file>` | project-relative list input；读取失败是 actionable error。 |
| `--config <file>` | complete semantic config，优先于 discovery。 |
| `--artifact-dir <dir>`、`--top-n <n>` | config 的 CLI presentation overrides；`--top-n` 在 config resolution 后覆盖 `report.topN`，只限制 `report.md` 每个 record section。 |
| `--skip-baseline` | 请求 default current-snapshot-only scan，不能和 `--baseline` 合用。 |
| `--verification-output` | 只选择 accepted-record-aware 人读 status。 |

`changed`、`regressions` 要求 `--profile full --baseline <revision>`；quick 只可使用 `all`。缺失、重复、非法或不兼容输入在 scan work、config selection、dependency snapshot、cache 与 artifact I/O 前以 usage exit `3` 失败。三个 gate 拼写不进入 Core；它们只由 adapter 映射为 policy。

## Console 与 artifacts

console 显示 config provenance、profile、同源 quality/verification status、固定最多 5 条 record previews、trusted paths 和 completion/outcome。artifact directory 成功时包含 `run.json`、`records.ndjson`、`report.md` 及可选 `raw/**`；machine set 的 field/byte/invariant owner 是 [Output](output.md)。

## 进程状态

| Outcome | Exit |
| --- | --- |
| success（含 disabled/passed policy） | 0 |
| gate-failed（validated publication 后的 failed policy） | 1 |
| failed（not-evaluated、runtime 或 publication failure） | 2 |
| usage/config | 3 |

Output failure 优先于 computed policy。`--verification-output` 不改变 artifacts、GateResult、completion 或 exit。

## Dogfood wrapper

`quality:check`、`quality:full-check`、`quality:scan` 与 `quality:gate` 以及 `scripts/quality/scan.ts` 都显式传入仓库 root 并单向调用本入口。前三者保持 omitted gate；`quality:gate` 请求 full `regressions` 并只透明转发调用者显式 baseline，不推断 comparison target。

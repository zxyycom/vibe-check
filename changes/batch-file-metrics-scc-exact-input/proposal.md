# Proposal

`fileMetrics` 的私有 SCC adapter 将大型 exact-path union 分批传输，并保持一次逻辑 measurement 的完整结果、资源与失败边界。

## Why

调用方在 Windows 上观察到一次 repository-quality `fileMetrics` 扫描选择约 620 个文件，并形成约 34,941 个字符的 SCC argv；该长度超过 `CreateProcessW` 的 32,767 UTF-16 code-unit 上限，使 Check 在产生可信 measurement 前失败。

SCC 4.0.0 可以接收多个文件或目录，但没有可用的 response-file、stdin file-list 或位置 glob 协议。改传目录会让 SCC 重新发现文件，破坏 Check 已批准 exact paths 的 ownership；扩大 public scanner options 或更换 SCC 也不是修复该 transport 故障的必要条件。

因此应把“一次逻辑 exact-input measurement”与“一次 OS process invocation”分开。分批只能改变 SCC adapter 的私有传输方式，不能发布部分结果、扩大输入、重置逻辑资源预算或改变 public contract。

## Outcome

`fileMetrics` 将任意单路径可安全编码的 approved exact-path union 作为一次全有或全无的逻辑 SCC measurement：安全预算内仍执行一个 measurement process，超出预算时稳定分批；只有全部批次成功且结果可信时才返回统一 measurement，任一批失败都沿现有 unavailable taxonomy 拒绝完整结果。

## Scope

### Intended Change

1. 在 `src/package-checks/file-metrics/scc/**` 内增加平台无关、确定性的 argv partition planner。它按 Windows UTF-16 command-line 保守上界计算 executable、固定 SCC 参数、分隔、终止 NUL 与每个 exact path；production ceiling 不超过 `28_000` code units，并由同一 Change 的性能曲线在安全候选中收敛。
2. `measureFileMetrics` 继续只执行一次 SCC availability probe；`scanWithScc` 随后按 planner 顺序执行一个或多个固定 `--no-config --by-file --format csv` 的 measurement batches。
3. 每批在汇合前完成 process、CSV 与 batch-local exact-scope 验证。全部批次成功后拒绝重复 measurement path、按 path 稳定排序，并返回一个统一 `SccScanResult` 交给现有 full-union acceptance 与 Record conversion。
4. 300 秒 measurement timeout 作为所有 batches 共享的单调 deadline；现有 64 MiB process output 上限作为 stdout、stderr 各自跨 batches 的累计预算。预算耗尽时拒绝逻辑 scan，不启动已知无法完成的后续 batch。
5. 用固定 stock SCC 4.0.0、约 620 个文件/34,941 个路径字符的可复现 workload，测量当前单进程基线、每进程冷启动和不同 batch sizes/ceilings 的完整逻辑 scan 曲线；记录 invocation count、wall-time median/p95、结果等价性，并生成可读曲线图。
6. 初始曲线形成后创建完整 Investigation candidate；最终 runtime 用同一 workload 复测后补入 before/after 结果并发布。报告及受管资源保存实际执行的 benchmark harness、原始/汇总数据、曲线图、阈值选择和不可外推边界，并以“补充”关系指向 `260912-diagnose-file-metrics-scc-windows-argument-limit`；没有实际测量前不创建空 candidate。
7. planner、预算、批次数与内部失败细节保持 adapter 私有；不新增 authoring/resolved option、fingerprint、Record、machine output、package export 或共享 scanner abstraction。

### Resulting Impacts

- `src/package-checks/file-metrics/scc/scanner.ts` 从单 process wrapper 变为顺序 batch workflow；纯 planner 或预算 helper 只有形成独立职责时才拆到同一 `scc/` owner 的相邻模块。
- `src/package-checks/file-metrics/scc/scanner.test.ts` 增加 partition、merge、batch-local scope、后续批失败、单路径不可传输和累计预算证据；现有 SCC adapter Case 与仍写有“one SCC invocation”的 file-metrics scope Case 必须按实际测试目的同步。
- `docs/checks/file-metrics.md` 将“一次交给 SCC”改为“一次逻辑 scan，可由多个有界 process batches 承载”；`docs/development/scanner-dependencies.md` 固定 transport batching、exact-input ownership、资源与整批拒绝边界。
- `docs/investigations/` 增加一份性能调查报告及必要的文本/CSV 资源，保存 batch-size/cold-start 曲线、环境、样本、阈值选择与证据边界；该报告不替代 runtime、测试或稳定 owner。
- 用户可观察到 Windows 大输入从 `unavailable / external-execution-failed` 恢复为正常 measurement；完成前须由非实施代理从实际 diff 反查用户说明、内部 owner、测试证据与未改变的 public API。
- 该 Change 不修改 `scripts/project/gate/checks/repository-quality.ts`、通用 process runner、project-files collection、schema、示例或 package exports。若实现必须触及这些边界，先修订 Change artifacts 及受影响 owner，不顺手扩大范围。

## Success Criteria

1. planner 使用 `1 + separators + Σ(2 × argument.length + 2)` 的 UTF-16 code-unit 上界；`argument.length` 按 JavaScript UTF-16 code units 计数。production ceiling 不超过 `28_000`，输入顺序不变、批次非空且每个 exact path 恰好出现一次；任一单路径无法独立装入时，在启动 measurement process 前返回 execution failure。
2. 安全预算内的普通输入仍只启动一个 measurement process；超预算输入启动多个顺序 batches，并只在全部 process、CSV、batch-local scope 与 aggregate uniqueness 验证通过后返回按 path 稳定排序的统一结果。
3. 任一 batch 的启动、timeout、output budget、exit、CSV、越界 path 或重复 measurement 失败都拒绝完整 logical scan；已完成 batch 不产生部分 metric、Finding、waiver audit 或 Record。
4. measurement batches 共用 300 秒 deadline，stdout 与 stderr 各自累计不超过 64 MiB；availability probe 继续保持自己的既有 process 边界。
5. `fileMetrics` 的 constructor、resolved options、fingerprint、final data、Records、machine schema、package exports 和 SCC 4.0.0 固定协议均无新增 public 字段或状态。
6. benchmark 在同一 host/profile/corpus 上比较单进程基线，以及每批 `1/5/10/25/50/100/200/310/620` 个文件和候选 ceiling `8_000/12_000/16_000/20_000/24_000/28_000`；经过 2 轮不计入结果的 warm-up 后至少测量 10 轮，报告完整 logical scan wall-time median/p95、invocation count、单进程冷启动、输出等价性及 batch size/ceiling 到 wall time 的曲线。
7. 在不超过 `28_000` 的候选中，选择 median 不高于最快候选 `110%` 且 p95 不高于最快候选 `115%` 的最小 ceiling；若噪声或结果不满足选择条件，先修正 benchmark 或 Plan，不凭直觉定值。形成的 Investigation 可独立复核输入、环境、数据、选择和未知。
8. 最窄 SCC/file-metrics tests、Test Evidence closure、typecheck、lint、文档验证与完整 `bun run check` 通过；非实施代理完成基于实际 diff 的行为/文档反查。
9. 自动证据明确区分纯 planner、当前平台 stock/fake SCC integration 与真实 Windows acceptance。真实 Windows 运行不是合入硬门禁；没有 Windows runner 时必须保留端到端未验证边界，不能把当前平台证据表述为真实 Windows 验收。

## Affected Owners

- Runtime：`src/package-checks/file-metrics/scc/scanner.ts` 及必要的同目录私有 helper。
- Check integration：`src/package-checks/file-metrics/measurement.ts`（只在统一结果或 deadline 接线需要时修改）。
- Tests / Case evidence：`src/package-checks/file-metrics/scc/scanner.test.ts`、必要的相邻 integration tests，以及 `docs/testing/cases/check-owned-scanners.md` 中受影响 Cases。
- User contract：`docs/checks/file-metrics.md`。
- Internal scanner contract：`docs/development/scanner-dependencies.md`。
- Performance evidence：任务 2.1 发布的 `docs/investigations/` 后继报告及其受管资源。
- Change coordination：`docs/governance/change-coordination.md`。

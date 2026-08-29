# Design

本设计让质量事实和性能观察各自留在正确 owner：ordinary quality Checks 直接进入 Gate Run，performance observer 只后处理 Gate result。

## Context

- **计划形成时：** Gate 有 32 个 direct Checks；其中四条 product quality test lanes 是实现测试，不扫描当前仓库。旧 quality Definition 的 repository file selection、code areas 与 policies 仍可从 Git 基线恢复，但它的 wrapper、独立 Run、outputs 与 scheduler 不再有消费者。Gate 的 `afterGate` 已提供 immutable initial result 和包含 timing 的完整 Gate-owned context，但 default hook 是 identity。
- `make-bun-entries-use-pinned-tools.md` 与 mise 配置要求正式 scanner workflow 不使用 ambient PATH。
- **当前已验证（2026-08-29）：** required/full 在同一 Gate Run 中直接执行四项 raw quality Checks；这些 entry 都是 `quality`-tagged、`contributesToAggregate: false`，因此保留 raw outcome 与 Records，但不进入 assurance aggregate。mise binding 和直接注入的 SCC/Lizard command 都必须是绝对路径；缺失或相对值会被替换为不可用的绝对 command，owning Check 结算为 `unavailable`，不回退 ambient `PATH`。
- **当前已验证（2026-08-29）：** 默认 `afterGate` 已接入 performance observer。标准 required 样本为 `[9278.3, 14673.0, 8539.4, 8426.0, 8362.3]ms`，median `8539.4ms`、nearest-rank p90 `14673.0ms`、threshold `18342ms`；full 为 `[23195.2, 16219.4, 17297.0, 18005.7, 14029.0]ms`，median `17297.0ms`、nearest-rank p90 `23195.2ms`、threshold `28994ms`。每条 baseline 以 raw samples 重算 median、p90 和 `ceil(max(p90 * 1.25, median * 1.5))`；无效 baseline 只产生 `not-comparable`。它是 `linux/x64`、Bun `1.3.14`、reuse current install 开发机 workload 的 advisory observation，不是 budget。
- **当前已验证（2026-08-29）：** bound Gate Run 在同一 invocation directory 写入恰一份 core diagnostic、标准 `run.json` / `records.ndjson` 和对应 process transcripts；这是本地 invocation evidence，不是 quality 专用或 release artifact。machine-evidence integration fixture 只选择 quality observations：它断言四项 outcome identity 都存在且未因 `quality` tag 禁用；`records.ndjson` 可以为空，非空时逐行确认 Record 属于这四项之一。其 20 秒是 `node:test` harness timeout，不是性能预算。
- **当前 raw quality 结果（2026-08-29）：** 真实 required/full Gate artifacts 证明 `duplicate-detection` 为 passed（0 findings），`file-metrics` 为 failed（27 findings），`function-metrics` 为 passed（129 non-blocking findings），`markdown-link-validation` 为 failed（2 findings），并合计发布 158 行 Records。failed facts 没有进入 aggregate；同次 Gate aggregate 为 passed 不表示 repository quality 已通过。

## Goals / Non-Goals

目标是恢复真实 repository quality observations、保留 Check-owned policy/Records，并建立低噪 advisory 性能观察。非目标是恢复 quality 短命令、嵌套 Run、quality 专用 machine publication、通用 hook chain、逐 Check budget、跨主机硬门禁或主动性能优化。

## Decisions

### Intended Change

1. 在 Gate project policy 模块中构造四个 package ordinary Checks，并作为独立 `ProjectGateEntry` 进入 required/full；不建立父 quality Check。entry 明确区分 assurance 与 non-blocking observation，四项 quality Checks 保留原 policy 和 raw status但不进入 assurance aggregate。
2. 正式 root scripts 通过 `mise exec` 启动 Gate。mise private environment 提供 SCC/Lizard 的绝对 executable；Gate 对缺失或相对值改用自己的不可用绝对 command，再显式传给 owning Check；jscpd 继续由安装 candidate 自解析 package dependency。
3. 新增一个 Gate-private performance baseline value 和一个纯 observation/comparison function。default `afterGate` 使用它，并严格保留输入 result status；超界只追加 warning。
4. baseline 只覆盖无 tag override、candidate reuse 的标准 required/full profile。样本在同一 worktree、锁定 runtime/toolchain 和无并发 Gate 下交错采集；threshold 由实际分布和保守容差形成。它是开发机 advisory comparison，不是性能 budget 或 merge gate。
5. bound Gate Run 将现有 machine publication directory override 到 invocation directory。标准 machine fact set 保留全部 Gate Check final data 与 Records；不建立只含 quality 的筛选文件。

### Resulting Impacts

1. `definition.ts` 的 raw membership、expected IDs、profile/disabled-tag tests 与 aggregate exclusion 必须覆盖四项直接 observations；quality tag 只作为这四项的有界筛选，不作为父包装身份。
2. 正式命令、package verify child 和 help/docs examples 必须指向同一 mise-bound root；focused unit tests通过依赖注入或 fixture environment，不依赖开发者 ambient tools。
3. root maxParallel 保持 3；四项 direct Checks 加入后以最终标准 required/full 样本复测 elapsed 和 longest Checks。该测量不把 timing observation 变成调度或 merge budget；若需改变调度，另建 Change。
4. performance observer 只使用 context facts，不读取文件日志；不匹配 baseline、initial non-passed 或 malformed duration 时返回 observation/not-comparable，同时保持原结果。
5. 测试正文与 Case owner/proof 同步维护；private baseline 数值是项目 workflow evidence，不成为 Product public contract。
6. machine publication failure 使用既有 output failure；quality-only integration fixture 只证明同次 machine files 可读、四项 outcome identity 存在且未因 `quality` tag 禁用，并在非空时验证每条 Record 的 quality ownership；它不要求 Records 非空或每项 outcome 必有 `data`。本次真实 required/full Gate evidence 则证明四项 final data 与 158 行 Records 可回读，而不是解析 core diagnostic text。fixture 的 20 秒 `node:test` harness timeout 不构成性能预算。

## Risks / Trade-offs

- 真实 quality findings 会以 producing Check 的 failed/passed 终态出现在同次 Run；它们当前不改变 assurance aggregate。后续升级阻断必须修改 entry policy，而不能改写 Check outcome 或为保持绿色调低 finding policy。
- scanner 与测试并发可能放大 wall time；先保持现有 scheduler，再用相同 workload 复测，避免同时改 membership 和调度导致归因不清。
- advisory 不会阻止已知性能退化合并，但能先建立可信观察；它不是性能 budget，硬门禁需要受控环境和单独确认。
- Gate progress 能显示质量终态与摘要，具体 finding 由同次 machine fact set 的 Check Records 承接。该目录是短期本地 evidence，会包含 prepared candidate 绝对路径，因此不能用作 release artifact。

## Open Questions

无。membership、scheduler、runtime 或 toolchain 改变时，旧 baseline 不再代表当前 workload；必须重新交错采样，而不是只提高阈值消除告警。

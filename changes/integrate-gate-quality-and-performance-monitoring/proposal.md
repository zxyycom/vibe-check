# Proposal

本 Change 计划让 Project Gate 直接结算当前仓库的四项原始质量 Checks，并用既有 Gate-owned hook 对标准 invocation 的 wall elapsed 做可审阅的性能提示。

## Why

本计划形成时，删除 `repository-quality` 外层 process wrapper 后，Gate 不再扫描当前仓库的 duplicate、file metrics、function metrics 与 Markdown local-link 质量；现有同名 test lanes 只证明这些 package Checks 的实现。与此同时，Gate 已有完整 `afterGate` context，却没有默认性能 observation 或经测量的合理区间。这些是计划形成时的缺口，不替代下述当前实施与验证事实。

## Outcome

required/full Gate 在同一个 bound Product Run 中直接执行四项仓库质量 Checks，保留真实终态与 Records，并把它们作为显式 non-blocking observations 排除在 assurance aggregate 之外。正式运行使用锁定 scanner 工具。每次 Gate 还会通过默认 `afterGate` 输出 elapsed；只有完整匹配已测标准 workload 时才给出 within-range 或 outside-range advisory，超界不改变原 Gate status。该 baseline 只是特定开发机上的 advisory observation，不是性能预算、merge 条件或跨环境承诺；其它 profile、tag override、candidate rebuild 或 runtime identity 仍只给出 `not-comparable` observation。

## Scope

### Intended Change

- 把原 repository policy 的 `duplicate-detection`、`file-metrics`、`function-metrics` 与 `markdown-link-validation` 直接加入 Gate Definition，并以 entry metadata 明确它们是 non-blocking observations；删除包装层不再恢复。
- 让正式 Gate root commands 和 package verify 内部 Gate invocation 进入仓库锁定 mise 环境；Gate 将 SCC/Lizard 绝对 executable 作为项目私有配置交给 owning Checks。
- 使用现有唯一 `afterGate` 接入一个纯 Gate-owned performance observer；记录匹配条件、重复样本和 advisory threshold，输出本次 elapsed 及比较结论。
- 在同一 Gate invocation directory 启用既有标准 machine publication，使直接质量 Checks 的 final data 与 Records 在进程结束后可检查；不建立 quality-only schema 或二次报告器。
- 同步 Gate catalog/selection/tests、stable docs、Case/Test Evidence 和长期 Decision；不新增 Product public observer、日志 parser、独立 quality 命令或二次报告器。

### Resulting Impacts

- Gate membership 从仅包含质量实现测试扩展为同时包含四个真实 repository checks；四项 raw terminal facts 保持可见，但 required/full assurance aggregate 不消费这些 observation。
- 三个 scanner Check 会增加外部进程和 root scheduler contention；旧三路调度测量只能作为方向，完成后必须重新测量标准 workload。
- 质量 finding 仍由 producing Check Records 表达；Gate progress 只呈现终态和 Check-owned message，不按 Record 内容重算结果。
- invocation directory 除单份 core diagnostic 与 process transcripts 外会增加标准 `run.json`/`records.ndjson` machine fact set；其中 invocation-local 路径不构成发布材料。
- 性能比较只对与 baseline identity 完整匹配的 workload 有意义；candidate rebuild、tag override 或环境不匹配仍输出 observation，但不能被判断为退化。

## Success Criteria

1. required/full Gate 的 raw identities 直接包含四项 repository quality Checks，不存在 `repository-quality` process、嵌套 Run、独立 quality output 或 `bun run quality`。
2. 四项 quality Checks 使用原文件/area/finding policy并保留真实终态/Records；entry 明确把它们排除在 assurance aggregate 之外，不改写 producing Check outcome。
3. 正式 Gate roots 使用 mise 锁定 toolchain，SCC/Lizard 不从 ambient PATH 解析；mise binding 或直接注入的 command 缺失或相对时，Gate 只交给 owning Check 一个不可用的绝对 command，使该 Check 按普通 scanner boundary 结算为 `unavailable`。
4. 默认 afterGate 对每次 invocation 输出 elapsed；只有对完整匹配已测 baseline 的标准 workload 才做 advisory 比较，不匹配时明确为 not-comparable，warning 不改变初步 status 或 exit。
5. 同次 invocation 的标准 machine facts 可回读四项质量 Check 的 final data，以及它们实际产生的 Record rows；publication failure 不伪装为成功，不恢复 quality 专用 artifact，也不从 core diagnostic text 推导 Records。
6. 重复基线测量、最窄测试、Test Evidence、docs/Decision/Change checks，以及 required/full Gate 验证覆盖上述边界。

## Affected Owners

- `docs/script-tooling.md`：Project Gate membership、正式入口、invocation evidence 与 performance observer 规则。
- `docs/quality-metrics.md`、`docs/scanner-dependencies.md`：raw quality facts、aggregate exclusion 与 scanner binding 边界。
- `docs/testing/cases/repository-tooling.md`：Gate catalog、hook、machine evidence 与 root command 的直接测试证据。
- `docs/decisions/observe-repository-quality-checks-inside-project-gate.md`、`docs/decisions/publish-project-gate-machine-facts-with-invocation-evidence.md`、`docs/decisions/monitor-project-gate-performance-advisory.md`：跨 Change 持续有效的方向；派生的 Decision index 不作为独立内容 owner。

# Tasks

本 Plan 按冻结路径 authority、owner channels、Gate hard cut 与可审计验证的依赖顺序实施；所有 checkbox 仅在相应产物与证据实际完成后勾选。

## Readiness

- [x] 0.1 从 `docs/navigation.md` 读取 Product、Configuration、Output、Script Tooling、Testing 与 coding-style owner，并审计 `src/**`、`scripts/project/**`、process artifacts 及相邻测试的现有 path/output/write/failure 边界。
- [x] 0.2 在实施前确认三条 active + unaligned 后继 Decision 与本 Plan 的 authority、owner、hard-cut、machine canonical ownership 一致；发现新的跨 Change 长期判断时先按 `decision-records` 处理。
- [x] 0.3 为 `ResolvedInvocationPaths`、public Check projection、RunControls output overrides、diagnostic readback 和 Check artifact base 写出最小契约矩阵，覆盖 relative/absolute authoring、disabled/null、standalone caller 与 Gate exact directory。
- [x] 0.4 盘点 `gate.log`/console-stream patch、single diagnostic sink、machine root target、process/test-evidence transcript closure、existing docs/examples 与每个受影响 native test/Case；维护测试前先运行 Test Evidence check。
- [x] 0.5 为 Check ID filesystem-safe encoding 明确确定性、collision prevention、raw ID preservation 与不可访问 sibling namespace 的实施/测试准则；不把 persistent cache、candidate state 或 external-tool workspace 纳入 invocation context。

## Implementation

- [x] 1.1 在 Product invocation creation 建立唯一冻结的 internal resolved path representation，一次解析 project root、evidence targets、owner channels、Check artifact base 与 cross-run state boundary；删除后续 phase/closure 的重复解析。
- [x] 1.2 以最小只读 projection 扩展 executable `CheckExecutionContext` 和 callback assembly，提供 shared invocation identity、absolute project root 与本 stable Check ID 的 artifact directory；未配置 base 时为 `null`，不暴露 owner path map 或其它 owner capability。
- [x] 1.3 更新 RunControls、Project Definition normalization 和 output readback，使 caller 仍通过一个 top-level `diagnosticLogging` 入口选择输出，并取得 aggregate diagnostic status 及 per-channel file/status map，保留既有 failure-priority 与四态语义。
- [x] 1.4 将诊断实现重构为 owner-neutral router：在写前分配 Product-global sequence 与 monotonic elapsed，并隔离 Core、Scheduler、learned-admission writer 的 setup/write/close failure；static/custom policy disabled 不创建 learned file，history unavailable 仍产生 enabled channel evidence。
- [x] 1.5 将 Core、Scheduler 与 learned-admission event projection 路由到各自 owner channel：scheduler graph 每 invocation 完整一次并生成 fingerprint，decision 保留全部动态 facts；删除已由 machine/progress canonical owner 保存的 Record/final-data/messages/durations 重复。
- [x] 1.6 让 progress renderer 显式拥有 terminal tee 与 `progress.log`，呈现完整 per-Check duration（未执行为 `null`）；让 Gate 仅写 adapter/`afterGate` messages，移除全局 console/process stream patch 及旧混合 transcript。
- [x] 1.7 以 stable Check ID 安全编码创建 `checks/<encoded-check-id>/` artifact namespace，迁移 process 与 test-evidence rule-test writers/readback/failure/terminal references，移除 Definition closure 的 `invocationLogDirectory` handoff，并禁止旧 `process/<check-id>.log` 产生。
- [x] 1.8 将 Gate machine output target 调整为 `<invocation>/machine/`，保持 v4 `run.json`/`records.ndjson` canonical bytes、schema、atomic publication 与 output-failure behavior，不创建额外 invocation layer。
- [x] 1.9 同步 Architecture、Configuration、API mechanics、Output/Output maintenance、Script Tooling、Testing、schemas/examples/package API 与 Test Evidence materials，使 owner/path/status/correlation、hard cut 和 machine-byte boundary 可由当前文档直接恢复。
- [x] 1.10 新增或更新覆盖 owner isolation、path resolution、Check namespace collision、channel correlation、graph-once/fingerprint、payload de-duplication、duration presentation、disabled learned channel、partial writer failure、machine namespace/canonical bytes 与 old-path absence 的最窄 Product/Gate tests；按 Test Evidence 规则维护 Case owner/proves/catalog。

## Verification

- [x] 2.1 对每个被改 native test、fixture、Case 或 `Owner`/`Proves` 运行最窄目标测试，并在测试维护前后执行 `bun run test-evidence -- check --root .`；审阅 Case 账本确认每个新增/修改证明义务独立且闭合。
- [x] 2.2 执行受影响的 Product、machine-output、diagnostic、progress、Project Gate、process/test-evidence transcript 测试，验证路径 authority、writer failure attribution、hard-cut absence 与 canonical bytes 的完整行为边界。
- [x] 2.3 执行受影响 scope 的 format check、lint、typecheck、docs/schema/examples validation 与 dependency/entry checks；按 `docs/coding-style.md` 完成正确性、边界、错误处理、命名、类型与未授权副作用审阅。
- [x] 2.4 对最终 implementation、Decision、Change 与 stable owner 文档进行 AI-ready review：删除过期/重复说明，明确 authority、owner、lifecycle、disabled/failure semantics、唯一入口及可验证引用，确保目标契约不被表述为已实现事实。
- [x] 2.5 运行 `bun run decisions -- check`、`bun run change-plan -- check changes/provide-invocation-path-context` 与受影响 docs validation；实现、owner docs 和验证证据成为当前事实后，按 `decision-records` 核对三条后继的 alignment。
- [x] 2.6 运行日常 required Project Gate `bun run check`，保存可复核的 invocation evidence；仅在发布/显式全量授权时运行 `bun run check -- --all`，不以它替代 required Gate。
- [x] 2.7 归档前逐项审阅 Success Criteria、所有 task evidence、stable owner 同步、Decision alignment、Plan Git distance、`bun run decisions -- check`、`bun run change-plan -- check changes/provide-invocation-path-context` 与 required Gate；获得单独归档授权后才运行 archive。

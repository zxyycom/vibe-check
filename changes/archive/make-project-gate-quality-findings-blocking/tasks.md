# Tasks

任务按先核对配置与现有证据、再实施、最后完成 focused validation 和 alignment 核对的顺序执行。

## Readiness

- [x] 0.1 已恢复直接相关 Decision、Gate/quality owner、Change/Case workflow，并确认 package defaults 与 Gate policy 是两个不同配置层。
- [x] 0.2 已在测试改动前运行 Test Evidence closure，并定位四项 configuration、settlement 与 aggregate 的现有证明入口。

## Implementation

- [x] 1.1 将四项 repository-quality Gate Check 的顶层 explicit `findingPolicy` 收紧为 `blocking`，不改任何阈值、scope、exclusion、waiver、flags、required、aggregation 或 Record contract。
- [x] 1.2 更新/补齐 configuration、real settlement/aggregate、zero-Finding 和 waiver/exclusion 保持不变的最小测试证据；不建立第二聚合实现。
- [x] 1.3 更新 `docs/script-tooling.md` 的当前 Gate policy、required/`--quality`/`--all` 与仅 Markdown link validation 的 `--docs` selection 影响，以及 package-default 分层说明。
- [x] 1.4 将本 Change 实施事实和已执行验证同步到 artifacts，并在完整事实到位后核对 Decision alignment。

## Verification

- [x] 2.1 运行最窄 Gate configuration/definition 和四项相关 Product settlement tests，证明 bad Finding→owning Check failed→Gate aggregate failed，0 Finding→passed。
- [x] 2.2 运行 Test Evidence closure、Decision check、Change check、docs validation 与受影响 scripts/product type/lint/format checks。
- [x] 2.3 在当前 0-Finding 状态运行 `bun run check -- --quality`，确认 focused Gate passed 且没有 quality Records。初阶段不运行 default 或 `--all` Gate；完成后的明确授权下，恰好一次 default `bun run check` 以 31 passed、0 failed、5 not-applicable 通过，machine Records 为零；`--all` 仍未运行。
- [x] 2.4 审阅最终 diff、Change 任务状态、Decision alignment 与未运行边界；最终授权允许在 default Gate 通过后由 Change CLI 归档并创建一个 scoped commit。不得手动 push 或绕过已配置的 commit hook。

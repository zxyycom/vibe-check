# Tasks

先锁定 invocation-only 命名边界，再实施与验收；完整证据后才能标记决策 aligned。

## Readiness

- [x] 0.1 确认用户只简化现有命名，审阅默认共享目录、Gate public entry、writer/readback 和兼容边界。
- [x] 0.2 独立审查最小方案，确定封闭 RunControls opt-in 与每 channel exclusive-create，不新增目录或私有通道。

## Implementation

- [x] 1.1 实现 controls type/closed validation 与 invocation path 选择，保持默认命名、UUID/timestamp 和 fingerprint。
- [x] 1.2 Gate 中央 bound controls 选择固定 channel 文件名，同步实际 consumer 断言。
- [x] 1.3 同步 Decision、用户/内部/Gate 文档与相应 Case，说明部分 channel failure 和非事务边界。

## Verification

- [x] 2.1 运行最窄 controls、naming、collision、facts/readback、default/disabled 与 Gate integration tests；Test Evidence 全树闭合。
- [x] 2.2 由非实施代理从实际 diff 反查实现、测试与用户/内部文档，关闭实质问题。
- [x] 2.3 运行 typecheck/lint/format/docs 与完整 root Gate，核对真实 fixed filenames、candidate identity、未覆盖边界与最终 diff。

### 实施前证据

2026-09-08，controls、diagnostic start/failures、logger 与 bound Gate 目标测试 11 pass；Test Evidence 为 560 entities / 128 Cases / 15 topics。这些只证明旧基线，不证明新命名模式。

### 非实施审查

2026-09-08，独立 reviewer 基于实际 controls/creation/paths、Gate bound controls、四项 naming tests 与 Case diff 反查用户 API、内部 Project Run/Human Output 和 Gate layout，无阻断项。已核对默认兼容、调用级 scope、exclusive-create 不覆盖/追加、partial channel success、真实 readback 与非原子边界；未以文档机械检查代替该语义审查。

### 实施完成时的证据（2026-09-08）

- 最窄 controls/diagnostic tests 通过；独立 naming tests 覆盖缺省、固定名、collision、disabled、facts 与 readback。Gate bound fixture 及真实 Gate evidence root 均为 `core.log` / `scheduler.log`，没有另建 Product 子目录。
- `bun run check -- --all` 最终 36/36 passed：包括 Product/scripts tests、类型/依赖边界、lint、format、metrics、docs、package artifact 与独立 consumer types/runtime/documentation。首次 34/36 暴露 invocation controls parser depth 与新 collection 示例依赖 Node ambient types；已按 invocation-output-target 责任提取 parser、把显式示例 root 改为 `"."`，未调整阈值或失败策略。独立 reviewer 复核提取后的 validation precedence、错误映射和公开行为不变。
- Test Evidence 为 568 entities / 130 Cases / 15 topics 全树闭合；`docs:api` 与文档链接验证通过。实施完成时本地 candidate 为 `0.0.0-local.4091db8ccb6d`，package status 为 current，exact installed entry 已由 Gate 消费。
- 本次 Gate evidence：`.log/project-gate/2026-09-08T01-39-34.412Z-1056818-c5677d29-53fb-4fd5-ba1d-9a50c8a44705/`。这是本次本地运行证据，不是 published release 或可移植验收 receipt。
- 用户说明、内部 owner 与测试已通过实际 diff 语义审查；长期 Decision 已对齐。该次交付保留 active Plan，未归档或提交 Git；后续授权与复核见下节。

### 归档前复核（2026-09-08）

- 用户后续明确授权：按 `ai-ready-docs` 和完整编码规范审查、优化本次改动，通过后归档并创建本地 Git 提交；不授权发布、推送或环境 setup 变更。
- 主代理按编码规范全部章节审阅本次实现、测试、脚本和 public JSDoc，未以近邻旧代码作为合规依据。公共边界、类型/错误、数据流、命名、模块归属及 private collector 复用符合规范；不需要新增抽象或 Product 行为变更。包消费者 fixture 改用直接结构/异常断言，日志并发测试增加首个 Run 提前结算的明确失败信号，保留原 Case 证明目的。
- 非实施代理按 AI-ready 消费任务审阅文档并反查实现：显式区分内部二参 collector 与公共具名参数入口；公开 guide 补齐 source literals、无空洞字符串数组、空数组、submodule/gitlink 语义；清理 Plan 中旧 alignment 与待验证状态。用户从随包页面即可恢复用法、默认、失败和安全边界；日志命名仍保持默认兼容与 per-channel 非事务语义。
- 优化后 `bun run check -- --all` 再次 36/36 passed，覆盖 package artifact、独立 consumer types/runtime/documentation、类型/依赖、lint/format、metrics、全部测试分区和文档。Test Evidence 568 entities / 130 Cases / 15 topics 闭合，四项 naming 目标测试通过。
- 本次受验 candidate 为 `0.0.0-local.06dd5c17e5eb`，Gate evidence 为 `.log/project-gate/2026-09-08T01-46-22.410Z-1069297-a945148b-85c3-40c2-a774-136a0f370e83/`。产品与包验证通过后执行正式 archive；归档后的目录状态由目录位置表达，本材料只保留形成时设计与证据。

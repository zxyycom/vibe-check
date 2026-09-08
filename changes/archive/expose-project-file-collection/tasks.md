# Tasks

以下预备任务把已确认的单 selection consumer outcome 转为可审阅的 Plan；checkbox 只在实际完成后勾选。

## Readiness
- [x] 0.1 经主代理确认 public façade 的 final parameter type、root normalization 与 error-expression contract，并将已确认方案写回 Proposal/Design。
- [x] 0.2 审阅 `docs/development/project-files.md`、相邻 collector/configuration tests、public inventory、documentation projection 与 installed-consumer入口，确定最小测试实体和 Case 影响。
- [x] 0.3 将 Draft artifacts 收敛为 Plan 后运行 Change Plan gate；不以 Plan metadata 替代实施授权。

## Implementation
- [x] 1.1 在 project-files owner 内实现 public input parse/snapshot façade，复用 private single-selection collection，不公开 batch/enumerator或 Check policy。
- [x] 1.2 从 package root 仅导出经批准的 operation/options type，并同步 public inventory、declaration documentation与 external consumer type surface。
- [x] 1.3 更新 project-files stable owner、README与一个 package-published guide/managed example，清楚说明 root、full selection、output、failure和非目标。
- [x] 1.4 为 public façade 的 validation、source/empty/snapshot behavior新增最小直接证据，并按真实实体维护 scan-scope Cases。

## Verification
- [x] 2.1 运行最窄 project-files/public API tests及 `bun run test-evidence -- check --root .`，处理本 Change 引入的 entity/Case diagnostics。
- [x] 2.2 运行受影响的 typecheck、lint、public inventory和 package API documentation check；由主代理运行 generator/projection write 或 package/candidate validation。
- [x] 2.3 审阅局部 diff，确认没有公开 batch/codeAreas/cache/watcher/content read/AbortSignal、没有改变 Check selection policy，且 docs/example 从 package root 可恢复真实 consumer usage。

### 实施完成时的证据（2026-09-08）

- public façade、既有 collection/configuration 与 public inventory 目标 tests 通过；新增四项实体覆盖 relative/absolute root 一致、stable/frozen/detached paths、合法空集、closed/accessor-safe validation、缺失字段、non-string/sparse/accessor arrays 与 selected Git source failure。全树 Test Evidence 为 568 entities / 130 Cases / 15 topics。
- 主代理作为非实施 reviewer，从实际 diff 审阅 façade 责任、private collector 复用、README、用户 guide、内部 project-files owner、managed example 与 installed consumer；修正过宽的 hooks/error-context 表述，补齐相对 root 与 malformed array 样本。用户仅凭 published guide 可恢复完整 selection、显式 default composition、root resolution、同步返回/抛错以及非取消/非 batch 边界。
- 首次完整 Gate 的 independent type consumer 不提供 Node ambient `process` 类型；示例与 type fixture 改用显式 relative root `"."`，保持当前工作目录语义，并通过正式 `docs:api:write` 同步 guide。未增加依赖或修改 consumer 环境来绕过边界。
- 最终 `bun run check -- --all` 为 36/36 passed，含 types/import boundary、lint/format/metrics/docs、package artifact 与独立 consumer type/runtime/documentation；installed runtime 证明非空排序路径、冻结结果和非法 root TypeError。`docs:api`、Change Plan 与 diff 检查通过。
- 实施完成时 local candidate `0.0.0-local.4091db8ccb6d` 为 current；本次 Gate evidence 为 `.log/project-gate/2026-09-08T01-39-34.412Z-1056818-c5677d29-53fb-4fd5-ba1d-9a50c8a44705/`。长期 Decision 已对齐；该次交付仅实施与验证，尚未获归档和提交授权；后续授权与复核见下节。

### 归档前复核（2026-09-08）

- 用户后续明确授权：按 `ai-ready-docs` 和完整编码规范审查、优化本次改动，通过后归档并创建本地 Git 提交；不授权发布、推送或环境 setup 变更。
- 主代理按编码规范全部章节审阅本次实现、测试、脚本和 public JSDoc，未以近邻旧代码作为合规依据。公共边界、类型/错误、数据流、命名、模块归属及 private collector 复用符合规范；不需要新增抽象或 Product 行为变更。包消费者 fixture 改用直接结构/异常断言，日志并发测试增加首个 Run 提前结算的明确失败信号，保留原 Case 证明目的。
- 非实施代理按 AI-ready 消费任务审阅文档并反查实现：显式区分内部二参 collector 与公共具名参数入口；公开 guide 补齐 source literals、无空洞字符串数组、空数组、submodule/gitlink 语义；清理 Plan 中旧 alignment 与待验证状态。用户从随包页面即可恢复用法、默认、失败和安全边界；日志命名仍保持默认兼容与 per-channel 非事务语义。
- 优化后 `bun run check -- --all` 再次 36/36 passed，覆盖 package artifact、独立 consumer types/runtime/documentation、类型/依赖、lint/format、metrics、全部测试分区和文档。Test Evidence 568 entities / 130 Cases / 15 topics 闭合，四项 naming 目标测试通过。
- 本次受验 candidate 为 `0.0.0-local.06dd5c17e5eb`，Gate evidence 为 `.log/project-gate/2026-09-08T01-46-22.410Z-1069297-a945148b-85c3-40c2-a774-136a0f370e83/`。产品与包验证通过后执行正式 archive；归档后的目录状态由目录位置表达，本材料只保留形成时设计与证据。

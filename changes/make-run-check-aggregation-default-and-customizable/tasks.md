# Tasks

先审计当前事实和目标契约，再修改 Product/Gate，最后用行为、文档和 package consumer 证据验收。

## Readiness

- [x] 0.1 审计当前 API、有效选择、异常/输出关闭、Gate 和 active Decision。结论：同步四态函数直接替换旧 policy；有效列表与全量 snapshot 分离，普通 Run 失败仍返回 `RunResult`。事实与路径见 design 的 Context。

## Implementation

- [ ] 1.1 为 active effective-selection Decision 形成覆盖默认聚合与 caller-local callback 的长期后继，并确认其与当前 owner 的交接边界。
- [ ] 1.2 在 `src/project-run/**` 和 `src/index.ts` 实现同步 `CheckAggregation` 类型、Controls 验证、公开 `CoreCheck`、同源有效列表、默认 strict-all 与定制四态验证；保留全量 snapshot 和无完整 facts/cancellation 分支语义。
- [ ] 1.3 仅将聚合 callback 错误传播为 `run` Promise rejection，证明普通 Run 错误仍按原分支结算；聚合先于正常 final progress 成功呈现，拒绝路径关闭诊断与 progress writer，不让清理失败掩盖原错误，避免正常结果或 machine publication 的伪提交。
- [ ] 1.4 Gate bound Run 改用默认汇总；同步聚合说明、结果映射和必要的 Promise-rejection 故障注入，不改候选绑定或 Check 领域规则。
- [ ] 1.5 按实际行为同步 API、Check results、Project Run、Gate、callback/output 用户指南、JSDoc、示例、package public inventory 与 external-consumer 类型用法。

## Verification

- [ ] 2.1 修改测试前后运行 `bun run test-evidence -- check --root .`；运行最窄聚合、effective-selection、Controls、Run 异常关闭和 Gate adapter 测试，覆盖空/混合四态、final data、同步函数、Promise 非法返回及其 rejection 清理、throw、progress 诚实性与普通失败隔离。
- [ ] 2.2 运行 Product/script typecheck、lint、dependency 与 public entry 检查；验证 package root 导出的类型和 consumer 编译。
- [ ] 2.3 运行文档/示例验证、`bun run decisions -- check`、目标 `change-plan check`、`bun run check` 和 `bun run check -- --all`，核对 required/all Gate 的聚合、退出与 package acceptance。
- [ ] 2.4 由非实施代理基于实际 diff 反查用户与内部文档影响；对仅持随包文档的 callback 使用任务核对输入、四态输出及抛错语义。
- [ ] 2.5 审阅目标 diff、测试证据与 Success Criteria，确认所有任务完成且稳定 owner 已同步；Change 完成与目录删除仅在另获明确授权后执行。

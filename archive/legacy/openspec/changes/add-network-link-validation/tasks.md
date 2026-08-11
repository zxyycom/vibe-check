> **核心句：**本 change 只保存未来 Network Link Check 的方向；任务 1.1 完成前不得修改实现、主 specs、schemas、examples、dependencies或测试，也不得执行真实网络请求。

## 1. 实现前阻塞审计

- [ ] 1.1 **BLOCKING：当前不得实施。** 在本 feature 被明确排期后，确认 `establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition` 与 `add-markdown-link-validation` 已实际实施；基于真实 Check/Record、TaskPlan/scheduler、Project Definition policy和Markdown candidate handoff重新基线全部artifacts。届时完成safe-egress、credential isolation、URL redaction、资源预算、领域outcome与execution report分流和deterministic test harness的安全审计；确认scheduler只承接slots/resources与内部失败隔离，并清除全部过时基础假设和推测性HTTP实现矩阵。任何阻塞问题未闭合前不得执行后续任务或真实网络smoke。

## 2. 安全实现与证据

- [ ] 2.1 以 1.1 审计后的最小契约实现显式授权的 Product-owned Network Link Check、安全transport boundary与shared TaskPlan接入；正常完成的领域结果由producer返回，真正execution failure只映射为failed CheckRun/null result；同步 Project Definition declaration、受控测试、owner文档和必要 public artifacts，不建立第二个Markdown parser或feature-local scheduler。

## 3. 验证

- [ ] 3.1 运行审计确定的zero-I/O、SSRF、credential/redaction、slot/resource治理、scheduler内部失败隔离及domain-indeterminate/execution-failed互斥测试，以及测试证据、依赖许可证、产品typecheck/lint、文档/OpenSpec和workspace required验证；required suite不得访问公共网络，真实网络smoke必须另获明确授权。

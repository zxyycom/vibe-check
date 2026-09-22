# Design

以材料责任为主线整理 validation owner，再把同一责任映射到 workspace 命令、Gate Check 和测试证据。

## Context

- 当前材料 owner 文档、workspace validator 和 Project Gate adapter 分散描述同一批 JSON、schema、machine artifact、report example 与 links。
- 当前 Gate 已有多个独立执行节点，但它们共享 `docs` preset、`docs-*` identity 和 task dispatcher，调用者无法从 Gate manifest 直接恢复责任。
- `jsonValidation` 负责严格 JSON 文档；`jsonSchemaValidation` 负责显式 schema registry、bindings 和 instance validation。项目仍需维护 schema inventory、current/historical registry、machine artifact 集合和 publication drift。
- package API projection 还服务 package artifact/installed consumer acceptance；它是否进入材料 Gate 由 owner 事实决定。

## Goals / Non-Goals

- 统一当前术语：owner 为 `repository-material`，入口和 preset 为 `materials`。
- 让 JSON、schema、machine examples、report examples 和 links 的输入、Finding、identity、mutex 与测试责任可独立恢复。
- 在 Gate 中复用已发布公共 Check；项目专用校验只保留仓库布局、生成漂移和 machine material 所需的责任。
- 保持 Product API、schema 版本、历史材料和默认 aggregation 语义稳定。
- 将增量选择交给 P0-1，将 Markdown lint、cache 和 `--only` 留给后续 Change。

## Decisions

### Intended Change

1. 将 validation owner 与当前文档改为 `repository-material` 语义；workspace 只接受 `materials` 及已命名 task。完整 `bun run validate` 仍执行 workspace 全量校验。
2. 将 Gate preset 改为 `materials`，为材料责任采用 `materials-*` identity。最终 identity 数量由 readiness 审计决定：每个独立 Finding/输入/互斥边界至少一个 Check，单纯 task 编排不单独建 Check。
3. 复用边界按以下规则冻结：
   - 纯 JSON 文档完整性优先使用公共 `jsonValidation`。
   - 绑定 schema 的 instance 验证优先使用公共 `jsonSchemaValidation`。
   - schema inventory、current/historical registry、machine artifact 集合和 publication drift 继续由项目 validator 拥有。
   - links 保持路径存在性与 Markdown link validation 两个独立责任。
4. Gate 直接接入窄责任 validator 或公共 Check constructor；workspace workflow 负责组合命令，不再成为 Gate Check 的事实 owner。
5. 使用同一材料 corpus、registry 声明和 Test Evidence Case；Gate 与 bootstrap validator 可以共享事实声明，但不互相调用、不建立嵌套 Run。
6. 当前运行时采用新 identity；归档日志和历史 Decision 继续按形成时的 identity 读取。

### Resulting Impacts

- 更新 validation 目录、workspace 命令、Gate definition/catalog/controls、adapter、测试路径、Case ledger、owner 文档和导航。
- 现有 Check ID、mutex 和性能历史的消费者需要逐项核对；新 ID 从当前实施建立新的性能历史，既有历史材料保持原样。
- 公共 JSON Check 可能报告旧 parser 不会报告的 duplicate-key、encoding 或 size Finding；Plan 内以 corpus 对照验证，不用排除规则隐藏。
- package API projection 只在 owner 证明其属于材料 Gate 时接入；否则保持 package acceptance/workspace task 的现有边界。

## Risks / Trade-offs

- 更严格的公共 JSON 语义可能暴露真实材料问题；处理方式是修复材料或记录明确差异，不回退到模糊 parser。
- Check 数量可能增加，但每个节点都会拥有独立输入、Finding、mutex 和 Case 证据。
- bootstrap validator 与 Gate 双路径有维护成本；通过同一 corpus、registry 和对照测试控制漂移。

## Open Questions

实施前需要用当前代码和消费者证据冻结三项内容：最终 `materials-*` identity 清单、公共 JSON Check 的文件范围/大小上限、package API projection 的 Gate owner。它们是 Plan Readiness，不需要另建用户决策；证据不足时暂停实现而不是猜测。

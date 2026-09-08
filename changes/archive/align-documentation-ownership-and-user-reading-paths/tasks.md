# Tasks

先定位 owner，再调整阅读路径与发布材料，最后以独立审查和包消费证据交付。

## Readiness

- [x] 0.1 核对用户授权、已有改动、当前文档与发布 registry，确认不改变产品行为。

## Implementation

- [x] 1.1 明确导航与治理中的读者、发布范围和公开契约/内部实现 owner。
- [x] 1.2 拆分 API 输出、类型化依赖和 learned 调度专题，精简 README 与回调说明。
- [x] 1.3 前置八项 Check 最小用法，清理维护细节并修正已确认的语义偏差。
- [x] 1.4 闭合内部引用、发布 inventory、示例投影与当前链接。
- [x] 1.5 根据复审调整正文重心、负向描述与迁移口吻，保留安全/失败边界与受管示例，同步受影响的链接。

## Verification

- [x] 2.1 核对文档 diff、示例源码不变和发布映射，完成独立语义/使用审阅。
- [x] 2.2 运行投影、文档与格式校验以及全量 Project Gate，验证本地 candidate 与外部 consumer。
- [x] 2.3 更新 Decision 对齐和 Plan 证据，检查全部 active Change 与 Decision；保持未归档、未提交。
- [x] 2.4 独立复核本轮增量与代表性用户阅读任务，重跑文档、投影和完整 Gate，记录修订后的 candidate 证据。

- [x] 2.5 完成提交前 AI-ready 全文复审与验证，核对本 Change 的归档授权与 Git 提交范围。

## Completion Evidence

- 2026-09-08：两位非实施代理分别审阅公开 API 使用路径及导航/内部 owner/八项 Check 指南。已修复全部 must-fix：两个旧 anchor、维护提醒 advisory 示例绿灯、flags/preflight/message 双 owner 与当前调用方路由；最终均通过。
- API 369 → 166 行，scheduling 332 → 258 行；新输出、依赖和 learned 专题与原回调专题形成明确阅读路径。12 API Markdown + 8 Check guides + 1 machine guide 与现有 registry 闭合；全部 21 份 source/build/installed Markdown bytes 相同。
- managed TypeScript example source 未改；CLI 漂移测试只更新被移动的 target，progress Case 只移动 Owner，不改 Case ID、Entities 或 Proves。目标 16 tests 与维护提醒 failure-assessment test 1 项通过；Test Evidence 全树 568 entities / 130 Cases / 15 topics 通过。
- 最终 bun run check -- --all：36/36，通过 product/tooling tests、format/lint/typecheck、文档/schema/示例、包 artifact 和外部 consumer types/runtime/docs。candidate 为 0.0.0-local.a20b04109ec2；日志 .log/project-gate/2026-09-08T02-47-23.290Z-1111894-f654f17b-e1be-4959-8794-acf7b24dcc70。此前联动失败已修复，最终证据以此轮为准。
- bun run docs:api、bun run format check、bun run validate、git diff --check 通过；长期 Decision 已完整对齐。所有实现/公开文本在最终 Gate 前稳定；之后仅记录治理状态与完成证据。
- 未修改 Product 运行逻辑或公开签名，未 Git add/commit、归档或发布。Plan 保持 active / plan，等待用户审阅这一版。

### 正文重心与表达复审后的修订

- 2026-09-08：完成 README 阅读顺序与可选索引收敛，输出指南增加常用配置表并后置日志/失败参考；依赖、learned 指南改用用户任务开场，缓存/调度清理冗余负向枚举，API/回调清理迁移口吻与双重否定。同步当前输出入链；不再拆页，不修改 Product 行为或既有长期判断。
- 非实施代理基于本轮修改前快照与实际增量复核，无 must-fix。仅凭随包文档即可恢复本次 outputs override、diagnostic 命名冲突与 hook failure、learned observation 安全/完成边界、prepared complete 非 finally 保证，以及 simulation 不执行真实 Check/不占真实资源。
- 本轮所有目标 Markdown fenced code 与修改前逐字相同；managed example source 未改，测试正文与 Case 未改。docs:api、format check、validate、git diff --check 通过。
- 修订后 bun run check -- --all：36/36，通过 package artifact、外部 consumer types/runtime/docs 与全部原有验证；当前 candidate 为 0.0.0-local.6281282cab14。日志 .log/project-gate/2026-09-08T03-02-16.577Z-1118531-83a20984-08a1-4bd3-a83d-04ae2c713d97；21 份随包 Markdown 的 source/build/installed bytes 一致。本次修订的产物证据以此轮为准；随后只更新 Plan 完成记录。
- Plan 保持 active / plan；未 Git add/commit、归档或远端发布。

### 归档前最终复审与授权

- 2026-09-08：用户明确要求再次使用 AI-ready-docs 复审当前重心、负向描述与迁移残留，然后归档并提交一版。独立代理审阅 12 份 API Markdown、8 份 Check guides 与机器输出契约，共 21 份随包文本，未发现阻断性的重心偏移或迁移残留；保留的否定用于安全、closed grammar、I/O、取消与失败边界。
- 对固定 diagnostic 命名的措辞作最后澄清：命名只控制 basename，日志内容保留 invocation ID、共享 sequence 与 elapsed-time correlation。已按 logger/rendering 源码纠正中间草稿误称日志保存 UTC 创建时间的问题，并获独立定向复核通过。
- 最终 bun run check -- --all 为 36/36，通过全部 product/tooling、文档、schema、Case、artifact 与外部 consumer 验收；candidate 为 0.0.0-local.ddcee355b622，日志 .log/project-gate/2026-09-08T03-14-19.747Z-1126350-762c81b8-c96f-4ffe-8f73-7289fabae19c。docs:api、validate 与严格 decisions check 通过；没有新增运行时或测试修改。
- 所有任务已完成，归档授权已核对；归档范围仅本 Change，Git 候选仅本任务文档、对应 JSDoc、包材料映射/投影测试、Case Owner 与治理记录。归档前调整本 proposal 的 owner 链接以适配目标目录；归档后只由当前协调文档反映 lifecycle，不重写历史内容。Git 提交按仓库已启用的普通 hook 规则执行，不发布 npm 包。

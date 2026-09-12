# Tasks

先通过 Readiness 的审计门禁，再按 1.1–1.4 实施两个工具与两向边界，最后完成独立语义审查和同一 candidate 验收。checkbox 只表示该项证据或工作已完成。

## Readiness

- [x] 0.1 审计分类与范围：核对 28 个 runtime / 127 个 type-only exports，确认两个工具无 Core 具体调用；Core 必需基础和其余候选保持原 owner。依据见 design 的实施范围与 Audit Reference。
- [x] 0.2 审计实现入口与兼容条件：确定两个目标文件、公开类型推导、Core roots、符号身份与 fail-closed 语法、layout/Test Evidence/Gate 接线；类型探针只作为可行性证据，真实声明和包验收留在 Verification。
- [x] 0.3 建立两向依赖 Decision 为 active/unaligned，并核对本 Plan 与既有 admission、public inventory、file-input 方向相容。
- [x] 0.4 审计门禁：由非实施代理复核 proposal/design/tasks 的范围、源码依据、用户/内部文档影响与验收闭合；AI-ready 语义审查和 Change/Decision/文档机械检查通过，确认无需额外架构决定即可从 1.1 推进。

## Implementation

- [ ] 1.1 在 `scripts/validation/package-tools-boundary.ts` 实现公开符号校验与 Core 入向闭包检查，接入 `validateRepositoryLayout`；覆盖 design 的 Core roots、生产材料分类与语法矩阵，集中维护空初始外部允许集合。新增边界测试前后运行 Test Evidence check。
- [ ] 1.2 迁移 Finding presentation 源码和近邻测试；以公开 `CheckResult` 推导 message 类型，保留 `FindingOverflowContext` 与非公开 `appendCheckMessages`。更新 package Check、root 及测试 imports，保持数量、冻结、formatter 和错误语义。
- [ ] 1.3 提取 `defineAdmissionPolicy`、五个 exact 类型及 JSDoc 到工具 owner；只使用四个既有公开策略类型。更新原 authoring-defaults 测试 import、保留 Definition 集成断言，补充工具 identity 与泛型正反用例；Core 原文件不保留 helper re-export。
- [ ] 1.4 同步 architecture、workspace tooling、工具源码定位/JSDoc、layout owner 集合、Case links 与包材料引用；确认新测试仍由 `productRuntime` lane 覆盖。核对公开 inventory 与 compiler roots，只调整实际受影响的来源路径。

## Verification

- [ ] 2.1 运行两个工具、Definition 集成与边界的最窄测试，Test Evidence check 通过；正反 fixture 覆盖新目录自动受检、Core/工具直接与间接越界、公开 alias/type、同文件私有符号、测试材料绕行、加载语法与解析失败，以及合法 facade/callback 避免误报。
- [ ] 2.2 证明 Core roots 的生产闭包不含工具，完成该闭包的内存 TypeScript no-emit 检查及默认 Definition/Run 回归；比对声明结构，验证 static/simple/prepared 同步/异步、contextual types、identity 与额外字段拒绝。
- [ ] 2.3 由非实施代理基于实际实现 diff 反查用户指南/JSDoc/示例和内部 owner，确认导入用法、defaults、I/O、失败及输出兼容；分别记录两类文档的实际更新或无需更新理由。
- [ ] 2.4 运行 `bun run validate`、受影响 typecheck/lint、Change/Decision checks、`bun run check` 与 `bun run check -- --all`；对同一 candidate 核对 exports、声明、source maps、shipped sources 和隔离 installed consumer。
- [ ] 2.5 核对 success criteria 与任务证据，将完整落实的两向依赖 Decision 标记 aligned；保持本 Change 目录，完成删除须另有明确授权。

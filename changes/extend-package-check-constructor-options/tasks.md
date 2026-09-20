# Tasks

任务按「先完成契约审计，再实现共享边界与九个构造器，最后用 installed consumer 和完整 Gate 验收」推进。

## Readiness

- [x] 0.1 核对九个固定身份构造器、各自 authored/resolved options、默认 definition 与 `commandCheck` ordinary authoring 字段，确认本 Change 是统一 constructor contract 而非 SCC 专用扩展。
- [x] 0.2 验证顶层 options、默认 identity generic、自定义 literal identity、native parser 和 resolved-options 隔离可以由现有 `TypedCheckWithOptions` 表达，不需要构造后 adapter 或 `defineCheck()` overload。
- [x] 0.3 对照 Project Definition、API mechanics、specialized-constructor 与 supporting-type Decisions，确定字段分流、validation owner、兼容性和 root export 边界。
- [x] 0.4 建立 active/unaligned Decision `260920-configure-package-checks-through-constructor-options`，固定字段集合、默认规则、maintenance overload 和 package-owned 行为边界。
- [x] 0.5 经 AI-ready 与非实施审阅，将 proposal、design 与 tasks 收敛为可直接实施的 contract；诊断历史未进入长期主线，`design.md` 已明确没有开放问题。

## Implementation

- [x] 1.1 定义并导出 `PackageCheckAuthoringOptions<Id>` 及共享 closed-input projection helper；复用 Core 字段类型，处理 package defaults、boolean quiet-row policy、identity/display validation 和 domain/project 分流。
- [x] 1.2 将八个 object-policy 构造器及其 authored options 类型接入 identity generic 和共享 helper，保持各领域 resolver、resolved options、callbacks、Finding/Record 与 parser contract 不变。
- [x] 1.3 为 `maintenanceReminders` 增加 `MaintenanceRemindersInput<Id>` object overload，并保留 entries array overload、内部 Git default、默认 quiet-row policy 和现有返回数据。
- [x] 1.4 按 Test Evidence 流程更新 constructor type/runtime tests 与 Definition/Run integration cases，覆盖默认值、自定义 identity、所有共享字段、非法 unknown input、两个同类实例和 execution-options 隔离。
- [x] 1.5 更新 `src/index.ts`、公共 API inventory、README、API mechanics、Project Definition owner、九项 Check guide 和必要示例；共享规则只在 owner 完整定义，各 guide 保留 Check-specific 用法与引用。
- [x] 1.6 更新 exact package candidate 与 external consumer acceptance，使隔离 consumer 从 root 导入共享类型、构造两个 `fileMetrics` 实例和另一类自定义实例，并运行同一 Project Definition。

## Verification

- [x] 2.1 运行最窄 constructor、options、Definition、bound Run 与 type tests；核对默认 constructed values、literal identities、field projection、parser identity、resolved options 和多实例结果。
- [x] 2.2 修改测试前后运行 `bun run test-evidence -- check --root .`，确认新增或调整的 Case Owner/Proves 与实际行为一致。
- [x] 2.3 构建 exact candidate，运行 package artifact、external consumer type/documentation/runtime acceptance，核对 root declarations、公共 inventory、示例和真实多实例执行。
- [x] 2.4 由非实施代理基于最终 diff 反查公共行为、内部 owner 和文档语义；修复其发现后重新运行受影响的最窄验证。
- [x] 2.5 将 Decision `260920-configure-package-checks-through-constructor-options` 标记为 aligned，运行 `bun run decisions -- check` 与 Change Plan check。
- [x] 2.6 运行 `bun run check` 和 `bun run check -- --all`；确认所有成功标准闭合、无构造器特例、无临时兼容说明或未交接的稳定规则。

# Tasks

首批两个工具与门禁的完成证据保留；本轮补齐其余三个工具和用户可独立使用的数据 API，再对扩展后的目标重新验收。checkbox 只表示对应范围的实际完成。

## Readiness

- [x] 0.1 审计分类与范围：核对 28 个 runtime / 127 个 type-only exports，确认两个工具无 Core 具体调用；Core 必需基础和其余候选保持原 owner。依据见 design 的实施范围与 Audit Reference。
- [x] 0.2 审计实现入口与兼容条件：确定两个目标文件、公开类型推导、Core roots、符号身份与 fail-closed 语法、layout/Test Evidence/Gate 接线；类型探针只作为可行性证据，真实声明和包验收留在 Verification。
- [x] 0.3 建立两向依赖 Decision 为 active/unaligned，并核对本 Plan 与既有 admission、public inventory、file-input 方向相容。
- [x] 0.4 审计门禁：由非实施代理复核 proposal/design/tasks 的范围、源码依据、用户/内部文档影响与验收闭合；AI-ready 语义审查和 Change/Decision/文档机械检查通过，确认无需额外架构决定即可从 1.1 推进。

- [x] 0.5 校正完整范围与授权：cache、waiver、learned 纳入 Non-core；用户允许面向外部消费者的最小公开数据 API，不以私有依赖排除迁移。
- [x] 0.6 核对六个公开值与三个支持类型、等价调用改写及用户契约，建立公开数据复用 Decision 为 active/unaligned。

## Implementation

- [x] 1.1 在 `scripts/validation/package-tools-boundary.ts` 实现公开符号校验与 Core 入向闭包检查，接入 `validateRepositoryLayout`；覆盖 design 的 Core roots、生产材料分类与语法矩阵，集中维护空初始外部允许集合。新增边界测试前后运行 Test Evidence check。
- [x] 1.2 迁移 Finding presentation 源码和近邻测试；以公开 `CheckResult` 推导 message 类型，保留 `FindingOverflowContext` 与非公开 `appendCheckMessages`。更新 package Check、root 及测试 imports，保持数量、冻结、formatter 和错误语义。
- [x] 1.3 提取 `defineAdmissionPolicy`、五个 exact 类型及 JSDoc 到工具 owner；只使用四个既有公开策略类型。更新原 authoring-defaults 测试 import、保留 Definition 集成断言，补充工具 identity 与泛型正反用例；Core 原文件不保留 helper re-export。
- [x] 1.4 同步 architecture、workspace tooling、工具源码定位/JSDoc、layout owner 集合、Case links 与包材料引用；确认新测试仍由 `productRuntime` lane 覆盖。核对公开 inventory 与 compiler roots，只调整实际受影响的来源路径。

- [x] 1.5 公开六项数据能力和三个支持类型，完善 JSDoc、root inventory、独立用户示例/指南与 installed consumer 类型/runtime 证据。
- [x] 1.6 迁移 cache、waiver、learned 及其独立 ranking，改用公开数据/测量类型、保持算法与失败兼容，更新 consumers/Case/实际 Node allowlist。
- [x] 1.7 同步完整五工具的内部 owner、公开材料发布映射与文档路径，清除将三个工具写成范围外的当前说明。

## Verification

- [x] 2.1 运行五个工具、公开数据能力、Definition 集成与边界的最窄测试，Test Evidence check 通过；正反 fixture 覆盖新目录自动受检、Core/工具直接与间接越界、公开 alias/type、同文件私有符号、测试材料绕行、加载语法与解析失败，以及合法 facade/callback 避免误报。
- [x] 2.2 补齐新公开 API 的外部独立使用及旧 cache/history/waiver 行为等价证据；证明 Core roots 的生产闭包不含工具，完成该闭包的内存 TypeScript no-emit 检查及默认 Definition/Run 回归；比对声明结构，验证 static/simple/prepared 同步/异步、contextual types、identity 与额外字段拒绝。
- [x] 2.3 由非实施代理基于实际实现 diff 反查用户指南/JSDoc/示例和内部 owner，确认导入用法、defaults、I/O、失败及输出兼容；分别记录两类文档的实际更新或无需更新理由。
- [x] 2.3.1 实现稳定后由独立子代理完成正确性审查；最终验收前分别派发优化子代理，以 AI-ready 文档规则和编码规范优化本次改动，不增加无必要抽象，并重验受影响证据。
- [x] 2.3.2 按严重 Bug 的自动沉淀规则，保存本次未提交门禁实现的绝对路径漏检调查；报告核对修复、回归和独立复核证据，明确不外推历史发布影响。
- [x] 2.4 运行 `bun run validate`、受影响 typecheck/lint、Change/Decision checks、`bun run check` 与 `bun run check -- --all`；对同一 candidate 核对 exports、声明、source maps、shipped sources 和隔离 installed consumer。
- [x] 2.5 核对扩展后的 success criteria 与任务证据，将完整落实的公开数据契约 Decision 标记 aligned；保持本 Change 目录，完成删除须另有明确授权。

## First-Stage Evidence

以下只证明 2026-09-12 首批两个工具与门禁的验收，不证明本轮三个工具和新增 API 已完成。保留这些可复核阶段证据；未执行 Git 暂存、提交、推送或 Change 删除。

- 兼容性：实施后 AST 与公开 inventory 仍为 28 个 runtime / 127 个 type-only exports。Finding 实现主体和测试正文与实施前一致，仅调整 import 与等价 message alias；内存 declaration emit 核对 admission helper、五个 exact 类型结构一致，四个公开策略类型的符号身份一致。
- 局部证据：两个工具、Definition authoring 与 layout 测试通过；Core-only no-emit 的实际 121 文件闭包已纳入 layout 测试。另运行默认 Definition、Run planning、Run controls 与 default outputs 回归，4/4 通过。
- 边界证据：正反 fixture 包含相对/绝对路径、tsconfig alias、Core literal dynamic import、工具动态加载拒绝及 Core `import = require(...)` 拒绝；修复与独立复核的形成时依据见[调查报告](../../docs/investigations/investigate-core-package-tools-boundary-validation-gap.md)。
- 文档与质量：非实施代理审查实际 diff，并分别完成文档 AI-ready 优化和代码规范优化。内部 architecture、Definition、workspace 与 Case 已同步；公开指南和示例仍使用相同 package-root API，JSDoc 随源码完整迁移，无需改变用户用法。校验器按公开身份、模块图与 Core 闭包三个职责组织，未改变质量政策或阈值。
- 同一 candidate `0.0.0-local.1816844a504a`：`bun run check` 为 31 passed / 0 failed / 5 not applicable；`bun run check -- --all` 为 36 passed / 0 failed。后者完成 artifact、声明、source maps、shipped sources 与隔离 installed consumer 的类型、文档和 runtime 验收。
- Gate 日志：默认验收 `.log/project-gate/2026-09-12T08-33-09.732Z-1042533-9f9461ef-7bd1-429d-bff1-12fa74d2d9ba`；完整验收 `.log/project-gate/2026-09-12T08-33-55.094Z-1044591-a7726733-93be-4f1b-9aab-20f985de53db`。
- 收尾检查：`bun run validate`、Test Evidence、Change、Decision、Investigation 与 diff whitespace 检查通过；两向依赖 Decision 已通过 CLI 标记为 active/aligned。
- 验证边界：未执行正式发布或独立的物理 candidate lifecycle integration target；本次验收不宣称外部发布生效，也不审计历史发布包。

## Expanded Acceptance Evidence

以下证明 2026-09-12 扩展后的完整五工具与公开数据 API，取代首批证据作为当前完成依据。

- 目标与兼容：cache、waiver、learned 及 learned 专属 ranking 已进入 `src/package-tools/`；五个工具全部受两向门禁约束。独立审查逐文件核对迁移，ranking 与原实现一致；cache/history 的 exact-record 改写复用原组合，保留字段集、验证顺序、重复读取保护、I/O 和失败语义。公开 inventory 为 34 runtime / 130 type-only exports：既有成员保留，新增六值与三个支持类型。
- 外部用户：新增[数据边界指南](../../docs/guides/data-boundaries.md)与[独立 package-root 示例](../../docs/examples/package-api/data-boundaries.ts)，无需 Check、Definition 或 Run。六个值与三个类型通过安装后 strict type acceptance，runtime 文档示例实际调用全部六项能力；契约区分 deep canonicalization、浅 snapshot、失败模型和 Proxy 限制。
- Core 与目标测试：实际 Core-only 生产闭包为 120 文件，不含工具，TypeScript no-emit 通过并由 layout 测试持续验证。迁移负责人运行 30 项 cache/waiver/learned/Run 集成测试，公开数据负责人运行 canonical/closed 测试；主线程另运行 Finding、admission authoring、默认 Definition 与 Run 回归 6/6 通过。Test Evidence 为 605 实体全部映射到 139 Cases / 15 topics。
- 独立审查与最终优化：非实施代理完成完整范围语义审查、35 项定向测试及物理 `package:candidate:integration` 6/6 验证；文档优化代理完成 AI-ready 优化，代码优化代理将安装类型证据按数据边界职责提取为同级片段并完成格式校验。最终发现的 export locale/default 排序差异已统一为确定性默认序，窄测试 6/6 及独立复核确认未削弱精确成员断言。
- 文档影响：用户说明、JSDoc、README、navigation、受管示例和包材料映射已同步；内部 architecture、workspace、Definition 与 Case owner 已同步。旧调查只修正随迁移失效的链接，保留形成时依据，不把新路径当作历史执行事实。
- 同一 candidate `0.0.0-local.d65372eb2deb`：最终 `bun run check` 为 31 passed / 0 failed / 5 not applicable；`bun run check -- --all` 为 36 passed / 0 failed / 0 not applicable，覆盖 artifact、声明、source maps、shipped sources 与隔离 installed consumer 的类型、文档和 runtime。
- 最终 Gate 日志：常规验收 `.log/project-gate/2026-09-12T09-43-08.109Z-1198578-2edfcb47-3741-4779-9d75-521392661fe0`；完整验收 `.log/project-gate/2026-09-12T09-43-41.695Z-1203274-6f31f8f5-695c-4ce1-b3d2-b9c8d818efc4`。
- 收尾与边界：`bun run validate`、typecheck/lint、Change、Decision、Test Evidence、Investigation 与 diff 检查通过；公开数据契约 Decision 已通过 CLI 标记 active/aligned。候选 staging 的一次不完整状态通过正式 `package:build` 重建并完成最终验收，未手工清理构建目录。未正式发布、提交、推送或删除 Change；迁移时误暂存已撤回，当前 Git index 为空。

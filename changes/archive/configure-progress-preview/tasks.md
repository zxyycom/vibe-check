# Tasks

按已确认文本级 formatter 契约实现配置、接线与证据；Finding 审查独立，不等待它的代码变化。

## Readiness

- [x] 0.1 确认用户要求数量/长度配置与同步 formatter，输入默认文本、类型和长度限制，不需要 raw data。
- [x] 0.2 核对 outputs、renderer、snapshot、相关 Decision 与旧默认测试，明确兼容和失败边界。
- [x] 0.3 建立后继预览 Decision 为 active + unaligned，保留前序继续有效的 owner、安全与 Native adapter 约束。

## Implementation

- [x] 1.1 实现兼容的 output authoring、closed validation、resolved defaults 与 RunControls 逐字段覆盖/清除。
- [x] 1.2 建立 callback-free declarative output projection，数值与 formatter 种类进入 Definition fingerprint，controls 和函数身份不进入。
- [x] 1.3 接入 count/text limits 与同步 formatter，保持 escaping、bounded text、准确计数、facts 和失败隔离。
- [x] 1.4 同步用户/内部文档、JSDoc/公开类型与实际受影响的 API 示例和验证材料。

## Verification

- [x] 2.1 运行输入/覆盖/identity 与 renderer/formatter/failure/完整事实目标测试，覆盖短预算与 Promise 错用。
- [x] 2.2 运行 Test Evidence 闭合、typecheck、lint、dependency、文档/声明/示例校验。
- [x] 2.3 由非实施代理从实际 diff 反查契约、实现、测试证据及用户/内部文档，关闭实质问题。
- [x] 2.4 运行完整 root Gate 与 installed-consumer 验收，核对候选和 working tree diff，标记后继 Decision aligned 并记录未覆盖边界。

### 2026-09-07 完成证据

- 实施代理完成源码、目标测试与文档；非实施的主代理从实际 diff 独立复核 output grammar/defaults、callback-free snapshot、renderer、测试断言及 README/API mechanics/内部 owner。发现并修复 `Promise.prototype.catch.call` 仍读取返回值 `.then` 的问题，改用真实 Promise 识别和 intrinsic `then.call`，并补 caller-owned getter 与端到端覆盖回归。没有待关闭的实质审查问题。
- 共同 field grammar 由 `src/project-definition/progress-rendering-output.ts` 拥有；完整 Definition 的 required-enabled/defaults 与 RunControls 的 optional/presence 仍在各自边界。默认 materialization 不再由 `defineConfig` 重复展开；未修改质量阈值、waiver 或 Gate selection。
- 用户材料新增并执行 `docs/examples/package-api/progress-preview.ts`，由既有 projection registry 投影到 API mechanics；示例证明从包导入 formatter 类型、保存 Definition policy、单次覆盖及文本头尾摘要。README 保留可发现入口；内部文档解释 grammar、fingerprint、escaping 与失败边界。没有新增 machine DTO/schema 字段；真实受影响的 public type inventory 和 Gate 默认值测试已同步。
- 主代理独立目标测试 12 pass；实施代理最终包含 Gate/public inventory 的目标集合 19 pass。`bun run typecheck`、`bun run lint`、`bun run format`、`bun run docs:api`、`bun run validate -- docs` 与 `git diff --check` 通过；最终 Test Evidence 为 560 entities / 128 Cases / 15 topics，主代理重新执行闭合通过。
- 前两轮 full Gate 分别为 30/36、34/36，暴露预期清单、重复、函数复杂度、文件长度与格式问题；均已修复。最终 `bun run check -- --all` exit 0，36/36 passed，0 failed / not-applicable / unavailable，elapsed 21.2s。exact candidate 为 `0.0.0-local.e21ae71b93a6`，日志目录为 `.log/project-gate/2026-09-07T10-53-39.967Z-486299-f3d72e07-3ac0-4b53-8f50-16dc407ea0f8`，包含完整 package artifact、external type/runtime/docs acceptance。
- 后继预览 Decision 已按实现与证据标记 active + aligned。未执行正式 release/publish、cold setup 实验、Git add/commit/push 或本 Change 归档；完成后的 Plan 保持 active，归档须另获授权。formatter 的 trusted-host 副作用、detached work、任意异步协议及跨平台/跨版本行为不因本次本地验收成为额外承诺。

### 2026-09-08 审核与归档交接

- 用户明确授权使用 `ai-ready-docs` 优化本次文档、以完整编码规范而非邻近实现审核代码，然后归档并创建本地 Git 提交。本节承接后续授权，上一节的未归档/未提交描述仅属于当时状态。
- 主代理覆盖本次配置、validation/defaults、declarative projection、invocation/renderer、脚本、公开类型、示例和测试 diff。按编码规范移除仅转发的 parser wrapper 与多余字段复制；将 formatter 串行调用、默认/替代/有界正文与 marker budget 写为连续具名步骤。没有新增临时实现、放宽阈值、增加 waiver 或改变 Gate selection。
- 文档按 AI 消费任务优化：API mechanics 补明 formatter context、选中项调用顺序与正文预算排除项；内部人读输出按选择、正文、安全呈现拆分，并链接配置/覆盖 owner；Plan 明确区分实施前与当前事实。非实施代理从实际 diff 反查并完成定向复核，仅凭随包文档可恢复 kind 分支、数量 0、null 清除、失败与 readback 边界；无剩余实质问题。Finding Draft 改引 stable owner，归档时同步协调页路径与状态。
- 本轮目标测试 18/18 通过；Test Evidence 560 entities / 128 Cases / 15 topics 闭合。`bun run check -- --all` exit 0，36/36 passed，elapsed 18.5s；涵盖 typecheck/import boundary、lint、format、行为测试、文档、package artifact 与外部 consumer type/runtime/docs acceptance。candidate 为 `0.0.0-local.f93b419e7c09`，日志目录 `.log/project-gate/2026-09-08T01-14-45.448Z-1030087-436bd237-0a2b-4bd2-8936-6f61447d3dca`；随后 `package:status` 确认为 current。
- 成功标准与 11 项任务均已按当前证据复核，允许通过正式入口归档本 Change；Git 提交保存已验收改动，不代表 release/publish、远端推送、cold setup 或额外平台验收。

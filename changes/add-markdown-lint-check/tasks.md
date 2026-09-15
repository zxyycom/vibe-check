# Tasks

先闭合长期方向和 backend 证据，再实现独立 Check，最后以目标、package、文档和 aggregate 证据退出。

## Readiness

- [x] 0.1 核对 current project-file owner 与 Change 协调，确认按需收集路径可直接承接 file-owning Check。
- [x] 0.2 用 exact 候选规则复核 tracked Markdown corpus，确认八项默认集的信号方向与 repository dogfood 边界。
- [x] 0.3 建立独立 Markdown lint 长期 Decision，闭合用户结果、owner、九项规则、private backend、package advisory
  default 与 Gate 边界；运行 `bun run decisions -- check`。
- [x] 0.4 在临时 consumer 复核 `markdownlint@0.41.1` 的 MIT license、Node engine、production/transitive graph、
  Promise subpath 与项目 Node host 中的实际 strings API 执行。根依赖与 lockfile 由 Implementation 1.1 更新。
- [x] 0.5 使用 `ai-ready-docs` 复核 proposal、design 与 tasks，确认文档只保留当前契约，且实现参数、owner、
  验收和 Open Questions 均已闭合。

## Implementation

- [x] 1.1 用 `pnpm` 更新根 production dependency、`pnpm-lock.yaml` 与 release manifest，并同步
  dependency/artifact audit 的 exact requirements。
- [x] 1.2 在 `src/package-checks/markdown-lint/**` 实现闭合 options/resolved options、九项 Product rule catalog、
  constructor/preparation 与 root export types/parser。
- [x] 1.3 实现一次 file selection、资格对账、安全有界 UTF-8 读取、有序逐文件 cancellation 和 no-partial traversal。
- [x] 1.4 实现 `markdownlint/promise` private adapter、固定 dialect/rule parameters、backend protocol validation、
  range fallback 与稳定排序/Record identity。
- [x] 1.5 实现 Product-owned Records、bounded messages、final-data invariants、unavailable reasons，以及
  not-applicable/passed/failed/unavailable settlement。
- [x] 1.6 新增 `docs/checks/markdown-lint.md`，同步 README、导航、package document registry、可执行示例、
  type acceptance、public API inventory 与 changelog。

## Verification

- [x] 2.1 修改测试前后运行 `bun run test-evidence -- check --root .`，并完成配置、九项 rules、方言、
  range/identity/order、input/limits/cancel/backend/no-partial 和四态结果的最窄原生 tests。
- [x] 2.2 运行受影响的 typecheck、lint、dependency 与 public-entry checks，证明 Core 不反向依赖新 Check 私有实现，
  且根 API 闭合。
- [x] 2.3 运行 `bun run validate -- docs`、API/example/type acceptance 与 package artifact/candidate/installed-consumer
  验收，证明 backend 实际随包解析和执行。
- [x] 2.4 运行 `bun run check`，确认 `markdownLinkValidation`、Project Gate selection 与无 cache 基线没有行为回归。
- [x] 2.5 在实现与公开材料验证完成后，把 `provide-bounded-markdown-lint-check` Decision 标记为 aligned，
  并运行 `bun run decisions -- check`。
- [x] 2.6 由非实施代理依据实际 diff 反查公开承诺、内部 owner、Decision、Case、package material 和交付边界；
  处理发现后逐项核对 Success Criteria。

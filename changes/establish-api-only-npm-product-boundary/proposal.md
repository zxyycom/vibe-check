# Proposal

本 Plan 在 `unify-check-authoring-and-execution` 完成后，把已验证的 Product runtime 投影为只支持 Bun 的 API-only `vibe-check` npm package；package 不重新解释 Check、Run、Task、Core 或 scanner semantics。

## Why

仓库当前正式入口是项目拥有的 bound Project Run，root manifest 仍为 `private: true`，也没有 exact-tarball consumer evidence。即使 Product runtime 在仓库内工作，也不能据此证明普通项目可以安装、导入并运行一个依赖闭合的 package。

上游 Check Change 将最终 public contract 收敛为：

- runtime functions：`defineConfig`、`defineCheck`、`inherit`、`run`；
- ordinary default Check values：`duplicateDetection`、`fileMetrics`、`functionMetrics`；
- one recursive `Check` family、direct execution、structured outcomes、native object customization；
- scanner executable 等 Check-specific dependencies 位于各默认 Check options；Run Controls 不再提供 operational dependency override。

本 Change 只负责 package projection、Bun host、dependency delivery、deterministic staging、exact-tarball acceptance 和 legacy Product CLI hard cut。它不能保留上游已经取消的 `BuiltInCheck`、`replace` / `append`、TaskPlan 或 operational dependency map 作为 package compatibility layer。

## Outcome

- Repository root 保持 `private: true`；受控 build 从 Product/current-contract owners 生成 staging tree，只在 staging root 执行 `npm pack`。
- Candidate package 的 runtime callable exports 恰好是 `defineConfig`、`defineCheck`、`inherit` 与 `run`；三个 default Checks 是 non-callable ordinary values。
- Public types 与上游 final inventory 一致；不公开 Core、Task、scheduler、scanner adapter、binding 或 legacy adjustment types。
- Installed project 自己维护 Project Definition 和 bound Project Run；separate caller 只调用项目 Run。
- Exact-tarball acceptance 证明 recursive authoring、typed Check helper、inheritance、native default-object spread、Check-owned executable options、direct execution/results、effects 和 cancellation。
- Manifest 无 `bin`；installable replacement 通过后删除 retained Product CLI migration diagnostic。
- Candidate 使用 unscoped `vibe-check`、MIT 与 `0.0.x`，但 build/pack/verify 不构成 registry publish。

## Scope

### In scope

- 消费并核对 `unify-check-authoring-and-execution` 的 final owners、source、tests、public inventory 与 dogfood；
- 建立 Bun runtime entry、declarations、manifest、MIT materials、support/prerequisite metadata 和 consumer map；
- 闭合 package-owned 或 Check-options-configured external scanner dependencies；
- deterministic staging、allowlisted inventory、provenance、digest 和 exact-tarball installed acceptance；
- project definition file → bound project Run → separate caller 的 canonical usage；
- replacement acceptance 后删除 retained Product CLI contract；
- 同步 architecture、configuration、scanner dependencies、output、testing、script tooling、CI 与 release procedure owners。

### Out of scope

- 重新设计 recursive Check、direct execution/result、Task scheduling、Core facts、policy、output 或 scanner protocol；
- 恢复 adjustment APIs、TaskPlan、operational precedence maps 或配置 discovery；
- 固定 consumer 项目的文件路径或 wrapper convention；
- Node.js direct import、dual runtime、whole-invocation sandbox、plugin system 或 public Product CLI；
- registry credentials、Trusted Publishing 或 `npm publish`。

## Success Criteria

- 上游 Change 已完成、稳定 owners 已同步，且 package implementation 不在未完成 contract 上建立 provisional exports。
- Runtime callable export inventory 恰好是 `defineConfig`、`defineCheck`、`inherit`、`run`；三个 ordinary default Check values 不是额外 operations。
- Public type export inventory与上游 decision/current-contract source 一致，旧 role/source/TaskPlan/adjustment/operational types 无法导入。
- Exact tarball 中的 Project Definition 可以声明 information-only root、execution-with-children、option-aware child、default Check children、全部 `inherit` states 与 native scanner/threshold overrides。
- Package Run 在 caller Bun runtime 中执行 project Check functions，并保留 one-Check-one-Task、structured outcome、Record/reference、dependency/mutex/cap、cancellation 和 effect semantics。
- Scanner executable/args 只来自对应 Check options；installed execution 不读取 repository mise、workspace devDependencies、old environment precedence registry 或 ambient repository paths。
- Manifest、entry、declarations、docs、examples 与 acceptance 单向核对 current public-contract source；tarball 无 tests、credentials、cache、logs 或 undeclared workspace files。
- Legacy Product CLI 只在 exact-tarball replacement 通过后删除；repository dogfood 继续调用 bound Project Run。
- 未获得单独授权时不读取 registry credentials、不配置外部发布，也不执行 `npm publish`。

## Affected Owners

- [`unify-check-authoring-and-execution`](../unify-check-authoring-and-execution/)：唯一上游 authoring/execution/public inventory handoff；
- `src/product/public-contract/**` 与 public entry：package symbol、defaults、support 与 release projection；
- `src/product/**`：Bun runtime/declaration closure；
- root manifest、lockfile、build/declaration configs 与 package scripts；
- `docs/scanner-dependencies.md` 与 default Check options：installed external prerequisite boundary；
- `scripts/**`：repository project Run adapter、staging、pack 与 acceptance；
- Architecture、CLI、Configuration、Output、Testing、Script Tooling、navigation、CI 与 release procedure owners。

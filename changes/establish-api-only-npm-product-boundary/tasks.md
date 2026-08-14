# Tasks

Readiness `0.15`、`0.16` 是 Implementation 门禁：只在 `adopt-typescript-project-definition` 完成并归档后核对上游证据、复审本 Plan 并刷新 baseline，再按编号实施 package projection、Bun host、exact-tarball acceptance 和 CLI hard cut。

## Readiness

- [x] 0.1 已确认三个 artifacts 共享同一目标：把前置 Product 运行内核投影为 API-only Bun npm package；package 只公开配置定义函数、Package Run 和必要 types。
- [x] 0.2 已区分 current facts、active future decisions、Change context、Vibe Check 显示名和仍需工程证据确认的 package values。
- [x] 0.3 已确认首个 package 只支持 Bun direct import；`support-bun-as-the-package-host` 为 active unaligned decision。
- [x] 0.4 已确认调用链为“其他调用方 → 项目 Run → Package Run → Product 运行内核 → 项目函数 → Task 系统”；不要求 whole-invocation worker/child process。
- [x] 0.5 已确认普通 invocation 默认产生 Product-owned logs、适用 cache 和 canonical output，同时返回 structured result。
- [x] 0.6 已确认 Project Definition 拥有 policies、Checks、gate、scheduler、effects 和 operational configuration；Run Controls 只补充当次 context 或允许的 overrides。
- [x] 0.7 已确认 runtime callable exports 恰好是配置定义函数和 Package Run；项目维护配置文件与运行脚本，项目 Run 不属于 package export。
- [x] 0.8 已确认 public registry identity 为 unscoped `vibe-check` 并使用 MIT；registry authority、authentication、legal material 和 publish authorization 仍需后续证据。
- [x] 0.9 已确认 Package Run 返回完整 Task、Check、Record、decision 与 effect results；API/file 是同一 validated model 的 projections。
- [x] 0.10 已确认 `0.0.x` 可以使用 explicitly configured Python、`scc` 等 external prerequisites；Product 继续拥有 capability、diagnostics 和 result semantics。
- [x] 0.11 已确认 tool neutrality 只约束 built-in Check policy、metadata 和 semantics；operational binding 可以如实绑定实际工具。
- [x] 0.12 已把 exact public symbols、default paths、environment identifiers、failure/cancellation/concurrency encoding、dependency delivery mix 和 host matrix 交给 current source 与工程 evidence；项目文件路径不属于 package contract。
- [x] 0.13 已按 `decision-records` 建立 public/MIT、definition-value Run、两个 callable exports、caller-runtime Task execution 和 operational binding 等 active directions，并通过 `bun run decisions:check`。
- [x] 0.14 已把两个 Plans 收敛为单向 owner 顺序：前置 Change 交付 definition-facing contract 与 Product 运行内核；本 Change 只消费并添加 package/release projection。
- [ ] 0.15 核对前置 Change 已完成并归档，current-contract fields、Project Definition validator、Product 运行内核、Task/dependency semantics、operational snapshot、JSON hard cut 和两文件 usage 均有 owner docs 与目标 tests。
- [ ] 0.16 依赖满足后重新审阅 current owners、active decisions、release/runtime graph 与本 Plan；确认没有新的 package-specific product question，运行 `plan` 刷新 baseline，再开始 Implementation。

## Implementation

- [ ] 1.1 核对并扩展 `src/product/**` current public-contract source：保留前置 Change 的 definition-facing names、types、defaults、environment/dependency identifiers；按 license decision、release history 与 evidence 添加 package name、MIT/license、candidate version、support matrix、system prerequisites、manifest/release fields 和 consumer map；不写 placeholder 或项目文件路径。
- [ ] 1.2 修改 tests 前按 `test-evidence-review` 恢复 public API、Task execution、CLI、gate、effects、repository adapter 与 package-consumer Cases；确定前置证明集合、CLI-only 退役集合和 exact-tarball separate-caller 证明集合。
- [ ] 1.3 从 current public-contract source 和 Product 运行内核建立 public entry：导出配置定义函数、Package Run 与必要 definition/control/result types；runtime callable export inventory 恰好为两个 functions，不泄漏 Core、manager、scheduler、Task、bindings 或 convenience operation。
- [ ] 1.4 实现 public result、failure、cancellation 和 concurrency projection；validated Task/Check/Record model 同时驱动完整 API result 与 canonical files，configuration、planning、gate、execution 和 effect outcomes 使用 distinct variants。
- [ ] 1.5 实现 Bun default host 并接入前置 Product 运行内核：snapshot environment/platform，提供 filesystem、Git、clock/identity、subprocess、cache、reporter 与 output；闭合 package-owned/configured-external delivery 和 executable/version validation，不重写 upstream definition、Task 或 precedence semantics。
- [ ] 1.6 接通 configured logs/progress、cache 和 canonical output；实现 current-contract defaults、write ownership、atomicity、collision、cleanup、cache invalidation、explicit disable 与 structured effect status。
- [ ] 1.7 在 root `private: true` 边界实现 clean staging，从 authoritative Product/current-contract sources 生成 Bun runtime、public entry、`.d.ts`、manifest 和 MIT files；manifest 无 `bin`、resource API、undeclared subpath 或额外 runtime callable export。
- [ ] 1.8 建立 staged import/dependency audit，确保 installed API 不读取 repository root、mise、`scripts/**`、tests/fixtures 或 dev-only packages；从 exact-tarball evidence 派生 host support，并为 unsupported host、missing prerequisite 与 invalid operational input 提供 typed diagnostics。
- [ ] 1.9 核对 unscoped `vibe-check` release history并选择 next `0.0.<patch>`；生成 matching MIT/provenance 与 breaking-risk/precise-pin notes，不把 root version、repository name、Change progress 或 pack 解释为 registry authority 或发布事实。
- [ ] 1.10 实现 candidate build、`npm pack --json`、allowlisted inventory、digest 与 provenance scripts；普通 lifecycle 止于 pack/verify，不读取 registry credentials、不运行 install-time network effects，也不 publish。
- [ ] 1.11 建立安全临时 Bun acceptance：只安装 exact tarball、declared dependencies 与明确 prerequisites；创建项目配置文件和项目运行脚本，再由 separate caller 只调用项目 Run；验证 project functions、representative `TaskPlan` dependency/parallelism/resources、default effects、complete result、failures、cancellation 和 concurrent invocation。
- [ ] 1.12 Gate B 通过后原子删除 Product CLI、argv parser、routing/help/exit mapping、`product:cli` script 和 CLI-only support；把 `scripts/quality/**` 改为调用项目 Run 的 repository adapter，不保留 dual Product entry、deprecated forwarding 或 argv shim。
- [ ] 1.13 同步 Architecture、CLI retirement、Configuration、Scanner Dependencies、Output、Testing/navigation、Script Tooling、release procedure、AGENTS、CI/workspace gate 与 Cases；stable owners 引用 upstream contract 和 current public-contract source，不复制本 Change 的 staging 细节。

## Verification

- [ ] 2.1 对 current public-contract source 执行 owner-to-artifact comparison，证明 manifest、两个 callable exports、types、defaults、environment/dependency identifiers、docs 与 fixtures 只使用 owned values；项目文件名未成为 package contract。
- [ ] 2.2 运行配置定义 authoring、definition/control/result、expected failures、Task/Check/Record projection、cancellation、concurrent invocation、operational resolution 与 effects 的最窄 tests；证明 expected failures 不依赖 console、exit code 或 exception text。
- [ ] 2.3 运行 direct project function、static `TaskPlan`、dependency/parallelism/resource、configuration/reference/gate、scan completeness 与 caller-runtime tests；证明 package 消费上游运行内核，没有 config loader、function serialization、whole-invocation worker 或重复 scheduler。
- [ ] 2.4 从 clean exact-tarball project 记录验证的 OS/architecture、最低 Bun、Git/system prerequisites 与 jscpd/scc/function-metrics delivery；external executable 必须显式绑定，audit 证明不读取 mise、workspace devDependencies 或 ambient `PATH`。
- [ ] 2.5 运行 Product CLI removal 与 repository adapter tests；focused search 证明 `src/product/**`、manifest 与 public docs 没有 `bin`、argv/help/exit contract、Product config discovery、public worker protocol、dual Product entry 或 deprecated forwarding。
- [ ] 2.6 重复 clean build 并比较 manifest、runtime、declarations、MIT inventory 与 provenance；tarball 只含 allowlisted files，无 tests、cache、artifact、secret、credential、undeclared workspace material 或 license/access mismatch。
- [ ] 2.7 在 isolated installed project 重跑 separate-caller acceptance：确认 validators、public types、Task/Check/Record results、built-in identities 与 effects 来自同一 version；runtime callable exports 恰好是配置定义函数和 Package Run，internal paths 不是 supported imports。
- [ ] 2.8 运行 product/package target tests、typecheck、lint、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate` 与本 Change 的 `change-plan -- check`。
- [ ] 2.9 运行 `bun run verify:vibe-check-workspace:full` 和 candidate dogfood；审计 scripts 无 registry/install-time publish side effect，并记录“build/pack/verify 通过，未执行 registry publish”。

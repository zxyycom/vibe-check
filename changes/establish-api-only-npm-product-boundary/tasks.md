# Tasks

本 Change 当前暂缓实施；暂停原因与恢复条件记录在 Design 的 `Implementation Observations`。metadata 保持 `plan`，不以 stage 表示暂停；条件闭合并完成重新审阅后，再按 API/runtime、CLI hard cut、package staging、exact-tarball evidence 的顺序实施。

## Readiness

- [x] 0.1 已核对 Proposal、Design 与 Tasks 共享“Vibe Check 以 API-only npm package 提供产品能力，并在同一实施边界 hard cut Product CLI”的主目标。
- [x] 0.2 已区分 current-fact owners、active future decisions、Change 实施上下文、Vibe Check 产品显示名、内部 role labels 与尚未确认的 package 公共契约名称。
- [x] 0.3 产品 owner 已确认首个 package 只支持 Bun direct import；`support-bun-as-the-package-host` 已建立为活动未对齐决策。
- [x] 0.4 产品 owner 已确认 Project Definition 与 custom runner 在 package-private worker/child-process boundary 中执行；`contain-project-code-behind-private-runtime-boundary` 已修订旧同进程方向。
- [x] 0.5 产品 owner 已确认普通 invocation 默认产生 Product-owned logs、适用 cache 和 canonical output，同时返回 structured result；`enable-tool-effects-by-default` 已建立。
- [x] 0.6 产品 owner 已确认 Project Definition 拥有 policy、Checks、gate、scheduler、reporting、cache 和 output configuration；public package API 不复制 command/method grammar。
- [x] 0.7 产品 owner 已确认 public callable surface 恰好包含配置定义与工具运行两个操作；必要公共类型不计为操作，配置文件由使用者创建和拥有，不公开 bootstrap/init、resource、CLI 或 private runtime surface。
- [ ] 0.8 分别确认 registry package、public imports/exports、两个操作及必要类型的 symbols、fixed Project Definition path、default effect paths 与 supported environment identifiers；不得从 `vibe-check` root name、源码或示例自动推导。
- [ ] 0.9 建立唯一 current public-contract source，核对 foundation seams、Open Questions 和派生消费者；更新三个 artifacts 后重新审阅并运行 `plan` 刷新 Git baseline，未完成前不得开始实施。

## Implementation

- [ ] 1.1 修改测试前按 `test-evidence-review` 恢复 CLI、configuration、runtime、gate、output/cache、repository tooling 与 package-consumer Cases；确定 CLI-only Case 删除集合和迁移到 API/exact-tarball acceptance 的证明集合。
- [ ] 1.2 实现配置定义与工具运行两个 public operations 及必要类型：配置定义返回同一 closed plain definition；工具运行使用 runtime-validated input 和 closed structured result。不得导出 internal Core、manager、scanner adapter、scheduler 或 private binding。
- [ ] 1.3 实现 Bun-only Product default runtime 和 closed operational resolver：快照 ambient environment/platform，提供 filesystem、Git、process/thread/worker、cache、reporter 与 output implementations，并验证 declared precedence 和授权边界。
- [ ] 1.4 实现 package-private project-code runtime：在该边界中加载 Project Definition、planning 和 custom runners，建立 serializable handoff、startup、cancellation、termination、cleanup 与 failure normalization；内部 entry/protocol 不进入 exports 或 `bin`。
- [ ] 1.5 把现有 scan/config/gate 领域语义迁移到工具运行操作；默认运行 configured logs、cache 和 canonical output，并在 structured result 中返回 effect status。Missing definition 返回配置诊断，不创建文件。
- [ ] 1.6 原子删除 Product CLI、argv parser、routing/help/exit mapping、`product:cli` script 与 CLI-only support；把 `scripts/quality/**` 改为 public package API 的 repository-owned adapter。
- [ ] 1.7 在 root `private: true` 边界内实现 clean staging build，从权威 Product/public sources 和 current public-contract source 生成 Bun runtime、`.d.ts`、legal files 与 candidate manifest；manifest 无 `bin`、resource API 或额外 callable surface。
- [ ] 1.8 建立 runtime import/dependency audit，确保 installed API 不读取 repository root、`scripts/**`、tests/fixtures 或 dev-only packages；声明最低 Bun/platform prerequisite，并为 unsupported host 或 invalid operational input 提供 typed diagnostics。
- [ ] 1.9 核对 owned release history 并选择唯一 next `0.0.<patch>`；生成 breaking-risk/precise-pin release notes，不把 root workspace version、repository name、Change 完成度或 pack 解释为 registry identity、稳定承诺或发布事实。
- [ ] 1.10 实现 candidate build、`npm pack --json`、inventory、digest 与 provenance scripts；普通 lifecycle 止于 pack/verify，不读取 registry credentials，也不执行 publish。
- [ ] 1.11 建立安全临时 Bun consumer acceptance：安装 exact tarball，调用 confirmed 配置定义操作创建 Project Definition value，再用 confirmed 工具运行操作验证默认 effects、代表性 gate、private containment failure 和 structured result；证明不存在第三项 public operation。
- [ ] 1.12 同步 Architecture、CLI 退役、Configuration、Output、Testing/navigation、Script Tooling、release procedure、AGENTS、CI/workspace gate 与语义 Case catalog；相邻 active Change 只引用 confirmed roles/identifiers。

## Verification

- [ ] 2.1 对 current public-contract source 执行 focused search 和 owner-to-artifact comparison，证明 manifest、exports、declarations、docs 与 fixtures 只使用 confirmed identifiers；root/source/Change/example strings 未被隐式继承。
- [ ] 2.2 运行配置定义、tool input/result、Bun default runtime、operational precedence、private containment、configuration/reference/gate、scan completeness 与 logs/cache/output effects 的最窄 tests；证明 gate、runtime 与 effect failure 使用不同 variants，且没有 public bootstrap/init。
- [ ] 2.3 运行 Product CLI removal 与 repository-adapter tests；focused search 证明 `src/product/**`、package manifest 与 public docs 没有 `bin`、argv/help/exit contract、public worker protocol、dual entry 或 deprecated forwarding surface。
- [ ] 2.4 重复 clean build 并比较 manifest、runtime/declaration inventory 与 provenance；检查 actual tarball 只含 allowlisted files，无 public template/resource API、source tests、cache、artifact、secret、credential 或 undeclared workspace material。
- [ ] 2.5 在隔离 Bun consumer 中运行 installed package acceptance，确认 runtime validators、public types、structured results 和 built-in identities 来自同一 package version，undeclared internal paths/protocols 不是 supported imports。
- [ ] 2.6 运行 product/package target tests、typecheck、lint、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate` 与本 Change 的 `change-plan -- check`。
- [ ] 2.7 运行 `bun run verify:vibe-check-workspace:full` 和 candidate dogfood；审计 scripts 没有 publish side effect，并记录“build/pack/verify 通过、未执行 registry publish”的交付边界。

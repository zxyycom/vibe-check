# Tasks

本 Plan 的产品与架构输入已经闭合，下一执行入口是 Readiness `0.14`。先用 `0.14` 定义 current public-contract source 的责任和消费者，再用 `0.15` 把单向 handoff 同步到 `adopt-typescript-project-definition`；随后从 Implementation `1.1` 建立 contract source。Package integration、public entry 和 CLI hard cut 必须等待 `1.3` 证明下游 Project Definition/private-runtime seam 可用。Design 的 `Confirmed Product and Architecture Inputs` 承接已确认方向，`Required Engineering Closure`、`Execution Gates` 与 `Current Execution State` 承接剩余工作和阶段门禁。

## Readiness

- [x] 0.1 已核对 Proposal、Design 与 Tasks 共享“Vibe Check 以 API-only npm package 提供产品能力，并在同一最终实施边界 hard cut Product CLI”的主目标。
- [x] 0.2 已区分 current-fact owners、active future decisions、Change 实施上下文、Vibe Check 产品显示名、内部 role labels 与尚待工程选择的 package 公共契约值。
- [x] 0.3 产品 owner 已确认首个 package 只支持 Bun direct import；`support-bun-as-the-package-host` 已建立为活动未对齐决策。
- [x] 0.4 产品 owner 已确认 Project Definition 与 custom runner 在 package-private worker/child-process boundary 中执行；`contain-project-code-behind-private-runtime-boundary` 已修订旧同进程方向。
- [x] 0.5 产品 owner 已确认普通 invocation 默认产生 Product-owned logs、适用 cache 和 canonical output，同时返回 structured result；`enable-tool-effects-by-default` 已建立。
- [x] 0.6 产品 owner 已确认 Project Definition 拥有 policy、Checks、gate、scheduler、reporting、cache 和 output configuration；public package API 不复制 command/method grammar。
- [x] 0.7 产品 owner 已确认 public callable surface 恰好包含配置定义与工具运行两个操作；必要公共类型不计为操作，配置文件由使用者创建和拥有，不公开 bootstrap/init、resource、CLI 或 private runtime surface。
- [x] 0.8 产品 owner 已确认 registry product 是正常公开发布的 unscoped `vibe-check`，使用 MIT license；真实 registry authority、authentication、copyright/legal metadata 与 publish authorization 保持为工程/发布证据。
- [x] 0.9 产品 owner 已确认工具运行默认返回完整 Task、Check、Record 结果并同时产生配置允许的文件输出；API 与文件是同一 validated execution/publication mechanism 的 projections。
- [x] 0.10 产品 owner 已确认 `0.0.x` 过渡阶段允许 configured external prerequisites，例如显式提供 Python、`scc` executable locations；Product 继续拥有 capability、diagnostics 与 result semantics，不以 reduced capability 规避依赖闭合。
- [x] 0.11 已澄清 tool neutrality 只约束 built-in Check 的 policy fields、metadata 和语义不按 scanner 塑形；configuration 可以在 operational dependency boundary 中如实绑定具体工具，不要求隐藏实现或建立第二份配置文件。
- [x] 0.12 产品 owner 已把 exports/symbols、fixed/default paths、environment identifiers、failure/cancellation/concurrency encoding 和 evidence-derived host matrix 委托给工程闭合；正式版本门槛不属于本 Change。
- [x] 0.13 已按 `decision-records` 建立 public unscoped package、MIT license 与 semantic-tool-neutral/operational-binding 三项活动未对齐决策，并通过 `bun run decisions:check`；当前 literal values 仍留给 future current public-contract source。
- [ ] 0.14 明确 current public-contract source 的 typed responsibility 和完整 consumer map，覆盖 candidate manifest、public entry、declarations、canonical example、docs、repository adapter fixtures 与 exact-tarball acceptance。
- [ ] 0.15 把三阶段 handoff 同步到 `adopt-typescript-project-definition`：该 Change 只拥有 definition authoring/selection/private loading/normalization/JSON hard cut/foundation handoff，并消费本 Change frozen contract；两个 Plans 不重复实现 loader、public-name owner 或 package staging。
- [x] 0.16 已按 confirmed contract 更新三个 artifacts，重新核对 owner docs、活动决策、两个 active Changes 与当前实现，并运行 `plan` 刷新 Git baseline；Plan baseline 只证明计划复核状态，不作为产品代码实施证据。

## Implementation

- [ ] 1.1 在 `src/product/**` package-private boundary 建立 typed current public-contract source；让 unscoped `vibe-check` public/MIT identity、工程选定的 public identifiers/paths/environment allowlist、operational dependency contract、evidence-derived support matrix 与 candidate version input 只有一个 literal owner，并建立 generation 或单向 comparison check。
- [ ] 1.2 让 `adopt-typescript-project-definition` 消费 confirmed path/import/symbol/effect/environment/dependency-binding values；在其 seam 可用前，本 Change 不实现 placeholder public entry、不复制 loader，也不开始 CLI hard cut。
- [ ] 1.3 核对 `adopt-typescript-project-definition` 已通过目标 tests 并提供 definition authoring、source selection、private loading/normalization、custom execution、JSON hard cut 与 default-effect handoff；记录 package integration 使用的 package-private seam。
- [ ] 1.4 修改测试前按 `test-evidence-review` 恢复 CLI、configuration、runtime、gate、output/cache、repository tooling 与 package-consumer Cases；确定 CLI-only Case 删除集合、Project Definition Change 已拥有的证明集合，以及迁移到 API/exact-tarball acceptance 的 package 证明集合。
- [ ] 1.5 从 confirmed contract 与 Project Definition seam 建立唯一 public entry：配置定义操作返回同一 closed plain definition，工具运行操作使用 runtime-validated input 和 closed async result；callable runtime exports 精确为两个 functions，工程只增加能够证明必要的 non-callable runtime values，必要 types 不泄漏 internal Core、manager、scanner adapter、scheduler 或 private binding。
- [ ] 1.6 实现 closed result/failure/cancellation/concurrency contract；Task、Check、Record 的 validated owner model 同时投影为完整 API result 与默认 canonical files，gate、configuration、containment、execution 与 effect failure 使用不同 variants。
- [ ] 1.7 实现 Bun package host 与 closed operational resolver：快照 configured environment/platform，提供 filesystem、Git、process/thread/worker、cache、reporter 与 output implementations；闭合 package-owned/configured-external dependency mix，在独立 operational dependency boundary 接受 Python、`scc` 等显式 executable locations，work 前验证且不回退 ambient `PATH`。Built-in Check policy fields 与语义不得按实际 scanner 塑形。
- [ ] 1.8 接通普通 invocation 的 configured logs/progress、cache 和 canonical output；实现 confirmed default paths、write ownership、atomicity、collision、cleanup、cache invalidation、explicit disable 与 structured effect status。
- [ ] 1.9 原子删除 Product CLI、argv parser、routing/help/exit mapping、`product:cli` script 与 CLI-only support；把 `scripts/quality/**` 改为只 import public package surface 的 repository-owned adapter。
- [ ] 1.10 在 root `private: true` 边界内实现 clean staging build，从权威 Product/public-contract sources 生成 Bun runtime、public entry、`.d.ts`、legal files 与 candidate manifest；manifest 无 `bin`、resource API、undeclared subpath 或额外 runtime value export。
- [ ] 1.11 建立 staged runtime import/dependency audit，确保 installed API 不读取 repository root、mise、`scripts/**`、tests/fixtures 或 dev-only packages；从 exact-tarball evidence 派生实际 host support，并为 unsupported Bun/platform、missing configured prerequisite 与 invalid operational input 提供 typed diagnostics。
- [ ] 1.12 核对 unscoped `vibe-check` owned release history 并选择唯一 next `0.0.<patch>`；生成 matching MIT legal/provenance、breaking-risk/precise-pin release notes，不把 root workspace version、repository name、Change 完成度或 pack 解释为 registry authority、稳定承诺或发布事实。
- [ ] 1.13 实现 candidate build、`npm pack --json`、allowlisted inventory、digest 与 provenance scripts；普通 lifecycle 止于 pack/verify，不读取 registry credentials、不运行 install-time network side effects，也不执行 publish。
- [ ] 1.14 建立安全临时 Bun consumer acceptance：只安装 exact tarball 与 declared prerequisites，调用 confirmed 配置定义操作创建 Project Definition value，再用 confirmed 工具运行操作验证默认 effects、代表性 gate、private containment failure、result/cancellation/concurrency contract 和 exact public surface。
- [ ] 1.15 同步 Architecture、CLI 退役、Configuration、Scanner Dependencies、Output、Testing/navigation、Script Tooling、release procedure、AGENTS、CI/workspace gate 与语义 Case catalog；相邻 active Change 只引用 confirmed contract 或其 owner。

## Verification

- [ ] 2.1 对 current public-contract source 执行 owner-to-artifact comparison，证明 manifest、exports、runtime values、declarations、paths、environment/dependency bindings、docs 与 fixtures 只使用 owned values；root/source/Change/example strings 未被隐式继承。
- [ ] 2.2 运行配置定义、tool input/result、expected failures、完整 Task/Check/Record projection、cancellation/timeout、concurrent invocation、operational precedence 与 logs/cache/output effects 的最窄 tests；证明 API/file projections 使用同一 owner model，expected product failures 不依赖 console、exit code 或 exception text。
- [ ] 2.3 运行 Project Definition source selection、private loading/evaluation、custom execution、configuration/reference/gate、scan completeness 与 containment tests；证明 public package 只消费 downstream seam，不公开 worker protocol 或重复 configuration authority。
- [ ] 2.4 从 clean exact-tarball consumer 得出并记录实际验证的 OS/architecture、最低 Bun、Git/system prerequisites 与 jscpd/scc/function-metrics delivery；验证 external executable 必须由 configuration 显式绑定，focused audit 证明不读取 mise、workspace devDependencies 或 ambient `PATH` fallback。
- [ ] 2.5 运行 Product CLI removal 与 repository-adapter tests；focused search 证明 `src/product/**`、candidate manifest 与 public docs 没有 `bin`、argv/help/exit contract、public worker protocol、dual entry 或 deprecated forwarding surface。
- [ ] 2.6 重复 clean build 并比较 manifest、runtime/declaration/MIT legal inventory 与 provenance；检查 actual tarball 只含 allowlisted files，无 source tests、cache、artifact、secret、credential、undeclared workspace material 或不匹配的 license/access metadata。
- [ ] 2.7 在隔离 Bun consumer 中运行 installed package acceptance，确认 runtime validators、public types、完整 Task/Check/Record results、built-in identities 与 default effects 来自同一 package version，callable runtime exports 恰好两个且其它 runtime values 都有必要性证据，undeclared internal paths/protocols 不是 supported imports。
- [ ] 2.8 运行 product/package target tests、typecheck、lint、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate` 与本 Change 及 downstream Change 的 `change-plan -- check`。
- [ ] 2.9 运行 `bun run verify:vibe-check-workspace:full` 和 candidate dogfood；审计 scripts 没有 registry/install-time publish side effect，并记录“build/pack/verify 通过、未执行 registry publish”的交付边界。

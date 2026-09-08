# Package Lifecycle

维护 package artifact、candidate 或 external-consumer acceptance 时，从本篇按任务读取 workspace lifecycle：构建与安装候选包、核对 material、准备 formal release，或维护 translated source mapping，均在对应小节执行。

本文拥有这些 package lifecycle 边界；它不定义 Product consumer contract，也不拥有 Project Gate aggregation 或 package documentation 的内容事实。

## Package artifact 与 candidate

### 构建输入与包接口边界

`scripts/package/artifact/**` 从 public Product 入口 `src/index.ts` 与显式 internal Worker root `src/package-checks/function-metrics/analyzer-worker.ts` 构造 local candidate。artifact fingerprint 同时绑定这两个 compiler root、Bun、锁定的 TypeScript emit/parser toolchain、Product source、package scripts 与文档输入。

Worker、Product adapter 与 Lizard port façade都不是 package export 或 consumer subpath；它们仅作为内部 runtime material 保持所需的 Worker execution shape。构建过程逐模块生成 `dist/esm/**.mjs`，同时生成 `types/**.d.ts`、对应的源码映射，并复制 package 所属的非 test/fixture `src/**.ts` Product 源码。

package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`；`package.json` 的 `exports` 只开放根路径 `"."`。因此物理存在的 `dist`、`types` 与 `src` 目录不是 consumer subpath API。

worker 不是额外 export：normalization 只在 emitted `function-metrics/analyzer-worker-port.js` 中恰好一次将 `new URL("./analyzer-worker.ts", import.meta.url)` 改为 `analyzer-worker.mjs`，任何数量或 compiler-shape drift 都拒绝产物，绝不 broad-rewrite ordinary URL strings。

### 依赖与发布清单

逐模块产物保留第三方 package imports；candidate manifest 必须声明完整且可审计的直接运行时依赖要求。依赖的行为 owner 决定使用精确版本还是有界 semver range；candidate installation 必须验证实际解析版本满足声明，随后由实际 consumer execution 验证这份安装。普通 dependencies 不被 bundled 进 Vibe Check tarball，而由 package manager 作为独立 package 安装。

[`scripts/package/artifact/release-manifest.json`](../../scripts/package/artifact/release-manifest.json) 是 local candidate 与 formal release 共用的唯一稳定发布 manifest owner。它保存：

- user-scoped `@zxyycom/vibe-check`；
- discovery metadata、唯一 root export、license/host/repository/publish metadata；
- allowlisted files 与完整 production dependencies。

其 `version` 必须是不可发布的 `<candidate-version>` sentinel；构建以显式传入的 repository root 读取它，并且只投影本次 candidate/release version 到 staging。它不通过 module-level JSON import 回读主 checkout，因此 fixture 和 formal root 不能泄漏 source。

fingerprint 显式绑定该 JSON 的 repository-relative path 和原始 bytes；任意静态 JSON drift 都使 local candidate 与 formal receipt stale。manifest 不含 `private`、`homepage`、`bin`、lifecycle scripts、Bun host 或 subpath export。

source→projection equality 不取代独立 audit：source 和 tar/staging 仍对 closed fields、identity、license/legal material、engine、root export、files、publish target 与合法 dependency map fail closed；安装 probe 从同一 source 取得 Ajv/jscpd requirement，再验证实际 consumer-resolved package/bin。

### Legal material 与 dependency installation 的边界

Package artifact 与 dependency installation 是两个不同的事实源。

#### 随包法律材料

**当前范围。** 根 [`LICENSE`](../../LICENSE) 是 Vibe Check own MIT text；唯一 [`licenses/`](../../licenses/) 目录保存仅适用于已携带 analyzer translations 的 [`analyzer-translations-NOTICE.md`](../../licenses/analyzer-translations-NOTICE.md)、Lizard 1.24 MIT、`lizard.py` Apache-2.0、Pygments 2.18 BSD-2-Clause text 与 fixed-range provenance。

**验收责任。** staging、tarball 与 installed candidate 核对 packaged material，并闭合 shipped source header→ledger→license、deferred bodies absent 与无 Python/Lizard/Pygments runtime dependency。

**不作出的结论。** `licenses/` 不代表普通 npm dependency graph；归属说明不枚举独立安装的 dependency；artifact 不发布平级 `third-party-licenses/`。

#### 实际安装的依赖

**当前范围。** private consumer 本次安装中实际存在的全部 top-level、scoped 与 nested dependency package，包括本平台实际选中的 optional package；不含 Vibe Check candidate 自身。

**验收责任。** 核对路径与 manifest 中非空且无首尾空白的 name/version，并读取同样非空且无首尾空白的当前 `license`，或所有条目具有同一个此类 `type` 的 legacy `licenses[]`。当前 policy 只接受 `Apache-2.0`、`BSD-2-Clause`、`BSD-3-Clause`、`BlueOak-1.0.0`、`ISC` 与 `MIT`。

**不作出的结论。** 审计不覆盖本平台未安装的 optional package，不证明 dependency package 的物理法律材料，也不构成法律审查或额外兼容语义。

#### 失败与审计边界

Dependency manifest 缺失或格式错误、目录名与 manifest name 不一致、许可声明缺失/格式错误/不在当前 policy、symlink package layout 或 candidate package path 逃逸均 fail closed。SPDX 字段不能替代随包材料的 physical audit；Pygments/Lizard legal provenance text 本身也不构成 runtime dependency。

artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package 源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。

### 候选包安装与外部使用方验收

`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，再把解析到的根入口交给 private consumer；它不从 repository source 或祖先依赖补偿不完整的 candidate。安装后的责任按以下边界闭合：

1. package material audit 完成后，对[实际安装的依赖](#实际安装的依赖)一节定义的集合执行 license declaration policy audit；
2. 一个 child 一次解析 candidate 根入口与 Ajv/jscpd 两项功能探针依赖；
3. parent 核对路径 containment、manifest version 和 jscpd bin；
4. 实际 jscpd execution 由随后消费同一安装的 Product / external runtime 验收，preparation 不为同一事实重复启动多个 probe。

`candidate/external-consumer/**` 是 candidate 下级模块：它建立一次隔离安装及 typed material，并分别验证 types、documentation 与 runtime。

runtime evidence 从 installed root import 实际调用 `functionMetrics`，要求 CCN `2` 的 non-blocking finding，证明 emitted Worker URL 指向安装包内 worker 且 Worker 执行成功，而不扩大 public exports。Types acceptance 用一次真实 `tsgo` consumer typecheck 覆盖 public imports、examples 与 Definition，并直接核对 installed declaration owner 的相邻 JSDoc；它不为同一 declaration graph 构造第二个 LanguageService program。父级 candidate lifecycle 不吸收这些验收职责。

### Local candidate lifecycle

#### 证据路径与冷重建边界

`scripts/package/build-contract.ts` 是 local candidate 默认路径与责任的唯一 owner：`build/package/` 是唯一完整 unpacked package build evidence，`build/artifacts/` 保存 versioned `.tgz`。`.cache/vibe-check/package-candidate/` 只保存 preparation receipt 与 `candidate.tsbuildinfo` 等 cache state；不得把 staging/tarball 放回 cache、挪用根 `artifacts/`，或复制 cache staging 建立第二个 evidence source。

fixture 传入 `buildDirectory` 和 `stateDirectory` 时必须让两者保持 test-local 隔离，且 contract 拒绝彼此重叠。cold rebuild 只清理这两个精确拥有的 build paths 和 cache-owned receipt/compiler state。

#### 根命令、Project Gate 与物理集成

`package:status` 只读地报告 candidate version、`current`/`stale` freshness、unpacked path、tarball path 和经验证的 installed entry；stale 时另报告 required preparation action，并以非零退出提示 `package:build`，不静默复用或修复。

`package:build` 执行既有 prepare 的 `reuse`/`reinstall`/`rebuild` 选择和相应 audit，明确分别报告完成后的 current state 与 performed action；`package:verify` 直接运行 complete Project Gate。Gate root 在 Product Run 前完成或复用这一份 exact preparation，`--all` 内的 artifact 与 external-consumer acceptance 只消费其 typed evidence，不再另建 detached cold candidate。

`package:candidate:integration` 是 routine `--test` preset 之外的显式物理 target：它在 30 秒进程硬限制内以 test-local state 证明一次 cold build/install/reuse，并覆盖以下边界：build staging 仍由 artifact acceptance 审计、installed documentation drift 会失败、installed dependency license drift 与 missing dependency 触发 reinstall、malformed receipt 触发 rebuild。Routine Gate 不运行该显式 target。

#### 准备动作与复用证据

Candidate preparation 先执行不修改文件系统的状态判断，再根据结果执行动作：

- `reuse`：receipt/input、packed artifact 与 installed consumer 都仍然有效，不执行 build、pack 或 install。
- `reinstall`：packed artifact 仍然有效，但 installed consumer 无效；只重新安装。
- `rebuild`：receipt 或 artifact 无法复用；清理 candidate state 后重新 build、pack 和 install。

Reuse path 不重复扫描只服务 build evidence 的 staging 内容。Artifact acceptance 仍对同一次 provider staging 执行完整 material audit，因此 staging corruption 不会从 `--all` package acceptance 中消失。

### Formal release preparation and receipt

#### 发布身份与授权边界

Formal release 不复用 local receipt 或把 `0.0.0-local.*` 改名。`package:release:prepare` 要求 caller 显式提供 canonical positive `0.0.<patch>` 与保守 lowercase tag，并要求 repository root、index 和 worktree 位于同一 clean `HEAD`。这些输入只选择本地 build identity；命令不会核验 npm 上的版本可用性、publisher authority 或授权状态，也不会把 caller input 变成 registry fact。

一次 active release 的 exact version/tag/access/mechanism 与当次 registry observations 由该 release 的 active Change evidence 承接，不在本稳定行为 owner 中复制。归档 release 中的形成时结果不得恢复成后续版本的 selection、availability 或授权。

执行者必须先建立新的 active release owner，再从其 current evidence 取得 `<selected-version>` 与 `<selected-tag>`，然后调用 `bun run package:release:prepare -- --version <selected-version> --tag <selected-tag>`。Evidence 中的值不是后续版本的默认值、registry availability 证明或 publish 授权；public access 仍由 version 投影后的 staging manifest 中闭合的 `publishConfig` 承接，外部 publish mechanism 也不由此脚本执行。

#### 受控路径与收据内容

Prepare 清理的范围仅是 `build/release-package/`、该 version 的 `build/artifacts/zxyycom-vibe-check-<version>.tgz`、`build/releases/zxyycom-vibe-check-<version>.release.json` 与 `.cache/vibe-check/package-release/`；其中 release staging/cache 与默认 `build/package/`、`.cache/vibe-check/package-candidate/` 隔离，versioned tarball root 由 artifact builder 共用。

Receipt writer 在写入前要求 artifact、staging 与 receipt path 都匹配这些 owned paths，并重新核对 artifact SHA-256；失败不会把任意 caller path 写成 release evidence。

Release receipt 只保存 repository-relative canonical paths，并闭合 source commit、package input fingerprint、version/tag、ordered tar inventory、SHA-256、SHA-512 SRI、manifest/legal/README identity；它不保存 token、OTP、`.npmrc`、publisher secret、临时 consumer 或 absolute checkout path。

prepare 在 build 前后复核 clean commit/fingerprint，写入 receipt 后再按该 receipt 重验；任一 source 或 byte drift 都失败。只有 receipt 通过 current verifier 后，这些本地材料才构成完整 formal preparation 结果；receipt 本身仍不证明 Gate 或 registry 状态。`package:release:verify` 只把显式 receipt 交给 `--all` Gate，不查询 registry，也不发布。

### Translated source mapping maintenance

此维护流程只处理 source-aligned Lizard port 的**来源到仓库 target**闭合；它不是上游代码更新、header 修复或 analyzer 行为验收。维护者先区分下列 owner，不能从相邻 JSON 的格式推断写入权：

| Material | Owner / editable status | Purpose |
| --- | --- | --- |
| `licenses/lizard-1.24.0-provenance.json` | source/range/hash/SPDX→translated target inventory 的唯一人工编辑源 | 来源、范围和 translated target 改动时在此更新。 |
| `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/lizard-1.24-source-identity.json` | 单独人工维护的 identity evidence | 选择 source→symbol 或 named host seam，并保留 `classes`/`symbols` completeness signal；它不由 ledger 生成。 |
| `scripts/package/package-contract.ts` 的 `PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256` | 由 ledger 字节派生的 package legal-material pin | package legal-material audit 消费该 pin；不要手改。 |

通常先运行只读检查：

```sh
bun run source-mapping
```

它解析 ledger 并核对 package-contract 中的精确 provenance SHA-256；只有摘要一致且 identity 不含旧派生计数后，才执行 source-identity AST audit。发现任一派生材料陈旧时失败而不写工作树。审阅 ledger 和 identity selection 后，才可显式运行：

```sh
bun run source-mapping -- sync
```

`sync` 只会把 provenance 的 SHA-256 投影到 package contract，并在遗留字段存在时从 identity JSON 删除派生的 `counts.entries` 与 `counts.targets`；它不生成或改写 source→symbol/host-seam 选择、上游 hash、SPDX、license、source header、oracle 或 analyzer 行为。

写入前会先完成 ledger/identity/package-pin 校验及 identity audit；验证拒绝时不改 curated files（包括缺失或重复的 package pin）。若之后的写入失败，流程尝试恢复本次尝试写入的每个文件的原内容；该恢复路径由目标测试覆盖，但不替代版本控制。

来源 inventory/派生 pin 的维护测试、identity AST coverage、以及 source header/legal-material closure 是互补证据；它们不能证明 reader/oracle/parity 的翻译语义，后者仍由 analyzer owner 的行为测试证明。

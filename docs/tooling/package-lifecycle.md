# Package Lifecycle

本文拥有 package artifact、candidate 与 external-consumer acceptance 的 workspace lifecycle。
它不定义 Product consumer contract，也不拥有 Project Gate aggregation 或 package documentation 的内容事实。

## Package artifact 与 candidate

`scripts/package/artifact/**` 从 public Product 入口 `src/index.ts` 与显式 internal Worker root
`src/package-checks/function-metrics/analyzer-worker.ts` 构造 local candidate。artifact fingerprint 同时绑定这两个
compiler root、Bun、锁定的 TypeScript emit/parser toolchain、Product source、package scripts 与文档输入。Worker、
Product adapter 与 Lizard port façade都不是 package export 或 consumer subpath；它们仅作为内部 runtime material 保持所需的
Worker execution shape。构建过程逐模块生成
`dist/esm/**.mjs`，同时生成 `types/**.d.ts`、对应的源码映射，并复制 package 所属的非 test/fixture `src/**.ts`
Product 源码。package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`；`package.json` 的 `exports` 只开放根路径
`"."`，因此物理存在的 `dist`、`types` 与 `src` 目录不是 consumer subpath API。worker 不是额外 export：normalization
只在 emitted `function-metrics/measurement.js` 中恰好一次将 `new URL("./analyzer-worker.ts", import.meta.url)` 改为
`analyzer-worker.mjs`，任何数量或 compiler-shape drift 都拒绝产物，绝不 broad-rewrite ordinary URL strings。

逐模块产物保留第三方 package imports；candidate manifest 必须声明完整且可审计的直接运行时依赖要求。依赖的行为 owner
决定使用精确版本还是有界 semver range；candidate installation 必须验证实际解析版本满足声明，随后由实际 consumer
execution 验证这份安装。package tooling 不替依赖 owner 推断额外兼容语义。
local candidate 与 formal release 共用同一 closed generated manifest：user-scoped `@zxyycom/vibe-check`、唯一 root export、
`MIT AND Apache-2.0 AND BSD-2-Clause`、Bun `>=1.3.14`、canonical `zxyycom/vibe-check` repository、explicit public npm registry/access、allowlisted files 与
完整 production dependencies。manifest 不含 `private`、`bin`、lifecycle scripts、Node host 或 subpath export。
仓库根 [`LICENSE`](../../LICENSE) 是 own MIT text owner，当前 notice 为 `Copyright (c) 2026 zxyycom`；artifact 还携带
[`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md)、`licenses/**` 中 Lizard 1.24 MIT、`lizard.py` Apache-2.0、Pygments
2.18 BSD-2-Clause text 与 fixed-range provenance，以及 Momoa third-party text。staging、tarball 与 installed candidate 都逐字节
核对这些 material、shipped source header→ledger→license closure、deferred bodies absent 与无 Python/Lizard/Pygments runtime
dependency；Pygments/Lizard legal provenance text 本身不构成 runtime dependency。SPDX 字段不能替代 physical legal-material audit。
artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package
源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。

`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，再把解析到的根入口交给 private consumer；
它不从 repository source 或祖先依赖补偿不完整的 candidate。安装后的责任按以下边界闭合：

1. 一个 child 一次解析 candidate 根入口与两项声明依赖；
2. parent 核对路径 containment、manifest version 和 jscpd bin；
3. 实际 jscpd execution 由随后消费同一安装的 Product / external runtime 验收，preparation 不为同一事实重复启动多个 probe。

`candidate/external-consumer/**` 是 candidate 下级模块：它建立一次隔离安装及 typed material，并分别验证 types、
documentation 与 runtime；runtime evidence 从 installed root import 实际调用 `functionMetrics`，要求 CCN `2` 的 non-blocking
finding，证明 emitted Worker URL 指向安装包内 worker 且 Worker 执行成功，而不扩大 public exports。Types acceptance
用一次真实 `tsgo` consumer typecheck 覆盖 public imports、examples 与 Definition，并直接核对 installed declaration owner
的相邻 JSDoc；它不为同一 declaration graph 构造第二个 LanguageService program。父级 candidate lifecycle 不吸收这些验收职责。

### Local candidate lifecycle

`scripts/package/build-contract.ts` 是 local candidate 默认路径与责任的唯一 owner：`build/package/` 是唯一完整
unpacked package build evidence，`build/artifacts/` 保存 versioned `.tgz`。`.cache/vibe-check/package-candidate/`
只保存 preparation receipt 与 `candidate.tsbuildinfo` 等 cache state；不得把 staging/tarball 放回 cache、挪用根
`artifacts/`，或复制 cache staging 建立第二个 evidence source。fixture 传入 `buildDirectory` 和 `stateDirectory`
时必须让两者保持 test-local 隔离，且 contract 拒绝彼此重叠。cold rebuild 只清理这两个精确拥有的 build paths 和 cache-owned receipt/compiler state。

`package:status` 只读地报告 candidate version、`current`/`stale` freshness、unpacked path、tarball path 和经验证的
installed entry；stale 时另报告 required preparation action，并以非零退出提示 `package:build`，不静默复用或修复。
`package:build` 执行既有 prepare 的 `reuse`/`reinstall`/`rebuild` 选择和相应 audit，明确分别报告完成后的 current state 与
performed action；`package:verify` 直接运行 complete Project Gate。Gate root 在 Product Run 前完成或复用这一份 exact preparation，
`--all` 内的 artifact 与 external-consumer acceptance 只消费其 typed evidence，不再另建 detached cold candidate。
`package:candidate:integration` 是 routine `--test` preset 之外的显式物理 target：它在 30 秒进程硬限制内以 test-local state 证明一次
cold build/install/reuse，并覆盖以下边界：build staging 仍由 artifact acceptance 审计、installed documentation drift 会失败、
missing dependency 触发 reinstall、malformed receipt 触发 rebuild。Routine Gate 不运行该显式 target。

Candidate preparation 先执行不修改文件系统的状态判断，再根据结果执行动作：

- `reuse`：receipt/input、packed artifact 与 installed consumer 都仍然有效，不执行 build、pack 或 install。
- `reinstall`：packed artifact 仍然有效，但 installed consumer 无效；只重新安装。
- `rebuild`：receipt 或 artifact 无法复用；清理 candidate state 后重新 build、pack 和 install。

Reuse path 不重复扫描只服务 build evidence 的 staging 内容。Artifact acceptance 仍对同一次
provider staging 执行完整 material audit，因此 staging corruption 不会从 `--all` package acceptance 中消失。

### Formal release preparation and receipt

Formal release 不复用 local receipt 或把 `0.0.0-local.*` 改名。`package:release:prepare` 要求 caller 显式提供 canonical
positive `0.0.<patch>` 与保守 lowercase tag，并要求 repository root、index 和 worktree 位于同一 clean `HEAD`。这些输入只
选择本地 build identity；命令不会核验 npm 上的版本可用性、publisher authority 或授权状态，也不会把 caller input 变成
registry fact。

一次 active release 的 exact version/tag/access/mechanism 与当次 registry observations 由该 release 的 active Change
evidence 承接，不在本稳定行为 owner 中复制。归档 release 中的形成时结果不得恢复成后续版本的
selection、availability 或授权。执行者必须先建立新的 active release owner，再从其 current evidence 取得
`<selected-version>` 与 `<selected-tag>`，然后调用
`bun run package:release:prepare -- --version <selected-version> --tag <selected-tag>`。Evidence 中的值不是后续版本的默认值、
registry availability 证明或 publish 授权；public access 仍由 generated manifest 的 closed `publishConfig` 承接，外部
publish mechanism 也不由此脚本执行。

Prepare 清理的范围仅是 `build/release-package/`、该 version 的 `build/artifacts/zxyycom-vibe-check-<version>.tgz`、
`build/releases/zxyycom-vibe-check-<version>.release.json` 与 `.cache/vibe-check/package-release/`；其中 release staging/cache
与默认 `build/package/`、`.cache/vibe-check/package-candidate/` 隔离，versioned tarball root 由 artifact builder 共用。
Receipt writer 在写入前要求 artifact、staging 与 receipt path 都匹配这些 owned paths，并重新核对 artifact SHA-256；失败
不会把任意 caller path 写成 release evidence。

Release receipt 只保存 repository-relative canonical paths，并闭合 source commit、package input fingerprint、version/tag、
ordered tar inventory、SHA-256、SHA-512 SRI、manifest/legal/README identity；它不保存 token、OTP、`.npmrc`、publisher secret、
临时 consumer 或 absolute checkout path。prepare 在 build 前后复核 clean commit/fingerprint，写入 receipt 后再按该 receipt
重验；任一 source 或 byte drift 都失败。只有 receipt 通过 current verifier 后，这些本地材料才构成完整 formal preparation
结果；receipt 本身仍不证明 Gate 或 registry 状态。`package:release:verify` 只把显式 receipt 交给 `--all` Gate，不查询 registry，
也不发布。

### Translated source mapping maintenance

此维护流程只处理 source-aligned Lizard port 的**来源到仓库 target**闭合；它不是上游代码更新、header 修复或
analyzer 行为验收。维护者先区分下列 owner，不能从相邻 JSON 的格式推断写入权：

| Material                                                                                                        | Owner / editable status                                             | Purpose                                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `licenses/lizard-1.24.0-provenance.json`                                                                        | source/range/hash/SPDX→translated target inventory 的唯一人工编辑源 | 来源、范围和 translated target 改动时在此更新。                                                             |
| `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/lizard-1.24-source-identity.json` | 单独人工维护的 identity evidence                                    | 选择 source→symbol 或 named host seam，并保留 `classes`/`symbols` completeness signal；它不由 ledger 生成。 |
| `scripts/package/package-contract.ts` 的 `PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256`                        | 由 ledger 字节派生的 package legal-material pin                     | package legal-material audit 消费该 pin；不要手改。                                                         |

通常先运行只读检查：

```sh
bun run source-mapping
```

它解析 ledger 并核对 package-contract 中的精确 provenance SHA-256；只有摘要一致且 identity 不含旧派生计数后，才执行
source-identity AST audit。发现任一派生材料陈旧时失败而不写工作树。审阅 ledger 和 identity selection 后，才可显式运行：

```sh
bun run source-mapping -- sync
```

`sync` 只会把 provenance 的 SHA-256 投影到 package contract，并在遗留字段存在时从 identity JSON 删除派生的
`counts.entries` 与 `counts.targets`；它不生成或改写 source→symbol/host-seam 选择、上游 hash、SPDX、license、
source header、oracle 或 analyzer 行为。写入前会先完成 ledger/identity/package-pin 校验及 identity audit；验证拒绝时
不改 curated files（包括缺失或重复的 package pin）。若之后的写入失败，流程尝试恢复本次尝试写入的每个文件的原内容；
该恢复路径由目标测试覆盖，但不替代版本控制。

来源 inventory/派生 pin 的维护测试、identity AST coverage、以及 source header/legal-material closure 是互补证据；
它们不能证明 reader/oracle/parity 的翻译语义，后者仍由 analyzer owner 的行为测试证明。

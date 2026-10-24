# Package Artifact

修改 package 构建、manifest、ESM 布局或随包法律材料时读取本文。本文拥有 local candidate 与 formal release 共用的产物契约；安装与复用见 [Package lifecycle](package-lifecycle.md)，正式发布见 [Package release](package-release.md)。

## 产物构造与审计

### 构建输入与包接口边界

`scripts/package/artifact/**` 从精确三个 compiler roots 构造 local candidate：public Product 入口 `src/index.ts`，以及私有
`src/package-checks/function-metrics/analyzer-worker.ts`、`src/package-checks/markdown-link-validation/io-worker.ts`。
artifact fingerprint 同时绑定三个 roots、Bun、锁定的 TypeScript emit/parser toolchain、Product source、package scripts 与文档输入。

Worker、Product adapter 与 Lizard port façade都不是 package export 或 consumer subpath；它们仅作为内部 runtime material 保持所需的 Worker execution shape。构建过程逐模块生成 `dist/esm/**.mjs`，同时生成 `types/**.d.ts`、对应的源码映射，并复制 package 所属的非 test/fixture `src/**.ts` Product 源码。

package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`；`package.json` 的 `exports` 只开放根路径 `"."`。因此物理存在的 `dist`、`types` 与 `src` 目录不是 consumer subpath API。

emit 通过[统一 compiler resolver](workspace.md#typescript-工具链)调用稳定 TS7 的已安装 `tsc` bin，并使用显式 `--ignoreConfig`。
artifact owner 因此必须在 CLI 中镜像 source compiler 的 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noImplicitReturns` 与 `allowUnreachableCode: false`，确保真实 runtime/declaration emit 遵守同一实现验收。
ESM specifier 与 Worker URL parser 使用上述工具链的 TS6 compatibility API。

toolchain fingerprint 绑定以下实际材料，而非仅记录包名或 wrapper 版本：

- 稳定 compiler manifest、声明的 bin、launcher 与 platform resolver；
- 本机选中的平台 package manifest 与 executable；
- compatibility wrapper 及其实际重导出的 TS6 API implementation 与 declarations。

candidate identity 另绑定根 manifest、lockfile、workspace 配置、精确依赖补丁与 resolver 使用的路径 containment 校验实现。必需材料缺失或 package identity 不符时拒绝构建。

`collectArtifactFingerprintInputFiles` 每次按当前 source、package scripts 与材料 registry 收集完整仓库输入。hash 按排序后的路径逐项读取原始 bytes，保留清单中的重复项；已安装工具链由上述独立 resolver 绑定。

指纹分支测试使用独立枚举固定输入、合法最小 registry、source 与 package scripts 的 synthetic repository，仍调用真实 collector/hash；复制测试按该 fixture 的当次清单复制普通独立文件，调用方负责副本的修改与清理。测试分别核对精确清单、各类输入的字节敏感性、新增输入的发现与副本写入隔离，不为输入变体复制完整 checkout。

指纹与 compiler-cache 的分支矩阵只替换私有工具链身份 provider，不替换 collector、hash 或 cache 判断；默认仍读取真实已安装工具链，没有跨轮身份缓存。真实 compiler/compatibility API、platform executable 与材料身份资格由 `compiler-toolchain.test.ts` 直接验证，实际 emit 和 installed consumer 验收继续使用真实 resolver。

Worker URL normalization 仅处理两个已知 owner，各自要求恰好一次精确 `new URL(<source>, import.meta.url)`：

| emitted parent（`dist/esm/package-checks/` 下） | source URL → runtime URL |
| --- | --- |
| `function-metrics/analyzer-worker-port.mjs` | `./analyzer-worker.ts` → `./analyzer-worker.mjs` |
| `markdown-link-validation/io-session.mjs` | `./io-worker.ts` → `./io-worker.mjs` |

normalization 发生在对应 `.js` emit 转为 `.mjs` 的构造阶段。目标须为独立编译的包内 Worker material；
缺失、越界、重复或 compiler-shape drift 拒绝产物，不改写普通 URL 字符串，也不增加 package export。

### 依赖与发布清单

逐模块产物保留第三方 package imports；candidate manifest 必须声明完整且可审计的直接运行时依赖要求。依赖的行为 owner 决定使用精确版本还是有界 semver range；candidate installation 必须验证实际解析版本满足声明，随后由实际 consumer execution 验证这份安装。普通 dependencies 不被 bundled 进 Vibe Check tarball，而由 package manager 作为独立 package 安装。

[`scripts/package/artifact/release-manifest.json`](../../scripts/package/artifact/release-manifest.json) 是 local candidate 与 formal release 共用的唯一稳定发布 manifest owner。它保存：

- user-scoped `@zxyycom/vibe-check`；
- discovery metadata、唯一 root export、license/host/repository/publish metadata；
- allowlisted files 与完整 production dependencies。

其 `version` 必须是不可发布的 `<candidate-version>` sentinel；构建以显式传入的 repository root 读取它，并且只投影本次 candidate/release version 到 staging。它不通过 module-level JSON import 回读主 checkout，因此 fixture 和 formal root 不能泄漏 source。

fingerprint 显式绑定该 JSON 的 repository-relative path 和原始 bytes；任意静态 JSON drift 都使 local candidate 与 formal receipt stale。manifest 不含 `private`、`homepage`、`bin`、lifecycle scripts、Bun host 或 subpath export。

source→projection equality 不取代独立 audit：source 和 tar/staging 仍对 closed fields、identity、license/legal material、engine、root export、files、publish target 与合法 dependency map fail closed；安装 probe 从同一 source 取得 Ajv/jscpd requirement，再验证实际 consumer-resolved package/bin。

### 随包法律材料

根 [LICENSE](../../LICENSE) 是 Vibe Check own MIT text；唯一 [licenses/](../../licenses/) 保存仅适用于已携带 analyzer translations 的 [analyzer-translations-NOTICE.md](../../licenses/analyzer-translations-NOTICE.md)、Lizard 1.24 MIT、`lizard.py` Apache-2.0、Pygments 2.18 BSD-2-Clause text 与 fixed-range provenance。

staging、tarball 与 installed candidate 核对 packaged material，并闭合 shipped source header→ledger→license、deferred bodies absent 与无 Python/Lizard/Pygments runtime dependency。来源 inventory 与派生 pin 的修改入口见[来源映射维护](source-mapping.md)。

`licenses/` 不代表普通 npm dependency graph，归属说明不枚举独立安装的 dependency，也不发布平级 `third-party-licenses/`。这些依赖的[实际安装许可声明审计](package-lifecycle.md#实际安装的依赖)是另一事实源：SPDX 字段不能替代随包材料的 physical audit，Pygments/Lizard provenance text 本身也不构成 runtime dependency。

### Pack 前后验收

artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package 源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。

每次 ESM 范围提取或 Worker URL 处理只解析当前原文一次，语法诊断与结构遍历复用该 AST；诊断阶段只检查语法。
exact public surface 由最终产物证明：保留 declaration export graph 对独立 type 清单的精确比对，runtime 在现有 ancestry-external Node runner 中比较真实 namespace keys 与独立 runtime 清单。source 侧保留 API authoring/default 行为与唯一相邻 JSDoc owner 证明，不另建完整 source export graph；emitted runtime 也不为相同清单再建 TS graph。
公开声明验收按文件收集相邻中文 JSDoc，再完整核验公开清单；语言要求由[编码规范](../development/coding-style.md#64-package-对外说明含显式随包用户-markdown-与任务专题以中文叙述为主)拥有。

Worker audit 的缺失、越界 URL、重复 URL 与 tarball bytes drift 负向证明使用最小独立 fixture，仍经过生产 layout/tar audit 入口；不得为注入故障修改真实候选或 Gate 共享 staging。真实候选的完整正向 layout/material 审计保留。

真实安装验收从 exact tarball 在 ancestry-external consumer 中运行受支持 Node，观察 Markdown Link 实际 `.mjs` Worker
加载、成功与协作取消后的退出，并保留 function-metrics Worker 的分析验收。源码/Bun 测试、路径模拟或 staging audit
不能替代这项安装证据；未执行的平台或 Node 版本不因路径检查通过而成为已验证环境。

文档内容与随包范围由[文档材料 registries](documentation.md#documentation-validation-and-package-material)拥有，不由 artifact audit 另建清单。修改 artifact 后先运行相邻测试，再用 `bun run check -- --all` 验证同一产物及 installed consumer。

# Package Artifact

修改 package 构建、manifest、ESM 布局或随包法律材料时读取本文。本文拥有 local candidate 与 formal release 共用的产物契约；安装与复用见 [Package lifecycle](package-lifecycle.md)，正式发布见 [Package release](package-release.md)。

## 产物构造与审计

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

### 随包法律材料

根 [LICENSE](../../LICENSE) 是 Vibe Check own MIT text；唯一 [licenses/](../../licenses/) 保存仅适用于已携带 analyzer translations 的 [analyzer-translations-NOTICE.md](../../licenses/analyzer-translations-NOTICE.md)、Lizard 1.24 MIT、`lizard.py` Apache-2.0、Pygments 2.18 BSD-2-Clause text 与 fixed-range provenance。

staging、tarball 与 installed candidate 核对 packaged material，并闭合 shipped source header→ledger→license、deferred bodies absent 与无 Python/Lizard/Pygments runtime dependency。来源 inventory 与派生 pin 的修改入口见[来源映射维护](source-mapping.md)。

`licenses/` 不代表普通 npm dependency graph，归属说明不枚举独立安装的 dependency，也不发布平级 `third-party-licenses/`。这些依赖的[实际安装许可声明审计](package-lifecycle.md#实际安装的依赖)是另一事实源：SPDX 字段不能替代随包材料的 physical audit，Pygments/Lizard provenance text 本身也不构成 runtime dependency。

### Pack 前后验收

artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package 源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。

文档内容与随包范围由[文档材料 registries](documentation.md#documentation-validation-and-package-material)拥有，不由 artifact audit 另建清单。修改 artifact 后先运行相邻测试，再用 `bun run check -- --all` 验证同一产物及 installed consumer。

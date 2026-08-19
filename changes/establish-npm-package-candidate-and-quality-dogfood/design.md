# Design

本 Design 说明如何用最小的物理 package 边界证明 Bun-only candidate 和 repository `quality`。主线只有 build/pack、repository consumer、隔离 consumer 和 handoff；它不建立 release system、scanner configuration system 或 benchmark framework。

## Context

下表是实施起点，不替代对应当前 owner：

| 当前事实 | 来源 | 本 Plan 的处理 |
| --- | --- | --- |
| Root 是名为 `vibe-check` 的 private workspace，尚无 public `exports`、`types`、`files` 或 production `dependencies`。 | `package.json` | Root manifest 保持开发工作区；candidate manifest 在派生 staging 中生成。 |
| Public inventory 已固定为四个 functions、三个 ordinary Check values 和 named type roots。 | `src/product/public-contract/current.ts` 与 public-surface Decision | Build、declarations 和 consumer imports 只投影这一 inventory。 |
| `quality` 的 canonical path 是 `index.ts -> scan.ts -> project-run.ts -> project-definition.ts`，后两个文件直接 import Product source。 | `scripts/quality/**` | Canonical files 保留原位，只把 Product imports 改为 `vibe-check`。 |
| Root `jscpd@5.0.11` launcher 最终由 Node 执行；jscpd manifest 的 public `bin` 指向 `run-jscpd.js`。 | root dependency、`jscpd/package.json`、repository Definition | Candidate 声明同一精确版本，Product default 解析 installed bin target 并由 Bun 执行。 |
| Scanner cache 已按 tool version、normalized command args、measurement config 和 input fingerprint 建立 identity。 | `docs/scanner-dependencies.md` 与 cache implementation | 不重建 cache model；只让新的 default Bun command 形成稳定且不同于旧 Node launcher 的 backend identity。 |
| Root scripts 已由 Bun 启动；Node pin 仍服务既有 pnpm 与 codegraph 开发工具。 | `package.json`、`mise.toml` | Candidate acceptance 使用 pinned Bun `1.3.14`；其它 tooling 保持现状。 |
| Test-evidence runner 递归遍历 `scripts`，当前 profile 没有 ignore；其它 scripts lint/format/typecheck 也以 `scripts` 为根。 | `scripts/test-evidence/supported-runner-profile.json`、discovery 与 development scripts | Nested consumer install 必须显式退出 repository-owned traversal，不能把 dependency files/tests 当成仓库材料。 |

### 实施术语与证明角色

| 术语 | 含义 |
| --- | --- |
| **candidate** | 从 fully-derived staging 经 `bun pm pack` 生成的本地 `vibe-check` `.tgz`；identity 由 local semver、input fingerprint、source revision 和 artifact digest 组成。 |
| **repository consumer** | 原有 `scripts/quality/` Definition/Run，通过该目录自己的 private package context 解析已安装 candidate；它证明真实仓库 workflow。 |
| **isolated consumer** | repository ancestry 外的临时 Bun project，安装同一 `.tgz` 并运行小型 acceptance fixture；它证明 package closure 独立。 |
| **自动准备** | `scripts/quality/index.ts` 建立 pinned Bun/mise 环境后、scan 前执行的 candidate build/install preparation；输入匹配时复用，输入变化时 rebuild/reinstall，失败时不运行 scan。 |
| **preparation receipt** | 保存于 ignored local state 的准备记录，至少包含 input fingerprint、candidate version、`.tgz` digest 和 resolved public entry；它只用于判断能否安全复用。 |

两类 consumer 的证据互补：repository consumer 证明真实 workflow，isolated consumer 证明没有 source/workspace leakage。隔离 consumer 不重跑完整 repository `quality`；那只会重复昂贵 scanner work，而不会增加 package-closure 证明力。

Repository 中任何会加载或 typecheck `scripts/quality/{project-definition,project-run}.ts` 的入口都属于 package consumer。当前至少包括 scripts typecheck、`project-run.test.ts` 经 test-evidence 运行、`quality` 和 workspace verifier；它们必须在消费前共享同一个 preparation owner，不能各自实现打包，也不能为 typecheck 添加 source/path alias。

### Test evidence handoff

Readiness 审计确认了下列现有证据与实施义务。计划中的测试意图保留在本 Change；只有测试实体实际存在或改变时，才维护 Case 账本。

| 行为边界 | 现有 Case | 实施时的证据动作 |
| --- | --- | --- |
| Current public projection | `WB-PROJECT-DEFINITION-001` | 保留 current-contract 证据；为 accepted `.tgz` 的 exports、types、file inventory 与 isolated public import 新增 package-candidate Case，不把物理 package closure 并入 Definition 行为 Case。 |
| Default duplication scanner 与 cache identity | `WB-SCANNER-DUPLICATE-CHECK-001`、`AUX-CURRENT-SCANNER-EVIDENCE-001`、`AUX-QUALITY-CACHE-001` | 修改对应实体后同步 Case 映射；覆盖 Bun direct bin、失败分类、旧 backend identity 失效和跨 install path normalization。 |
| Repository bound Project Run | `AUX-QUALITY-DOGFOOD-001` | 保留 Definition binding 证明；自动准备、fresh/reuse/rebuild/failure 和 resolved installed entry 进入新的 package-candidate Case。 |
| Workspace prerequisite graph | `AUX-WORKSPACE-TASK-ENGINE-ADAPTER-001`、`AUX-WORKSPACE-VERIFIER-PROFILE-001` | 给 verifier 增加 preparation dependency 后更新实际受影响的 profile/adapter Case，证明 package consumers 不会并发准备。 |
| Test discovery exclusion | `AUX-TEST-EVIDENCE-DISCOVERY-001` | 更新 profile discovery 证据，证明 nested `node_modules` 被显式排除且 repository test surface 保持闭合。 |

新的 package-candidate Case 必须同时拥有 repository physical install 与 isolated consumer 两组实体；它证明 package closure 和 preparation lifecycle，不重复 Product Run 的既有完整行为矩阵。

### Consumer path

```text
Product/current public contract
  -> derived staging: ESM + declarations + manifest
  -> bun pm pack -> one audited .tgz

bun run quality
  -> scripts/quality/index.ts -- pinned Bun/mise --> scripts/package-candidate/run-quality.ts
  -> automatic candidate preparation
     -> staging/tarball/receipt in .cache/vibe-check/package-candidate/
     -> install/reuse .tgz in scripts/quality/node_modules/vibe-check
  -> scripts/quality/scan.ts
  -> canonical project-run.ts/project-definition.ts
     -- bare import "vibe-check" --> installed candidate

isolated temporary Bun project
  -> install the same .tgz
  -> typecheck public imports
  -> run minimal duplicateDetection fixture
```

## Goals / Non-Goals

### Goals

- 生成一个可由 Bun 安装、typecheck 和执行的 API-only candidate。
- 让 canonical repository `quality` 通过已安装 public entry 运行，并在 candidate 输入不变时快速复用。
- 用同一 `.tgz` 的 focused isolated consumer 证明 package/dependency closure 不依赖 repository source。
- 只调整 Bun direct jscpd 所需的 default command 与 cache normalization，并形成后继 Gate 可消费的事实 handoff。

### Non-Goals

- 不建立 release/version/legal/registry 系统、Node/dual-runtime support 或全仓 runtime migration。
- 不建立 package-owned `.env`/scanner discovery、通用 cache service、dependency-network tracer 或 benchmark framework。
- 不在 isolated consumer 重跑整套 repository policy，也不通过 package boundary 重复 Product 的完整行为测试矩阵。

## Decisions

### 1. 派生本地 candidate，不把 root workspace 直接改成发布包

Staging 从 Product 与 public-contract owner 生成，不手工维护。它只包含 emitted runtime、declarations、candidate manifest 和明确允许的 package materials。Candidate manifest 使用 `0.0.0-local.<short-fingerprint>` 形式的合法本地 semver；这是安装身份，不是受管理的公开版本。

Build-input fingerprint 至少覆盖 Product/public-entry source、declaration/build 配置、manifest 生成输入和锁定的 production dependency 版本。一次 pack 和 audit 后记录 accepted `.tgz` digest；两类 consumer 安装同一文件，不要求重复 gzip 得到相同 bytes。

这个 artifact 是 local proof candidate，不是 release candidate。本地可行性证明不以 legal completion 为前置；因此本 Change 不推翻 MIT 方向，但也不能把缺少 release legal material 的本地 artifact 表述为 publish-ready package。正式 `0.0.x` version、MIT text 与经核实的 holder/year 仍由 release Change 重新构建和验收。

### 2. 在 pinned workflow 中自动准备真实的 private package consumer

Repository root 也名为 `vibe-check`，canonical importer 留在 root package scope 会产生 self-resolution 歧义。因此新增一个使用非产品名称的 private `scripts/quality/package.json`。自动准备把本地 `.tgz` 安装到 `scripts/quality/node_modules/vibe-check`，但不保存生成的 dependency 或 lockfile；该 nested `node_modules` 必须被 Git ignore，并从 test-evidence、lint、format、typecheck 与 quality file traversal 中排除。

Root `quality` 继续进入 `scripts/quality/index.ts`。`index.ts` 仍只建立 pinned Bun/mise/scanner 环境，但 pinned child entry 改为 `scripts/package-candidate/run-quality.ts`；该 entry 先调用同目录 preparation owner，再进入 `scripts/quality/scan.ts`。`scan.ts` 仍只调用 bound Run 并把 structured result 映射到 process exit。Definition/Run 继续使用原有 canonical tracked files，不生成副本、alias 或 source symlink。

`scripts/package-candidate/**` 把 staging、`.tgz` 与 preparation receipt 保存到 ignored `.cache/vibe-check/package-candidate/`。Receipt 与当前 input fingerprint、`.tgz` digest 和 resolved public entry 匹配时，不执行 build、pack 或 install；输入变化时自动 rebuild/reinstall；任何准备动作失败、状态损坏或身份矛盾时给出可行动 diagnostic，并且不运行 scan、不回退旧 candidate。正常使用不要求手动准备命令，实现也不建立通用 artifact cache 或 package-manager abstraction。

### 3. 使用 focused isolated consumer，不重复完整仓库扫描

Isolated project 位于 repository module ancestry 之外，安装 accepted `.tgz`，导入 approved runtime/types，并针对 fixture repository 执行一个包含 `duplicateDetection` 的小型 Definition。这足以覆盖 declarations、Product Run、subprocess 和 candidate-owned jscpd dependency，不要求 external `scc` 或 `lizard`。

完整 repository policy、effects 和 external scanner integration 已由 repository `quality` 运行；详细 Run/scheduler/cancellation/output 行为仍由 Product tests 拥有。经 installed package 重放这些测试只会增加运行成本，不覆盖新的 package 风险。

Repository validation 需要先闭合 preparation dependency：workspace verifier 增加一个 candidate-preparation task，`typecheck-scripts`、test-evidence 和 quality tasks 显式依赖它，避免并行 build/install。直接运行 scripts typecheck 或目标 Project Run test 时也调用同一个 preparation owner；在 verifier 已准备的情况下这些调用只是 identity check。任何入口都不得通过 TypeScript path mapping、source alias 或 workspace link 绕开 installed declarations/runtime。

所有实际 build/pack/install 都使用 repository-pinned Bun。已经位于 `scripts/quality/index.ts` 子进程中的 `run-quality.ts` 可以直接调用 preparation owner；其它直接入口必须通过同一 pinned-tool adapter 启动 preparation，而不是用 ambient Bun 产生另一种 receipt。

### 4. 把 `jscpd` 作为普通依赖，并用 Bun 执行其 declared bin target

Candidate manifest 把精确的 `jscpd@5.0.11` 声明为 production dependency。Default duplication Check 解析 installed package manifest 及其 declared `bin` target，再以 active Bun `process.execPath` 执行 availability 与 scan command；不调用 pnpm/Node `.bin` launcher。

缺少 candidate-owned jscpd 表示安装不完整，package acceptance 必须失败。Consumer-supplied scanner options 以及 external `scc` / `lizard` 缺失继续使用现有 validation 与 typed unavailable 行为。本 Change 不增加 package-owned environment lookup 或 dependency bootstrap script。

### 5. 复用现有 scanner cache contract

Project Definition 是普通 TypeScript，可以在调用 `defineConfig` 前读取 `.env`、`process.env` 或其它 project-owned input；这不需要 package feature 或专用 fixture。Product 只接收最终 validated `options.scanner`。

当前 cache owner 已把 scanner executable/args 和 detected tool version 纳入 backend identity。实现只更新 candidate-owned Bun+jscpd default 的 normalization，使其满足：

1. 从旧 Node launcher 切换后不复用旧 cache entry；
2. 同一 installed `jscpd` version 不会只因 consumer install directory 不同而产生不同 key；
3. explicit override value 继续使用现有 identity 行为。

不新增 environment-variable field、precedence layer 或通用 executable-equivalence system。

### 6. 一次审计 package 风险，不监控 package-manager internals

Artifact audit 验证 candidate manifest identity、approved exports/types、declared production dependencies 和 allowlisted file inventory。Consumer evidence 记录 candidate digest、resolved `vibe-check` entry、installed `jscpd` version/bin target 以及 commands/results。

普通 dependency installation 可以使用 registry 或 local cache。本 Plan 不禁止或追踪这些流量，也不证明 package-manager credential 行为；它不执行 `vibe-check` registry command 或 publish action，这一任务边界已足够支持 local package proof。

### 7. 性能只作诊断，不建立契约

有价值的效率要求是行为性的：第二次无变化的 `bun run quality` 不得 rebuild、repack 或 reinstall candidate。记录一次代表性的改动前、candidate-backed 和 candidate rebuild 耗时，用于发现明显回归。

当前没有稳定 performance budget 或已报告 bottleneck，因此本 Change 不建立多轮 cold/warm matrix、任意百分比/毫秒门槛或可复用 benchmark harness。若实际测量显示明显回归，再按 performance owner 调查，不在此预设 SLO。

### 8. 生成简洁的 downstream handoff

只在 evidence 已存在后创建 `candidate-handoff.md`，并记录：

| 字段 | 必需内容 |
| --- | --- |
| Candidate identity | local version、input fingerprint、source revision、`.tgz` path/digest 和 build command。 |
| Public/package inventory | exported runtime/types、manifest production dependencies 和 audited file list。 |
| Consumer evidence | repository/isolated commands、resolved entries、typecheck/run results 和 reuse result。 |
| Host/prerequisites | tested Bun/platform、installed jscpd version/bin target、external `scc` / `lizard` boundary。 |
| Limitations/revalidation | Bun-only/local-only status、excluded release/annotation/bootstrap scope，以及需要 rebuild/revalidation 的输入。 |

## Risks / Trade-offs

- **Root self-resolution：**必须使用 private `scripts/quality` package context 并断言 resolver；source alias 或 root self-reference 都是失败。
- **Stale local install：**自动准备必须把 preparation receipt 绑定到 input fingerprint 与 artifact/resolved-entry identity；失败时不运行 consumer，也不应扩展成通用 cache service。
- **并行准备：**workspace verifier 必须让所有 package-consuming checks 依赖一个 preparation task；直接入口复用同一 owner，不维护第二套 build/install 逻辑。
- **生成依赖污染 repository traversal：**`scripts/quality/node_modules` 必须由每个显式文件发现 owner 排除；仅依赖工具的默认 ignore 不能替代 test-evidence profile 和相邻验证。
- **jscpd 的 Bun compatibility：**`jscpd` 声明 Node engine，但当前 bin wrapper 能由 Bun 运行；必须执行 focused availability/scan acceptance。若失败，应取消 direct-run 优化，而不是增加宽泛 compatibility layer。
- **Narrow isolated fixture：**它只证明 package closure；repository dogfood 和 Product tests 分别拥有完整仓库与产品行为风险。
- **Bun-only support：**pinned Bun `1.3.14` 和当前平台的证据不代表 Node 或未测试平台兼容。

## Open Questions

无。`bun run quality` 自动准备 candidate：输入变化时自动 build、pack、install，输入未变化时快速复用；正常使用不要求先执行手动准备命令。实现复杂度限制在这条 workflow 所需的 input fingerprint、preparation receipt 和 local install，不扩展成通用缓存系统。

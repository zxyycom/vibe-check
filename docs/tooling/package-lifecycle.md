# Package Lifecycle

维护本地候选包准备、安装与 external-consumer acceptance 时读取本文。本文拥有 exact candidate 的状态、动作、证据路径和安装验收；不定义 Product consumer contract 或 Project Gate aggregation。

## Package artifact 与 candidate

artifact builder 产出 tarball；candidate lifecycle 安装并核对该精确产物，再把 installed root entry 交给 private consumer。按修改对象进入对应 owner，不必通读所有专题：

| 任务 | 完整规则 |
| --- | --- |
| 构建、manifest、模块布局或随包法律材料 | [Package artifact](package-artifact.md) |
| 本地候选包状态、准备与安装验收 | 本文下节 |
| 正式发布、冻结 source、receipt、tag 与合入 | [Package release](package-release.md) |
| Lizard 来源 inventory、identity selection 与派生 pin | [来源映射维护](source-mapping.md) |

## Local candidate lifecycle

### 命令与状态转换

| 命令 | 行为与结果 |
| --- | --- |
| `bun run package:status` | 只读报告 version、`current`/`stale`、unpacked/tarball path 与经验证的 installed entry；stale 时报告 required action，非零退出并提示 `package:build`，不静默修复。 |
| `bun run package:build` | 按状态执行 prepare 和 audit，分别报告完成后的 current state 与 performed action。 |
| `bun run package:verify` | 运行 complete Project Gate，不是另一条独立准备路径。 |

Preparation 先作不修改文件系统的状态判断，再执行对应动作：

| 动作 | 条件 | 执行 |
| --- | --- | --- |
| `reuse` | receipt/input、packed artifact 与 installed consumer 均有效 | 不 build、pack 或 install |
| `reinstall` | packed artifact 有效，installed consumer 无效 | 仅重新安装 |
| `rebuild` | receipt 或 artifact 无法复用 | 清理 owned state 后 build、pack、install |

### 证据路径与清理范围

`scripts/package/build-contract.ts` 拥有默认路径：`build/package/` 是唯一完整 unpacked build evidence，`build/artifacts/` 保存 versioned `.tgz`。`.cache/vibe-check/package-candidate/` 只保存 preparation receipt、`candidate.tsbuildinfo` 等 cache state；不得放置 staging/tarball、挪用根 `artifacts/` 或复制 cache staging 建立第二份 evidence。

fixture 的 `buildDirectory` 与 `stateDirectory` 必须 test-local 隔离，contract 拒绝重叠。cold rebuild 只清理精确拥有的 build paths 与 cache-owned receipt/compiler state。

### Gate 复用与物理集成

Gate root 在 Product Run 前完成或复用这份 exact preparation；`--all` 的 artifact 与 external-consumer acceptance 消费其 typed evidence，不另建 detached cold candidate。Gate binding 与 aggregate 由 [Project Gate](project-gate.md)拥有。

Reuse 不重复扫描只服务 build evidence 的 staging；artifact acceptance 仍完整审计同一 provider staging，staging corruption 不能绕过 `--all`。

`bun run package:candidate:integration` 是 routine `--test` 之外的显式物理 target：30 秒进程硬限制内，以 test-local state 证明 cold build/install/reuse、installed documentation drift 失败、dependency license drift/missing dependency 触发 reinstall，以及 malformed receipt 触发 rebuild。build staging 仍由 artifact acceptance 审计；Routine Gate 不运行此 target。

## 候选包安装与外部使用方验收

`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，不从 repository source 或祖先依赖补偿残缺 candidate。安装后依次：

1. 完成 [package material audit](package-artifact.md#产物构造与审计)，再按下节审计实际安装的依赖许可声明。
2. 一个 child 一次解析 candidate 根入口与 Ajv/jscpd 两项功能探针依赖。
3. parent 核对路径 containment、manifest version 和 jscpd bin。
4. 随后的 Product / external runtime 消费同一安装，实际执行 jscpd；preparation 不为同一事实重复启动 probe。

`candidate/external-consumer/**` 建立一次隔离安装及 typed material，分别拥有 types、documentation 与 runtime 验收；父级 candidate lifecycle 不吸收这些职责。其 types fixture 用独立的 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes` profile 验收安装后的公共 declarations，不承接 `noImplicitOverride`、`noImplicitReturns` 或 unreachable-code 等 implementation-only 规则，也不增加 compiler invocation 或重复安装。

Runtime 从 installed root import 调用 `functionMetrics`，要求 CCN `2` 的 non-blocking finding，证明 emitted Worker URL 指向安装包内 worker 且执行成功，不扩大 public exports。Types 用一次真实 `tsgo` consumer typecheck 覆盖 public imports、examples 与 Definition，直接核对 installed declaration owner 的相邻 JSDoc，不再为同一 declaration graph 建第二个 LanguageService program。Documentation 验收见[随包材料验收](documentation-validation.md#随包材料验收)。

### 实际安装的依赖

审计集合是 private consumer 本次实际安装的全部 top-level、scoped 与 nested dependency package，包括本平台选中的 optional package，不含 candidate 自身。

核对路径与 manifest 中非空、无首尾空白的 name/version；读取同样非空、无首尾空白的当前 `license`，或所有条目具有同一个此类 `type` 的 legacy `licenses[]`。当前 policy 只接受 `Apache-2.0`、`BSD-2-Clause`、`BSD-3-Clause`、`BlueOak-1.0.0`、`ISC`、`MIT`。

Manifest 缺失或格式错误、目录名与 manifest name 不一致、许可声明缺失/格式错误/不在 policy、symlink package layout 或 candidate path 逃逸均 fail closed。审计不覆盖本平台未安装的 optional package，不证明 dependency package 的物理法律材料，也不构成法律审查或额外兼容语义；与[随包法律材料](package-artifact.md#随包法律材料)分别验收。

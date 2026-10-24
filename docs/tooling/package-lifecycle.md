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

`scripts/package/build-contract.ts` 拥有默认路径：`build/package/` 是唯一完整 unpacked build evidence，`build/artifacts/` 保存 versioned `.tgz`。`.cache/vibe-check/package-candidate/` 保存 preparation receipt、`candidate.tsbuildinfo` 和带摘要的原始 compiler emit；它们都是可丢弃的中间状态，不构成第二份 staging 或 tarball。

compiler cache 按 emit 调用及其输入/runner 源码、Product 源码与输出摘要校验；candidate fingerprint 则继续覆盖完整 package lifecycle。文档或非编译相关的 candidate 脚本变化可复用 raw emit；同一源码文件集合的内容变化可使用稳定 TS7 增量状态；文件集合、emit 输入、依赖 lock、compiler resolver、[实际工具链](package-artifact.md#构建输入与包接口边界)变化或缓存损坏则冷 emit。每次 candidate rebuild 都重新组装唯一 staging，并完成审计、pack、tarball 审计与 exact candidate 安装。

fixture 的 `buildDirectory` 与 `stateDirectory` 必须 test-local 隔离，contract 拒绝重叠。cold rebuild 只清理精确拥有的 build paths 与 cache-owned receipt；compiler state 仅由其输入和输出摘要校验决定保留或清理。

### Gate 复用与物理集成

Gate root 在 Product Run 前完成或复用这份 exact preparation；选中的 artifact 与 installed consumer acceptance 共同消费其 typed evidence。
Check 的选择、candidate binding 与 aggregate 由 [Project Gate](project-gate.md)拥有。

external provider 只为同次 invocation 安装一次，types/docs/runtime 复用同一 material，分别结算。
日常 all 不证明 types 兼容性；发布前按 [Package release](package-release.md#发布工作区冻结源与交接)完成同一正式 tarball 的全部安装验收。

acceptance input 优先验证显式 Gate artifact：有效输入直接交给验收，非法输入立即失败；direct target 未收到 Gate input 时才加载本地 preparation。

Reuse 不重复扫描只服务 build evidence 的 staging；artifact acceptance 仍完整审计同一 provider staging，staging corruption 不能绕过 `--all`。

`bun run package:candidate:integration` 是 routine `--test` 之外的显式物理 target：30 秒进程硬限制内，以 test-local state 证明 cold build/install/reuse、installed documentation drift 失败、dependency license drift/missing dependency 触发 reinstall，以及 malformed receipt 触发 rebuild。build staging 仍由 artifact acceptance 审计；Routine Gate 不运行此 target。

### 文档验收输入的交接

1. 同次 local candidate preparation 只生成一次 source-derived 文档预期，parent 以内存材料交给 bound Run。
2. Run 在本次 invocation log 下写入 `package-documentation.json`，供 artifact 与 external documentation child 共享；
   external provider 通过 `documentation-fixture.ts` 复制可执行示例及其支持材料。
3. child 核验预期文件摘要、candidate tarball 路径/摘要、source input fingerprint 与 repository root，
   再分别比较真实 staging、tarball 和 installed bytes；独立 documentation acceptance 还执行可执行示例。

预期文件仅是本轮验收输入，不是跨轮 cache 或第二份 staging；正文不进入 Check data、Records 或 stdout。
显式 Gate artifact 必须带有有效文档输入，缺失或无效时失败，不重新生成预期掩盖接线错误；
未收到 Gate input 的 direct target 保留独立准备/验证路径。

### 分支测试与真实验收的分工

- **路径与缓存：** 同路径、双向父子与非重叠相邻路径直接由纯路径 owner 验证。compiler-cache 矩阵保留真实文件摘要、
  状态判断与 staging copy，以可控工具链身份和 fake compiler emit 验证复用、增量与冷 emit；真实工具链资格与产物另行验收。
- **文档输入 guard：** 直接调用 artifact 与 installed-documentation 各自实际使用的选择/guard 入口，核对缺失输入时
  renderer、audit 与 direct build 均未调用。
- **完整正向边界：** 真实 artifact 与 installed documentation 验收保留，不由 guard spy 或 fake emit 替代。

## 候选包安装与外部使用方验收

`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，不从 repository source 或祖先依赖补偿残缺 candidate。安装后依次：

1. 完成 [package material audit](package-artifact.md#产物构造与审计)，再按下节审计实际安装的依赖许可声明。
2. 一个 child 一次解析 candidate 根入口与 Ajv/jscpd 两项功能探针依赖。
3. parent 核对路径 containment、manifest version 和 jscpd bin。
4. 随后的 Product / external runtime 消费同一安装，实际执行 jscpd；preparation 不为同一事实重复启动 probe。

`candidate/external-consumer/**` 建立一次隔离安装及 typed material，分别拥有 types、documentation 与 runtime 验收；父级 candidate lifecycle 不吸收这些职责。其 types fixture 用独立的 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes` profile 验收安装后的公共 declarations，不承接 `noImplicitOverride`、`noImplicitReturns` 或 unreachable-code 等 implementation-only 规则，也不增加 compiler invocation 或重复安装。

### 隔离安装诊断

准备过程在 stderr 写入 `external-consumer-setup` JSON 行，Gate 将它们保留在
`prepared-external-package-consumer` 对应的 `checks/<encoded-check-id>/process.log`；stdout 仍只承载原 typed material。
fixture、安装、类型 fixture、入口解析和 identity 验证各在同步工作前写入开始记录，返回或抛错时写入耗时与终态。
若 provider 被 timeout/取消终止，最后一个没有结束记录的阶段表示当时尚未完成，不推断其内部原因。

安装返回时另保留 exit code、是否受 signal、是否存在命令执行错误、两条流的 bytes，以及可识别的 Bun
依赖解析标记、resolved/downloaded/extracted 合计数和 installed package 数。
这些摘要在安装结束后生成，不是实时进度时间线；每条流只检查前 8,192 个 UTF-16 code units 的完整行，超限明确标记。
未识别或未取得的计数为 null，不能视为零工作或网络故障。
这些诊断记录不转储原始输出、异常、环境、URL 或凭据；每次准备的诊断最多 8 KiB，超限写一次截断标记，之后继续原验收工作。
诊断写入错误明确失败；安装命令、隔离性、重试策略、预算和 typed material 均不因诊断改变。

### 外部使用方验收

`typecheck-fixture.ts` 统一构造 consumer 的 tsconfig 与 public-import source，并组合各领域声明验收片段；`type-acceptance.ts` 负责安装隔离所需的声明依赖、写入 fixture、调用 compiler 和审计已安装 JSDoc。

文档示例使用 Node 标准库时，types fixture 将当前锁定的 `@types/node` 及其 `undici-types` 依赖复制到隔离 consumer 内，以真实声明校验调用；传递依赖从 `@types/node` 的实际位置解析，不依赖根目录 hoist。类型验收不为 runtime 增加祖先依赖回退，也不修改 package 的发布依赖。

Runtime 从 installed root import 调用 `functionMetrics`，用 Rust match fixture 验收 CCN `3`、第 4/5 行真实 `=>` contributors 的 non-blocking finding。
同一 consumer 另以 TypeScript 显式返回类型加尾随控制流和四项 `??`，验收 CCN `5`、四项第 2 行完整贡献，
并以 NLOC 上限 `3` 证明函数边界未污染；ND 保留默认上限。两组共同证明 emitted Worker URL 指向安装包内 worker 且执行成功，不扩大 public exports。
Types 通过[统一 compiler resolver](workspace.md#typescript-工具链)用一次真实稳定 TS7 consumer typecheck 覆盖 public imports、examples 与 Definition，直接核对 installed declaration owner 的相邻 JSDoc。
Documentation 验收见[随包材料验收](repository-material-validation.md#随包材料验收)。

### 实际安装的依赖

审计集合是 private consumer 本次实际安装的全部 top-level、scoped 与 nested dependency package，包括本平台选中的 optional package，不含 candidate 自身。

核对路径与 manifest 中非空、无首尾空白的 name/version；读取同样非空、无首尾空白的当前 `license`，或所有条目具有同一个此类 `type` 的 legacy `licenses[]`。当前 policy 只接受 `Apache-2.0`、`BSD-2-Clause`、`BSD-3-Clause`、`BlueOak-1.0.0`、`ISC`、`MIT`。

Manifest 缺失或格式错误、目录名与 manifest name 不一致、许可声明缺失/格式错误/不在 policy、symlink package layout 或 candidate path 逃逸均 fail closed。审计不覆盖本平台未安装的 optional package，不证明 dependency package 的物理法律材料，也不构成法律审查或额外兼容语义；与[随包法律材料](package-artifact.md#随包法律材料)分别验收。

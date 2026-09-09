---
title: "Vibe Check 0.0.1 至拟发布 0.0.2 升级差异审计"
id: "260908-audit-0-0-2-upgrade-differences"
formedAt: "2026-09-08T13:55:00Z"
question: "以 Git 历史为主，相对已发布 @zxyycom/vibe-check@0.0.1 的 source 基线，当前拟发布 0.0.2 的产品、包与迁移差异是什么；哪些结论有历史与当前 owner 交叉证据，哪些不能由本轮审计证明？"
tags:
  - "compatibility"
  - "package"
  - "release-audit"
  - "upgrade"
relations: []
---

## 形成时背景

本轮为 `@zxyycom/vibe-check@0.0.2` 准备升级说明，比较 0.0.1 的发布源码与拟发布源码；不执行发布，也不证明 registry 中已有 0.0.2。

**结论先行：** 主要迁移点是 Bun → Node 宿主、`dependsOn` 与 preflight 时序、Function Metrics 的配置/指标、Duplicate Detection 的比较范围，以及输出路径的参数归属和诊断结果读取。旧 root 导出名称保留、v4 schema 未变，均不意味着整个版本兼容。

**输出归属须单独看待：** 默认输出开关未变，不等于输出契约未变。machine/diagnostic 目录仍支持 Definition 默认值和 Controls 本次覆盖；Check 产物 base、progress 日志文件和 diagnostic 文件命名只属于 Controls。不能概括为“所有目录都移到了 Controls”。

## 调查目的

让升级者和发布审查者能够：

1. 找到会影响现有调用的旧→新变化及具体迁移动作。
2. 区分已有能力、新增能力和仅工作区变化，不把新增类型导出误作新增配置机制。
3. 按 Git 锚点与当前 owner 复核结论，并识别还需要实际包或运行验证的部分。

报告拥有本轮调查认识；公开行为仍以链接到的领域 owner 为准，发布实施与授权由当前 Change 承接。

## 调查范围与依据

### 比较基线

| 对象 | 本轮实际依据 | 能证明什么 |
| --- | --- | --- |
| 0.0.1 发布源码 | annotated tag `v0.0.1`；tag object `5581b79f7ff3d60322fe955ebd8dc41aff2b7230`；peeled commit `2a454f0a6162afebb6729a4cfef969594d045c10` | 本地 Git 的源码身份，不单独证明 registry bytes。 |
| 历史发布交叉证据 | `d8d509782ca509ff4e5540c245afbf6719c15c66:changes/archive/publish-public-api-only-npm-package/release-evidence.md` | 后续归档记录将正式 scoped receipt、tarball、当时的 Gate/registry 验收与同一源码提交关联。 |
| 拟发布源码 | `c0af9fff429ea22602432b542f743af29f305fa4` | 本轮新端点，不是已冻结的正式 0.0.2 release source。 |

`d8d50978` 是 tag 之后的归档提交，不是 tag 的祖先；它只作为历史记录级交叉证据。两端根 `package.json` 的私有 `vibe-check@0.1.0` 都是工作区 metadata，不能拿来确定公开包版本。已有未提交的发布 Plan/文档改动不作为 Product 发布 bytes。

### 方法与证据定位

调查以 tag-to-HEAD 的 213 个可达提交为线索，按下表限定路径读取实际 diff，再与当前公开说明交叉核对；不是逐条提交标题的汇总。

| 主题 | 主要源码 / 当前 owner | 关键历史锚点 |
| --- | --- | --- |
| 宿主与包接口 | `scripts/package/package-contract.ts`、`scripts/package/artifact/release-manifest.json`、`src/index.ts`、`scripts/package/public-api-inventory.ts`；[README](../../README.md) | `73a1d239`、`80ff28e8` |
| Check 配置与行为 | `src/package-checks/**`；各 [Check 指南](../../README.md#随包提供的-check) | `113d6344`、`d356dcb4`、`a9d53de8` |
| 调度与依赖 | `src/project-definition/**`、`src/project-run/**`；[API 机制](../api-mechanics.md)、[依赖数据](../guides/check-dependencies.md) | `88160edd`、`80eec565`、`e83baa3e`、`fa0993d7` |
| 输出与 Controls | `src/project-run/controls/contract.ts`、`src/project-definition/output-validation.ts`、`src/project-run/outputs/**`；[输出指南](../guides/run-outputs.md) | `54336c4e`、`a5f2d044`、`92c6ec5d`、`752b7e8f`；归属说明 `7e76da8b` |
| 机器结构 | `docs/schemas/vibe-check-run.schema.json`、`vibe-check-record.schema.json`、`vibe-check-report.schema.json`；[机器输出契约](../output.md) | 三文件在 tag→本轮 HEAD 无 diff |
| 法律材料 | `scripts/package/legal-materials.ts`、`licenses/**`；[Package lifecycle](../tooling/package-lifecycle.md) | `c239eab8`、`9ee0263e` |

可用以下只读 Git 命令复核；将 `<path>` 换为表中的具体路径：

```sh
git show-ref --tags -d v0.0.1
git show v0.0.1:src/project-run/controls/contract.ts
git diff v0.0.1..c0af9fff -- <path>
git log v0.0.1..c0af9fff -- <path>
git show d8d50978:changes/archive/publish-public-api-only-npm-package/release-evidence.md
```

本轮未联网、查询 registry、读取认证、安装旧包或构建正式 tarball。下文“已确认”指源码/契约层面的差异；迁移动作是据此提出的建议，具体消费者还需运行验证。

## 调查结果与边界

### 1. 运行宿主与公共入口

- **已确认变化：** 0.0.1 公开包要求 Bun `>=1.3.14`；当前 package manifest/README 要求 Node `>=24.18`。根工作区的 `engines.node: >=24 <25` 不是随包 host contract。
- **迁移：** 更新质量脚本的执行命令和 CI runtime，在满足最低版本的 Node 上重新 typecheck、运行 Definition；不要把旧 Bun 支持外推到新包。
- **保持：** 两版均为 root-only ESM/types export，入口为 `index.mjs` → `dist/esm/index.mjs` 与 `types/index.d.ts`；无 Product CLI/bin、CommonJS、browser 或 subpath 支持。source inventory 的 88 个旧名称全部存在于当前 155 个名称中。
- **限制：** 名称集合保留不证明 overload、泛型推断、options shape、回调时序或 runtime 语义兼容。仍应从 installed declaration 验证实际项目。

### 2. 输出参数由谁拥有，以及怎么迁移

**默认值没有整体迁移。** 0.0.1 已有 Definition `outputs` 默认值和 Controls `outputs` 覆盖机制。当前仍默认开启 progress 和 machine（目录 `artifacts/vibe-check`），关闭 diagnostics（默认目录 `.log/vibe-check`）；scheduler 默认 `maxParallel: 4` 也未变。

**实际归属如下。** 依据是两端 `controls/contract.ts`、旧 `output-configuration.ts`、当前 `outputs/configuration.ts` 及 [API 参数归属](../api-mechanics.md#参数应该放在哪里)。

| 参数或职责 | 当前 owner | 相对 0.0.1 的结论与使用动作 |
| --- | --- | --- |
| machine / diagnostic 的 `enabled`、`directory` | Definition `outputs` 保存默认值；Controls `outputs` 覆盖本次字段 | 默认/覆盖机制旧版已有，不是把目录字段从 Definition 删除。可复用目录留在 Definition，本次 CI/独占目录放 `run` 第二参数的对应 `outputs`。 |
| progress 开关、preview 数量/长度、formatter | 同一默认/本次覆盖机制 | 开关旧版已有；preview/formatter 为新增可配置字段。仅提供的字段覆盖，`undefined` 不覆盖，`false`、数量 `0`、`formatter: null` 有效。 |
| `checkArtifactBaseDirectory` | 仅 Controls 顶层 | 新增的本次 Check 产物 base；不放在 `defineConfig` 或 `outputs`。Check callback 只取得自己的 `artifactDirectory`，未配置时为 `null`，不因此取得其它 Check 的目录权限。 |
| `progressLogFile` | 仅 Controls 顶层 | 新增的本次 terminal-progress 日志目标，不是 Definition output branch。 |
| `diagnosticLogFileNaming` | 仅 Controls 顶层 | 新增命名选择：默认 `unique`，显式 `channel` 使用固定 channel 文件名；它不负责开启日志或选择目录。 |
| `projectRoot`、`flags`、`signal`、`checkAggregation` | Controls | 本次根目录、选择、取消和聚合旧版已有；Controls 不进入 Definition fingerprint，也不能替换 Checks/options/scheduler。 |
| scheduler 策略与 `measurementHooks` | Definition `scheduler` | 新增调度能力仍是项目检查策略，不因每次运行调用这些回调就移入 Controls。 |

**路径规则也变了（`54336c4e`）。** 旧 diagnostics directory 受项目内相对路径限制；当前 machine/diagnostic directory 统一接受非空、无 U+0000 的受信任目标：相对路径从 effective `projectRoot` 解析，绝对路径直接使用。空字符串、NUL 不再是合法 target；它不是 containment/sandbox 保证。machine publisher 只拥有 canonical 文件和自己的临时文件，不清空整个共享目录。

**诊断结果读取存在 shape 变化。** 旧版 `outputs.diagnosticLogging` 为 `{ enabled, status, file }`，当前为 `{ enabled, status, channels }`。读取文件路径的调用方应改为 `channels.core.file` 与 `channels.scheduler.file`，并分别处理 status。默认文件名为 `core-<suffix>.log` / `scheduler-<suffix>.log`；在调用方已隔离的目录使用 `diagnosticLogFileNaming: "channel"` 时才为 `core.log` / `scheduler.log`，同名冲突失败而非覆盖。

这一变化只影响配置、人读日志及 `RunResult` readback，不是 v4 machine schema 升级。不要从未变的 machine schema 推断整个 `RunResult.outputs` shape 未变。

读取时先区分状态：disabled channel 的 `file` 为 `null`；启用后即使创建失败也保留预计算路径，不能用路径非空证明写入成功。任一 channel failed 会使 diagnostic aggregate failed，但另一 channel 仍可能成功。输出失败不改写 Check/Record facts；仅当 primary Run 正常完成时，才由输出失败使结果成为 `kind: "output"`。精确 readback 与失败优先级见[输出状态与失败处理](../guides/run-outputs.md#输出状态与失败处理)。

### 3. 依赖、preflight 与调度

| 已确认旧→新 | 对现有调用的影响 / 迁移 |
| --- | --- |
| 旧版先执行 Definition-order 的全 Check 串行 preflight barrier；当前先应用 cancellation/flag selection，再在每个 Task admission 后执行 preflight。 | 无 relation 的 preflight 可以并发。移除“前面 Check 的 preflight 一定先完成”的副作用假设；真实数据依赖显式声明。 |
| 旧 `dependsOn` 等待上游终态；当前要求 direct provider 全部 `passed`，否则本 Check 在 author work 前成为 `unavailable / dependency-not-passed`。 | 需要成功前置继续用 `dependsOn`；需要审计失败等任意终态改用新增 `observes`，并按读取结果处理无 data 的终态。 |
| 新增 named resources、custom admission 的 `prepare/decide/complete`、measurement hooks、immutable admission graph 与公开 learned strategy。 | 按需接入，不是普通 Definition 的强制迁移。mutex/resource 只限制并发/容量，策略只对合法候选提出选择；都不能替代数据或必需先后关系。 |

完整契约见[依赖数据](../guides/check-dependencies.md)与[调度 Check](../guides/scheduling.md)。

### 4. 随包 Check 的迁移与新增

| Check / surface | 已确认旧→新 | 迁移动作 |
| --- | --- | --- |
| Function Metrics | 外部 Lizard 1.23 → 内置翻译 analyzer；删除 `scanner.executable` 配置；新增 `nestingDepth.maximum`（默认 7）和 nesting-depth Finding；普通 Finding 的 `non-blocking` 默认保留。 | 删除 `scanner` options，重新比较自己的语言/corpus、指标和 Finding；显式 blocking 项目需处置新增嵌套深度 Finding。无需为该 Check 另装 Lizard。 |
| Duplicate Detection | 两版均随包安装兼容 jscpd v5。旧版跨不同 areas 的文件也互比；当前 Finding 的全部 location 必须至少共享一个 code area。 | 若需继续跨 `source` / `scripts` 比较，声明一个覆盖双方的共享 area；审阅阈值与 waiver，不把跨域 Finding 消失误认成代码问题已修复。 |
| File Metrics | 仍需外部 `scc`，要求从 3.7.0 升为精确 4.0.0。 | 更新 scanner provisioning 并验证目标 corpus；不要复用旧工具 availability 或数值等价假设。 |
| Secret Detection | 第八项随包 Check；`secretDetection({ files })` 要求完整显式 files，检测高置信 PEM private-key material。 | 可选接入；不是默认全仓扫描或通用凭据保护。按[指南](../checks/secret-detection.md)审阅范围、限制和敏感输出边界。 |
| Finding waiver / Markdown cache | 为相关指标、重复与 secret Checks 增加专用 identity/waiver；Markdown Link 新增显式 parse-facts cache。 | 使用 owning Check 的 identity 和 cache trust contract，不能按人读消息替代身份或失效依据。 |
| JSON Schema | registered schemas、identity modes 和 allowlisted reference sources 在旧版已存在；本版补 root supporting type exports/JSDoc。 | 不为这些类型导出重写既有配置机制；仍遵守既有 schema/reference 授权。 |

各 Check 的精确字段、默认和限制以 [README 的随包 Check 索引](../../README.md#随包提供的-check)进入对应指南。

### 5. 保持的机器契约与变化的法律材料

**机器消费无需切换 schema version。** 三个当前 schema 文件在比较范围内无字节 diff，run/record 仍为 v4。继续读取完整 `run.json` + `records.ndjson` 并验证 fingerprint；diagnostics、progress 与 Check messages 不是 machine DTO 字段。该结论不承诺跨包版本的 fingerprint 值不变。

**法律材料需要重新核对。** 旧包使用 MIT manifest，并携带 Momoa license；当前保留 own MIT 根 `LICENSE`，改在 `licenses/` 携带 analyzer 翻译相关的 Lizard MIT、`lizard.py` Apache-2.0、Pygments BSD-2-Clause、NOTICE 与 provenance。manifest license expression 为 `MIT AND Apache-2.0 AND BSD-2-Clause`。

更新镜像/SBOM/材料收集时，应分别核对随包翻译材料和实际安装 dependencies；后者的 license declaration audit 不是前者的替代。这里描述材料与仓库验收范围，不构成法律充分性判断。

### 6. 可选新工具与非产品变化

`cacheJsonByKey`、同步 `collectProjectFiles`、`presentCheckFindings`、admission graph 与 custom/learned strategy 等从 root 按需使用；不自动替换现有 Check 或启用新扫描。

治理技能、测试证据账本、Project Gate 的资源配置、虚拟性能实验及维护文档重组仅服务工作区，不是要求 package 用户迁移的 API。最后一轮算法比较没有采用候选，也没有证明真实 Gate 加速，不能作为产品性能提升写入升级说明。

### 7. 未核验项与使用出口

本轮未证明旧 registry tarball 当前可取得及其 bytes、任何 0.0.2 正式 artifact/receipt/完整 Gate/registry 状态，也未证明具体消费者的 Node/OS/lockfile/corpus 兼容性。

发布说明可据本报告起草，但实际包核对、迁移用例与最终发布验收仍需补齐。拟发布源码变化时，以新的明确 commit 重做受影响 diff；需要 registry 或 tarball 结论时另获授权取证，不从历史记录或本报告推断。

# 变更日志

本页随包提供版本变化与升级影响，按版本组织。

## 0.0.2

发布日期：2026-09-09。

本节按主题记录 `@zxyycom/vibe-check` 的 `0.0.2` 相对 `0.0.1` 的净变化。
升级影响随对应变更列出，提交记录集中在[相关提交](#相关提交)。

在 Node `>=24.18` 环境安装精确版本并更新 lockfile；按所用能力完成调整后，
运行项目 typecheck 和代表性 Run，复核 Check 终态、Finding/Records、aggregation 与诊断。

### 产品变化

#### 运行环境与包材料

- **宿主改为 Node `>=24.18`**，取代 Bun `>=1.3.14`；仓库开发脚本和 Gate 继续使用 Bun。
  集成入口保持为包根的程序化 API。
- **补全包声明与发现信息**，调整导出类型命名。
- **变更日志随包交付**，由 README 直接链接，便于按安装版本查阅变化与升级影响。
- **增加运行依赖和来源材料**：引入 `@secretlint/core`、private-key rule 与 `immutable`；
  `licenses/` 收录分析器翻译的 attribution、NOTICE、license 和 provenance。
  根 `LICENSE` 保持 MIT，包 manifest 的 license expression 为 `MIT AND Apache-2.0 AND BSD-2-Clause`。

#### 随包 Check

- **新增 [`secretDetection`](./checks/secret-detection.md)** 与 `parseSecretDetectionData`：
  在显式 `files` 范围内检测高置信 PEM private key，并提供结果数据、Records 和 waiver 类型。
- **[`functionMetrics`](./checks/function-metrics.md) 内置 TypeScript 分析器**：
  移除 `scanner` 配置及 Python/Lizard 运行前提，内部翻译基线更新到 Lizard 1.24。
  新增 `nestingDepth`，默认 `maximum` 为 `7`；CCN Record 增加按源码顺序排列的
  `complexityContributors: { token, line }[]`。升级时需复核新增 Finding 和 Record 结构。
- **[`duplicateDetection`](./checks/duplicate-detection.md) 更新引擎并修复比较范围**：
  包运行依赖 `jscpd` 从 `^5.0.11` 升至 `^5.1.1`；仓库开发依赖锁定 `5.1.1`。
  修复项目相对路径输入漏报；重复 locations 必须共享至少一个 code area，跨区域比较需配置共同 area。
- **[`fileMetrics`](./checks/file-metrics.md) 改用 SCC `4.0.0` 协议**：
  环境需提供兼容的 `scc` 命令，Rust `?` 的复杂度计数随之调整。
- **三个指标 Check 接入 Finding waiver**：`duplicateDetection`、`fileMetrics`、`functionMetrics`
  增加可审计的 waiver 标识与配置，默认 `findingPolicy` 仍为 `non-blocking`。
- **[`markdownLinkValidation`](./checks/markdown-link-validation.md#parse-facts-cache) 增加显式解析缓存**：
  使用单文件 JSONL 保存 parse facts；每次运行仍重新形成 Check 结果。

#### Check 依赖与选择

- **区分成功前置和终态观测**：`dependsOn` 要求所有直接 provider 为 `passed`；否则 dependent
  跳过回调，结算为 `unavailable / dependency-not-passed`。
  新增 `observes`，供需要等待上游任意终态的汇总或审计使用。
- **`preflight` 随所属 Check 准入执行**：由整次 Run 的全局 barrier 改为本 Check 的执行前阶段，
  受依赖、互斥、容量和取消约束；独立 Check 的准备可以并发。
- **新增 `enabledByFlags`**：支持 `all`、`any`、`none`、`not-all`。匹配的 root 显式设置
  `propagateDependsOn: true` 时，传递选中其 `dependsOn` 前置，即使前置自身 flag 条件未命中；
  省略时不传播，`observes` 不参与扩展。`checkAggregation.checks: "effective"` 聚合本次有效选择。
- **新增 `dependencies.list()`**：返回冻结、稳定排序的直接 `dependsOn ∪ observes` 四态 observation；
  `get()` 同样以该直接关系集合授权。
- **新增 invocation-private dependency handoff**：provider 可用 `defineCheck({ handoff: true, ... })` 声明只在
  `passed` branch 交付的 same-Run object/function reference；direct `dependsOn` consumer 用
  `dependencies.get(provider)` 同时读取 canonical data 和 typed handoff。该引用不进入 Definition
  fingerprint、Check facts、RunResult、machine/progress/diagnostic、aggregation 或 cache；Product 在 graph
  关闭时只清除自己的引用，不替代 producer/caller 的 immutable-observation 或 resource cleanup 责任。

用法见[自定义 Check](./guides/extending-check-lifecycle.md)与[依赖和类型化数据](./guides/check-dependencies.md)。

#### 调度与观测

- **声明资源与顺序偏好**：Check 增加 `resourceClaims`、`admissionPriority`，scheduler 增加
  `resourceCapacities`；资源从 `preflight` 到 settlement 原子持有，priority 在合法 ready 候选中排序。
- **自定义准入策略**：`scheduler.admissionPolicy` 支持 `custom/simple` 与调用级 `custom/prepared`
  生命周期；`defineAdmissionPolicy` 辅助类型推导，策略可取得动作后性能 observation。
- **终态测量 hook**：`scheduler.measurementHooks` 接收调度测量，状态从
  `RunResult.outputs.measurementHooks` 读取。正常完成 Run 的 hook 失败可按输出失败优先级形成
  `kind: "output"`、`scheduler-measurement-hooks-failed`；已有取消或执行诊断保持优先。
- **独立模拟与本地历史策略**：`createAdmissionGraph` 构造不可变静态调度模拟；
  `createLearnedCriticalPathStrategy` 将调用方管理的时长历史接入 prepared strategy。

配置与边界见[调度指南](./guides/scheduling.md)。

#### 输出与文件工具

- **诊断日志分为 `core` / `scheduler` 两个 channel**：旧 `diagnosticLogging.file` 改为
  `diagnosticLogging.channels.core.file` 与 `.scheduler.file`，各有独立 status。
  `diagnosticLogFileNaming` 支持默认 `unique` 与固定 `channel`；固定名称冲突时失败，保留原文件。
- **完善 progress 与 console 呈现**：捕获 Check 回调及其已等待异步工作中的 `console.*`，覆盖
  `preflight` 并在 settlement 后呈现；直接 stdout/stderr、stream 或子进程输出独立于该捕获机制。
  新增 `presentCheckFindings` 生成有界消息摘要，并增加 Record 预览。`progressRendering` 支持
  formatter、条数和文本长度限制，配置错误定位到具体字段。
- **提供调用级路径上下文**：新增 `invocationId`、Check 专属 `artifactDirectory`，以及 Controls 的
  `checkArtifactBaseDirectory`、`progressLogFile`。machine 与 diagnostic 输出目录统一为可信目标：
  相对路径从本次 `projectRoot` 解析，绝对路径直接使用；不提供路径沙箱或目录清理。
- **新增 [`cacheJsonByKey`](./guides/cache-results.md)**：按调用方的 key、namespace/version、
  目录、解析与计算函数缓存本地 JSON 结果，并返回读写状态；
  并发协调和清理由调用方负责。
- **新增 [`collectProjectFiles`](./guides/collecting-project-files.md)**：
  按共享 selection 规则同步收集一次项目文件，返回冻结的相对路径快照。

输出细节见[Run 输出与诊断](./guides/run-outputs.md)。`run.json` 与 `records.ndjson`
继续采用 [v4 machine schema](./output.md)；上述 RunResult 和 Check Record 变化需分别复核。

### 实现与仓库维护

本节面向维护者，涵盖内部优化、Gate、包验收与协作工具。

- **私有实现优化**：分析器 reader 采用 suffix fast path；admission core 采用不可变选择索引、
  反向索引、计数器和持久 frontier，保持公开 DTO、顺序与回调契约。
- **Gate 配置集中化**：统一 definition manifest，分离 checks/runtime，`afterGate` 归 definition
  所有；命令收敛为 `bun run check`，提供默认 required、focused flags 与独占 `--all` 选择。
- **Gate 选择与质量策略**：复用 flag 传递和 effective aggregation；仓库质量 Finding 设为 blocking。
  root `maxParallel` 为 `3`，Bun test runners 与 repository scans 各最多并行 `2` 个。
- **Gate 证据结构化**：调用目录按 owner 分配 artifacts、channel logs 和 machine 输出；
  native diagnostics、lint/format failures 增加结构化 Records。
- **强化包验收并复用 candidate**：增加 Node external consumer、实际引擎及安装依赖许可检查、
  analyzer Worker/翻译材料验收；static release manifest 纳入 fingerprint。完整 Gate 复用已准备
  candidate，物理生命周期验证改为显式 `package:candidate:integration`。
- **增加显式研究与维护入口**：`source-mapping` 检查来源 ledger/identity/pin，`--sync` 更新派生 pin；
  Lizard 性能命令提供 A/B/C 分层测量，`admission:simulate` 提供虚拟准入平台；
  `maintenance:lizard-upstream` 提供非阻断的上游查询。
- **重整文档与治理**：按读者、随包范围和规则 owner 组织阅读路径，更新 Change Plan、Decision Records、
  Investigation Report 契约及索引；历史变更材料统一通过 Git 恢复。
- **集中维护文档发布映射**：`docs/package-documents.json` 声明 Markdown、Check 指南和 machine 材料的
  源文件与包内路径，构建、fingerprint 和包材料验收共同读取；包内链接检查覆盖 machine Markdown。
- **明确发布工作区与交接**：项目分支采用无前缀语义名称，发布准备与冻结源码分别在实现和 detached
  工作区进行；正式包验收、发布、版本标签与合回 main 按同一源码身份衔接。Package 文档按职责拆分。
- **增加可选 post-commit hook**：显式设置 `core.hooksPath` 后，在 `main` 每小时至多尝试一次
  non-force、no-tag 的 `origin/main` 推送；失败不阻断 commit。

维护入口见[仓库维护文档](https://github.com/zxyycom/vibe-check/blob/c0af9fff429ea22602432b542f743af29f305fa4/docs/navigation.md#仓库工具与测试)。

### 相关提交

按变更主题在[源码仓库](https://github.com/zxyycom/vibe-check)检索提交；提交号用于定位实现变化。

| 变更主题 | 提交 |
| --- | --- |
| Node 宿主 | `73a1d239`、`d765971a` |
| 包声明与发现信息 | `80ff28e8` |
| 运行依赖与来源材料 | `c239eab8`、`9ee0263e` |
| `secretDetection` | `a9d53de8` |
| `functionMetrics` | `0f317f2d`、`d356dcb4`、`e8f9ccb3`、`5ff3149e` |
| `duplicateDetection` | `21b4d23a`、`741fefe0`、`113d6344` |
| `fileMetrics` | `5bdda4db` |
| Finding waiver | `8c6eddb0` |
| Markdown 解析缓存 | `bf49676f`、`00c364b5` |
| `dependsOn` / `observes` | `88160edd` |
| `preflight` 时序 | `88160edd`、`da6ea93f` |
| flags 与 effective aggregation | `8fdb840b`、`da6ea93f`、`fb695143` |
| `dependencies.list()` | `7bcd56d4`、`88160edd` |
| 资源容量与准入优先级 | `29438d69`、`4ee8ca30` |
| 自定义准入策略 | `c9760932`、`80eec565`、`281e7711` |
| 终态测量 hook | `2103c4e5` |
| 调度模拟与本地历史策略 | `e83baa3e`、`822a1ef4` |
| 诊断 channel | `c30eaa65`、`752b7e8f` |
| progress / console / Finding 摘要 | `c30eaa65`、`5813738e`、`f2201ec1`、`47add411`、`92c6ec5d`、`eea8169b` |
| 调用级路径与输出目录 | `a5f2d044`、`92c6ec5d`、`54336c4e` |
| `cacheJsonByKey` | `72722d6f` |
| `collectProjectFiles` | `bf3d6e79` |
| reader 与 admission core 优化 | `dd9635d0`、`cea4d1db` |
| Gate 配置 | `84c44124`、`1b11ccda`、`5ae74e6d` |
| Gate 选择与质量策略 | `fb695143`、`c428530a`、`b30477b6` |
| Gate 结构化诊断 | `a5f2d044`、`6afa910a`、`acade164` |
| 包验收与 candidate 复用 | `73a1d239`、`21b4d23a`、`9ee0263e`、`c239eab8`、`6b19ec8f`、`fa4d45f5` |
| 研究与维护入口 | `3ea6180c`、`e2bad655`、`f7e9f353`、`853b30ea` |
| 文档与治理 | `94979fe1`、`7e76da8b`、`917517dc`、`761df044` |
| post-commit hook | `d71f388c`、`931a0c12` |

# Design

本设计把 Vibe Check 的 API-only 方向落实为一个 Bun-hosted、Project Definition 配置驱动的 npm package：public package API 只包含配置定义与工具运行两个操作，Product 自行提供 default runtime、工具 effects 和私有 project-code execution boundary。

## Context

当前事实由 `docs/architecture.md`、`docs/cli.md`、`docs/configuration.md`、root `package.json` 与 `src/product/**` 承接：正式入口仍是 Bun CLI，root manifest 仍是 private workspace manifest，当前 registry-like name、CLI 动词、JSON config path 和源码导出都不是未来 package API 的证据。

以下活动未对齐决策已经确认未来方向：

- `release-one-versioned-npm-product-unit`：一个版本化 npm package 交付匹配的 runtime 与公共声明；
- `use-programmatic-api-as-product-entry`：程序化 API 是唯一正式执行入口，Product 不发布 CLI 或 `bin`；
- `support-bun-as-the-package-host`：首个 package 只承诺 Bun direct import；
- `drive-product-execution-from-project-definition`：Project Definition 拥有 policy、Checks、gate、scheduler 和 tool-effect configuration；
- `enable-tool-effects-by-default`：普通 invocation 默认运行 Product-owned logs、cache 和 output，并返回结构化结果；
- `contain-project-code-behind-private-runtime-boundary`：Project Definition 与 custom runner 在 package-private runtime 中执行；
- `expose-two-public-operations`：public callable surface 恰好包含配置定义与工具运行两个操作；
- `confirm-package-contract-names-before-publication`：Vibe Check 显示名保持不变，其它 package 公共契约名称在 candidate 前逐项确认。

这些决策约束本 Change，但尚未成为实现事实。本 Change 的暂停原因与恢复门禁记录在本设计的 `Implementation Observations`、Open Questions、Resume Conditions 和 Tasks Readiness 中；当前仍未闭合的是 package/API/path/environment identifiers、唯一 current public-contract source 和实现前置 seams。

### Terms

- **Current fact**：由 owner docs、代码、测试或 release artifact 证明的现状；未来决策不能反向描述成已经实现。
- **Confirmed direction**：`active + unaligned` 的长期方向；它约束设计，但不代表实施完成或 Change 已获 implementation 授权。
- **配置定义操作**：在使用者拥有的 TypeScript Project Definition 中调用，返回 Product 可直接验证的同一 closed plain definition shape。
- **工具运行操作**：加载 selected Project Definition 并运行完整工具的唯一正式执行操作。
- **Public package API**：上述两个 callable operations 与支撑它们的必要公共类型；它不包含 CLI、bootstrap、resource API 或 internal runtime surface。
- **Current public-contract source**：实施后唯一拥有 registry package、exports、symbols、固定路径和 operational identifiers 当前值的 source；决策记录只保存选择理由。
- **Consumer adapter**：repository tooling 或外部使用方拥有的 argv、console 与 exit-code wrapper；它调用 public package API，但不属于 Product contract。
- **Private execution boundary**：Product-owned package-private worker 或 child process；它提供 project-code process-failure containment，不提供 OS permission sandbox。

## Goals / Non-Goals

**Goals**

- 用一个 package version 交付匹配的 Bun runtime、配置 authoring declarations 和 execution declarations。
- 让调用方只定义 Project Definition 并运行工具，不接触 argv protocol、host ports、worker protocol 或 internal Core。
- 让 Product 提供 default runtime、默认工具 effects 和 project-code failure containment，同时返回结构化结果。
- 让全部 public artifact 从单一 Product source 与单一 public-contract source 生成或核对。
- 在 API、private runtime 和 exact-tarball acceptance 可用的同一实施边界删除 Product CLI。
- 对 staging tree 和 exact tarball 执行 public-surface inventory、dependency audit 与 isolated Bun consumer acceptance。

**Non-Goals**

- 重新命名 Vibe Check，或在本 artifact 中选择 registry package、export、symbol、fixed path、effect path 或 environment identifier。
- 支持 Node.js direct import 或 dual-runtime build。
- 把 private runtime 表述成 filesystem、network、credential 或 OS-permission sandbox。
- 创建 registry account、配置 credentials/Trusted Publishing 或执行 `npm publish`。
- 公开 bootstrap/init、template/resource API、Core、scanner、manager、scheduler、worker entry 或 IPC protocol。
- 把旧 CLI 的 `scan`、`gate`、`init` grammar 复制成 public command union 或 methods。

## Decisions

### 1. Owner 和恢复顺序

当前行为只从 current-fact owners 恢复；未来方向从 active decisions 恢复；本 Change 只拥有实施范围、顺序、风险、开放问题和验证。Vibe Check 是已建立的产品显示名；root manifest、repository path、source file、Change 名称和语义角色都不能自动决定其它 package 公共名称。

开始实施前必须完成三项工作：

1. 确认 registry package、imports/exports、两个操作和必要类型的 symbols、fixed Project Definition path、default effect paths 与 supported environment identifiers；
2. 建立唯一 current public-contract source，并明确所有 generated/public consumers；
3. 核对 foundation seams，更新三个 artifacts，并在语义复核后运行 `plan` 刷新 Git baseline。

### 2. Public package API 恰好包含两个操作

配置定义操作只返回 Product runtime 能直接验证的同一 plain closed definition shape，不建立 brand、builder state、registration lifecycle 或第二种配置 authority。Project Definition 文件由使用者创建并拥有；missing definition 返回配置诊断，Product 不创建文件。

工具运行操作接收 project root、definition source selection 与必要 invocation-scoped operational context。Project Definition 拥有 policy catalog、Check declarations/selection、gate policy、scheduler、reporting、cache 和 output configuration；当次 overrides 不能注册 Check、改写 policy 或提升 network、安全和 gate 授权。

必要 public input/result/type declarations 可以导出，但不增加 callable operation。Candidate manifest 不声明 `bin`，也不提供 public `init`、bootstrap、scaffold、create-file、template/resource API 或 internal execution surface。文档示例不是 runtime resource contract。

### 3. Structured result 与默认 effects 同时成立

普通 invocation 默认启用 Product-owned logs/progress、适用 cache 和 canonical tool output。Project Definition 与 invocation overrides 按各自 owner 控制 reporter、cache、output target、verbosity 和显式禁用模式；Product 拥有默认路径、write ownership、atomicity、collision、cleanup、cache invalidation 和敏感材料边界。

Closed structured result 区分 invocation completion、Check snapshot completeness、decision evaluation、领域 gate result、diagnostics 和每项 effect 的 actual status。Evaluated gate failure 是完成后的领域结果，不转换成 exception 或 Product exit code；invalid input、pre-work failure、execution failure 与 effect failure 使用不同 variants。调用方不需要解析日志或回读 artifact 才能恢复核心事实。

### 4. Bun default runtime 是完整产品实现

首个 package 只支持 Bun。Manifest、docs、diagnostics 和 acceptance 声明实际最低 Bun/platform prerequisite；npm、ESM、Node types 或 root workspace Node engine 不构成 Node.js runtime support。Unsupported host 在 work 前返回 actionable failure。

Default runtime 每次 invocation 快照受支持的 ambient environment/platform，并提供 filesystem、Git、clock/identity、subprocess、worker/thread、cache、reporter 与 output publication。普通消费者不实现这些 ports；package-private test seams 不自动成为 public plugin system。

Operational precedence 固定为 `explicit typed invocation override > supported environment value > Product/Project Definition default`。每个受支持环境名称必须经过公共命名门禁；environment 不能改变 Project Definition semantic policy 或提升授权。

### 5. Project-owned code 只在 private runtime boundary 中执行

Public host 不直接 evaluate Project Definition 或调用 custom runner。Product 把 serializable source locator 与 invocation context 交给 package-private worker/child process，由该 runtime 在 Bun 中完成 module loading、validation、planning 和 custom execution；closure、host object 和 internal handle 不跨边界成为 public input。

Product 拥有 startup、cancellation、termination、abnormal-exit handling、resource cleanup 和 diagnostic normalization。Public result 只呈现稳定领域、effect 和 failure variants，不泄漏 worker module、IPC message、process argument、exit mapping 或 bootstrap path。Worker 与 child-process 的选择是 package-private 实现判断。

该 boundary 只隔离 project code 对调用宿主的进程故障。面向不可信项目的显式模式必须在 import 前完全跳过 project-owned executable code，并只允许 ungated neutral observation。

### 6. Root manifest 保持 private，candidate 从 staging tree 形成

Repository root 继续使用 `private: true` 防止误发布。Build 清理并重建受控 staging output，从权威 Product source、public entry source 和 current public-contract source 生成 Bun runtime、declarations、legal files 与 candidate manifest；`npm pack` 只在 staging root 执行。

Staging 是 derived release projection，不接受手工修补。Build 记录 source revision、package version、public-contract identity、inventory 和 tarball digest。Acceptance 把 exact tarball 安装到安全临时 Bun consumer root，并只使用 installed content 验证配置定义、工具运行、默认 effects 与 private containment。

### 7. Product CLI 与 API 实施为原子 hard cut

当 public package API、private runtime、semantic tests 和 exact-tarball consumer 同时可用时，删除 `src/product/cli.ts`、`src/product/args.ts`、CLI-only support/tests、`product:cli` script 和正式 CLI contract；不保留 dual entry、deprecated forwarding export 或 argv compatibility shim。

只证明 argv/help/exit/console mapping 的 Cases 随 surface 退役；configuration selection、reference/gate、scan completeness 与 output atomicity 等领域证明迁移到工具运行操作或 exact-tarball acceptance。Repository adapter 位于 `scripts/**`，只导入 public package surface。

### 8. Prestable package、pack 与 publish 是不同边界

Candidate version 使用 owned release history 中唯一递增的 `0.0.<patch>`；root workspace version、repository name、Change 进度或 candidate pack 都不构成 registry identity、稳定承诺或已发布事实。Release material 说明相邻 `0.0.x` 可以 breaking，并建议精确锁定。

Project scripts 只提供 deterministic build、pack 和 verify。真实 `npm publish` 必须由未来任务明确给出 registry package、version 和外部写入授权，并在 publish 前重新验证 candidate、registry authority、authentication 与 version absence。

## Risks / Trade-offs

- **Bun-only 缩小 direct-import consumer 范围。** 该范围与首发 runtime 能力一致；Node/dual support 保持独立演进。
- **Private runtime 增加 lifecycle 与 serialization 成本。** 它保护调用宿主免受 project-code process failure，但不伪造权限 sandbox。
- **默认 effects 会写日志、cache 和 output。** Closed configuration、显式禁用、structured effect status 和 Product-owned ownership rules 使副作用可预测。
- **Project Definition 承担更多配置责任。** 各领域字段仍由对应 owner 定义；public package API 不建立第二份 policy。
- **命名门禁会延后 publishable candidate。** Vibe Check 产品身份已确定，剩余 package/API/path/environment identifiers 仍需逐项确认。
- **Private staging 增加 derived layer。** Manifest-driven generation、inventory 和 exact-tarball acceptance 防止其成为第二 owner。
- **CLI hard cut 移除现有命令便利。** Repository 与外部使用方可以在自己的边界包装 public package API，Product 不维护第二 execution contract。

## Open Questions

1. **Package 公共契约名称**：registry package、public imports/exports、配置定义操作、工具运行操作、必要公共类型、fixed Project Definition path、default output/cache path 和 supported environment identifiers 分别采用什么字符串？`run`、`define` 等文字只表示语义角色，不预先选择 symbol；Vibe Check 产品显示名不在此问题内。

## Resume Conditions

- 两个公开操作及其必要 package/API/path/environment identifiers 已确认；没有 bootstrap、resource、CLI 或 internal runtime public export。
- Current public-contract source 的 owner、结构和全部派生消费者已明确。
- Foundation seams 已成为可用 current facts，或任务依赖顺序已明确且不会猜测接口。
- Proposal、Design 与 Tasks 已按 confirmed identifiers 同步；随后重新审阅当前 owner、活动决策与实现事实，并运行 `plan` 记录新 Git baseline。在此之前不得开始实施。

## Implementation Observations

### 当前状态

本 Change 当前暂缓实施。`.change-plan.json` 保持 `plan`，只表示三个 artifacts 已形成可恢复的计划结构；它不表示 Readiness 已完成、实施已获授权或存在独立的暂停 stage。

原始暂停原因是等待宿主 runtime、嵌入式执行边界、默认工具副作用与公开操作模型确认后再冻结公共名称和实施计划。其中宿主、私有执行边界、默认副作用与两操作模型已成为活动方向；当前仍等待 package/API/path/environment identifiers、唯一 current public-contract source 与 foundation seams。满足上述恢复条件后，先重新核对三个 artifacts、当前 owner、活动决策与实现事实，再完成未勾选的 Readiness，并运行 `plan` 刷新 Git baseline；在此之前不开始 Implementation 任务。

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
- `confirm-package-contract-names-before-publication`：Vibe Check 显示名保持不变，其它 package 公共契约名称在 candidate 前逐项确认；
- `publish-unscoped-vibe-check-publicly`：registry product 使用公开可安装的 unscoped `vibe-check`；
- `license-package-under-mit`：package manifest 与 legal materials 使用 MIT；
- `bind-external-programs-outside-check-semantics`：configuration 可在 operational dependency boundary 显式绑定外部程序，built-in Check policy 仍保持工具中立。

这些决策约束本 Change，但尚未成为实现事实。本 Change 的产品输入、剩余工程闭合、前置门禁与下一执行入口分别记录在本设计的 `Confirmed Product and Architecture Inputs`、`Required Engineering Closure`、`Execution Gates`、`Current Execution State` 和 Tasks Readiness 中。

当前实现证据已经变化：`docs/architecture.md` 描述 Check/Record 与 Product-owned task orchestration 为当前事实，`establish-check-task-orchestration` 已归档；但 `adopt-typescript-project-definition` 仍是 active Plan，现行 Configuration 仍使用 JSON/CLI selection。前置 Change 的实施范围包括 Project Definition authoring、private loading/normalization、JSON hard cut、foundation handoff，以及唯一 current public-contract source 的 definition-facing fields。本 Change 在该 Change 完成前保持等待，不先实施 package contract engineering。

Current package host 通过 repository-owned `mise.toml` 注入 scc/Lizard bindings，并从 workspace `node_modules` 解析 jscpd；root manifest 把 Product runtime dependencies 全部放在 `devDependencies`，repository 也没有 package legal file。Exact tarball 因而尚未证明 ordinary consumer 的 dependency closure、license 或 platform support。Registry 查询在 2026-08-14 对 unscoped `vibe-check` 返回 `E404`；这只表示当时未解析到公开 package，不证明名称所有权、私有占用或未来可用性。

本 Change 所需的产品与架构方向已经确认。尚未闭合的是前置 Project Definition/runtime seam，以及本 Change 后续负责的 package/release source fields、external dependency resolver、legal/registry authority、实际 host support、public entry 和 package integration。

### Terms

- **Current fact**：由 owner docs、代码、测试或 release artifact 证明的现状；未来决策不能反向描述成已经实现。
- **Confirmed direction**：`active + unaligned` 的长期方向；它约束设计，但不代表实施完成或 Change 已获 implementation 授权。
- **配置定义操作**：在使用者拥有的 TypeScript Project Definition 中调用，返回 Product 可直接验证的同一 closed plain definition shape。
- **工具运行操作**：加载 selected Project Definition 并运行完整工具的唯一正式执行操作。
- **Public package API**：上述两个 callable operations 与支撑它们的必要公共类型；它不包含 CLI、bootstrap、resource API 或 internal runtime surface。
- **Current public-contract source**：计划由前置 Change 在 `src/product/**` 建立的唯一 package-private 当前值 owner；它目前尚未成为实现事实。决策记录只保存选择理由，不复制 literal values。
- **Definition-facing fields**：前置 Change 在上述唯一 source 中建立并验证的 identifiers、fixed/default paths、environment 与 dependency-binding names；它们不是另一份 source，也不包含没有 package/release evidence 的 placeholder。
- **Package/release fields**：本 Change 在依赖满足后，依据 owned release history 与 exact-tarball evidence 添加到同一 source 的 version、support、manifest 与 release values。
- **Operational dependency binding**：Configuration 中与 built-in Check policy 分离的 closed runtime section；它显式提供外部 executable location，只影响依赖解析，不改变 Check identity、policy 或 result semantics。
- **Installed consumer**：只获得 exact packed tarball、声明的 package dependencies 与明确列出的系统前提，不可读取 repository root、mise、workspace devDependencies、tests 或 scripts。
- **Consumer adapter**：repository tooling 或外部使用方拥有的 argv、console 与 exit-code wrapper；它调用 public package API，但不属于 Product contract。
- **Private execution boundary**：Product-owned package-private worker 或 child process；它提供 project-code process-failure containment，不提供 OS permission sandbox。

## Goals / Non-Goals

**Goals**

- 用一个 package version 交付匹配的 Bun runtime、配置 authoring declarations 和 execution declarations。
- 让调用方只定义 Project Definition 并运行工具，不接触 argv protocol、host ports、worker protocol 或 internal Core。
- 让 Product 提供 default runtime、默认工具 effects 和 project-code failure containment，同时返回结构化结果。
- 让全部 public artifact 从单一 Product source 与单一 public-contract source 生成或核对。
- 只在 Project Definition Change 完成并归档后开始 package implementation，单向消费其 current public-contract source 与 runtime seam。
- 在 API、private runtime 和 exact-tarball acceptance 可用的同一实施边界删除 Product CLI。
- 对 staging tree 和 exact tarball 执行 public-surface inventory、dependency audit 与 isolated Bun consumer acceptance。
- 给 installed consumer 一个明确的 public/MIT registry contract、Bun host contract、system prerequisite 与 scanner dependency binding contract。

**Non-Goals**

- 重新命名 Vibe Check，改变 unscoped `vibe-check` public distribution、MIT license 或 `0.0.x` prestable direction。
- 要求产品 owner 逐项选择 export、symbol、fixed path、effect path、environment identifier、failure encoding 或 host matrix；definition-facing values 由前置 Change 按已确认边界闭合，本 Change 只补全 package/release evidence fields。
- 支持 Node.js direct import 或 dual-runtime build。
- 重复实现 `adopt-typescript-project-definition` 已拥有的 Project Definition selection、loader、normalization、JSON hard cut 或 foundation handoff。
- 把 private runtime 表述成 filesystem、network、credential 或 OS-permission sandbox。
- 创建 registry account、配置 credentials/Trusted Publishing 或执行 `npm publish`。
- 公开 bootstrap/init、template/resource API、Core、scanner、manager、scheduler、worker entry 或 IPC protocol。
- 把旧 CLI 的 `scan`、`gate`、`init` grammar 复制成 public command union 或 methods。

## Decisions

### 1. 实施范围与单向完成顺序

当前行为只从 current-fact owners 恢复，未来方向从 active decisions 恢复。本 Change 的实施范围是 public package contract、package host/projection、CLI hard cut、release candidate 与 installed-consumer evidence；“实施范围”不建立第二个长期 owner。Vibe Check 是已建立的产品显示名；root manifest、repository path、source file、Change 名称和语义角色都不能自动决定其它 package 公共名称。

实施只使用以下单向顺序：

1. **Project Definition runtime（`adopt-typescript-project-definition`）**：建立唯一 current public-contract source 的 definition-facing fields，完成 authoring、selection、private loading/normalization、foundation handoff 与 JSON hard cut，并以目标测试和 owner 文档证明 package-private seam 后归档。
2. **Package integration and hard cut（本 Change）**：消费前一步的 source 与 seam，在同一 source 中补全 package/release evidence fields，建立 public entry/package host、scanner dependency closure、staging/pack、repository adapter 与 exact-tarball acceptance，并原子删除 Product CLI。

本 Change 不在前置 Change 完成前实施中间 contract tasks，也不要求前置 Change 在归档后恢复。依赖门禁满足后，本 Change 重新审阅当前事实并运行 `plan` 刷新 Git baseline，然后连续实施到归档。

### 2. Public package API 恰好包含两个操作

配置定义操作只返回 Product runtime 能直接验证的同一 plain closed definition shape，不建立 brand、builder state、registration lifecycle 或第二种配置 authority。Project Definition 文件由使用者创建并拥有；missing definition 返回配置诊断，Product 不创建文件。

工具运行操作接收 project root、definition source selection 与必要 invocation-scoped operational context。Project Definition 拥有 policy catalog、Check declarations/selection、gate policy、scheduler、reporting、cache 和 output configuration；当次 overrides 不能注册 Check、改写 policy 或提升 network、安全和 gate 授权。

必要 public input/result/type declarations 可以导出，但不增加 callable operation。Callable runtime export inventory 必须精确等于两个 functions；工程可以选择最小必要的 non-callable runtime values，但不能用 constants、factories、registries、classes、namespaces 或 convenience helpers 绕过 exactly-two-operations contract。Candidate manifest 不声明 `bin`，也不提供 public `init`、bootstrap、scaffold、create-file、template/resource API 或 internal execution surface。文档示例不是 runtime resource contract。

配置定义操作是同步 plain-value identity；工具运行操作是异步 completion boundary。Expected invalid-input、configuration、runtime containment、execution、effect 与 evaluated gate outcomes 必须通过 closed result variants 表达，不能要求调用方解析 console、exit code 或 exception text。工具运行返回完整 Task、Check、Record 结果；取消、不可恢复 rejection 与同进程并发 invocation collision 的具体 encoding 由工程在不破坏 closed-result、private-runtime 和 effect-ownership 边界的前提下闭合并验证。

### 3. Structured result 与默认 effects 同时成立

普通 invocation 默认启用 Product-owned logs/progress、适用 cache 和 canonical tool output。Project Definition 与 invocation overrides 按各自 owner 控制 reporter、cache、output target、verbosity 和显式禁用模式；Product 拥有默认路径、write ownership、atomicity、collision、cleanup、cache invalidation 和敏感材料边界。

Closed structured result 区分 invocation completion、Task/Check snapshot completeness、Record publication、decision evaluation、领域 gate result、diagnostics 和每项 effect 的 actual status。Evaluated gate failure 是完成后的领域结果，不转换成 exception 或 Product exit code；invalid input、pre-work failure、execution failure 与 effect failure 使用不同 variants。Expected product failures 不以 promise rejection 代替 typed result；不可恢复的 host/runtime defect 边界必须单独说明。调用方不需要解析日志或回读 artifact 才能恢复核心执行事实。

Task、Check、Record 的底层执行与 publication mechanism 是唯一结果 owner。API structured result 与默认文件/canonical machine output 是同一次 invocation 对该 owner model 的不同 projection；二者不得分别计算身份、内容、decision、gate 或 effect facts。API 返回同一次 invocation 已验证的完整 detached results，文件输出默认同时发生；显式禁用持久输出不改变内存结果语义。

### 4. Bun default runtime 是完整产品实现

首个 package 只支持 Bun。Manifest、docs、diagnostics 和 acceptance 只声明 exact-tarball evidence 已证明的最低 Bun 版本、OS/architecture 与 system prerequisites；npm、ESM、Node types 或 root workspace Node engine 不构成 Node.js runtime support。Unsupported host 在 work 前返回 actionable failure。具体 host matrix 是工程验证结果，不是产品 owner 在本 Change 中选择的长期支持承诺。

Default runtime 每次 invocation 快照受支持的 ambient environment/platform，并提供 filesystem、Git、clock/identity、subprocess、worker/thread、cache、reporter 与 output publication。普通消费者不实现这些 ports；package-private test seams 不自动成为 public plugin system。

Operational precedence 固定为 `explicit typed invocation override > supported environment value > Product/Project Definition default`。每个受支持环境名称必须经过公共命名门禁；environment 不能改变 Project Definition semantic policy 或提升授权。

Installed consumer 不拥有 repository mise、workspace `node_modules` 或 package manager devDependencies。每项 scanner implementation 必须闭合为 package production material，或成为由使用者配置显式绑定的 external prerequisite；允许 Python、`scc` 等外部程序作为 `0.0.x` 过渡实现，但不得因此缩减主要产品能力，也不得把 Check/Record 语义、诊断或结果责任转交给外部工具。

“Tool-neutral configuration”只约束 Product-owned built-in Check 的 policy fields、metadata 和含义：它们不得按 `scc`、Lizard、jscpd 的 native flags 或输出格式塑形。它不隐藏源码中的实际实现，也不禁止 configuration 提供运行依赖位置。Project Definition/configuration 可以在独立的 operational dependency boundary 中显式绑定具体 executable；该 binding 只决定 runtime 到哪里执行既有能力，不能改变 Check identity、policy 或 result semantics。随着实现内化，`0.0.x` 可以移除不再需要的 binding，而不迁移语义 Check policy。

Default runtime 在任何 scanner work 前验证 configured executable identity、可执行性和必要版本，并把实际 binding 与 failure 归一化为 Product diagnostics。未配置的 external prerequisite 不回退到 ambient `PATH` 中的同名 executable；package 也不得在未授权时下载工具或执行 install-time network/script effects。精确配置字段、依赖分组、package-owned/external mix 和平台覆盖由工程从 runtime graph 与 acceptance evidence 闭合。

### 5. Project-owned code 只在 private runtime boundary 中执行

Public host 不直接 evaluate Project Definition 或调用 custom runner。Product 把 serializable source locator 与 invocation context 交给 package-private worker/child process，由该 runtime 在 Bun 中完成 module loading、validation、planning 和 custom execution；closure、host object 和 internal handle 不跨边界成为 public input。

Product 拥有 startup、cancellation、termination、abnormal-exit handling、resource cleanup 和 diagnostic normalization。Public result 只呈现稳定领域、effect 和 failure variants，不泄漏 worker module、IPC message、process argument、exit mapping 或 bootstrap path。Worker 与 child-process 的选择是 package-private 实现判断。

该 boundary 只隔离 project code 对调用宿主的进程故障。面向不可信项目的显式模式必须在 import 前完全跳过 project-owned executable code，并只允许 ungated neutral observation。

### 6. Current public-contract source 是唯一公共值 owner

`adopt-typescript-project-definition` 先在 `src/product/**` 的 package-private Product boundary 建立 typed current public-contract source，拥有 unscoped `vibe-check`/MIT identity、public export/symbol plan、fixed Project Definition path、default output/cache paths、supported environment identifiers 和 operational dependency-binding names。本 Change 只能消费这些已交付值，并根据 owned release history 与 exact-tarball evidence 在同一 source 中增加 package version input、Bun/platform support matrix、system prerequisites 和其它 package/release fields；不得静默重命名 definition-facing contract。

该 source 不通过 package exports 暴露，也不形成第三个 runtime operation。Candidate manifest、public entry/declarations、docs、canonical Project Definition example、repository adapter fixtures 与 exact-tarball acceptance 必须从它生成，或由一个有明确方向的 comparison check 对它做单向核对。TypeScript identifier 无法仅靠运行时 data 动态导出时，可以生成薄 public entry；不得在 handwritten entry、manifest template、docs 与 test fixtures 各维护一份名称集合。

Source 只保存已经有实现或 evidence 支撑的当前值，不为尚未验证的 package/release facts 写 placeholder。Package version 的下一个 `0.0.<patch>` 仍由 owned release history 派生；source 记录本次 candidate 的当前值，但不让 Change 进度或 root workspace version 成为版本 owner。Registry authority、MIT legal text/copyright metadata 与 platform/tool materials 仍需对应 owner 或 acceptance 的真实证据，不能由字符串字段自证。

### 7. Root manifest 保持 private，candidate 从 staging tree 形成

Repository root 继续使用 `private: true` 防止误发布。Build 清理并重建受控 staging output，从权威 Product source、public entry source 和 current public-contract source 生成 Bun runtime、declarations、legal files 与 candidate manifest；`npm pack` 只在 staging root 执行。

Staging 是 derived release projection，不接受手工修补。Build 记录 source revision、package version、public-contract identity、inventory 和 tarball digest。Acceptance 把 exact tarball 安装到安全临时 Bun consumer root，并只使用 installed content 验证配置定义、工具运行、默认 effects 与 private containment。

### 8. Product CLI 与 API 实施为原子 hard cut

当 public package API、Project Definition/private runtime seam、semantic tests 和 exact-tarball consumer 同时可用时，删除 `src/product/cli.ts`、`src/product/args.ts`、CLI-only support/tests、`product:cli` script 和正式 CLI contract；不保留 dual entry、deprecated forwarding export 或 argv compatibility shim。

只证明 argv/help/exit/console mapping 的 Cases 随 surface 退役；configuration selection、reference/gate、scan completeness 与 output atomicity 等领域证明迁移到工具运行操作或 exact-tarball acceptance。Repository adapter 位于 `scripts/**`，只导入 public package surface。

### 9. Prestable package、pack 与 publish 是不同边界

Candidate version 使用 owned release history 中唯一递增的 `0.0.<patch>`；root workspace version、repository name、Change 进度或 candidate pack 都不构成 registry identity、稳定承诺或已发布事实。Release material 说明相邻 `0.0.x` 可以 breaking，并建议精确锁定。

Candidate manifest 使用 unscoped `vibe-check`、public access 与 SPDX `MIT` expression，并包含匹配的 legal material。Registry `E404`、repository visibility 或缺失 legal files 都不能替代名称控制权、发布授权和许可材料核验。

Project scripts 只提供 deterministic build、pack 和 verify。真实 `npm publish` 不属于本 Change；单独授权的发布任务必须明确 registry package 与 version，并在 publish 前重新验证 candidate、registry authority、authentication、access、license material 与 version absence。

## Risks / Trade-offs

- **Bun-only 缩小 direct-import consumer 范围。** 该范围与首发 runtime 能力一致；Node/dual support 保持独立演进。
- **Private runtime 增加 lifecycle 与 serialization 成本。** 它保护调用宿主免受 project-code process failure，但不伪造权限 sandbox。
- **默认 effects 会写日志、cache 和 output。** Closed configuration、显式禁用、structured effect status 和 Product-owned ownership rules 使副作用可预测。
- **Project Definition 承担更多配置责任。** 各领域字段仍由对应 owner 定义；public package API 不建立第二份 policy。
- **两个 active Change 共享最终产品路径。** 单向完成顺序让 Project Definition Change 先完整归档，本 Change 后续只消费 current facts；代价是 package integration 必须等待前置 Change，但不再承担跨 Change 往返与双基线协调。
- **命名门禁会延后 publishable candidate。** 产品 owner 不逐项命名，但工程仍须在 current public-contract source 中选择最小、闭合且经过 acceptance 的 package/API/path/environment identifiers。
- **External prerequisites 增加安装与复现成本。** 显式 configuration、pre-work validation 和 Product-owned diagnostics 使过渡实现可观察；Check policy 与结果不能随具体 scanner binding 漂移。
- **Public/MIT 方向不等于已获 registry authority。** Candidate 仍须核验 unscoped name 控制权、authentication、matching legal material 与 publish authorization，不能把 E404 或 repository visibility 解释成发布许可。
- **Private staging 增加 derived layer。** Manifest-driven generation、inventory 和 exact-tarball acceptance 防止其成为第二 owner。
- **CLI hard cut 移除现有命令便利。** Repository 与外部使用方可以在自己的边界包装 public package API，Product 不维护第二 execution contract。

## Open Questions

无。产品与架构输入已经闭合；前置依赖与剩余工程工作分别由 `Execution Gates` 和 `Required Engineering Closure` 承接，不属于开放问题。

## Confirmed Product and Architecture Inputs

本 Change 不再把 public strings、host matrix 或 runtime failure encoding 逐项升级成产品 owner 问题。当前产品与架构输入已经闭合：

- Registry product 是正常公开发布的 unscoped `vibe-check`，使用 MIT license；真实 publish 仍要求后续任务具有 registry authority、authentication 和外部写入授权。
- 所有稳定承诺前的 published package versions 保持 `0.0.x`。相邻 patch 可以 breaking；这不豁免单个版本的 schema、安全、identity、documentation 和 validation 责任，也不在本 Change 中定义何时进入正式版本。
- Product 只提供 Bun-hosted programmatic API，公开 callable surface 恰好是配置定义与工具运行两个操作；Product CLI、`bin`、bootstrap/resource/internal runtime 都不属于 public surface。
- 工具运行默认返回完整 Task、Check、Record 结果，同时产生配置允许的 logs、cache 和文件/canonical output。内存结果与文件结果是同一底层 execution/publication mechanism 的不同 projections，不存在两套事实 owner。
- Package 可以在 `0.0.x` 过渡阶段依赖 Python、`scc` 等 external programs。使用者通过 configuration 显式提供所需 executable locations；Product 在 work 前验证并继续拥有 capability、diagnostics、normalization 和 result semantics，不自动缩小主要 built-in capability。
- Tool neutrality 只约束 built-in Check 的 semantic policy fields、metadata 和含义不按具体 scanner 塑形。源码、文档和 operational dependency binding 可以如实说明并绑定实际工具；这不是闭源或隐藏实现要求，也不要求建立第二份配置文件。

Product owner 已把 exact export/type symbols、fixed paths、default paths、environment identifiers、failure/cancellation/concurrency encoding 和 host matrix 委托给工程闭合。工程必须选择最小、可解释、单一 owner 且可由 exact tarball 验证的 contract；delegation 不允许从当前 root、源码或示例字符串偶然继承公共名称。

## Required Engineering Closure

以下都是本 Change owner 在前置 Project Definition Change 完成后的工程工作，不再作为产品输入阻塞，也不要求用户替实现选择文件布局、名称或测试细节：

1. 核对既有 current public-contract source 与 package-private runtime seam 的完整性，在同一 source 中补全 package version、support matrix、manifest/release fields 与 package consumer map；不重建或改名已交付的 definition-facing fields。
2. 从 staged runtime graph 生成 production dependency inventory，选择 package-owned 与 configured-external dependency mix，并在每个实际声明的 host 上证明 Bun/system/scanner prerequisites；不从 root devDependencies、mise 或 ambient `PATH` 成功推断 package closure。
3. 为 external prerequisite 建立显式 typed configuration、pre-work executable/version validation 和 normalized diagnostics；binding 不能进入 built-in Check policy semantics。
4. 让 API result 与 canonical output 共同消费 validated Task/Check/Record owner model，并用 runtime/type/tarball acceptance 证明 exact public surface、failure、cancellation、concurrency 与 effect semantics。
5. 选择 owned release history 中唯一 next `0.0.<patch>`，核对 registry authority、MIT legal/provenance materials；这些证据完成前只称 candidate，不称 published package。

## Execution Gates

本 Change 使用两个顺序门禁。Gate A 防止本 Change 在前置 Project Definition/current-contract facts 尚未交付时启动；Gate B 防止 CLI hard cut 早于可安装 replacement。

**Gate A — Project Definition dependency：**

- `adopt-typescript-project-definition` 已完成并归档，相关 owner 文档已同步。
- 唯一 current public-contract source 的 definition-facing fields、consumer comparison 与 package-private Project Definition/runtime seam 已通过目标测试；本 Change 不猜测或反向修改其接口。
- 执行者按 Tasks 依次完成 Readiness `0.15` 和 `0.16`：核对交付证据，重新审阅当前 owner、活动决策、两个 Change artifacts 与实现事实，并运行 `plan` 记录新 Git baseline；之后才开始 Implementation `1.1`。

**Gate B — CLI hard cut：**

- Public entry、closed API result、package-owned/configured-external dependency mix、evidence-derived host matrix、MIT legal material 与 deterministic staging 已形成可安装 replacement。
- Exact-tarball consumer 已证明 selected Project Definition、default effects、代表性 gate 与 failure containment；只有这时才能删除 Product CLI 和迁移 repository adapter。

## Current Execution State

- Product input gate 已解除：Bun host、私有执行边界、默认副作用、两个公开操作、public/MIT distribution、完整 API+file result、configured external prerequisites 和 tool-neutral semantic boundary 均有活动决策或产品确认。
- 本 Change 当前不可进入 Implementation，正在等待 `adopt-typescript-project-definition` 完成并归档；等待期间不实施 public entry、package staging、CLI hard cut 或另一份 contract source。
- Gate A 尚未满足：唯一 current public-contract source 的 definition-facing fields 与 Project Definition/private-runtime seam 仍需由前置 Change 交付。本 Change 当前没有可执行任务；依赖满足后依次执行 Readiness `0.15`、`0.16`，两项完成后才从 Implementation `1.1` 核对并扩展同一 source。
- Gate B 也尚未满足：package dependency mix、host evidence、MIT legal material 与 exact-tarball replacement 尚未形成。
- 本节与 Tasks checkbox 共同承接可执行状态；完成 `0.15`/`0.16` 时必须同步更新本节，避免保留过期的“等待”描述。
- `.change-plan.json` 的 `stage: plan` 与 `baseCommit` 只承接计划成熟度和复核基线。它们不证明任何 Implementation/Verification task 已完成，也不解除 Gate A 或授权 registry publish。

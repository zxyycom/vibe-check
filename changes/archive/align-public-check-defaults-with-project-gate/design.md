# Design

本设计用两个明确边界避免 public defaults 与 repository policy 再次耦合：Product 发布可组合、适合起步的固定基线；Project Gate 直接声明本仓库需要的严格配置。

## Context

本 Change 形成时，六项 package constructor 通过 `src/package-checks/project-files/configuration.ts` 共享 files 默认值，但该值仍是 package-private uppercase 常量。每个 constructor 会把 files branch 快照到完整 resolved options。四项质量 Check 通过同一个 package-private `DEFAULT_FINDING_POLICY` 选择 normal Finding 是否 blocking；Markdown Link 拥有独立 final data，但采用同一 policy resolver。

当时本仓库 Gate 已显式声明 repository files 与 duplicate thresholds，却让 file/function thresholds 继承 package defaults。若直接放宽 public defaults，Gate 会静默变宽。因此实现必须先让 Gate 完整拥有这些项目阈值，再改变 Product defaults。

## Goals / Non-Goals

目标：提供一个准确、可发现、可组合的公共 files 基线；让默认质量 Check 先报告而非阻断；让 Gate 严格政策不依赖 Product default；保持所有 Finding、Record、unavailable 与 aggregate 责任边界。

非目标：建立 preset registry、配置继承系统或 deep-merge helper；为每个 Check 公开一份 resolved default object；把 Gate-specific 目录排除复制到通用默认；通过提高阈值隐藏本仓库当前质量问题；改变 scanner protocol 或 finding conversion。

## Decisions

### Intended Change

本 Change 通过以下五项相互闭合的实现决定完成 public baseline 与 Project Gate policy 的分离。

#### 1. 公开一个不可变的完整 files 基线

`src/package-checks/project-files/configuration.ts` 导出 `defaultProjectFileSelection: ProjectFileSelection`，`src/index.ts` 从 package root 重导出。它保持 `source: "filesystem"`、`include: ["**/*"]`，并明确排除：

- VCS/Product state 与 caches：`.git`、`.vibe-check`、`.cache`、`.pytest_cache`；
- logs、coverage 与 temporary outputs：`.log`、`coverage`、`.tmp`、`tmp`；
- dependencies/build/generated outputs：`node_modules`、`vendor`、`artifacts`、`build`、`dist`、`generated`、`*.generated.*`、`target`；
- Python environments/cache：`.venv`、`venv`、`__pycache__`。

对象和嵌套数组深冻结。constructor 仍通过 owner-local snapshot 形成自己的 resolved branch，因此 consumer 得到可安全复用的 template，而不是可变全局配置。显式数组继续完整替换；推荐扩展形式是 `{ ...defaultProjectFileSelection, exclude: [...defaultProjectFileSelection.exclude, "**/fixtures/**"] }`。

#### 2. Public quality defaults 是固定 advisory baseline

`DEFAULT_FINDING_POLICY` 改为 `"non-blocking"`，因此 duplicate、file、function 与 Markdown Link 在省略 policy 时都保留完整 normal Finding evidence、附 warning 并结算为 passed。显式顶层或 area `"blocking"` 行为不变；unavailable 永不被 policy 降级。

三个数值型 constructor 的固定 defaults 为：

| Check | Public default |
| --- | --- |
| duplicate | minimum lines `4`；minimum tokens `100` |
| file metrics | ordinary code lines `360`；low-decision allowance `600`，decision tokens `12` |
| function metrics | NLOC `60`；low-complexity NLOC `180` when CC `< 6`；CC `12`；parameters `6` |

这些是直接、可记录的 package values，不从 Gate 值动态乘系数，也不形成命名 preset。consumer 可通过现有 closed options 精确覆盖。

#### 3. Gate 显式拥有严格 repository policy

`scripts/project/gate/repository-quality-checks.ts` 继续拥有 repository-specific include/exclude 和 duplicate area thresholds，并新增共享于 Gate file areas 的 `300 + 500/10` code-line policy，以及共享于 Gate function areas 的 `50 + 150/below 5 + CC 10 + parameters 5` limits。四项 Check 都显式传入 `findingPolicy: "non-blocking"`。

Gate 不导入或展开 `defaultProjectFileSelection`，也不从 public thresholds 计算项目阈值。这样 Product baseline 与项目 policy 可以独立改变，Gate test 直接断言完整严格值。

#### 4. Public inventory 区分 default value 与 operations

`CURRENT_PUBLIC_CONTRACT` 新增 `defaults` 分类并登记 `defaultProjectFileSelection`。runtime export audit、artifact inventory、Chinese JSDoc coverage 与 installed type consumer 都从该分类读取或显式消费；不会把该对象伪装为 operation 或 Check guide。

#### 5. 测试复用 owner，不复制默认数组

project-file collection test 证明公开默认对象深冻结、常见 outputs 被剔除且其它 dot files 仍可选。各 Check constructor test 用该 owner value 比较 resolved files，并只冻结自身领域默认值。Gate test 单独证明严格阈值；public inventory 与 installed consumer 证明 package root export 和 composition 可用。现有 Case 只在 `Proves` 的默认事实变化时更新，不按文件改动新增 Case。

### Resulting Impacts

- Package root runtime/declaration inventory 增加一个 default value，但不增加 Check、parser、type 或 subpath。
- 六项 file-selecting constructors 的 resolved files branch 会获得新增通用排除；显式完整 arrays 的行为不变。
- 四项质量 Check 的 normal Finding 默认 outcome 从 failed 变为 passed-with-warning，显式 blocking 和 unavailable 保持原语义。
- 三项数值型 Check 的无参 resolved thresholds 变宽；Project Gate 因显式声明原严格值而保持现有项目政策。
- README、API mechanics、四份 Check guide、JSDoc、public inventory、candidate 与 installed consumer evidence 必须同步。

## Risks / Trade-offs

- **默认 scope 变窄：** 名为 `tmp`、`coverage` 或 `venv` 的真实 source 默认会被排除；这些目录通常是生成状态，且 public object 与显式完整替换让例外可见。
- **默认不再阻断：** consumer 若误把单个 Check status 当 release gate，可能忽略 warning；文档必须明确显式 `blocking` 和 Run aggregation 是两个不同选择。
- **两套固定阈值：** public 与 Gate values 会重复数字，但它们由不同 owner、不同 consumer 和不同变化原因驱动；动态共享反而会制造不受审阅的耦合。
- **public surface 增加：** 新默认对象进入 prestable root inventory 与 declarations；其职责只限于通用 files baseline，不扩展为配置 registry。

## Open Questions

无。用户已确认采用公开可微调的默认文件方案，以及相对 Gate 略宽、默认 advisory 的 package Check baseline。

## Implementation Observations

- `defaultProjectFileSelection` 已成为 runtime、declaration 与 public inventory 共用的唯一公共默认 files value；constructor 继续建立同值但独立的冻结 snapshot，显式数组替换语义未改变。
- Gate policy test 直接断言严格数值；required Gate 的实际 `run.json` 中四项质量 Check 均为 `passed`，duplicate/file/function 的 `blockingFindingCount` 都为 `0`，同时 file、function 与 Markdown Link 仍分别保留 `28`、`134` 与 `2` 条 Finding Records。
- 完整 package verification 已通过 36/36 Checks，覆盖 artifact、安装后 TypeScript consumer、runtime consumer、documentation consumer 与 candidate lifecycle；未建立 public preset、merge helper 或 Gate-to-Product default coupling。

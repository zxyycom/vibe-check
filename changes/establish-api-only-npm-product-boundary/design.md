# Design

本 Design 把前置 Change 交付的 Product 运行内核投影为 API-only Bun npm package，并规定 public surface、installed host、artifact、replacement acceptance 与 Product CLI hard cut 的边界。

## Context

### Document Authority

本 Design 只规定 `establish-api-only-npm-product-boundary` 的 package projection、installed host、artifact、CLI hard cut 和 release-evidence 工作。它不重新拥有前置 Change 已定义的配置与执行语义。

| Concern | 权威 owner | 本 Change 的动作 |
| --- | --- | --- |
| Project Definition / Package Run / Run Controls | `adopt-typescript-project-definition` | 消费并公开，不重新定义 |
| Built-in descriptor values/options、Check tree authoring | `adopt-composable-check-tree` | 投影 values/types，并由 consumer acceptance 证明组合 |
| Check-scoped cap、admission/drain、shared scheduler handoff | `support-check-scoped-concurrency` | 消费语义并通过 acceptance 证明，不复制 scheduler |
| 项目函数调用、`TaskPlan`、dependency、并行与 named resources | 前置 Changes 与既有 Task owners | 通过 acceptance 证明保真，不复制 scheduler |
| Operational fields、precedence 与 snapshot | 前置 Change和 scanner dependency owner | 决定 installed delivery 并验证 prerequisites |
| Definition-facing public names | 前置 Change 建立的 current public-contract source | 原样消费；不得从示例推断 |
| Package/release names、manifest fields、support evidence | 本 Change 扩展后的同一 current public-contract source | 形成 candidate 并单向投影 |
| Staging、tarball、installed-consumer evidence | 本 Change | 完整拥有 |
| Product CLI removal | 本 Change | replacement 通过后 hard cut |

长期方向由 active decisions 拥有，尤其是：

- `release-one-versioned-npm-product-unit`、`use-programmatic-api-as-product-entry` 和 `support-bun-as-the-package-host`；
- `expose-config-definition-and-project-run-operations`、`pass-project-definition-value-to-run` 和 `drive-run-from-project-definition-value`；
- `execute-project-functions-through-task-system-in-caller-runtime` 和 `enable-tool-effects-by-default`；
- `confirm-config-run-and-package-names-before-publication`；
- `publish-unscoped-vibe-check-publicly`、`license-package-under-mit` 和 `bind-external-programs-outside-check-semantics`。

当前正式入口仍是 Bun CLI，root manifest 仍是 private workspace。前置 Change 尚未完成，因此本 Design 描述的是 target contract，不是当前可用 package。

### Stable Terms

| 术语 | 本 Design 中的含义 |
| --- | --- |
| **配置定义函数** | Package 公开的 authoring helper；返回 plain Project Definition |
| **Package Run** | Package 公开的执行函数；接收 `(Project Definition, Run Controls)` |
| **项目 Run** | 使用项目的运行脚本导出的已绑定入口；不属于 package export |
| **built-in descriptor** | 可直接放入 Project Definition Check tree 的 frozen non-callable package value |
| **current public-contract source** | `src/product/**` 中 public/package current values 的唯一 owner |
| **candidate** | 已 build、pack、verify 但未因此自动发布的 package artifact |
| **exact-tarball consumer** | 只获得目标 tarball、declared dependencies 和明确系统前提的临时 Bun project |

代码示例中的 `defineConfig`、`run` 和文件路径只说明角色与调用关系。Exact callable symbols、three
built-in descriptor values 与必要 types 由 current public-contract source 确认；项目文件路径始终由使用项目拥有。

### Package Consumer Path

```text
project config file
  → 配置定义函数
  → Project Definition

其他调用方
  → 项目 Run
  → Package Run(Project Definition, Run Controls)
  → 前置 Change 的 Product 运行内核
  → 项目函数与既有 Task 系统
```

Package projection 必须保持这条调用链。它不能把项目 Run 误作第三个 package operation，也不能在 Package Run 前加入配置文件 discovery、reload 或函数跨-runtime transport。

## Goals / Non-Goals

### Goals

- 用一个 package version 交付匹配的 Bun runtime、两个 callable exports 和 public declarations。
- 为普通 installed consumer 提供完整 default host、effects、dependency diagnostics 和 structured result。
- 让 public artifacts 从唯一 current public-contract source 生成或单向核对。
- 用 exact tarball 证明项目配置文件、项目运行脚本和 separate caller 的真实使用路径。
- 在 installable replacement 可用后原子删除 Product CLI contract。
- 形成 deterministic、allowlisted、可追溯且未发布的 `0.0.x` MIT candidate。

### Non-Goals

- 改写前置 Change 拥有的 definition、controls、validation、Task scheduling、function execution 或 JSON migration 语义。
- 固定项目配置文件、运行脚本或项目 Run 的文件名与 export convention。
- 支持 Node.js direct import、dual runtime、Product `bin` 或 public internal execution surface。
- 提供 whole-invocation worker/process containment 或 permission sandbox。
- 创建 registry account、管理 credentials、配置 Trusted Publishing 或执行 `npm publish`。

## Decisions

### 1. Package Work Starts Only After the Upstream Contract Is Complete

实施顺序固定为：

1. `adopt-typescript-project-definition` 建立并验证 current public-contract source、Project Definition、Product 运行内核、Task/dependency semantics、operational snapshot、canonical two-file usage 和 JSON hard cut；`adopt-composable-check-tree` 随后建立 built-in descriptor values/options 与 Check tree；`support-check-scoped-concurrency` 再建立 Check-scoped active caps、reservation/drain 与 shared scheduler handoff。三个 Change 都完成并归档。
2. 本 Change 执行 Readiness `0.15`、`0.16`，重新核对 owner 与 artifacts，运行 `plan` 刷新 baseline。
3. 本 Change 从 `1.1` 开始连续实施 package projection、host、artifacts、acceptance 和 CLI hard cut。

本 Change 不与前置 Change 交替修改同一 contract，也不在依赖未满足时创建 provisional public API。

### 2. Public Runtime Surface Has Exactly Two Callable Exports

Package 公开：

1. 配置定义函数；
2. Package Run；
3. frozen non-callable `duplicateDetection`、`fileMetrics`、`functionMetrics` values；
4. 上述 authoring/run 所需的 Project Definition、Check tree、Run Controls 和 result types。

只有前两项是 runtime callable operations。三个 built-in values 直接进入 Check tree，但不是 runner、builder
或 registry operation。Package Run 接收一个 Project Definition 和 closed Run Controls；项目 Run 是使用项目的
wrapper，不是第三个 package export。

Public surface 不包含 Product `init`、resource/bootstrap、Core、manager、scanner adapter、scheduler、Task、worker/process entry、IPC、registry、class 或 convenience factory。Manifest 不包含 `bin` 或 undeclared subpath export。

### 3. Installed Usage Preserves the Project-Owned Two-File Pattern

Installed project 采用以下关系：

```ts
// project-definition.ts
import { defineConfig, fileMetrics } from "vibe-check";

export default defineConfig({
  checks: [{
    id: "source",
    maxParallel: 2,
    checks: [{ ...fileMetrics, maxParallel: 1 }]
  }],
  scheduler: { maxParallel: 4 }
});
```

```ts
// run.ts
import projectDefinition from "./project-definition";
import { run as runVibeCheck } from "vibe-check";

export function run(controls = {}) {
  return runVibeCheck(projectDefinition, controls);
}
```

```ts
// another caller
import { run } from "./run";

const result = await run({
  // only controls exposed by this project
});
```

这些名称是示例。Acceptance 检查角色和调用方向，不把示例路径写入 package contract。项目可以在项目 Run 外再提供自己的 CLI、service、agent 或 editor adapter。

### 4. Package Run Is a Public Projection of the Upstream Run Kernel

Public Package Run 调用前置 Change 交付的 Product 运行内核。它保留上游已验证的：

- definition/control validation；
- custom runner 与 `TaskPlan` factory invocation；
- Check-tree leaf selection、descriptor options、Task dependency、bounded parallelism、Check-scoped active
  caps/reservation/drain 与 named resource coordination；
- operational dependency resolution；
- cooperative cancellation；
- Task/Check/Record、decision 与 effect result projection。

本 Change 只增加 public boundary 和 default host，不再解释这些语义。项目函数与 Package Run 在 caller 的 Bun runtime 中执行；单个 Task 或 scanner adapter 仍可使用自己的 subprocess/worker。Package 不承诺隔离 project code 的 `process.exit`、同步无限循环、global mutation 或 non-cooperative cancellation。

### 5. Bun Default Host Closes Installed Runtime Dependencies

首个 package 只承诺 Bun direct import。Manifest、docs、diagnostics 和 acceptance 只能声明 exact-tarball evidence 已证明的 Bun version、OS/architecture 和 system prerequisites；npm、ESM 或 Node type compatibility 不等于 Node runtime support。

Default host 每次 invocation snapshot environment/platform，并提供 filesystem、Git、clock/identity、subprocess、cache、reporter 和 output。普通 consumer 不实现这些 ports；package-private test seams 不成为 plugin system。

每项 scanner implementation 必须是 package production material，或是 definition/controls 按上游 contract 显式绑定的 external prerequisite。缺失或版本不兼容时在 work 前返回 typed diagnostic；不读取 repository mise state、workspace devDependencies 或 ambient `PATH`，install lifecycle 也不下载工具。

### 6. Results and Effects Preserve the Upstream Model

普通 invocation 默认产生 Product-owned logs/progress、适用 cache 和 canonical output，同时返回上游定义的 structured result。Package host 只实现 effect targets、write ownership、atomicity、collision、cleanup、cache invalidation 和 sensitive-material boundary；不另算 Check identity、Records、decision 或 gate facts。

Concurrent invocation、failure 和 cancellation 必须同时反映在 structured result 与 effect status 中。Evaluated gate failure 是领域结果，不转换成 CLI exit mapping。

### 7. One Current Source Drives Every Public Artifact

前置 Changes 建立 current public-contract source，并拥有 definition-facing names、built-in descriptor values/
types/options、defaults、environment identifiers 和 dependency identifiers。本 Change在同一 source 中补充有实现或 evidence 支持的：

- unscoped package name `vibe-check`；
- exact public symbols 和 export map；
- MIT/license fields；
- next `0.0.<patch>` candidate version；
- Bun/platform/system support；
- manifest、release 和 package-consumer fields。

项目配置文件和运行脚本路径不进入该 source。Candidate manifest、entry、declarations、docs、examples、fixtures 和 acceptance 必须生成自该 source或与其单向比较；不得各自维护一组 handwritten values，也不得写 placeholder。

### 8. Candidate Is Built in Controlled Staging

Repository root 保持 `private: true`。Build 每次重建 staging tree，投影 Bun runtime、public entry、declarations、manifest 和 MIT materials；staging 不接受手工修补，`npm pack` 只在 staging root 执行。

Build 记录 source revision、package version、public-contract identity、allowlisted inventory 和 tarball digest。Repeated clean build 应产生等价 artifacts；tarball 不包含 tests、cache、credentials、logs、temporary outputs 或 undeclared workspace material。

### 9. Exact-Tarball Acceptance Proves the Consumer Contract

Acceptance 按顺序执行：

1. 从 clean staging 产生一个 exact tarball。
2. 在安全临时目录创建只支持 Bun 的 consumer project。
3. 只安装 exact tarball、declared dependencies 和明确 prerequisites；不允许读取 repository root。
4. 创建项目配置文件并使用配置定义函数。
5. 创建项目运行脚本，将该 Project Definition 绑定到 Package Run。
6. 从 separate caller 只导入项目 Run 并传入项目允许的 controls。
7. 直接导入三个 built-in values，验证 descriptor spread options、mixed Check tree、leaf/group cap override、
   active-cap min、reservation/drain、representative `TaskPlan` scheduling、default effects、complete result、
   failures、cancellation 和 concurrent invocation。
8. 审计 runtime exports、declarations、manifest、filesystem access 和 dependency resolution，确认只有两个
   callable exports，三个 descriptor values 和必要 types。

Acceptance 必须使用将要交付的同一个 tarball，不能用 workspace source、symlink、repository scripts 或 devDependencies 替代。

### 10. Product CLI Is Removed Only After Replacement Acceptance

当两个 public operations、Bun host、dependency closure、semantic tests 和 exact-tarball acceptance 同时通过后，原子删除 `src/product/cli.ts`、`src/product/args.ts`、CLI-only support/tests、`product:cli` script 和正式 argv/help/exit contract。

只证明 argv、help、exit 和 console mapping 的 Cases 随 Product surface 退役。Configuration、gate、scan completeness、Task scheduling 和 output evidence 迁移到 package API、项目运行脚本或 exact-tarball acceptance。Repository command 留在 `scripts/**`，作为调用项目 Run 的 adapter；不保留 deprecated forwarding、argv shim 或 dual Product entry。

### 11. Pack and Publish Are Different Authorization Boundaries

Candidate 使用 release history 中唯一递增的 `0.0.<patch>`，manifest 声明 public unscoped `vibe-check` 和 SPDX `MIT` 并包含 matching legal material。相邻 `0.0.x` 可以 breaking，release material建议精确锁定。

Build、pack 和 verify 不证明 registry identity、名称控制或发布成功。Registry `E404` 也不证明名称所有权。真实 `npm publish` 需要单独用户授权，并重新核验 registry authority、authentication、access、license 和 version absence。

### 12. Engineering Closure Evidence

| Area | 必须闭合的证据 |
| --- | --- |
| Upstream handoff | 三个前置 Changes 已归档；source、run kernel、tree/options、Check-scoped cap、Task/dependency、operational 和 usage contracts 有 owner docs 与目标 tests |
| Public API | 两个 callable exports、三个 non-callable built-in values 与必要 types来自 current public-contract source；exact export inventory 通过 |
| Bun host | Filesystem、Git、environment、subprocess、cache、reporter、output 和 dependency diagnostics 在 installed consumer 中可用 |
| Artifacts | Runtime、declarations、manifest、MIT materials、inventory、provenance 和 digest 可重复生成 |
| Consumer usage | Exact-tarball project 的配置文件与运行脚本可用；separate caller 只调用项目 Run |
| CLI hard cut | Replacement 通过后移除 Product CLI；repository adapter消费项目 Run |
| Release boundary | Candidate version、support、license 和 registry authority有证据；未执行未经授权的 publish |

### 13. Execution Gates

#### Gate A — Upstream Handoff

- `adopt-typescript-project-definition`、`adopt-composable-check-tree` 与 `support-check-scoped-concurrency` 已完成并归档，稳定 owners 已同步。
- Current-contract fields、Project Definition validator、Product 运行内核、descriptor/tree/options、Check-scoped cap/admission-drain、Task/dependency semantics、operational snapshot、JSON hard cut 和两文件 usage 有目标测试。
- 完成 Readiness `0.15`、`0.16` 并运行 `plan` 刷新 baseline 后，才能开始 `1.1`。

#### Gate B — CLI Hard Cut

- 两个 public operations、closed result、Bun host、dependency mix、MIT materials 和 deterministic staging 已形成 installable replacement。
- Exact-tarball project + separate caller 已证明调用链、descriptor/tree/options、Check-scoped cap、project functions、Task execution、effects、results 和 representative failures。
- Gate B 满足后才能删除 Product CLI。

## Risks / Trade-offs

- **同 runtime project code。** 保留 functions 与 closures，但不隔离 project code 对 caller process 的影响。
- **两个 project-owned files。** 换取稳定的已绑定项目 Run；Package 不增加第三个 operation 或 Product CLI。
- **Default effects。** 普通运行会写 logs/cache/output；closed inputs、effect status 和 atomic writes 使其可预测。
- **External prerequisites。** 降低 package size 或平台负担，但增加显式配置和安装前验证责任。
- **Private staging。** 增加 derived layer；single-source generation、inventory 和 exact-tarball acceptance 防止其成为第二 owner。
- **CLI hard cut。** 移除 Product command convenience；项目和 repository adapter 可以在项目 Run 外自行提供命令。
- **Public/MIT 与 registry authority 分离。** Candidate 可以验证，但 publish 仍需新的授权与外部证据。

## Open Questions

无产品或架构开放问题。Exact public symbols、support matrix、dependency delivery mix、candidate version 和 registry authority 属于 tasks 中必须用实现或外部证据闭合的工程值，不是由示例或本 Design 猜测的产品选择。

# Design

本 Design 记录已实施的普通 `BuiltInCheck` 数据模型、辅助函数、校验边界和 owner 迁移顺序。它保留 proposal 的实现依据；已完成的验证证据见 tasks。

## Context

`proposal.md` 拥有本 Change 的目标、范围与成功标准；本文件拥有本 Change 的设计选择；`tasks.md` 拥有实施顺序和完成状态。长期产品方向仍由 `docs/decisions/**` 拥有，当前产品事实仍由稳定 docs、source 和 tests 拥有。

### Authority and current state

| 内容 | 当前状态 | 本 Change 的处理 |
| --- | --- | --- |
| 当前 source、current contract 与下游 Plan | 内置值已经是普通 `BuiltInCheck` 数据；顶层 `replace` / `append`、统一定义表、closed-record parser 与 private runtime lookup 已落地；current contract、Configuration、Architecture、repository dogfood 和下游 package Plan 已同步四个 functions、三个 values 与 `BuiltInCheck`。 | 这是本 Change 已验证的当前事实；下游 package 仍按自己的 Plan 交付真实 runtime entry、declarations 与 exact-tarball acceptance。 |
| active Configuration baselines | `use-standalone-built-in-check-adjustment-functions` 拥有普通内置 Check、`replace` / `append` 字段语义与 non-mutation boundary；`use-composable-check-tree-with-run-owned-bindings` 拥有统一 tree、declarative normalization 与 Package Run private binding 责任。两者均为 `active + aligned`。 | source、tests、Case 与稳定 docs 已完整兑现两个可独立维护的方向。 |
| active Product Contract directions | `docs/decisions/product-contract/expose-built-in-check-values-and-adjustment-functions.md` 与 `docs/decisions/product-contract/confirm-built-in-check-and-adjustment-names-before-publication.md` 仍为 `active + unaligned`。 | current source、contract 和下游 Plan 已采用这些方向；真实 package entry、declarations 与 exact-tarball acceptance 尚由下游 Change 实施，因此本 Change 不提前标记 aligned。 |
| package availability | repository root 仍是 private workspace，尚无已发布的 installable package。 | 对 current-source API 采用 hard cut，不建立 methods 与 functions 并存的 compatibility layer。 |

`defineConfig` 只构造 Project Definition value。辅助函数只校验当前调用所需的内置 Check 和 patch。declarative normalization 验证完整 Check tree；Package Run pre-work 随后按已选 `checkId` 构造 private runtime binding。两者都必须早于 project functions、dependency preparation、effects 和 scanner work。

当前 semantic Case `WB-PROJECT-DEFINITION-001` 覆盖 standalone adjustment、closed Project Definition、Package Run pre-work、public contract 与 fingerprint；原 method、enumerability 和 issuance assertions 已替换为普通结构数据、closed-record safety 与 non-mutation assertions。

### Terminology

| Term | Meaning |
| --- | --- |
| Check definition mechanism | Project Definition Check tree 的统一配置与 normalization contract。group、built-in 和 custom 是同一 tree 中由公开字段区分的 variants。 |
| Built-in Check / 内置 Check | Product 预先构造的 `BuiltInCheck` 数据 variant。它包含 recognized `kind` / `checkId`、canonical public metadata、完整 typed options 和可选叶子排程字段。 |
| 普通闭合记录 | prototype 为 `Object.prototype` 或 `null`，只含允许的 string-keyed enumerable data properties，不含 accessors、symbol keys 或额外字段的普通记录。其合法性不依赖 Product-specific prototype、object identity、private brand、methods 或 frozen state。 |
| 配置辅助函数 | 顶层 pure function `replace` 或 `append`。它解析一个受支持的内置 Check 和本次操作输入，返回新的普通内置 Check 数据，不修改或认证输入。 |
| 内置数据 owner | `built-in-data-model.ts` 拥有普通 `BuiltInCheck` 判别联合与 `checkId` 到 options/replacement 的类型关联；`built-ins.ts` 拥有唯一 metadata/defaults 表、closed parser 与构造路由。逐 Check replacement algorithms 位于相邻独立模块；这些边界不形成可变 registry 或 object-provenance store。 |
| 完整校验与 runtime 边界 | Check tree normalization 对完整 declarative Project Definition 执行公开数据 acceptance；Package Run pre-work 按已选 `checkId` 从 `run/built-ins.ts` 查找并构造 private runtime binding。辅助函数成功不替代任一边界。 |

## Goals / Non-Goals

### Goals

- 让内置 Check 与自定义 Check 共用同一个 Check tree 入口；内置差异由公开 discriminant 对应的 options policy，以及 Package Run pre-work 的 private binding construction 承接。
- 让 `replace` 与 `append` 各自表达稳定的字段语义，同时共享内置定义查询、普通记录解析和结果构造。
- 保持 built-in-specific TypeScript patch inference 和 runtime closed-input behavior，不退化为 generic object merge。
- 让 decisions、current contract、Configuration、source、tests 和下游 package Plan 使用同一 public surface 分类。

### Non-Goals

- 不让内置 Check object 自带 methods、validator、brand、factory identity 或 executable binding。
- 不把内置 options policy、自定义 Check binding 和 group structure 压成同一个无差别 shape；它们仍是显式 variants。
- 不建立任意自定义 Check 的 replacement / append policy。
- 不把 freeze、serialization、module instance 来源或 exact object equality 定义为产品行为。

## Decisions

### Target authoring surface

目标 package 调用形态如下；该示例表达目标契约，不表示 package 当前已经可以安装：

```ts
import { append, fileMetrics, replace } from "vibe-check";

const configuredFileMetrics = append(
  replace(fileMetrics, {
    maxParallel: 1,
    options: { codeLines: { changedDelta: 100 } }
  }),
  { mutex: "metrics-scanner" }
);
```

目标 runtime function export inventory 恰好包含四项，并按责任分类：

1. `defineConfig` 构造并返回 Project Definition value；它不执行完整 runtime validation 或 Product work。
2. `run` 是唯一执行 Product Run 的 function。
3. `replace` 与 `append` 是两个内置 Check 配置辅助函数；它们不执行 Run、不注册 global state，也不形成另一种项目集成入口。

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是另外三个普通 non-callable 内置 Check values。公开数据类型名为 `BuiltInCheck`，不再使用暗示特殊 carrier 的 `BuiltInCheckDescriptor`。

### Built-in Check data contract

每个 `BuiltInCheck` 包含：

- `kind: "built-in"` 与受支持的 `checkId`；
- 与该 `checkId` 对应的 canonical `displayName` 与 `recordTypes`；
- 该内置 Check 的完整 typed `options`；
- 可选的叶子自有 `dependsOn`、`maxParallel` 与 `mutex`。

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是 Product 按此契约预先构造的默认值。exported value、辅助函数返回值和普通数据副本使用同一个结构校验；只要 public fields 合法，来源和 object identity 不参与判断。

Check tree parser 按以下顺序工作：

1. 对输入执行一次 safe plain-record snapshot；非法 prototype、accessor、symbol key、非 enumerable property、额外字段或 snapshot error 均 fail closed。accessor getter 不得被调用；Proxy 抛出的异常按非法输入处理。
2. 根据公开字段选择 group、built-in 或 custom parser。
3. built-in parser 根据 `checkId` 查询内置定义表，并校验 canonical metadata、完整 options 和排程字段。
4. normalization 只形成 declarative resolved leaf；Package Run pre-work 再按已选 `checkId` 从 `run/built-ins.ts` 查找并构造 private execution binding。

parser 不调用 `materializeBuiltInDescriptor`，不查询 object identity，也不从 exported singleton 或 copied metadata 恢复输入。

### Helper typing and field semantics

public typing 使用 closed mapping 或等价 overloads：

```ts
replace<Id extends BuiltInCheckId>(
  check: BuiltInCheckById[Id],
  replacement: BuiltInCheckReplacementById[Id]
): BuiltInCheckById[Id]

append<Id extends BuiltInCheckId>(
  check: BuiltInCheckById[Id],
  additions: BuiltInCheckSchedulingAppend
): BuiltInCheckById[Id]
```

传入值的 `checkId` 必须决定 replacement shape 与返回 variant。实现不得退化为 `Record<string, unknown>` patch，也不得把 exported defaults 的精确 literal values 错当作不可改变的返回类型。

| Function | Accepted fields | Required semantics |
| --- | --- | --- |
| `replace` | 当前内置 owner 声明的 options patch，以及叶子自有 `dependsOn`、`maxParallel`、`mutex`。 | 已提供 scalar 或 fixed nested leaf 替换当前值；未提供 branch 保持；open options map 作为整个字段替换；不得接受未知字段。 |
| `append` | 当前仅为叶子自有 `dependsOn` 与 `mutex`。 | 在当前值后追加输入，并按首次出现顺序去重；不得追加 options 或 scalar fields。 |

两个辅助函数共享内置 Check parsing、内置定义查询与结果构造，但保持两个 public functions，因为 replace 和 append 对 collection 的含义不同。

### Validation responsibilities

| Boundary | Must validate | Does not prove |
| --- | --- | --- |
| `replace` / `append` call | 输入是 structurally valid supported built-in Check；operation input 是对应 `checkId` 的 closed patch；构造过程不执行 accessor getter。 | 不证明 Check tree 中的 id 唯一性、dependency reference、group inheritance、root cap 或完整 Project Definition 合法。 |
| `defineConfig` | 只提供 TypeScript 构造入口并返回 Project Definition value。 | 不执行完整 runtime validation，也不为任何 Check 盖章。 |
| Check tree normalization | 完整 closed Project Definition、所有 node variants、cross-node identity/dependency/cap constraints，以及 built-in canonical metadata/options。 | 不改变或修复非法输入，也不保存或解析 private execution binding。 |
| Package Run pre-work | 使用 normalization 已选的 built-in `checkId`，从 `run/built-ins.ts` 查找并构造 private runtime binding。 | 不改变 declarative validation 规则或修复非法输入。 |

helper 可以对非法输入抛出 `TypeError`；具体 message 不属于 public contract。完整 tree validation 仍须在任何 project work 前 fail closed，并保持 zero project-work side effects。

### Non-mutation and freeze boundary

产品契约要求：

- exported built-in values 在 TypeScript 中是 readonly data；
- `replace` / `append` 不修改输入、nested defaults 或 module-shared defaults；
- 每次 adjustment 返回新的普通数据。

实现可以 deep-freeze exported defaults 或返回值，也可以通过复制达到同一结果。`Object.isFrozen`、非法写入是否 throw、返回值是否 frozen 和 input 是否 frozen 都不是 public contract，也不得作为 parser acceptance condition。合法的 unfrozen plain copy 必须按同一结构规则处理。

### Implementation-local choices

- definition layer 只保留一套 built-in data contract：`built-in-data-model.ts` 表达判别联合，`built-ins.ts` 是唯一 metadata/defaults table、closed parser 与 constructor owner。逐 Check replacement algorithms、overload 形式以及 defaults/results 是否 runtime frozen，由最小实现和编码规范决定。
- `run/built-ins.ts` 是 runtime factory/lookup owner；公开数据 parser 不与它交换 binding。helper 与 tree parser 只能共用一个 built-in data validation source，避免漂移。
- error message 文本不进入 current public contract；tests 证明 error category、zero accessor-getter calls、zero project work 和 closed-input behavior。

## Risks / Trade-offs

- `replace` / `append` 会增加两个 public callable exports。只把它们称为“非执行操作”而不更新 exact export inventory，仍会让 decisions、current contract 和 package acceptance 互相矛盾。
- 移除 value-owned methods 是 current-source hard cut。由于 installable package 尚未发布，本 Change 不建立双 API compatibility layer；current consumers、examples、tests 和 downstream artifacts 必须在同一 Change 中迁移。
- structural acceptance 会接受满足 public contract 的普通 copies。安全边界由 plain-record snapshot、canonical metadata/options 和 pre-work validation 承接，而不是 origin identity。
- freeze 不再是公开契约后，调用方仍可能直接尝试修改其持有的对象。受支持路径依赖 readonly types 和 non-mutating helpers；implementation-local freeze 可以保留为防御，但不能成为 validity gate。
- `replace` / `append` 名称简洁但可能与应用代码同名；publication naming decision 和 exact-tarball declarations 必须在发布前证明导入与类型体验可接受。

## Open Questions

无。普通内置 Check、standalone `replace` / `append` 与 built-in-only scope 已成为当前事实；package surface 与 publication naming 的剩余对齐证据明确属于下游 `establish-api-only-npm-product-boundary` Change，不阻塞本 Change 验收。

# Design

本 Design 把 Project Definition 的 Check authoring 收敛为一个可组合树，同时保留既有 Product Core 的 flat Check catalog、private execution bindings 与 shared Task scheduler。

## Context

### Upstream Input and Authority

`adopt-typescript-project-definition` 已建立 Project Definition value、`defineConfig`、Package Run、closed Run Controls、caller-runtime project functions 与 shared Task-system handoff。本 Change 把这些当前事实当作前置输入；不修改其 Change artifacts，也不重写其完成状态、调用方向或授权边界。

当前 `ProjectDefinition.checks` 使用四组 authoring fields：`builtIn` 通过 ID 选择 Product definitions，`custom` 带有 definition/binding，`schedules` 逐项表达 dependencies，`selected` 再次表达执行选择。runtime 再把它们解析为 flat definitions、private bindings、schedule map 与 selected IDs。这个内部归一化目标有效，但四组字段不应继续成为项目作者的 API。

既有 `TaskDefinition` 提供可验证的 group 展开模型：group 含 children；父 `dependsOn` 与 `mutex` 追加到 children；group dependency 展开为其 descendant leaves；没有未满足 dependency 或命名资源冲突的 tasks 在全局 budget 内并行。Check、Record 与 Task 的身份不同，因此本 Change 复用这些规则，不把 Check tree 伪装成 TaskDefinition 或让 Task 进入输出。

### Stable Terms

| Term | Meaning in this Change |
| --- | --- |
| **built-in descriptor** | Package 直接导出的 frozen、non-callable Check authoring value，代表一个由 Product 私有 runtime 实现的 built-in Check。 |
| **custom leaf** | 项目定义的 executable Check leaf，带完整 public metadata、applicability 与 direct binding 或 static TaskPlan factory。 |
| **group** | 只用于 authoring 的 tree node；有 group `id` 和 child `checks`，不产生 CheckRun、Record 或 policy identity。 |
| **leaf** | 归一化后进入 flat catalog 的 built-in 或 custom Check；稳定身份仍是 `checkId`。 |
| **typed options** | 某个 built-in 明确拥有的完整语义 options；项目用普通 TypeScript object spread 继承/覆写，而不是运行时通用 deep merge。 |
| **resolved tree** | work 前已验证、flattened 的 leaves、selection、dependency/mutex metadata 与 private bindings。 |

## Goals / Non-Goals

### Goals

- 让使用项目直接组合三个 package-owned built-in descriptors 和 custom leaves。
- 用“叶存在即选择”的 tree 取代重复的 built-in catalog、selection 和 schedule authoring。
- 保持默认并发：数组位置无执行意义，`dependsOn` 和 `mutex` 是唯一显式约束，`scheduler.maxParallel` 是唯一 invocation-wide budget。
- 让 groups 具有 Task-like inheritance，但不泄漏为 Core、policy、Record 或 output identity。
- 让 built-in-specific defaults 可由 typed descriptor options 继承和局部覆写，同时不暴露 scanner command、arguments、exit mapping 或 private binding。
- 将 validated tree 单向映射到现有 flat Core 与 Task owners，避免第二套 scheduler 或 execution model。

### Non-Goals

- 把 group 当作可执行 Check，或使其拥有 `checkId`、CheckRun、Record type、policy reference 或 output row。
- 引入 `enabled`、`selected`、`parallel`、generic `options: Record<string, unknown>`、implicit sequence 或 runtime auto-merge。
- 允许项目 custom leaf 覆盖同名 built-in 的 metadata、private binding 或 operational dependency。
- 改变 `RunControls` 可覆盖的范围，或让 controls 注册/选择/改写 Check tree。
- 公开 Core、manager、scheduler、Task ports、scanner adapter 或任意额外 callable helper。

## Decisions

### 1. Public Authoring Uses One Check Tree

`defineConfig` 接受 `checks: readonly CheckNode[]`。根数组和每个 group 的 child 数组只表示集合与 authoring layout；数组顺序不表示 dependency、priority 或 serial execution。一个 leaf 出现在树中就进入 initial selection；不在树中的 built-in 不会被注册或执行。

因此 authoring contract 删除 `checks.builtIn`、`checks.custom`、`checks.schedules` 与 `checks.selected`。internal resolution 从 validated tree 派生 flat schedule/selection data，并只把它作为现有 Core boundary 的 private handoff；这不是 public compatibility contract，也不是第二份配置来源。

示意：

```ts
import {
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics
} from "vibe-check";

export default defineConfig({
  checks: [
    {
      id: "source-analysis",
      mutex: "native-scanner",
      checks: [
        duplicateDetection,
        {
          ...fileMetrics,
          options: {
            ...fileMetrics.options,
            codeLines: {
              ...fileMetrics.options.codeLines,
              absoluteFloor: 300
            }
          }
        },
        functionMetrics
      ]
    }
  ],
  scheduler: { maxParallel: 4 }
});
```

### 2. Built-ins Are Direct Frozen Non-Callable Descriptors

Package root exports exactly these built-in authoring values: `duplicateDetection`、`fileMetrics`、`functionMetrics`。每个值是 frozen non-callable descriptor，包含其 stable `checkId`、public `displayName`/record metadata、kind discriminant 和该 built-in 的 typed default options。

descriptor 不是 factory、builder、registry handle、scanner command 或 executable binding。Product runtime 在 validated resolved leaf 上按 canonical built-in identity 准备 private applicability/binding/reference-facts；项目不能以 object spread 改写 stable metadata、冒充 built-in 或替换 private runtime。允许组合的字段由 descriptor type 明确列出。

### 3. Leaf and Group Have Deliberately Different Shapes

`CheckNode` 是 `CheckGroup | BuiltInCheck | CustomCheck`：

- **CheckGroup**：required non-empty `checks` 和 group-only `id`；可携带 common scheduling metadata，不能带 Check definition、record types、options、applicability 或 binding。
- **BuiltInCheck**：canonical kind、stable `checkId`、Product-owned metadata 与 built-in-specific typed options；不能有 child `checks` 或 public execution function。
- **CustomCheck**：stable `checkId`、public metadata、applicability 与恰好一个 direct binding 或 static TaskPlan binding；不能有 child `checks`。它可以携带自己的 explicit typed domain fields，但不能覆盖 built-in identity。

group `id` 与 leaf `checkId` 共用 tree reference namespace 并全局唯一。`checkId` 继续是 Core、policy 和 output 的 stable Check identity；group ID 从不进入这些 surfaces。

### 4. Inheritance Is Explicit and Field-Specific

group 与 leaf 共同允许的 scheduling fields 只有 `dependsOn` 与 `mutex`。二者接受一个 ID 或 non-empty ID list；normalization 从 root 到 leaf 追加、去重并在 work 前验证。

- `dependsOn` 可以引用 leaf `checkId` 或 group `id`。引用 group 时展开为该 group 的全部 descendant leaves。未知 reference、self dependency、重复 identity 与展开后的 cycle 都失败。dependency 是顺序语义：目标 leaves 的 terminal availability 成立后，dependent Check 才可执行。
- `mutex` 是 named resource 约束。父和子 mutex 都传递给 descendant work tasks；同名 resource 的 Task work 不重叠。它不是“整个 Check 原子独占”承诺，也不定义数组顺序。
- 没有 `dependsOn`/`mutex` 的 leaves 默认并发；没有 `parallel` field。global budget 始终由 `scheduler.maxParallel` 定义。

没有“任意对象按层自动 merge”的规则。built-in options 的继承由 TypeScript object spread 显式表达；child 对 scalar/object field 的覆写行为是普通 JavaScript assignment，collection 的追加由作者显式 spread。未来只有在一个具体 owner 具有可验证的公共合并语义时，才可新增其 field-specific rule。

### 5. Built-in Options Move to Built-in Owners

当前 quality configuration 同时存放 project-wide scan/report data 与 duplicate/file/function-specific thresholds。为使内置 descriptor 真的可作为默认对象继承，built-in-specific configuration 和 defaults 移入对应 descriptor 的 typed `options` 及其 built-in owner validation；项目级 code areas、include/exclude/generated-file classification、report presentation 与跨 Check shared input 继续保留在 Project Definition 的 project-wide quality owner。

migration 只能保留已有 built-in semantic values、validation与结果含义。它不得把 scanner executable、raw flags、exit mapping、private parser configuration 或 environment snapshot 移入 options。Runtime 根据 resolved built-in leaf options 加上 project-wide quality input 生成现有 private built-in inputs。

### 6. Flattening Preserves Existing Runtime Responsibility

一个 dedicated tree normalization boundary 先验证 authoring nodes，再输出：

1. one flat `CheckDefinition` per leaf；
2. custom leaf applicability/binding map；
3. canonical built-in leaf identities；
4. resolved leaf dependencies，供 flat schedule/catalog 使用；
5. all leaf IDs as initial selection；
6. resolved inherited mutexes，供 orchestration handoff；
7. frozen declarative snapshot/fingerprint data，不含 functions、Task values、private ports、resolved executables 或 group-only layout that has no execution effect。

Check/Record Core 仍只接收 flat definitions 与 private bindings。existing schedule/selection resolver 可在 implementation 中消费 normalization output 或被等价的 flat validation 替代，但它不得重新要求项目作者复写 tree 已表达的资料。

Task orchestration 接收 resolved Check mutex：direct Check work 以及 custom TaskPlan 的 leaf work 都追加 inherited mutex；TaskPlan 的 local `dependsOn`/`mutex` 保留并与 Check-derived constraints组合。Task system 继续是唯一 shared scheduling owner。

### 7. Public Contract and Downstream Package Handoff Are Single-Source

current public-contract source 新增/确认三个 descriptor export names 与必要 public types，但保持 runtime callable exports 只有 `defineConfig` 与 Package Run。definition-facing docs、dogfood、package projection 和 downstream consumer fixture 必须从该 source 单向消费，不从 examples 重抄另一个 symbol list。

`establish-api-only-npm-product-boundary` 依赖本 Change 完成并归档后的 contract；它必须更新 upstream handoff、public export inventory、declarations 与 exact-tarball consumer evidence。它不重新设计 tree semantics。

## Risks / Trade-offs

- **从 parallel fields 改为约束图。** 作者不能用位置或 boolean 控制顺序；收益是所有并发/等待规则都可由 Task scheduler 验证和解释。
- **built-in options owner migration。** 迁移 quality fields 触及 validation、inputs、dogfood与 tests；必须保持结果语义，避免把 project-wide shared data复制进每个 descriptor。
- **descriptor composition 与 canonical identity。** 普通 object spread 便于继承，但 runtime 必须拒绝被改写的 built-in stable metadata，不能通过静默 canonicalization隐藏作者错误。
- **group flattening。** group 不出现在 output，减少可观察层级；作者需要用 leaf `checkId` 读取结果和 policy。group ID 只用于配置 dependency。
- **Check-level mutex handoff。** 继承 mutex 要追加到 direct work 与 TaskPlan leaves；遗漏其中任一类会违反同一资源约束。
- **public surface growth。** 三个 non-callable values 和 types 增加 package exports；current source、declarations、docs 与 exact-tarball verification 必须保持同一 inventory。

## Open Questions

无。以下方向已由当前用户确认：三个 frozen non-callable built-in descriptors；Task-like `checks` tree；叶出现即选择；默认并发且数组顺序无语义；group 仅 authoring/flatten；`dependsOn`/`mutex` 追加继承；typed built-in options 通过 ordinary TypeScript spread 覆写；custom/built-in 共树；Core 继续保持 flat catalog/private binding。实施中发现的具体 schema、diagnostic、module-path 或 test-case 问题按对应 owner 处理，不扩大为新的产品选择。

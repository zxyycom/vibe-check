# Design

本设计固定 V1 的配置、结果与 flag DSL，使实现可以沿“changed paths → protected flags → one effective selection”直接推进。

## Context

当前 Product 已拥有 caller flags、四种集合 mode、`propagateDependsOn` 与一次 private effective selection；缺少的是 selection 前的 change flag derivation。文件区域继续使用 [`ProjectFileSelection`](../../docs/guides/collecting-project-files.md) 已定义的 relative slash path、include/exclude、dot-path 和 exclude-first glob 语义，但 change detection 自己提供 candidates，不重新枚举 project files。

首个 consumer 是 Project Gate 的 `tests-product-runtime`。默认 required Run 只在 Product runtime 区域变化时选择它；显式 `--test` 或 `--all` 独立强制选择。该场景同时需要 `AND`、`OR` 和受保护的 change flag，足以检验 V1 DSL。

## Goals / Non-Goals

### Goals

1. Project author 只声明一次 comparison、flag ID 与文件区域。
2. Product 只获取并匹配一次 changed paths，所有 Check 复用同一冻结结果。
3. DSL 直接表达常用集合逻辑，同时保留当前 shorthand。
4. Selection fallback 与文件 evidence 分开：检测失败扩大运行，但不伪造 records。
5. 一个真实 Gate consumer 证明正确性与增量价值。

### Non-Goals

V1 提供一个 Git comparison view、一个 project root、region flags、file-centric callback records 和声明式 DSL。Rich diff、patch 内容、多个 comparison views、remote source、跨 Run cache 与 machine publication 留给具有独立 consumer 的后续 Change。

## Decisions

### Intended Change

#### 1. Project change configuration

`ProjectDefinition.changes` 使用以下语义形状；最终类型保持 closed、readonly，并接受同 shape 普通 value：

```ts
{
  source: {
    kind: "git",
    compareWith: "origin/main"
  },
  flags: {
    "product-runtime": {
      include: ["src/**"],
      exclude: []
    }
  }
}
```

`flags` 的 key 是非空 change flag ID。Product 生成 `vibe-check:change:<id>`；Definition 引用未知 ID 或 caller controls 提供该前缀时，在 author work 前失败。一个 path 可以命中多个 regions；每个 declaration 产生一个 flag，同名 key 由 record grammar 自然保持唯一。

Git source 将 `compareWith...HEAD` 的 committed delta 与当前 staged、unstaged、untracked paths 合并。新增和修改使用当前 path，删除使用旧 path，rename 的旧、新 path 都参与 region matching。Git revision、command、repository 或 path normalization 不能形成可信结果时返回 unavailable。

#### 2. Change result context

配置 `changes` 时，`execute` 的 `project.changes` 与 `prepare` 新增的 Product context 读取同一冻结 result：

```ts
type ProjectChanges =
  | Readonly<{
      ok: true;
      files: readonly Readonly<{
        path: string;
        flags: readonly string[];
      }>[];
    }>
  | Readonly<{
      ok: false;
      reason: Readonly<{ code: string }>;
    }>;
```

成功 records 只包含命中至少一个声明 region 的 changed paths。Records 按 path 排序，内部 flags 排序去重；可信零命中是 `{ ok: true, files: [] }`。失败分支没有 `files`；selection 单独把全部声明 change flags 视为 present。未配置 `changes` 时不提供该 context capability，也不运行 Git source。

`prepare` 保留 authored options 与 signal 两个现有参数，并追加一个只读 Product context 参数；现有二参数 callback 继续合法。Preparation 仍保持 task-local admission 时机，不成为第二次 change preparation。

#### 3. Flag DSL

`enabledByFlags` 接受当前 shorthand，或 `{ when, propagateDependsOn? }`。`when` 是 closed recursive value：

```ts
type FlagCondition =
  | Readonly<{ kind: "flag"; flag: string }>
  | Readonly<{
      kind: "all" | "any" | "none" | "not-all" | "exactly-one";
      conditions: readonly [FlagCondition, ...FlagCondition[]];
    }>
  | Readonly<{ kind: "not"; condition: FlagCondition }>;
```

集合节点要求非空、dense conditions。`all` 要求全部为真，`any` 要求至少一个为真，`none` 要求零个为真，`not-all` 要求至少一个为假，`exactly-one` 要求恰好一个为真；`not` 反转一个子表达式。Validator 对节点数量和深度使用统一有界限制，避免不受控递归；具体常量由相邻实现与测试共同拥有。

当前 `{ flags, mode, propagateDependsOn? }` 先保持既有的 token 去重与稳定排序，再降级到等价 DSL。Raw DSL normalization 冻结节点但保留每个集合节点的 child 顺序与 multiplicity，因此 `exactly-one(flag(a), flag(a))` 仍按两个 true children 求值为 false。Normalization 不去重 raw children，也不做交换、结合或其它代数重写；只有降级后结构完全相同的 shorthand 与 raw value 共享 canonical identity。

#### 4. Effective selection and Gate use

Caller flags 与 derived change flags 共同作为 evaluator input；`project.flags` 继续只表示 caller input，change evidence 从 `project.changes` 读取。Evaluator 只把最终 boolean 交给现有 effective selection；dependency propagation、control outcome、progress 和 aggregation 保持单一 owner。

首个 Gate expression 使用以下 raw DSL；builder 只构造同一结构，不建立第二种表达：

```ts
{
  when: {
    kind: "any",
    conditions: [
      {
        kind: "all",
        conditions: [
          { kind: "flag", flag: "project-gate:required" },
          { kind: "flag", flag: "vibe-check:change:product-runtime" }
        ]
      },
      { kind: "flag", flag: "project-gate:preset=test" },
      { kind: "flag", flag: "project-gate:all" }
    ]
  },
  propagateDependsOn: true
}
```

Change source unavailable 时 `vibe-check:change:product-runtime` 保守 present；`project.changes.ok` 仍为 false。`product-runtime` region 保守覆盖 `src/**`，与当前 lane resolver 对非 `src/package-checks/**` tests 的分区一起接受完整性验证；未来收窄 region 必须先证明所有 runtime lane tests 及其 Product upstream 仍被覆盖。

### Resulting Impacts

| Owner | Required change | Evidence |
| --- | --- | --- |
| Project Definition | `changes` 与 recursive DSL 的 validation、normalization、freeze、snapshot 和 fingerprint | authoring、invalid input、equivalent identity 与 bounds tests |
| Project Run | Git preparation、reserved Controls rejection、selection input 与 callback context | lifecycle、failure、cancellation、zero/multi-match tests |
| Check callbacks | `prepare` Product context 与 `execute.project.changes` | type inference、runtime identity 与 unavailable handling |
| Project Gate | `product-runtime` region、combined expression 与 force branches | definition、selection 与 bound Run tests |
| Public materials | exports、JSDoc、guides、examples、changelog 与 package acceptance | documentation validation 与 installed consumer tests |
| Test evidence | 新增和修改的语义 Case owner | ledger check 与最窄目标 tests |

## Risks / Trade-offs

- `vibe-check:change:` 成为新的保留 namespace；Controls 通过早期诊断避免把旧自定义 token 静默解释为 Product fact。
- Git unavailable 会扩大选择并增加运行时间，这是防止漏检的安全退化；`ProjectChanges` 保留真实 evidence 状态。
- 递归 DSL 提高表达力，也增加 authoring surface；closed nodes、非空 children 与统一 bounds 限制复杂度。
- Region 配置决定选择完整性；Gate 对共享 runtime paths 使用保守 include，并以 unavailable/full branches 保留恢复路径。

## Open Questions

无。实现中的字段拆分、helper 名称、递归 bounds 常量和 Git 命令编排由本 Plan 的对应 owner 在不改变上述公共语义的前提下确定。

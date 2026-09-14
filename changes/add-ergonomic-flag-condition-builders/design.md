# Design

本设计把便利输入限制在 authoring 边缘；内部事实仍是现有 closed recursive AST。

## Context

`CheckFlagCondition` 当前是 object-only recursive AST，Definition parser 负责 validation、bounds、freeze 与 canonical identity。Project Gate 和公开示例必须展开每个 flag atom。change flag 与普通 flag 共用 evaluator，仅完整 token 的构造来源不同。

## Goals / Non-Goals

### Goals

1. 让常见 TypeScript 组合以字符串和直接函数表达。
2. 保持 raw AST 的序列化能力与单一 normalization owner。
3. 让普通 flag 和 change flag 共用同一个 atom 输入。

### Non-Goals

本 Change 不新增求值节点、implicit operator、第二种 fingerprint、builder namespace、`flag()`、模板解析或 expression string language。

## Decisions

### Intended Change

`CheckFlagConditionInput` 是字符串或递归 AST input；normalized `CheckFlagCondition` 继续只包含 object nodes。Definition 在每层把非空字符串转换成 flag node，再执行现有深度 16、节点 256、closed-key、顺序和 multiplicity 规则。

直接导出的 builder 接受非空 rest tuple：

```ts
all(...conditions)
any(...conditions)
none(...conditions)
notAll(...conditions)
exactlyOne(...conditions)
not(condition)
changeFlag(id)
```

六个逻辑 builder 只构造 operator authoring node，原样保留字符串和 raw child，不遍历或把字符串 child 转成 flag node；Definition 是唯一执行 validation、字符串 normalization 与 canonicalization 的 owner。`changeFlag` 只拼接受保护 token，并保留 const generic literal return type。单 atom 直接写入 `when`，不需要 `flag()`。

Project Gate 使用：

```ts
when: any(
  all("project-gate:required", changeFlag("product-runtime")),
  "project-gate:preset=test",
  "project-gate:all"
)
```

### Resulting Impacts

| Owner | Required change | Evidence |
| --- | --- | --- |
| Check API | input union、builders、literal change token | type tests 与 public inventory |
| Definition | recursive string normalization 与 canonical identity | validation/fingerprint tests |
| Gate | raw object 改为直接 builder consumer | definition与 bound Run tests |
| Public materials | builder-first example、raw AST secondary说明 | docs projection 与 installed execution |
| Test evidence | 新增/修改实体的 Case mapping | ledger check |

## Risks / Trade-offs

- `all`、`any` 等直接导出名可能与使用方局部名称相同；ESM alias 已提供局部解决方式，不为所有用户增加 namespace 层级。
- builder 接受并保留字符串 atom，但不解释它；Definition 保持唯一 validation、字符串 normalization 与 canonicalization owner。

## Open Questions

无。函数命名、输入分层与 compatibility 已由当前请求固定。

# Design

本设计用计划退出和逐 Check 交接代替共享 file-policy 实现，不触碰当前 Product runtime。

## Context

当前 `ProjectDefinition.quality` 只有 `codeAreas`、`excludeDirs`、`generatedFiles` 与 `include`，Check callback 通过 `context.project.files` 读取同一全局 scope。`docs/configuration.md` 明确 Product 没有 shared selection layer，`use-check-owned-file-overrides.md` 要求文件级差异留在 producing Check 的 closed options。仓库中也没有旧计划描述的 shared policy schema、resolver、provenance 或 `explain-config` 入口。

## Goals / Non-Goals

**Goals**

- 让所有 active Check plans 使用当前 ordinary Check/options/scope 边界。
- 闭合旧共享方案的导航与依赖引用，使其不再阻塞首版实现。
- 保持 future per-Check file selection 可以独立演进。

**Non-Goals**

- 不新增共享 glob、patch、merge、provenance、cache projection 或解释器。
- 不在本 Change 中替任何具体 Check 选择 include/exclude grammar。
- 不归档或删除 Change；归档仍需当前任务的明确授权。

## Decisions

### Intended Change

1. **以当前 owner 为准。** 全局 inventory 继续由 `ProjectDefinition.quality` 和 Scan Scope 形成；本 Change 不修改代码。
2. **局部差异由 owning Check 承担。** 只有真实 Check consumer 需要时，才在该 Check 的完整 options、validation、execution 与文档中定义匹配和 precedence。
3. **没有跨 Check merge contract。** 相似的 include/exclude helper 只能作为实现复用，不能自动升级为所有 Checks 必须使用的公共配置层。
4. **以 artifact 交接完成本 Change。** 逐项重写依赖它的 active plans、portfolio 与 release route 后，本 Change 的实施结果即已成立；后续只等待验证与归档授权。

### Resulting Impacts

- 首版四项离线 Check 可以直接在现有 global scope 上工作，并按需拥有自己的 options。
- Network、secret、path 与 Lizard 等后置 Change 恢复时必须重新审阅本地 eligibility，而不能重新引用旧 shared resolver。

## Risks / Trade-offs

- 不共享 public grammar 可能产生少量重复；在没有稳定共同消费者前，这比错误耦合所有 Checks 更可逆。
- 旧 Change 名称仍保留到归档；Portfolio 必须明确它现在是退出计划，避免名称反向暗示待实现 feature。

## Open Questions

无。

## Implementation Observations

2026-08-24 复核确认当前代码和稳定 owner 已符合目标；本 Change 的唯一剩余工作是同步所有 active artifacts、运行验证并等待单独归档授权。

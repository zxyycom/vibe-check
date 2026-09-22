# Design

先用真实 corpus 确认材料变化事实，再把它投影到 Gate eligibility；Product 继续拥有 change preparation、effective flags 和 dependency closure。

## Context

- `definition.ts` 当前声明 `product-runtime: src/**`；`eligibility.ts` 已将 required、focused preset 和 all 投影为 public flag conditions。
- `controls.ts` 已将 focused argv 映射为 `project-gate:preset=<name>`，本 Change 不增加 argv translator。
- Product 一次准备 committed、staged、unstaged、untracked、rename 和 deletion evidence；可信零命中与 unavailable 分开表达。
- P0-0 先冻结 `materials` preset、Check identity、输入清单和 mutex；P0-1 只消费这份事实。

## Goals / Non-Goals

- 采用第二类 `repository-material` region，并用真实项目 corpus 证明选择结果。
- 让 region facts、effective flags、callback context、dependency closure 和 aggregate 来自同一 Product Run。
- 把增量条件集中在 Gate manifest/eligibility owner，保持 Check owner 不解析 Git diff。
- 保持 Product parser、Git acquisition、public DSL 和 aggregation contract 不变；Markdown lint、cache 和 `--only` 另行处理。

## Decisions

### Intended Change

1. 以 P0-0 的材料输入清单为 region 候选，覆盖实际影响材料验收的 docs、changes、schemas/examples、validator/provider、package/config 文件；最终 glob 与 exclude 由 corpus 冻结，优先避免漏检。
2. 为每个材料 Check 标注两项事实：输入是否完全由 region 覆盖，以及是否存在 region 外的反向依赖。只有输入闭合且没有未建模反向依赖的 Check 才进入默认增量选择；links 等需要全仓反向关系的 Check 维持全量 membership，直到有证据支持更细策略。
3. 材料 preset 和 all 是显式全量路径；required 的增量条件只影响直接 root，`propagateDependsOn: true` 仍由 Product 处理依赖。focused `materials`、focused `quality` 和组合 preset 继续表达 caller intent，不复制 closure。
4. 使用现有条件组合表达选择：`any(all(PROJECT_GATE_REQUIRED_FLAG, changeFlag("repository-material")), projectGatePresetFlag("materials"), PROJECT_GATE_ALL_FLAG)`；只有真实矩阵需要时才增加其它 operator。
5. 在隔离 Git fixture 中覆盖 changed、unchanged、zero-match、overlap、rename、delete、staged/unstaged/untracked、missing comparison ref、非 Git root 和 region 外 link target deletion，并核对 effective flags、not-applicable、callback 与 dependency facts。

### Resulting Impacts

- 修改 Project Definition、eligibility、相邻 tests、Project Gate 文档和 Test Evidence Cases；catalog/controls 只在材料 preset 名称变化处更新。
- 默认 required 的材料执行量会减少，但全量入口和 unavailable 回退提供完整验收路径；未选择的 Check 仍保留 Product 的 not-applicable fact。
- region 边界和反向依赖判断成为当前项目事实，后续 Markdown lint 只能复用它们，不能另建路径词汇。
- 性能只记录 workload 变化，不以单次耗时推断收益；任何扩宽/收窄 region 都需要新的 corpus 证据。

## Risks / Trade-offs

- 保守 region 可能保留部分误触发，但避免材料遗漏。
- Git unavailable 会增加执行量，换取失败可见性和安全回退。
- links 的全量执行成本较高，但反向依赖未建模前不能用局部路径推断安全跳过。

## Open Questions

实施前需从 P0-0 结果确认可增量 Check 清单、region glob/exclude 和 links 的反向依赖证据；这些是 readiness 证据，不要求额外用户决策。

# Design

设计以 area policy map 作为 files 与 codeLines 的单一事实源，以 constructor materialization 分离 authored input 与 resolved Check options，并让 SCC adapter 独占可验证的 CLI protocol。

## Context

`fileMetrics` 是普通 package-provided Check，当前通过完整 default value 和 nested object spread 定制。现有 validator 只检查 threshold 是 finite number，空 code-area map 也合法；Record conversion 对未知 area 直接跳过，且 generated files 在 collection 中先被排除，使部分 classification policy 没有实际语义。活动决策要求 Check options 拥有 execution dependency，但不要求公开 adapter protocol。

## Goals / Non-Goals

目标是支持按稳定 area ID 为不同文件集合声明不同 code-line policy、明确重叠语义、关闭非法配置与静默丢弃，并把 SCC CLI 参数收回 adapter。非目标是建立通用 rule engine、ordered precedence、共享 scanner registry、为 Lizard 同步迁移、公开 SCC tuning，或改变 project-file collection 的共同机制。

## Decisions

### Intended Change

- `fileMetrics(options?)` 返回固定身份、preflight、execution 和完整 resolved options 的普通 Check；input 只允许可省略的 `{ codeAreas, scanner }`。
- resolved options 恰为 `{ codeAreas, scanner }`。每个 resolved area 恰为 `{ files, codeLines }`；files 使用现有完整 selection，codeLines 使用 `{ maximum, lowDecisionTokenAllowance: { maximumCodeLines, maximumDecisionTokens } }`。
- 省略 codeAreas 时建立默认 project area；显式 map 必须非空，每个 area 必须声明 files branch。files 的三个 lists、整个 codeLines 及其局部字段可以省略并使用 package defaults。
- maximum 与 allowance values 使用安全整数；code-line maxima 必须为正，decision-token maximum 允许非负，显式 allowance maximum 必须严格大于普通 maximum。
- 每个 area 独立收集 exact paths，measurement 输入是稳定排序的去重并集，同时保留 path 到全部 area IDs 的 membership。scanner 对 union 只执行一次。
- Record conversion 为每个 area 计算该 measurement 的有效上限，并选择最小值；路径超过该值时产生一条以 path 为 ID、保存稳定排序 `codeAreas`、`codeLines`、`limit`、metric 与 path 的 Record。
- public scanner 恰为 `{ executable }`。availability 固定传 `--version`，scan 固定传 `--by-file --format csv` 与 exact paths；test fixtures 使用直接可执行 wrapper，不通过 public prefix args。

### Resulting Impacts

- `FileMetricsOptions` 变为 authored constructor input，并新增 private resolved types/resolution helper；public inventory 名称不变但 declaration shape hard cut。
- execution/measurement 需要从 area collection 建立 union 与 membership，Record 不再调用旧 code-area classifier；project-file shared collection 保持不变。
- repository dogfood 的 `metricCodeAreas` 不能继续复用于 file/function metrics：file metrics 建立 area-owned policy，function metrics 暂时保留现状。
- package Check guide、configuration/scanner/scope owners、README-facing inventory与 candidate type fixture 必须从 default value 语法切换到 constructor。
- 修改的测试保持现有 file-metrics scanner Case，并把 constructor、area policy、重叠 policy 与 adapter argument ownership写入当前 Case 证明；只有出现独立 owner/result 时才新增 Case。

## Risks / Trade-offs

area 独立 collection 会重复收集候选，但 SCC scope 会去重且只运行一次；最严格策略避免重叠区域因较宽阈值漏报，但较宽 area 的 policy 不单独产生第二条 finding。hard cut 会影响当前 `fileMetrics` value consumers，但 package 仍处于 prestable，且不维护旧 shape。默认 `scc` 仍依赖调用环境提供 command，本 Change 不改变安装分发策略。

## Open Questions

无。用户已确认采用 area ID 到 `{ files, codeLines }` 的 map、允许不同文件策略，并接受重叠区域按最严格有效上限结算；scanner 采用 executable-only 方向。

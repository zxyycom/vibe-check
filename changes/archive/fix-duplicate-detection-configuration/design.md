# Design

设计以 defaulted specialized constructor、area-owned scope/threshold policy、一个 exact-scope jscpd measurement 和 adapter-owned command protocol 取代多层 object spread、分散配置、marker 与 per-area subprocess 模型。

## Context

`duplicateDetection` 是普通 package-provided Check，按 active decisions 通过完整 options 拥有执行依赖并由自身 execution 消费。实施前的 adapter 使用 jscpd 5.0.11，并为每个 code area 生成独立临时配置；当时 runtime options validator 与 measurement 对 token 阈值的合法集合不一致，手写指南还遗漏 `cache`。这些内容是本 Change 的形成时问题，不描述实施后的稳定行为。

## Goals / Non-Goals

目标是让构造函数补齐 package-owned defaults、让一个 area 自己拥有输入与阈值、让 adapter 独占 jscpd 参数，并修复配置有效性、阈值边界、并发语义以及跨 area/重叠 area coverage。非目标是建立 generic Check derivation/patch grammar、Product-wide scanner registry、Run Controls override、任意 backend abstraction、跨 Check 共享 file policy，或公开 jscpd mode/format 等额外能力。

## Decisions

### Intended Change

- `duplicateDetection(options?)` 是 specialized constructor，返回固定身份、preflight、execution 和完整 resolved options 的普通 Check。无参时使用全部默认值；input 只允许可省略的 `{ cache, codeAreas, scanner }` branches，不建立 generic deep patch API。
- public `scanner.command` 使用 `{ kind: "package" } | { kind: "custom", executable }`，不公开 workers。默认 package command 由 adapter 解析 installed jscpd bin；custom command 的 scan arguments 和 availability `--version` 全由 adapter 固定，worker policy 沿用 jscpd auto。
- repository dependency/lockfile 固定实际测试基线 `5.0.11`，发布 candidate 声明 `^5.0.11`；candidate install 验证实际解析版本满足范围，external consumer 再执行真实 Run。version probe 只形成 availability/cache provenance，不执行精确 runtime version gate。
- 删除 per-area `maxConcurrency`。adapter 对全部 approved exact paths 只运行一次，依赖 jscpd 自身 worker policy。
- resolved Check options 恰为 `{ cache, codeAreas, scanner }`。constructor 省略 `codeAreas` 时建立默认 `project` area；显式 `codeAreas` 必须非空，每个 area 必须提供 `files` branch，并可省略由 package 补齐的 file lists、`minimumLines: 3` 与 `minimumTokens: 75`。
- 每个 area 独立收集自己的文件，完整 scanner scope 是所有 area paths 的去重并集；同一路径可由多个 area 选择，不存在隐式 `unknown` area 或顶层 default/override 回退。
- scanner 以所有实际输入 area 的最小 line/token 阈值运行，返回结果按路径恢复全部匹配 areas；finding 的 line count 与 token count 必须分别达到所有涉及 area 对应阈值的最大值。
- cache 保存通过 exact-input 校验的 raw scanner fragments；code-area annotation 和阈值过滤在 cache hit/miss 后统一执行。只有 effective scanner arguments（包括 scanner 下界）保持相同时，raw scan 才可在当前 area policy 下复用。

### Resulting Impacts

- constructor input/resolution、public inventory、scanner options、cache key/payload tests、direct-executable fake fixtures、repository dogfood Definition 和 package docs 都需同步 hard cut。
- code-area membership 或严格阈值变化不应污染可复用 raw cache；exact-input union fingerprint 和 scanner-effective minimums 必须进入 cache identity，area annotation/filtering 保持 cache 后处理。
- 新增 area-owned、跨 area 与重叠 area 可观察行为测试，并更新现有 scanner/cache Case 的 Owner/Proves；修改测试前后的完整 Test Evidence wrapper 必须通过。
- 既有 active decision 要求 execution dependency 仍留在 Check options；本 Change 不把 command 移入全局或 Run Controls。

## Risks / Trade-offs

一次全 scope 扫描可能比多个小 area scan 使用更大峰值内存，但避免多进程乘法和跨 area 漏检；worker 数固定由 jscpd auto policy 决定，不建立未被真实 budget 或 profiling data 支持的 public tuning。独立 area selection 可能重复收集候选，但 scanner scope 会去重；使用最严格 area 阈值会保守地避免较低阈值泄漏到更宽松或重叠 area，但可能少报只对其中一个 area 有价值的 clone。同 major scanner 升级可能改变少量启发式 findings；本产品接受该演进，以失败闭合、cache version isolation 和实际 consumer Run 保持门禁可信。prestable hard cut 不提供旧 shape compatibility reader。

## Open Questions

无。用户已明确授权归档旧 duplicate code-area 决策，并进一步确认 defaulted constructor 与 adapter-owned arguments 方向；是否将 jscpd mode、format 或 max-size 公开仍留待真实消费者需求。

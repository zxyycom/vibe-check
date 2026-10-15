# Design

仅在已经证明的 literal 子语言内降成本，其余 selection 继续交给 native matcher。

## Context

`src/package-checks/project-files/filesystem-collection.ts` 已有 narrow ASCII safe-literal 集合；`collection.ts` 最终批次仍 native。`docs/development/project-files.md` 拥有 operation-local 获取和 no-follow/error policy，公开语义由 collecting guide 拥有。

## Goals / Non-Goals

减少重复 membership 与 prefix array 工作；不改 glob grammar、native fallback、默认层、symlink、byte identity、获取策略和有效输入上限。

## Decisions

### Intended Change

将狭义 literal 判定和 membership 放入共同 config-glob owner，在完整 batch 使用相同证明。必须保持 native batch 的 pattern 顺序和去重，而非未经核对直接按 candidate 顺序 filter。prefix 用 slash offset，所有 policies 共享同一 prefix 构造；每 policy 只要一个 ancestor exclusion 匹配即完成。

### Resulting Impacts

literal-only 分支需直接对照 pinned micromatch 的 batch 返回值；过长 pattern 继续 fallback 保留原生异常和获取错误 cause。default 仍独立减法。深 prefix 字符本身的总长度不声称线性。

## Risks / Trade-offs

safe-literal 判定的字符扫描不可省；新 Set 分配对小列表有常数开销，但不引入全局缓存。复杂列表不采用逐项 OR，避免 negation 与 extglob 语义损失。

## Open Questions

无。采用范围限于下述已验证的字面路径子语言。

## Implementation Observations

### 采用范围与操作量

共同 safe-literal 判定用于获取和最终 batch；batch 仅在全部 candidates 为 normalized project-relative paths 时，
按 pattern 首现顺序输出交集。复杂语法、异常路径和超长 patterns 沿原生 fallback，默认层独立减法。
K02 使用按需生成的 slash-offset 前缀并保留 policy/matcher 顺序及短路。未采用逐 prefix 遍历所有 pending policies：
首个 policy 无匹配时，它会增加原 every 短路之外的 matcher 工作。复杂负/brace/extglob 列表继续由完整 matcher 解释，
索引限于本次调用，获取策略、字节身份、原生异常与输入上限保持。

基线与实施后的计数脚本/JSON 位于 `tmp/optimization-implementation-20261015/definition/operation-counts.{ts,json}`：

| 输入 | 基线 → 实施后 | 信号 |
| --- | --- | --- |
| literal F=P 16 / 64 / 128 | 240/4032/16256 → 0 | native literal RegExp exec |
| 深目录 D 8 / 16 / 24 | 375/2091/6175 → 0 | adapter 复制的 prefix segment slots |

literal 仍承担 pattern/candidate 字节识别和集合工作；目录数字包含祖先验证的重复需求，不能解释为单次 predicate
阶数或前缀字符/matcher 成本消失。该计数未测 timing、heap 或完整端到端收益。

### 测试与有限计时

下述计时保存前轮实施后的采样观察，不是本轮表达整理后源码的逐字节复测。

目标批次 54/54（21 files）通过，覆盖 byte collision、必要 I/O、symlink、默认排除、混合/负规则/重新包含、
Core region 与真实 Git region。新增实体复用既有 scan-scope Cases。collection fixture、native corpus 与宿主计数观测
移入相邻 `collection.test-support.ts`；原测试从 341 codeLines 收敛至 SCC 295，support 73，保留全部断言、
test names 和 Case 映射。两目标文件 13/13 tests、局部 lint/format 与完整 Test Evidence 通过。

相同输入 literal2048 的 median 为 Node 275.012→65.947ms、Bun 314.683→94.981ms；Node 小 literal/glob
存在几毫秒级代价。完整不利组及采样条件见 `tmp/optimization-implementation-20261015/performance/`，
不据此推断所有规模加速。

### 既有实施验收（2026-10-15）

文档整理前的实施快照已通过 Product/scripts typecheck、lint、validate、format、diff check 和完整 Test Evidence
（732 entities / 181 Cases），并经非实施代理复核。候选 `0.0.0-local.bf3c39c46928` 的 required Gate 为
37 passed / 6 not-applicable，complete Gate 为 43/43 passed，包含包产物与外部 consumer 验收。
原始日志与集成边界见 `tmp/optimization-implementation-20261015/integration.md`；这些结果只证明当时输入，
后续改动须重新选择相应验证。本 Plan 保留，提交、发布与结项删除分别依当前任务授权。

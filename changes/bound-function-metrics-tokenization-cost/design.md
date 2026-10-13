# Design

以保守成本筛选保留普通输入的原生 tokenizer，只在完整 source 的确定不可闭合尾部省略对应分支。

## Context

公开、私有及来源 owner 见 proposal。v1/v2 因合法 Node 成本回退被拒，v3 因 arbitrary addition 反例未采用；最终对象为 `candidate-v3.1.patch`。支持 host 是 Node，Bun 为工具及独立参考。采用条件和完整原始证据归[Decision](../../docs/decisions/bound-unclosable-tokenizer-tail-cost.md)与[调查报告](../../docs/investigations/evaluate-bounded-tokenizer-optimization.md)，本设计只保存实现及验收义务。

## Goals / Non-Goals

保持完整 token、UTF-16 offset/LF line、full-source anchors、capture/Unicode 零宽、macro/factory、模板 split、reader/processor/extension、whole-input 错误和取消语义。实现覆盖已测纯/普通前缀尾部；固定模板 regex、依赖、引擎、来源 baseline、公开配置、timeout 和等待 Worker exit 的策略保持现状。

## Decisions

### Intended Change

1. 首次消费仍构造 original regex。只有规范化 addition 为空或 `startsWith("|")` 时允许防护，其它 arbitrary addition 保守保留原生路径，不建立 regex parser。
2. comment 风险为 `lastOpen >= 0 && lastOpen > lastClose - 2`；template 风险要求固定分支存在、最后反引号存在且后面含原始 `${`。两者都不是语法判断，quoted/escaped delimiter 可保守误触发。
3. 无风险输入使用原生 loop；风险路径仍 full-source `matchAll`。游标越过最后 comment 可能起点，或恰好抵达最后反引号时，惰性构造省略对应分支的 regex。完整 token 已跨过最后反引号时不另行切换。
4. TS/TSX 通过第四私有参数传固定模板，保持原 addition 位置和 normalization。nested generator 使用 `RegExpExecArray`；生产所需 boolean 注解只影响类型，不改变运行逻辑。

### Resulting Impacts

- 三个既有测试正文以独立 baseline 期望验证 raw/final tokens、prefix/空白/tail、factory/throw/return/zero-width，保持原 Case 目的；没有 wall-clock 测试预算。
- 三份内部说明记录与 upstream 的非机械等价差异及同步复审条件。source identity JSON 复核后保持，原始 oracle/provenance/hash 不改。
- 最终长输入证明独立于较短的 751 行矩阵。Node 四形状 before/candidate 全部 raw/factory/final/adapter 深等；Bun candidate 也同 Node baseline，但两个模板的旧 Bun 输出不同，原因未知。
- 生产三个模块与已测候选通过类型擦除后 JS AST/叶 token 等价核对。历史源码、raw 和当前整理后的辅助代码分开保存，避免把新字节归给旧样本。

## Risks / Trade-offs

最终合法 Node corpus 首轮 +3.218%、确认 +0.669%、合并 +1.620%；该有限小幅成本作为明确取舍保留，不能因区间重叠称零损失。Bun 合法成本仅每侧两样本，旧 v3 dispatch 计数不作为 v3.1 新测量。

最后 delimiter 之前复杂或被其它 token 吞掉的路径、无原始 `${` 的模板尾部及非独立 addition 继续原 matcher，不保证所有 malformed 成本。各原语或 `(?!)` 的成本没有独立量化，physical-exit 延迟也不能说明返回后 CPU。

## Open Questions

无未决设计或采用问题。真实来源、工程/材料、Case、独立审查和同 candidate required/complete Gate 已闭合，Decision 已 aligned。生产 Bun 113/113 通过；额外 Node 109/113，同四 public Worker null-prototype/plain-object 断言失败在 before 复现，失败点后断言未执行，作为已知证据边界保留。

Plan 保留供交接；结项删除按独立授权与 `finalize` 流程执行。详细数值、Gate 首次容量失败和最终非阻断告警由报告保存。

---
title: "函数指标未闭合输入的有界识别优化验证"
id: "261012-evaluate-bounded-tokenizer-optimization"
formedAt: "2026-10-12T14:41:46Z"
question: "未闭合模板与注释在支持运行时及取消边界上如何退化，最小私有识别修补能否保持完整分析语义并消除异常增长？"
tags:
  - "cancellation"
  - "function-metrics"
  - "performance"
  - "source-alignment"
relations:
  - type: "补充"
    target: "261012-audit-function-metrics-pathological-input-cost"
    summary: "补充Node与退出证据并验证有界修补"
---

## 形成时背景

前序调查在 Bun 上观察到未闭合 TS 模板与 C 注释的成本增长。本轮于 2026-10-12 从 HEAD `08c9166b85152168ca27d45452a4174afed50e57` 出发，验证用户同意的私有、行为等价局部改写，以支持的 Node 24.18.0 为主基线，Bun 1.3.14 为独立参考。

最终采用 **v3.1**：支持 Node 的四个目标长输入完整 token/factory/adapter 深等，纯 N24 模板 raw-reader 耗时 1284.868→1.347 ms；合法 Node corpus 合并中位数增加 **1.620%**，作为已披露的取舍接受。Bun 旧 N24 模板输出与候选不同，原因未知，不属于双运行时等价加速证明。生产、来源说明与完整 Gate 已完成；额外 Node 源测试集合的四项既有断言失败仍保留。

## 调查目的

区分不可能闭合分支的重复扫描与必要 token 工作，覆盖纯构造及“普通闭合前缀 + 未闭合尾部”。采用条件是完整分析语义和局部收益，而非仅 metrics 相等或取消更早。固定 Lizard revision、依赖、引擎、默认 timeout 和 Worker 取消返回协议保持现有契约。

## 调查范围与依据

| 对象 | 方法与覆盖 |
| --- | --- |
| 行为 owner | [Scanner dependencies](../development/scanner-dependencies.md)、[来源映射](../tooling/source-mapping.md)、[宿主原语方向](../decisions/permit-evidence-backed-host-primitive-optimization-in-lizard-port.md)；CodeGraph/源码核对 shared CodeReader、TS/TSX、27-reader registry、adapter 和 Worker |
| 冻结输入 | 526 文件、2,417,957 bytes；旧报告仅提供路径 membership，本轮重新冻结文本/hash。before 为 348 模块快照，候选仅变三个 tokenizer/reader 模块 |
| 有限完整差分 | 每候选/每运行时 751 行：115 synthetic/edge、110 selected-extension normal/edge/malformed fixtures、526 corpus；deepEqual factory text/UTF-16 offset/LF line、final reader stream，以及有 filename 时的整个 adapter result；另有 16 组 zero-width/Unicode/factory 矩阵 |
| 最终额外语义 | v3.1 每运行时 82 项共享 CodeReader lifecycle、66 项 leading-addition 对照；Node 四个长输入另存全量 factory/final stream/adapter 对象；候选 Node analyzer behavior 84 项通过 |
| 合法成本 | 每个独立子进程 warm 一次，仅 timed 第二次 adapter 分析；import、读文件和 Product Run 在外；AB/BA，外层 15 秒 deadline |
| 病理成本与退出 | raw-reader、公开 Run、生产 settlement + diagnostic Worker transport 三个重叠层分别观察；Run/port 的 1 秒 signal 仅用于诊断。最终 48 行各格一次，6 秒外层 deadline、return 后 3 秒 physical-exit 观察窗 |

v1 较大矩阵为每运行时 144 行，模板 N=16/20/24、注释 N=2000/8000/16000、前缀有/无，每格两个新进程；v2/v3/v3.1 各缩为 48 行确认。模板 N24 纯输入为 97 bytes，C 最大输入为 48,000 bytes。差分的合成模板最大 N16，因此长输入证明另行取得，不能由 751 行覆盖直接外推。

完整 manifest、patch、raw、harness 和来源身份按“随附资源”查询。[生命周期说明](./_resources/261012-evaluate-bounded-tokenizer-optimization/lifecycle-note.md)区分阅读材料与重跑准备。原始数据去重仅合并重复 versions；无效行、失败、取消、次序及数值保留。旧 harness 的文件时间不是精确采样 UTC 起止；v3 起逐行保存时点。

## 调查结果与边界

### 最终机制与等价条件

共享 comment 分支及 TS/TSX 固定模板分支在特定未闭合尾部反复尝试。最终实现只筛选这一成本风险：

1. 规范化 addition 为空或以 `|` 起始时，才允许整个防护路径；其它 addition 沿原生路径，保留拼接量词等语义。
2. comment 风险由 `lastOpen >= 0 && lastOpen > lastClose - 2` 保守识别；模板风险要求存在固定模板分支、最后反引号及其后的原始 `${`。这些是成本筛选，不是语法或 delimiter 奇偶性判断。
3. 无风险输入继续原生 loop；有风险时仍在完整 source 上使用 native `matchAll`。游标越过最后 comment 可起始位置，或恰好抵达最后反引号时，才惰性省略确定无法闭合的对应分支。完整模板 token 已跨过最后反引号时不额外构造 pattern。
4. 原 regex 在首次消费时仍先编译，保留非法 addition 的错误/惰性边界。分支优先级、normalization、UTF-16 offset、source-start anchors、Unicode 零宽推进、macro/factory、模板 split 和 processor/extension 生命周期继续原路径。

这是三个私有模块的有界成本防护。最后 delimiter 之前的复杂或被其它 token 吞掉的路径、无原始 `${` 的模板尾部及非独立 addition 仍可能昂贵；本轮没有任意 malformed 线性上界、所有引擎一致性或普通项目整体加速结论。

### 探索转折与拒绝依据

| 阶段 | 观察 | 判断与后续 |
| --- | --- | --- |
| v1：逐 token `exec` | 有限完整差分通过；Node 合法 corpus 341.15→370.07 ms（+8.48%，每侧 8 样本） | 拒绝采用。病理输入收益不能抵消合法语料明显回退 |
| v2：native `matchAll` | 有限差分通过；Node 344.98→371.97 ms（+7.82%，每侧 8 样本） | 同样拒绝。Bun 小幅改善不替代主运行时验收 |
| v3：风险筛选 | Node 合法 corpus 342.14→341.10 ms（-0.30%）；独立诊断 526 调用中 517 原生、9 防护 | 支持继续审计，但不能称稳定加速；随后发现 arbitrary addition 反例，未采用 |
| v3.1：独立 addition 资格 | 每运行时 66 项对照中 before/v3.1 深等，旧 v3 各有 20 项不同 | 修复了 `source="/**"`、addition `?` 等量化前一分支的情况；错误探针只比较 name，未证明精确 message/cause |

v1/v2 共同增加预扫描、pattern 构造及逐 token 监测，v3 收窄至风险输入；静态工作量支持这一解释，但未独立量化各原语、`(?!)` 或引擎优化路径的成本，不能把候选差值直接拆成归因。

三次证据纠正保留了无效材料及边界：

- 首次合法语料只冻 hash、未冻文本，并行 Run 修改导致 31 行被 hash 拒绝；剩余单个 baseline 不成 A/B。随后恢复全部原文本和 before 模块，正式对照使用固定副本。
- 最初 v3.1 lifecycle harness 仍指向 v3，原输出标为 rejected；显式绑定 candidate-v3.1 后重跑 82 项。它证明共享 CodeReader 的 factory/partial consumption/throw/宏，不直接证明 TS/TSX split。
- v3 controller 的顶层 startedAt 被同名变量覆盖，窗口应取首/末行 UTC。v3.1 逐时点复核确认一次 Decision CLI 与有效合法/tail 样本未重叠；确认轮单列，未用后轮覆盖首轮。

### 支持 Node 的完整长输入与 Bun 差异

独立审查发现 Bun N24 模板旧路径正常退出且不抛错，却在纯输入返回 0 token、前缀输入返回 30；候选分别为 97/127。该现象从 v1 起已存在，较短输入相等不足以排除。原因未知，没有引擎内部或 CPU 证据，不能诊断为资源耗尽；旧 Bun 模板耗时不是等价加速证据。

采用暂停后，新增四个长输入完整证明：纯/前缀模板 N24、纯/前缀 C48k。Node before/candidate 的 raw factory `[text, UTF16offset, LFline]`、全部 final stream、整个 adapter result 深等，final token 数为 97/127/48000/48032；Bun candidate 也完整深等同一 Node baseline，Bun before 仅两个模板不同。四份 Node 全量对象随附，未以 digest 或 metrics 替代比较。

支持 host 由[Node 最低版本决策](../decisions/treat-node-engine-as-a-minimum-version.md)及 README 确定；该证据支持 Node 产品采用，不扩大 Bun 支持承诺，也不要求复制原因未明的旧 Bun 输出。

### v3.1 的成本取舍

同一合法语料，首轮和确认轮分别保存。Node 合并范围 before 331.002–355.439、candidate 332.827–361.276 ms；重叠不能抹去观察到的小幅增加。

| runtime/epoch | 每侧样本 | before→v3.1 median（ms） | 变化 |
| --- | ---: | ---: | ---: |
| Node 首轮 | 4 | 341.267→352.249 | +3.218% |
| Node 确认 | 4 | 336.535→338.787 | +0.669% |
| Node 合并 | 8 | 337.551→343.019 | +1.620% |
| Bun 参考 | 2 | 3125.829→3111.456 | -0.460% |

本次接受这一有限正常成本观察与目标病理收益的权衡，不把它描述成零损失，也不事后设置统计阈值。Bun 两样本不能证明稳定加速。旧 v3 的 517/9 dispatch 计数只属于旧身份。

最终 48 行 tail 诊断均正常结束、无外层 kill；每格一次的 Node raw-reader 结果如下，不据此估计稳定 p95：

| 输入 | before→v3.1（ms） |
| --- | ---: |
| N24 纯模板 | 1284.868→1.347 |
| N24 普通前缀模板 | 168.696→2.929 |
| C48k 纯注释 | 87.426→9.111 |
| C48k 普通前缀注释 | 86.479→9.444 |

Node 公开 Run 的纯模板 before 在 1003.726 ms 取消，candidate 在 93.898 ms 完成；前缀模板 258.536→96.000 ms，纯/前缀注释 212.049/205.163→130.133/130.570 ms，均完成。取消行只证明返回取消，不能作为完整分析耗时或与 raw 相减。该 A/B 使用独立冻结源码，不混入另两项生产优化。

Worker 诊断沿实际 Worker 与生产 settlement，通过额外保留的 exit listener 观察物理退出。v1 的 500 ms 窗口未见 Bun 模板 exit；延长至 3 秒后，v2 在取消返回约 921–950 ms 后观察到 exit。最终窗口全部观察到物理退出。return、terminate request/resolution 与 physical exit 是不同事件；观察窗和 exit code 不改变产品终态，没有返回后 CPU 用量证据。

### 实施与交付验证

[独立采用决策](../decisions/bound-unclosable-tokenizer-tail-cost.md)与 Change 完成审定后，落实三 Product 模块、shared/TS/TSX 三个既有测试实体正文及三份来源说明。原 oracle、identity JSON、root provenance/source hashes 和 Case 身份保持。生产相对已测 v3.1 的格式及类型注解修正，经类型擦除后的 JS parser-contextual AST/叶 token 核对等价；历史 patch/hash 保留。

| 验证 | 结果与边界 |
| --- | --- |
| 生产 function-metrics 39 文件 | Bun 113/113；额外 Node 执行 109/113，四项 public Worker `result.data` null-prototype 与 plain-object 期望的 `deepStrictEqual` 失败 |
| 四失败的 before 对照 | 冻结 before 的三原测试文件 7 项中 3 pass / 同四 fail；import map 及 Worker URL 均指向 before。四实体失败点后的断言未执行，不能称 Node 全部行为覆盖 |
| 真实生产来源与工程 | format/typecheck/lint、source-mapping/identity、材料及 Case 704 entities / 176 Cases / 15 topics 通过；候选 hooks 没有替代真实来源检查 |
| 同产物完整验收 | local candidate `0.0.0-local.15bfd8447e98`：required 34 passed / 9 not-applicable，complete `--all` 43/43 passed，均 exit 0；包括 artifact、外部安装消费者 types/docs/真实 Node runtime |

独立 reviewer 复核实际实现、owner 与报告；Decision 已按采用条件标记 aligned。首次 Gate 的 Markdown Link 容量失败及 Gate-owned 1500→2000 收尾、最终非阻断 mean/p95 告警见[共享交付证据](./_resources/261012-evaluate-project-file-selection-optimization/delivery-verification.json)。这些验收不抹去四项 Node 既有断言失败、Bun 差异和正常成本观察，也不证明用户环境部署或三项组合的真实负载收益。

### 后续辅助代码审查

辅助 harness 按编码规范补充 argv/JSON/unknown-error 与子进程协议失败保留；审查前源文本/hash 保存在 `harness-source-history.json`。当前修订版不是旧计时生成身份，原 raw、模块/input 身份和 patch 保持；输入/protocol 探针不替代完整矩阵或新性能测量。

## 随附资源

- [baseline-import-map.jsonl](./_resources/261012-evaluate-bounded-tokenizer-optimization/baseline-import-map.jsonl)
- [baseline-node-public-behavior.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/baseline-node-public-behavior.txt)
- [candidate-exec-existing-tests.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-exec-existing-tests.txt)
- [candidate-exec-rejected.patch](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-exec-rejected.patch)
- [candidate-native-existing-tests.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-native-existing-tests.txt)
- [candidate-source-identity.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-source-identity.json)
- [candidate-v3-complete-behavior.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-v3-complete-behavior.txt)
- [candidate-v3-existing-tests.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-v3-existing-tests.txt)
- [candidate-v3.1-complete-behavior.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-v3.1-complete-behavior.txt)
- [candidate-v3.1.patch](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-v3.1.patch)
- [candidate-v3.patch](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate-v3.patch)
- [candidate.patch](./_resources/261012-evaluate-bounded-tokenizer-optimization/candidate.patch)
- [case-core-before.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/case-core-before.json)
- [case-typescript-before.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/case-typescript-before.json)
- [copy-manifest.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/copy-manifest.json)
- [corpus-manifest.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/corpus-manifest.json)
- [frozen-input-provenance.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/frozen-input-provenance.json)
- [辅助harness规范审查与验证](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness-coding-style-review.json)
- [审查前harness完整源码与hash](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness-source-history.json)
- [harness/baseline-imports.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/baseline-imports.mjs)
- [harness/candidate-imports.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/candidate-imports.mjs)
- [harness/candidate-v3-imports.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/candidate-v3-imports.mjs)
- [harness/candidate-v3.1-imports.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/candidate-v3.1-imports.mjs)
- [harness/controller-v3.1-confirm.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/controller-v3.1-confirm.mjs)
- [harness/controller-v3.1.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/controller-v3.1.mjs)
- [harness/controller-v3.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/controller-v3.mjs)
- [harness/controller.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/controller.mjs)
- [harness/differential-v3.1.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/differential-v3.1.ts)
- [harness/differential-v3.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/differential-v3.ts)
- [harness/differential.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/differential.ts)
- [harness/followup.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/followup.mjs)
- [harness/freeze-snapshots.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/freeze-snapshots.mjs)
- [harness/measure-v3.1.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/measure-v3.1.ts)
- [harness/measure-v3.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/measure-v3.ts)
- [harness/measure.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/measure.ts)
- [harness/prepare-candidate.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/prepare-candidate.mjs)
- [harness/prepare-native-candidate.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/prepare-native-candidate.mjs)
- [harness/prepare-v3-candidate.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/prepare-v3-candidate.mjs)
- [harness/prepare-v3.1.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/prepare-v3.1.mjs)
- [harness/v3-dispatch-counts.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/v3-dispatch-counts.ts)
- [harness/v3-lifecycle-probes.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/v3-lifecycle-probes.ts)
- [harness/v3.1-leading-addition-probe.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/v3.1-leading-addition-probe.ts)
- [harness/v3.1-lifecycle-probes.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/v3.1-lifecycle-probes.ts)
- [harness/v3.1-long-token-proof.ts](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/v3.1-long-token-proof.ts)
- [harness/verify-product-token-relation.mjs](./_resources/261012-evaluate-bounded-tokenizer-optimization/harness/verify-product-token-relation.mjs)
- [legal-corpus-summary.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/legal-corpus-summary.json)
- [lifecycle-note.md](./_resources/261012-evaluate-bounded-tokenizer-optimization/lifecycle-note.md)
- [product-bun-behavior.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/product-bun-behavior.txt)
- [product-node-behavior.txt](./_resources/261012-evaluate-bounded-tokenizer-optimization/product-node-behavior.txt)
- [product-token-relation.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/product-token-relation.json)
- [production-behavior-summary.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/production-behavior-summary.json)
- [supported-node-comment-0-full.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/supported-node-comment-0-full.json)
- [supported-node-comment-1-full.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/supported-node-comment-1-full.json)
- [supported-node-template-0-full.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/supported-node-template-0-full.json)
- [supported-node-template-1-full.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/supported-node-template-1-full.json)
- [timing-observations.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/timing-observations.json)
- [token-differential.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/token-differential.json)
- [v3-dispatch-counts.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-dispatch-counts.json)
- [v3-experiment-design.md](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-experiment-design.md)
- [v3-legal-corpus-summary.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-legal-corpus-summary.json)
- [v3-lifecycle-probes.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-lifecycle-probes.json)
- [v3-source-identity.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-source-identity.json)
- [v3-timing-observations.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-timing-observations.json)
- [v3-to-v3.1.patch](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-to-v3.1.patch)
- [v3-token-differential.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-token-differential.json)
- [v3-type-only-proposal.patch](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3-type-only-proposal.patch)
- [v3.1-leading-addition-probes.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-leading-addition-probes.json)
- [v3.1-legal-corpus-summary.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-legal-corpus-summary.json)
- [v3.1-lifecycle-probes.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-lifecycle-probes.json)
- [v3.1-long-token-bun.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-long-token-bun.json)
- [v3.1-long-token-node.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-long-token-node.json)
- [v3.1-overlap-review.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-overlap-review.json)
- [v3.1-rejected-lifecycle-probes.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-rejected-lifecycle-probes.json)
- [v3.1-snapshot-closure.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-snapshot-closure.json)
- [v3.1-source-identity.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-source-identity.json)
- [v3.1-timing-observations.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-timing-observations.json)
- [v3.1-token-differential.json](./_resources/261012-evaluate-bounded-tokenizer-optimization/v3.1-token-differential.json)

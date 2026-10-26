---
title: 为无法闭合的 tokenizer 尾部采用等价成本防护
id: 261012-bound-unclosable-tokenizer-tail-cost
status: active
alignment: aligned
createdAt: 2026-10-12T15:40:37Z
purpose: 在私有 Lizard port 缓解已证实的未闭合尾部识别成本，同时保留完整分析语义与来源可审计性。
background: 未闭合模板和注释可造成明显成本增长；无差别尾部监测又使合法语料回退，需要窄成本筛选与完整等价证据。
decision: 仅在独立且确定无法闭合的注释或固定模板分支上启用私有尾部防护，其余输入保留原生路径，并以完整语义和分发验收决定采用。
tags:
  - algorithmic-complexity
  - function-metrics
  - lizard
  - performance
  - source-alignment
  - tokenizer
relations: []
---

## 目的

- 缓解固定 Lizard port 中已证实的未闭合模板重复插值与注释尾部识别成本，保持完整 token、分析结果、错误及资源生命周期。
- 使未来上游同步能恢复这一非机械但语义等价的局部取舍；成本承诺限于有证据的输入形状。

## 背景

- [本轮调查](../investigations/evaluate-bounded-tokenizer-optimization.md)以支持的 Node 为主基线、Bun 为独立参考，比较完整 token/factory/adapter 与合法冻结语料。无差别监测的两个中间候选虽通过差分，却使 Node 合法语料成本明显回退，因此被拒绝；窄风险筛选保留多数文件的原生迭代路径，才支持继续采用验证。
- 兼容性修正后的最终候选在合法 Node 语料的两轮均观察到小幅成本增加，幅度不同；不是正常输入加速或零损失证据。本次取舍接受如实披露的有限正常成本观察，换取已证实病理尾部的显著改善；不因样本范围重叠抹去增加，也不为采用事后设定统计阈值或继续按噪声调参。具体样本和边界由调查保留。
- 原 tokenizer 将自定义 addition 直接拼接在注释分支之后，并非所有片段都是独立 alternative。删除分支必须先证明拼接边界安全，不能只因当前常用 reader 没有特殊片段就缩减私有契约。
- [当前宿主边界](treat-node-engine-as-a-minimum-version.md)只支持 Node，Bun 是工作区工具与独立参考。本轮目标长模板在旧 Bun 路径出现不抛错却不返回尾部 token 的观察，原因未确定；候选在两宿主与支持 Node 的完整原始 token/factory/adapter 事实一致，但不与该旧 Bun 输出一致。不能宣称两宿主所有输入前后全等，也不将未知 Bun 行为诊断为已确认的引擎缺陷或产品修复。
- [通用宿主原语方向](permit-evidence-backed-host-primitive-optimization-in-lizard-port.md)拥有候选的共同证据门槛；本记录只承接这一独立尾部防护。固定来源、宿主与 Worker 生命周期由现有 owner 继续拥有。

## 决策

- 采用: 仅在 private shared tokenizer 内作成本筛选与惰性尾部防护。注释风险由最后 opener/closer 的位置保守识别；固定 TS/TSX 模板风险由最后反引号及其后原始 `${` 筛选。它们不是语法有效性或 delimiter 奇偶数判断。无风险输入沿原生匹配路径，不为普通 token 无条件增加监测。
- 采用: 仅当规范化 addition 为空或以 `|` 起始、从而与前面的注释分支独立时启用整个尾部防护；其它片段保留原生路径，不建立正则 parser。注释游标满足 `cursor > lastCommentClose - 2`、越过最后 closer 能容纳的最晚非重叠 opener 位置，或模板游标恰好抵达最后反引号时，才省略确定无法成功的对应分支。完整模板 token 已跨过最后反引号时不为过去的边界另行构造 reduced pattern。
- 采用: 始终在完整 source 上匹配，保留分支优先级、flags/normalization、UTF-16 offsets、source-start anchors、capture 与 Unicode 零宽推进、macro/factory、模板拆分及 processor/extension 生命周期。原 pattern 在首次消费时仍先构造，以保留错误和惰性边界；partial consumption、factory throw 与 iterator return 不得提前 drain。
- 采用: TS/TSX 只通过私有参数明确其固定模板分支；nested helper 不成为公共 seam、backend 配置、plugin 或 scanner 协议。保留固定 Lizard revision、root provenance/source hashes、translated inventory 与原始 upstream oracle，不用本地实现伪改来源事实。当前 deviation、README 和 scanner owner 明确这一机制及上游同步复审义务；identity 按真实符号和必要 host seam 核对，不为使检查通过而削弱闭合。
- 采用: 采用证据覆盖完整 token-stream differential、27-reader normal/edge/malformed/extension、惰性/factory/error、真实 Worker cancellation 与单独 physical-exit 观察、source identity/deviation、同 workload 合法语料和病理对照，以及工程/Case、required/complete Gate 和 artifact/installed consumer 验收。完整方向经过这些核对后才能标记 aligned；测后格式或类型修正须区分历史 snapshot 与当前实现，并证明等价。
- 采用: 回退边界限本次三个 tokenizer/reader 模块及相应持续证据。语义无法闭合、目标收益不成立或合法语料出现实质回退时保留原 matcher，不抹去调查与原始 oracle。测量只由调查在其 workload、runtime、采样和计时层内解释；取消返回时间不是分析完成耗时，物理退出延迟也不是 CPU 用量。
- 不采用: 不改 Worker 返回/清理协议、资源上限、默认超时、公开 metric 或配置，不新增依赖和引擎，不将风险筛选推广到其它 fragment。没有原始 `${` 的模板尾部仍用原 matcher；最后 delimiter 之前或其它尚未探测的退化形态没有改善或复杂度保证。

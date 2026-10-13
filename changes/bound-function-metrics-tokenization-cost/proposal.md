# Proposal

采用经完整语义和成本审计的 v3.1 私有 tokenizer 尾部防护，缓解已确认的不可闭合分支扫描。

## Why

未闭合 TS 模板重复插值和 C 注释在纯输入、普通闭合前缀后均出现异常成本。v1/v2 的正常 Node 成本回退约 8%，被拒绝；v3.1 收窄防护资格，支持 Node 长输入语义一致，病理成本显著下降，合法 corpus 合并观察增加 1.620%。采用取舍见[独立 Decision](../../docs/decisions/bound-unclosable-tokenizer-tail-cost.md)，样本与探索转折见[调查报告](../../docs/investigations/evaluate-bounded-tokenizer-optimization.md)。

## Outcome

保持 source-aligned 分析语义，减少已观察纯/普通前缀未闭合模板和注释的无谓扫描。接受如实披露的有限正常成本，保留未覆盖形状、Bun 差异和测量误差；不承诺任意 malformed 线性或普通项目整体加速。

## Scope

### Intended Change

- 修改 `analyzer/shared/code-reader.ts`、`analyzer/readers/typescript.ts`、`analyzer/readers/tsx.ts`。TS/TSX 私有第四实参标明固定模板；风险输入才进入防护路径，在完整 source 上惰性省略确定无法闭合的分支。
- addition 规范化后为空或以 `|` 起始才启用防护；其它拼接片段沿原 matcher，保留 leading quantifier 语义。
- 增强 shared/TS/TSX 三个既有测试实体的完整 raw/final token、offset/factory、partial consumption、零宽和普通前缀尾部断言；原 upstream oracle 保持。

### Resulting Impacts

- 更新 current evidence `README.md`、`source-alignment-deviations.md` 和 `docs/development/scanner-dependencies.md`，交接等价机制、来源复审和成本边界。
- 复核真实 source identity。三个 translated member、root provenance、revision、source hashes 和 target inventory 不变；私有参数与 nested helper 不新增 curated named seam。
- 按既有 Case 义务验证正文增强；无新增 entity/Case。Worker/settlement/resource policy、公开 Check guide/API 和取消返回协议保持。

## Success Criteria

1. 完整 token/factory/reader/adapter、27-reader normal/edge/malformed/extension、惰性/错误和支持 Node 长输入证据闭合，原 oracle 不变。
2. 同输入性能对照分别解释正常成本与目标收益；取消不当完成耗时，physical exit 不当 CPU 证据。
3. 真实来源、工程、Case、材料、required/complete Gate 及 installed consumer 验收完成；独立审查核对实际实现与 owner。
4. 明确披露 Bun N24 旧输出差异未知，以及额外 Node 源测试四项 before 同现断言失败及失败点后未执行的断言。

## Affected Owners

`docs/checks/function-metrics.md`、`docs/development/scanner-dependencies.md`、`docs/tooling/source-mapping.md`、current evidence、测试策略与 Case 维护。共同证据门槛归 `260903-permit-evidence-backed-host-primitive-optimization-in-lizard-port`，本候选取舍归独立 Decision；文件选择和 Run 调度不在本切面内。

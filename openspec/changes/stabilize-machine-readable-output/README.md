# stabilize-machine-readable-output

## AI 使用契约

本目录是实施该 change 的完整上下文包。实施代理必须能从下列 artifacts 恢复目标产品
结果、规范行为、已确认决策、执行顺序、失败语义和验收边界：

| Artifact | 权威范围 |
| --- | --- |
| `proposal.md` | change 的原因、产品结果、范围与成功标准。 |
| `specs/**` | 实现与测试必须满足的规范性可观察行为。 |
| `design.md` | 已确认的 owner、data flow、publication、validation 与 hard-cut 决策及理由。 |
| `tasks.md` | 必须完成的实施顺序与证明义务；不得覆盖 specs 或 design。 |
| `README.md` | 导航与执行摘要；不是额外的 contract owner。 |

当前代码与目标 specs 不一致时，把代码作为 baseline evidence，把 specs 作为目标；不得为
保留偶然的当前行为而削弱目标。若新 public field 或 semantic 无法从现有 owner 推导，先
更新本 change，不得从相邻 change proposal 猜测。

Observable behavior 以 `specs/**` 为准；specs 未覆盖的 owner/data-flow/implementation
constraint 以 `design.md` 为准。两者若直接冲突，说明 change 尚未 ready：先修正文档并重新
验证，不得自行选择一边继续实现。Proposal、README 与 tasks 中的摘要都不能覆盖这两个
owner。

## 产品结果

`metrics.json`、`warnings.ndjson` 与 `warnings-all.ndjson` 成为 TypeScript/Bun 产品唯一
当前 machine contract。未发生 output-contract failure 的 invocation 发布一个
schema-valid、byte-conforming、cross-artifact-consistent set。`quality:annotate` 只在整个
当前 warning stream 通过验证后输出 annotation。

Contract-valid set 可以表达 `success`、`gate-failed`，也可以表达 scan incompleteness
这类合法 domain failure。Files 本身不是 current-run evidence；调用方还必须保留 producing
invocation outcome。Schema、framing、cleanup 或 write failure 属于 output-contract
failure，不能成为可信 scan 或 gate 结果。

## 范围

本 change 交付：

- Output-owned `MachineMetricsV1` / `MachineWarningV1` projection；
- Product-owned runtime schemas 与 shallow product import boundary；
- generated canonical JSON Schemas 与 deterministic artifact-set examples；
- 共享同一 warning contract 的 artifact-set 与 warning-stream validators；
- canonical publication 前 validation，以及 handled failure cleanup；
- strict annotation input validation 与 infrastructure exit `2`；
- focused mutation proofs 与 required producer-to-consumer acceptance。

本 change 不重新设计 scanner behavior、thresholds、warning generation、completeness、gate
evaluation、config selection、console/report semantics 或 raw scanner artifacts；不增加 JSON
stdout、result envelope、manifest、SDK、plugin API、concurrent-writer protocol 或
multi-version compatibility layer。

## 与相邻 changes 的边界

- `add-external-project-config-workflow` 可以增加 config selection context 与 console
  provenance，但不会自动增加 machine v1 fields。Machine-visible provenance 需要后续
  output-contract change。
- `port-lizard-function-metrics-to-typescript` 可以替换 scanner backend 与 internal
  identity，但必须保持本 change 的 DTO shape、warning projection 与 artifact predicate。

## 执行规则

1. 依次读取 `proposal.md`、两个 delta specs、`design.md`、`tasks.md`。
2. 写 schema 或 DTO tests 前，先建立 projection 与 field-semantics baseline。
3. 严格采用 specs 定义的 positive byte grammar 与 set invariants；不得复用当前宽松的
   script NDJSON parser。
4. 只有对应实现、focused proof 与指定验证全部通过后才勾选 task。
5. 每次新增、删除、重命名或修改 native test body / semantic Case 时，遵循当前
   test-evidence workflow。
6. 若实现需要新 public field、另一个 accepted machine version、第二个 schema owner 或
   不同 process-outcome mapping，暂停实现并先更新本 change。

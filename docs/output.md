# 输出边界

本文是 Vibe Check public publication contract 的 owner。runtime schemas 是 exact field owner；
Package Run、Core、report 或 annotation 不复制 machine 字段规则。

## 当前产品输出

| 输出 | 合约 |
| --- | --- |
| `run.json` | 单一 UTF-8 JSON value，schema `urn:vibe-check:schema:run:v2` |
| `records.ndjson` | canonical ordered record rows；非空时每行一个 JSON value 且以 LF 结束，schema `urn:vibe-check:schema:record:v2` |
| `report.md`、console | 从同一 validated publication model 的人读投影 |
| `raw/**` | scanner-private material，不属于 public machine set |

`run.json` 发布 invocation、catalog fingerprint/definitions、runs、integrity、completeness、named
references、decision 与 acceptance evidence；`records.ndjson` 发布 records。两者共同构成唯一 canonical
machine set：record/run/reference/decision evidence 必须互相可解析，数组与 records 按 schema/validator
规定的 canonical order。完整 field/nullability/enums 只见
[run schema](schemas/vibe-check-run.schema.json) 与 [record schema](schemas/vibe-check-record.schema.json)。

## Core-to-machine projection

Core 先验证 `FinalCoreSnapshot`，Output 再创建一个 validated publication model；构造阶段同时核对并
冻结由 snapshot、decision 与人读选择器确定的 human status projection。Machine、report、console 与
structured Run Result 只消费该 model，不再接收可独立漂移的 status 或 GateResult 事实。Output 不重新计算
Check result、record、reference、policy、quality status 或 GateResult。

`src/product/run/machine-output.ts` 是外部 consumer 的 shallow boundary，导出
`validateMachinePublicationSetV2`。validator 接收一个 artifact directory 的 two-file bytes，完整返回
validated set 或一个 typed diagnostic；绝不返回可供 partial consumer 使用的 prefix。

## Publication lifecycle and evidence

candidate stages 是 validate publication model、serialize machine candidates、render report candidate 和
validate machine set；这些都在 canonical write 前完成。artifact stages 清理同一 selected directory 的
prior owned files、写同目录 owned temps、rename two machine files、rename report，最后才发布 trusted
paths。handled failure 清理 canonical files、`report.md` 与 owned temps，并返回 `kind: "effect"` 的
typed result；pre-work configuration failure 不进行 output I/O。`raw/**` 是 machine set 外的 scanner-private material，可按
scanner lifecycle 部分保留。

consumer 必须将 artifacts 与 producing Package Run result 一起解释。`kind: "completed"` 包含最终
decision 和各 effect status；configuration、planning、execution、cancellation 与 effect failure 使用
不同 result variants。项目自有 command adapter 如需 process exit code，必须从这些 variants 显式映射；
exit code 不是 Package Run contract。

## Readable output and annotation

validated model 同时保存普通 quality 与 verification projection；Package Run 当前选择普通
`Quality check status` 作为 console status，report 保留两者。console 固定最多预览
5 条 records；report 从 resolved `report` presentation settings 消费 title / notice / timestamp time zone /
footer、每个 accepted / unaccepted record section 的 `topN` 以及独立的 changed-record watchlist visibility /
`watchlistMax`。这些 report projection settings 不改变 validated model、machine v2 bytes、console、GateResult
或 structured result。annotation 是独立 script consumer：它以 artifact directory 为输入，先验证
`run.json` + `records.ndjson` two-file set，成功后才渲染 annotations。

## Published materials and verification

当前 schemas 位于 `docs/schemas/`，examples 位于 `docs/examples/artifacts/**`；每个 example directory
含 `run.json`、`records.ndjson` 和 README。docs tooling 独立检查 schema/example，runtime drift check
确认发布材料与 runtime schemas/serializers 一致。当前 tests 覆盖 JSON/NDJSON grammar、two-file
relationships、candidate-before-write、prior/report/temp cleanup、readable parity、Run Result effect status 和 actual
annotation consumer。

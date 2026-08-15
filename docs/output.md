# 输出边界

本文是 Vibe Check public publication contract 的 owner。runtime schemas 是 exact field owner；Package Run、Core、report 或 annotation 不复制 machine 字段规则。

## 当前产品输出

| 输出 | 合约 |
| --- | --- |
| `run.json` | 单一 UTF-8 JSON value，schema `urn:vibe-check:schema:run:v3` |
| `records.ndjson` | canonical ordered record rows；非空时每行一个 JSON value 且以 LF 结束，schema `urn:vibe-check:schema:record:v3` |
| `report.md`、console | 从同一 validated v3 publication model 的人读投影 |
| `raw/**` | scanner-private material，不属于 public machine set |

`run.json` 只发布 `schemaVersion`、`invocation`、`catalogFingerprint`、`recordsFingerprint`、`checks`、`references`、`acceptance` 和 `decision`。`invocation` 固定保存 invocation ID、normalized project root 和 timestamp。`catalogFingerprint` 绑定 declarative Check projections；`recordsFingerprint` 绑定 canonical ordered machine Record rows，空集也有稳定摘要。`checks` 是完整 Core Check projection（declarative Check definition 加一个 terminal outcome）；`records.ndjson` 的每行是 target QualityRecord，直接绑定 `checkId` 和 `recordTypeId`，不携带 execution-run identity。完整 field/nullability/enums 只见 [run schema](schemas/vibe-check-run.schema.json) 与 [record schema](schemas/vibe-check-record.schema.json)。

machine v3 不发布 `definitions`、`runs`、`integrity`、`completeness`、Task identity、invalid candidate evidence 或 effect status。运行/效果状态仍由 structured Package Run Result 承载，不能从这两个 artifact 倒推。

## Core-to-machine projection

Core 先验证并冻结 `{ checks, records }`，Output 再创建一个 validated v3 publication model。构造阶段从 Check declarative projections 计算 `catalogFingerprint`，并核对 reference、acceptance、decision 与 human status projection。Machine、report、console 与 structured Run effect 都只消费该 model，不再接收可独立漂移的 status 或 GateResult 事实。Output 不重新计算 Check outcome、Record、reference、policy、quality status 或 GateResult。

每个 Record 的 `checkId` 必须命名一个 published Check，`recordTypeId` 必须由该 Check definition projection 声明；其 `fields` 必须精确满足 owning record type 的 declared/required/type contract。Check/Record identity 和 arrays 均使用 canonical order，`recordsFingerprint` 必须匹配完整 Record row set。reference、acceptance 和 decision evidence 只能解析到 published `checkId`、`recordId` 或 named reference identity。two-file validator 必须在 canonical path 变更前接受完整 set，且失败绝不返回 partial validated prefix。

`src/product/run/machine-output.ts` 是外部 consumer 的 shallow boundary，导出 `validateMachinePublicationSetV3`。validator 接收一个 artifact directory 的 two-file bytes，完整返回 validated set 或一个 typed diagnostic；不向 partial consumer 暴露 prefix。

## Publication lifecycle and evidence

candidate stages 是 validate publication model、serialize machine candidates、render report candidate 和 validate machine set；这些都在 canonical path 变更前完成。artifact stages 先清理 stale owned temps 并写齐同目录 temps；只有全部 candidate writes 成功后，才依次以单文件 rename 替换两个 machine paths 与 report path、清理 retired artifacts，并由 producing process 宣布 publication trusted。candidate write 或首次 rename 的 handled failure 保留 prior canonical set；一次 canonical replacement 已成功后的 handled failure 清理 canonical files、`report.md` 与 owned temps，并返回 `kind: "effect"` 的 typed result。pre-work configuration failure 不进行 output I/O；`raw/**` 是 machine set 外的 scanner-private material，可按 scanner lifecycle 部分保留。

固定的 `run.json` 与 `records.ndjson` 是两个独立 filesystem paths；常规 Node filesystem API 只保证每次同文件系统 rename 的目录项替换原子性，不提供跨两个 paths 的 reader-visible transaction。因而这里的完整 set 保证是 candidate validation、`recordsFingerprint` set binding 与 handled-failure 边界，不是两个 rename 之间或 process crash / `SIGKILL` 下的 OS snapshot guarantee。mixed-generation files 会因 fingerprint 不一致而 fail closed；consumer 仍只能在 producing Run 已报告 output success 后读取，并把两份 bytes 作为一组验证。若未来要求 concurrent reader 在 replacement 期间始终看到同一 generation，必须另行决定 versioned generation 加 atomic pointer/directory 等 public reader protocol；v3 未引入该协议。

consumer 必须将 artifacts 与 producing Package Run result 一起解释。`kind: "completed"` 包含最终 decision 和各 effect status；configuration、planning、execution、cancellation 与 effect failure 使用不同 result variants。项目自有 command adapter 如需 process exit code，必须从这些 variants 显式映射；exit code 不是 Package Run contract。

## Readable output and annotation

validated model 同时保存普通 quality 与 verification projection；Package Run 当前选择普通 `Quality check status` 作为 console status，report 保留两者。console 固定最多预览 5 条 records；report 从 resolved `report` presentation settings 消费 title / notice / timestamp time zone / footer、每个 accepted / unaccepted record section 的 `topN` 以及独立的 changed-record watchlist visibility / `watchlistMax`。这些 presentation settings 只改变 human projection，不能改变 v3 machine bytes、Core facts、GateResult 或 structured result。

annotation 是独立 script consumer：它以 artifact directory 为输入，先验证 `run.json` + `records.ndjson` v3 two-file set，成功后才渲染 annotations。

## Published materials and historical v2

当前 schemas 位于 `docs/schemas/`，examples 位于 `docs/examples/artifacts/**`；每个 example directory 含 `run.json`、`records.ndjson` 和 README。docs tooling 独立检查 schema/example，runtime drift check 确认发布材料与 runtime schemas/serializers 一致。当前 tests 覆盖 JSON/NDJSON grammar、two-file relationships、candidate-before-write、prior/report/temp cleanup、readable parity、Run Result effect status 和 actual annotation consumer。

v2 run/record schema 原字节只保留在 `docs/schemas/historical/v2/`，供明确的 historical schema validation/reference 使用。它们不是当前 schema entry、runtime reader/writer、annotation input 或 fallback；current output 只接受 v3。

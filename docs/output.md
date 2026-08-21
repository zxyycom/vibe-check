# 输出边界

本文是 Vibe Check public machine publication contract 的唯一 owner。runtime schemas 拥有精确字段；Package Run、Core、progress 与命令 adapter 不复制 machine DTO 规则。

## 当前产品输出

| 输出 | 合约 |
| --- | --- |
| `run.json` | 单一 UTF-8 JSON value，schema `urn:vibe-check:schema:run:v4` |
| `records.ndjson` | canonical ordered supplemental Record rows；非空时每行一个 JSON value 且以 LF 结束，schema `urn:vibe-check:schema:record:v4` |
| `raw/**` | scanner-private material，不属于 public machine set |

`run.json` 只发布 `schemaVersion`、`invocation`、`recordsFingerprint` 和 `checks`。每个 Check row 有 `checkId`、`displayName` 与一个 terminal `outcome`：`passed` / `failed` 带 canonical final `data`；`not-applicable` / `unavailable` 带其受控 reason（前者可省略）。它不发布 aggregate、catalog、decision、reference、acceptance、view、blocking evidence、effect status 或 execution timing。

`records.ndjson` 的每行是：

```json
{
  "schemaVersion": "vibe-check.record.v4",
  "checkId": "api-health",
  "id": "sample:health",
  "data": { "latencyMs": 820, "statusCode": 503 }
}
```

`id` 只在 owning Check 内唯一；不同 Checks 可以使用同一 `id`。Record presence、count 或 `data` 不决定 Check terminal status。final `data` 是该 Check 的主事实；Records 是补充事实。完整 field/nullability/enums 只见 [run schema](schemas/vibe-check-run.schema.json) 与 [record schema](schemas/vibe-check-record.schema.json)。

这里的 canonical JSON 是 Product 的**安全结构契约**，不是业务 schema，也不是 JSON bytes 的排版契约。final/Record `data` 的根必须是 non-array plain object；递归只接受 `null`、boolean、string、finite number、dense array 与 plain object。Product 通过 own-property descriptors materialize，不读取 accessor 或调用 `toJSON`；拒绝 accessor、symbol/non-enumerable key、unsupported prototype、cycle、sparse array 与非有限 number，并将 `-0` 规范为 `0`。materialized data 用 prototype-safe container 与 recursive freeze 成为 detached Core fact；需要 canonical text 时才递归按 lexical key order 生成它，而不把 JavaScript own-key enumeration 声明为该顺序。它不验证 required property、业务 union、跨 Check consistency 或敏感值。

## Core-to-machine projection

Core 先验证并冻结 `{ checks, records }`。Output 只创建该 snapshot 和 invocation 的 validated v4 projection；不会重算 Check status，不解释 Check-local data，也不会从 Record 内容猜测 owner、count、ID、presentation 或 aggregate。

Validators 检查 schema identity、canonical JSON、Check order、`{ checkId, id }` composite uniqueness/order、Record ownership 和 complete Record-set fingerprint。Check rows 按 `checkId` 排序；Record rows 按 `{ checkId, id }` 结构 pair 排序，不能把 pair 拼接成 delimiter string。`recordsFingerprint` 绑定这些完整排序 Record rows：它 hash 的输入是 row array 的 UTF-8 **recursive lexical canonical text**，即每个 object 在每一层以 lexical property-name order 写入、array 保持 index order；空集也有稳定摘要。它不是 `records.ndjson` bytes 的 hash。

JavaScript object own-key enumeration，以及 `run.json`/`records.ndjson` 通过 `JSON.stringify` 产生的 lexical key order，都不是 public contract；reader 只以 schema、结构排序和 complete-set fingerprint 判断可信性。完整 two-file validation 是唯一 reader trust boundary：失败绝不返回 partial validated prefix。

`src/product/run/machine-output.ts` 是外部 consumer 的 shallow boundary，导出 `validateMachinePublicationSetV4`。它接受一个 artifact directory 的 two-file bytes，完整返回 frozen validated set 或 typed diagnostic。v3 identity、fields 和 bytes 不满足 v4 schema，因而被拒绝；没有 dual reader、writer、adapter 或 permissive fallback。

## Publication lifecycle and trust boundary

candidate stages 是 validate publication model、serialize machine candidates、validate complete machine set；它们都在 canonical path 变更前完成。artifact stages 先清理 stale owned temps，并写齐同目录 temps；只有全部 candidate writes 成功后，才依次以单文件 rename 替换 `run.json` 与 `records.ndjson`、清理 retired artifacts，并由 producing process 宣布 trusted paths。

candidate write 或首次 rename 的 handled failure 保留 prior canonical set；一次 canonical replacement 已成功后的 handled failure 清理可能混合的 canonical files、retired `report.md` 与 owned temps，并返回 typed effect failure。pre-work configuration failure 不进行 output I/O；`raw/**` 仍可按 scanner lifecycle 保留。

固定的 `run.json` 与 `records.ndjson` 是两个 independent filesystem paths；常规 rename 不提供跨 path reader-visible transaction。保证来自 candidate validation、complete-set fingerprint binding 和 handled-failure cleanup，不是 OS-level atomic snapshot。mixed-generation files fail closed；consumer 必须把两份 bytes 作为一组验证。需要 generation pointer、reader lock 或跨 paths atomic visibility 时，必须另行定义 public reader protocol。

## Progress and presentation boundaries

Product progress 仍可向人显示 Check lifecycle status、duration 和受控 reason code；它使用 producing Run 的 lifecycle facts，不从 machine artifacts反向恢复状态。

v4 不提供 report、console summary、annotation 或 arbitrary final/Record `data` 的 human-readable projection。它不保留 Record `message`、`location`、`level`、acceptance 或 view fields，也不遍历任意 data 形成 fallback。任何 typed dependency reader 或 explicit presentation API 由各自 downstream Change 拥有，不能通过本 machine contract 反推。

## Published materials and historical schemas

当前 schemas 位于 `docs/schemas/`，examples 位于 `docs/examples/artifacts/**`；每个 example directory 有 `run.json`、`records.ndjson` 和 README。docs tooling 独立检查 checked-in current schemas/examples；runtime drift checks 确认 runtime schemas/serializers 一致。

v2 schema bytes 只保留在 `docs/schemas/historical/v2/` 供明确 historical validation/reference 使用。v3 没有 current 或 historical runtime/publication path；其输入只会被 v4 validator 拒绝。历史材料不是 current schema entry、runtime reader/writer、example input 或 fallback；current output 只接受 v4。

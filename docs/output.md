# 输出边界

本文是 Vibe Check 输出边界的主规范。它固定 product report data、console channel 和
artifacts 的责任，不重新计算 scan scope、metric、scan completeness、warning、baseline
或 status。

## 当前产品输出

Output owner 位于 `src/product/**`。正式入口和 dogfood wrapper 都由同一产品 core 输出
进度、summary 与 completion console text，并写入 `metrics.json`、`report.md`、warnings
NDJSON 和 scanner reproduction artifacts。

Rust CLI、renderer 和根 Cargo 产品入口已移除。仓库仍保留的
`vibe-check.report.v1` schema 与 examples 只记录已退役 Rust 输出的历史材料，不是当前
TypeScript product contract，也不用于声明当前 artifacts 符合该 envelope。

## TypeScript product output boundary

Product Core 先产生 Vibe Check-owned metrics、final capability results、overall
completeness、warning channels、baseline/comparison metadata 和 normalized fatal issues；
Output 再写 artifacts 和 console summary。`metrics.json`、`report.md` 与 console 只投影
同一份 core-owned completeness record，不在各 surface 重算 capability status 或 overall。

Output 不得：

- 重新收集文件或运行 scanner。
- 重新计算 aggregate、capability status、overall completeness、warning、baseline 或
  status。
- 把 scc CSV、Lizard CSV、jscpd reporter object 或 process result 直接提升为 product
  field。
- 因源码位置变化改写 artifact name、warning channel 或 console conclusion。

当前 TypeScript product artifacts：

| Artifact | Responsibility |
| --- | --- |
| `metrics.json` | current metrics、completeness、aggregates、baseline/comparison、warnings 和 metadata |
| `report.md` | 从同一 metrics data 投影的 completeness 与人读报告 |
| `warnings.ndjson` | existing `changed` warning channel |
| `warnings-all.ndjson` | existing `all` warning channel |
| `raw/**` | scanner 与 baseline reproduction material；当前包含 normalized scanner outputs、fingerprints 和 aggregates，不是 stable product output field |

Artifact directory、raw subdirectories、JSON/NDJSON serialization、Markdown report、
ranking、accepted reason、timezone 和 top-N behavior 由当前 TypeScript 产品实现与
`src/product/config.ts` 拥有。

## Console channels

当前 TypeScript product 的 console behavior：

- stdout 显示 banner、profile、scan input progress、artifact paths、summary、warning
  preview 和 completion status。
- Summary 显示 overall completeness 与每项 capability 的 ID/status；failed result 同时显示
  normalized reason 和恢复动作。
- Normalized measurement failure 与 fatal issues 在 failure summary 中可见；top-level
  error 写 stderr。
- scanner process 的原生 stdout/stderr 不直接成为 product console contract。
- Quick / full、complete / empty / failed 和 warning / passed / failed 的结论必须与写出的
  artifacts 一致。

正式入口只负责最薄的命令分流和 project-root 传递。Dogfood wrapper 不重新定义 flags、
console text、status mapping 或 artifact locations。

## Completeness conclusion

Human output 从同一 overall completeness 得出结论：

- `complete`：保留既有质量结论；没有 normalized quality warnings 时可显示 passed，有
  warnings 时显示 warning。
- `empty`：显示 warning，说明没有 capability 有 eligible measurement input、质量未评价；
  不显示绿色通过，也不为该结论伪造 normalized quality warning record。
- `failed`：显示 failed capability、原因与恢复动作，说明 required current measurement
  未完成；其它 capability 的部分或成功数据不能形成可信质量结论。

Capability status 在各 surface 保持产品语义：profile 未请求为 `skipped`，已请求但没有
eligible input 为 `no-input`，eligible work 正常完成即使 zero findings 也为 `succeeded`，
required work 未完成为 `failed`。Output 不把这些状态互相推断或重分类。

`metrics.json` 与 `report.md` 在 model 可验证且 artifacts 可写时仍为 empty/failed scan 保存
同一 completeness evidence。Scanner-private raw output 即使为复现而保存，也必须通过
adapter normalization 后才能影响 metrics、warnings 或 status。稳定 contract 只承诺
capability ID/status、overall 与 failed diagnostic 的语义；不冻结 capability 展示顺序、
diagnostic 精确措辞、最终 JSON nesting 或 schema version。

## 已退役 Rust CLI 输出的历史材料

以下 `human` / `json` 内容只记录已删除 Rust CLI 的历史合同，不是当前可执行入口、
TypeScript 产品 contract 或迁移输入。

### `json`

```text
vibe-check scan --format json
```

历史 `json` 输出曾是 stdout 的唯一 JSON object。Rust MVP envelope 包含：

- `schema_version`
- `tool`
- `run`
- `scope`
- `summary`
- `metrics`
- `warnings`
- `gate`
- `diagnostics`

字段类型、必填性和枚举由历史 JSON schema 定义。Rust scanner raw output 不进入
envelope；adapter 诊断先归一化为 `diagnostics`。

历史格式标识与材料：

1. `schema_version = vibe-check.report.v1`。
2. 输出不得包含 schema 未声明的字段。
3. [JSON schema](schemas/vibe-check-report.schema.json)。
4. [JSON examples](examples/json/)。

这些 schema/examples 不声明当前 TypeScript artifacts 符合该 envelope。

### `human`

```text
vibe-check scan
vibe-check scan --format human
```

历史 Rust `human` report 从同一 Rust report data 派生，呈现 summary、metrics、gate、
warnings 和 diagnostics；它不是当前脚本解析接口。

### Rust channel boundary

- Rust `human` / `json` report 写 stdout。
- Usage、input/config、scanner fatal、output failure 和顶层 diagnostic 写 stderr。
- 输入错误不向 stdout 写 scan report。

这些要求已经随 Rust 产品路径删除而退役；不得把 Rust renderer、CLI fixtures 或 schema
contract 当作当前 `src/product/**` 的输出要求。

## 验证

当前产品输出变更至少证明：

- `metrics.json`、`report.md`、`warnings.ndjson`、`warnings-all.ndjson` 与 raw artifacts
  的名称、内容语义和生成条件保持。
- Console summary、human conclusion、report 与 machine artifact 投影同一 capability
  results、overall completeness 和 failed diagnostic。
- Complete、legitimate empty 与 required measurement failed 分别保持可信质量结论、
  “质量未评价” warning 和 actionable failure，不把 zero findings 当成 no input。
- warning preview、completion status 和 fatal issue channel 保持。
- jscpd reporter JSON 与 Lizard CSV 留在 adapter-private boundary；当前 `raw/**` 中的
  normalized scanner artifacts 不被替换为 stable third-party output fields。
- 正式入口与 dogfood wrapper 对同一 input 到达同一 core，并保持 artifacts 与状态语义。

初次产品化已通过 quick、full、baseline 和 explicit changed-files 的迁移前后对照；该
parity 是一次性产品化证据，不是当前每次输出变更的固定 gate。

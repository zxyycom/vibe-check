# Design

本设计把 machine v4 files 作为显式 package resources 交付，同时保持 README 单入口和 two-file trust boundary。

## Context

Machine v4 的 schema、example 和独立 docs validator 已经由 `docs/output.md` 与 output tests 拥有。Package documentation
中的 Markdown、TypeScript Definition、JSON 与 NDJSON 具有不同材料职责，不能统一伪装成 Markdown document。Package
artifact 使用 allowlisted documents 和 source fingerprint，宽泛 manifest glob 不是接受依据。

## Goals / Non-Goals

目标是交付 current consumer contract materials，并由 exact candidate acceptance证明 installed bytes。非目标是发布 historical schemas、repository scripts、生成器或测试，新增 artifact reader，改变 v4 DTO，或新增第二 package index。

## Decisions

### Intended Change

Output guide 进入 package supporting Markdown inventory；current schemas 与唯一 `mixed-outcomes` example 进入独立只读
resource registry。Example 由可执行 `definition.ts` 和对应 two-file publication 组成：Definition 混合一个实际读取
`package.json` 的 `jsonValidation` 与递归自定义 workflow，覆盖 typed provider/parser、preflight continue/block、继承式
dependency readback、messages、四种 outcome 与多条 Records。Repository generator 为 Definition 的 `vibe-check` import 提供
current source public API，通过完整 public Run 在隔离 project manifest 上形成 facts，只为可重复 bytes 注入固定 invocation
metadata。所有材料共同参与 source fingerprint、staging copy、tar audit、installed
comparison 与 external docs acceptance；Definition 还由 installed consumer typecheck 直接验证。

### Resulting Impacts

Documentation audit 需要返回 documents 和 resources，但 Markdown trailing-LF 规则不应用于 TypeScript/JSON/NDJSON。
Staging allowlist 与 packed/installed audits 必须按 package path 逐字节比较 resources。README 仍是唯一总入口并直接链接
output guide；schemas/example 不建立额外导航页。Current material 改变使旧 candidate receipt 失效。

## Risks / Trade-offs

- 单组 example 比四套 outcome-specific fixtures 更少，但 Definition 明显长于直接返回四态的 fixture；它以一条可追踪的内置与自定义工作流换取更高解释力，而 `run.json` 仍集中覆盖 passed、failed+Records、not-applicable 与 unavailable。不再单独提供零字节 Record-set fixture。
- Schema无法单独证明跨文件 generation一致；文档必须继续要求 complete-set fingerprint validation。
- Definition、隔离 project input 与稳定 example metadata 的职责不同；生成器必须通过 public Run 形成 Check/Record facts，只固定 invocation metadata，不能另建第二套 facts。

## Open Questions

无。用户已确认 machine output contract 可以随 package 发布，并把 current example 收敛为一组带对应 TypeScript Definition
的 mixed-outcomes materials。

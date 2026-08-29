# Proposal

本 Change 让安装包直接交付与 runtime 同版本的 machine v4 output guide、schemas 和一组可从
TypeScript Project Definition 追溯的 current example。

## Why

Package Run 默认能够发布 `run.json` 与 `records.ndjson`，但当前 candidate 只交付 README、API mechanism 和 Check guides。Consumer 无法从安装包取得完整 machine contract、current schemas 或代表性 two-file sets，只能回到 repository source tree；直接复制现有 `docs/output.md` 又会把内部实现和历史材料置于 package 阅读主线。

## Outcome

安装后的 package consumer 能从 README 进入 consumer-first output contract，读取同版本的两份 current v4 schemas，以及一组
包含 `definition.ts`、`run.json` 与 `records.ndjson` 的 capability-rich mixed-outcomes example；candidate fingerprint、staging、tarball、
installation 和 external docs acceptance 都证明这些材料与 runtime 属于同一产品单元。

## Scope

### Intended Change

- 把 `docs/output.md` 保持为 consumer contract，并把 repository implementation notes 放入 repository-only owner。
- 将 output guide、两份 current v4 schemas 与唯一 mixed-outcomes Definition/output example 加入显式 package material registry。
- 让生成器通过完整 public Run 执行同一份 Definition 的一个内置 Check 与一条自定义依赖工作流，形成代表性 Check/Record facts，再以固定文档 invocation metadata 生成可重复 bytes。
- 将这些材料纳入 candidate fingerprint、copy/audit/install/external-consumer acceptance，并从 README 直接链接。

### Resulting Impacts

- Package documentation collector、artifact allowlist、receipt fingerprint 和安装验收需要识别 Markdown documents 与 TypeScript/JSON/NDJSON resources 的不同文本规则。
- Historical v2 schemas、generation/validation scripts 和 repository tests继续不随包交付；output guide必须明确该边界。
- Package artifact 与 documentation Semantic Case proof 需要覆盖新增 current material inventory。

## Success Criteria

- Current candidate 精确包含 output guide、两份 v4 schemas 和一组 `definition.ts` / `run.json` / `records.ndjson` example，不包含 historical schemas 或 repository scripts。
- Example Definition 通过安装后 typecheck；生成器证明内置 Check、typed provider/parser、preflight、dependency readback、四种 terminal outcome 与多条 Records 来自同一份 Definition。
- README 与 output guide 的 package 内链接可解析，consumer 能区分 schema validation 与 complete-set fingerprint validation。
- Artifact、candidate installation 和 ancestry-external documentation acceptance逐字节核对全部材料。
- Docs/schema/example validation、Test Evidence 和 full package verification通过。

## Affected Owners

- `docs/output.md`、`docs/schemas/**`、`docs/examples/artifacts/**`
- `docs/script-tooling.md` 与 `scripts/docs/package-api/**`
- `scripts/package/artifact/**`、candidate receipt/install/external consumer acceptance
- `README.md`、`docs/testing/cases/**` 与 package candidate tests

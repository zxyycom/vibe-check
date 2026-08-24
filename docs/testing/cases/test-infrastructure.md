# test-infrastructure

## Case AUX-TEST-EVIDENCE-CATALOG-001: 语义 Case source、查询与失败边界保持严格
Owner: `docs/testing/case-maintenance.md#存储格式`
Entities:
- `bun|scripts/test-evidence/catalog-cli.test.ts|returns a query failure status at the CLI boundary`
- `bun|scripts/test-evidence/catalog.test.ts|diagnoses malformed Case structure and stable identity conflicts`
- `bun|scripts/test-evidence/catalog.test.ts|parses and queries topic-grouped semantic Cases`
Proves:
- 受控 topic Markdown 解析 Owner、Entities 与 Proves，并支持按 topic、owner、entity 和文本有界查询。
- 非法目录成员、symlink、heading、字段、Owner anchor、重复 ID/entity 与空语义产生阻断诊断。
- CLI 对精确 show miss 返回稳定 query failure，不写入派生状态。

## Case AUX-TEST-EVIDENCE-CLOSURE-001: Static 与 runtime entity closure 对漂移 fail closed
Owner: `docs/testing/case-maintenance.md#全树闭合`
Entities:
- `bun|scripts/test-evidence/closure.test.ts|closes one static and runtime entity into a stable Bun entity key`
- `bun|scripts/test-evidence/closure.test.ts|reports static-only, runtime-only, and duplicate entity identities`
Proves:
- 唯一 static declaration 与唯一 runtime report identity 生成确定性的 Bun entity key。
- Static-only、runtime-only 以及任一侧重复 identity 都产生阻断诊断。

## Case AUX-TEST-EVIDENCE-DISCOVERY-001: Bun profile 与 runner report 发现保持确定性
Owner: `docs/testing/case-maintenance.md#全树闭合`
Entities:
- `bun|scripts/test-evidence/discovery/bun-files.test.ts|expands Bun test roots with include, ignore and supplemental files`
- `bun|scripts/test-evidence/discovery/bun-files.test.ts|rejects invalid, empty and redundant Bun test surfaces`
- `bun|scripts/test-evidence/discovery/profile.test.ts|loads one versioned and sorted supported runner profile`
- `bun|scripts/test-evidence/discovery/profile.test.ts|parses stable Bun runner reports without inferring missing fields`
Proves:
- 版本化 source roots、include、ignore 与 supplemental file 规则展开完整且唯一的 Bun test 文件集合；nested `node_modules` 不属于 repository test surface。
- 非法、空、越界、符号链接或冗余 test surface 被拒绝，新增匹配文件自动进入集合。
- JUnit parser 只接受具有精确 name、suite、file、line 和成功计数的 runner report。

## Case AUX-TEST-EVIDENCE-CANCELLATION-001: Test Evidence 将取消传到真实 runner process
Owner: `docs/script-tooling.md#测试证据闭合工具`
Entities:
- `bun|scripts/test-evidence/discovery/profile.test.ts|forwards cancellation through the top-level discovery operation`
- `bun|scripts/test-evidence/ast-scan.test.ts|forwards cancellation to ast-grep scans`
- `bun|scripts/test-evidence/runner-process.test.ts|forwards cancellation to the Bun test discovery child`
Proves:
- 顶层 discovery operation 把同一 caller `AbortSignal` 传入所有 ast-grep static scan 与 Bun JUnit runtime discovery process，不会在 Test Evidence 内丢失。
- 已启动 Bun child 收到取消后保留 error、`SIGTERM` 和 `status: null`，不会被误判为成功。

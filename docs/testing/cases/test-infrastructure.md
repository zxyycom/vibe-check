# test-infrastructure

## Case AUX-TEST-EVIDENCE-CATALOG-001: 语义 Case source 与查询保持严格

Owner: `docs/testing/case-maintenance.md#存储格式`
Entities:

- `bun|scripts/test-evidence/catalog.test.ts|diagnoses malformed Case structure and stable identity conflicts`
- `bun|scripts/test-evidence/catalog.test.ts|parses and queries topic-grouped semantic Cases`
  Proves:

- 受控 topic Markdown 解析 Owner、Entities 与 Proves，并支持按 topic、owner、entity 和文本有界查询。
- 非法目录成员、symlink、heading、字段、Owner anchor、重复 ID/entity 与空语义产生阻断诊断。

## Case AUX-TEST-EVIDENCE-CLOSURE-001: Static 与 runtime entity closure 对漂移 fail closed

Owner: `docs/testing/case-maintenance.md#全树闭合`
Entities:

- `bun|scripts/test-evidence/closure.test.ts|closes one static and runtime entity into a stable Bun entity key`
- `bun|scripts/test-evidence/closure.test.ts|reports static-only, runtime-only, and duplicate entity identities`
- `bun|scripts/test-evidence/discovery/bun.test.ts|retains static and runtime closure across configured scans`
  Proves:
- 唯一 static declaration 与唯一 runtime report identity 生成确定性的 Bun entity key。
- Static-only、runtime-only 以及任一侧重复 identity 都产生阻断诊断。

## Case AUX-TEST-EVIDENCE-DISCOVERY-001: Bun profile 与 runner report 发现保持确定性

Owner: `docs/testing/case-maintenance.md#全树闭合`
Entities:

- `bun|scripts/test-evidence/discovery/bun-files.test.ts|expands Bun test roots with include, ignore and supplemental files`
- `bun|scripts/test-evidence/discovery/bun-files.test.ts|prunes excluded Bun subtrees after every include has a witness`
- `bun|scripts/test-evidence/discovery/bun-files.test.ts|keeps Bun include witnesses independent of subtree exclusion`
- `bun|scripts/test-evidence/discovery/bun-files.test.ts|rejects invalid, empty and redundant Bun test surfaces`
- `bun|scripts/test-evidence/discovery/profile.test.ts|loads one versioned and sorted supported runner profile`
- `bun|scripts/test-evidence/discovery/profile.test.ts|parses stable Bun runner reports without inferring missing fields`
- `bun|scripts/test-evidence/ast-grep/scan.test.ts|scans all configured rules once and forwards paths and cancellation`
- `bun|scripts/test-evidence/ast-grep/scan.test.ts|accepts complete configured match streams and empty scans`
- `bun|scripts/test-evidence/ast-grep/scan.test.ts|rejects failed ast-grep processes without partial matches`
- `bun|scripts/test-evidence/ast-grep/scan.test.ts|rejects malformed or unknown ast-grep matches without partial results`
- `bun|scripts/test-evidence/discovery/bun.test.ts|discovers literal Bun entities and blocks all configured unsupported shapes`
  Proves:
- 版本化 source roots、include、ignore 与 supplemental file 规则展开完整且唯一的 Bun test 文件集合；项目 profile 显式排除 nested `node_modules`。
- 非法、空、越界、符号链接或冗余 test surface 被拒绝，新增匹配文件自动进入集合。
- 已有全部 include 的真实匹配后，不读取确定整树排除的目录；文件级 ignore 不隐藏后代，未显式排除的 node_modules 不被特殊跳过。只在被排除树中匹配的 include 仍有见证，缺失 include、过滤后空集合与 supplemental 的判断保持独立。
- 通过 schema 验证并排序的 runner profile 及其 Bun file-rule arrays 是冻结快照；后续 discovery 不能通过 mutation 改写已解析的 test surface。
- JUnit parser 只接受具有精确 name、suite、file、line 和成功计数的 runner report；registration closure 还要求全部 root tests 与 testcase elements 明确 skipped，不从静态结果推断 runner 字段。
- 同一文件集合仅通过一次 config 扫描覆盖 native 与三类 unsupported rule；健康声明恢复精确实体与位置，alias、dynamic、parameterized 同时存在时各自产生准确位置的阻断诊断。
- 合法混合流及空扫描接受正常 0/1 退出；非正常退出、signal、timeout、spawn failure、malformed match 或未知 rule ID 均阻断且不泄露已解析的部分 matches。

## Case AUX-TEST-EVIDENCE-CANCELLATION-001: Test Evidence 将取消传到真实 runner process

Owner: `docs/tooling/workspace.md#source-owners-and-dependency-direction`
Entities:

- `bun|scripts/test-evidence/discovery/profile.test.ts|forwards cancellation through the top-level discovery operation`
- `bun|scripts/test-evidence/ast-grep/scan.test.ts|scans all configured rules once and forwards paths and cancellation`
- `bun|scripts/test-evidence/discovery/runner-process.test.ts|forwards cancellation to the Bun test discovery child`
  Proves:
- 顶层 discovery operation 把同一 caller `AbortSignal` 传入单次 ast-grep config scan 与 Bun JUnit runtime discovery process，不会在 Test Evidence 内丢失。
- 已启动 Bun child 收到取消后保留 error、`SIGTERM` 和 `status: null`，不会被误判为成功。

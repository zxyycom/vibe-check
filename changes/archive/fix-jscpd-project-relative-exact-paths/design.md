# Design

本设计在 jscpd adapter 的外部工具边界转换 path coordinate system，并通过该 adapter 所属的 raw-cache version 排除修复前的错误结果。

## Context

`src/package-checks/project-files/collection.ts` 形成 project-relative slash paths；这些是所有文件型 Check 的稳定 identity，不应为一个外部工具改为绝对路径。Plan 形成时，`src/package-checks/duplicate-detection/jscpd/scanner.ts` 在系统临时目录写 `path: files`，而 jscpd 将相对 `path` 相对 config 目录解析。`cwd` 已传给 child process，但不改变该 config 语义。

`src/package-checks/duplicate-detection/cache/identity.ts` 的 `RAW_SCAN_CONFIGURATION_VERSION` 是 duplicate raw evidence 的局部 invalidation boundary。`docs/scanner-dependencies.md#exact-input-handoff` 规定 adapter 不重新发现输入，report measurement 仍须经 approved exact scope 对账。

## Goals / Non-Goals

**Goals**

- 只让 jscpd 读取 approved project files，保留 public Check options、finding policy、Records、final data 和 aggregation。
- 在 project-owned identity 与 tool-owned path representation 之间建立单一转换边界。
- 使修复前可能为空的 duplicate raw evidence 必然 cache miss，并建立覆盖 public handoff 的回归。

**Non-Goals**

- 不将 config 写入项目目录，不公开 config location、path mode、arguments 或 worker policy。
- 不改变 file selection、glob、symlink、area overlap、threshold、waiver、cache directory 或 cache payload schema。
- 不修改 Lizard、SCC 或任何消费项目 wrapper；仅修正 jscpd parser 对 report `format`-matched path suffix 的归一化。

## Decisions

### Intended Change

1. **在唯一 adapter boundary 转换。** 修改 `prepareJscpdScan` / `prepareJscpdInvocation` 的内部数据流，使其接收 invocation `cwd`；对每个 approved path 调用 `resolve(cwd, path)`，再写入临时 config 的 `path`。`node:path.resolve` 决定本机 platform separator、root 和 drive 语义；测试使用 `resolve` 断言，不能假定 POSIX 字符串。
2. **不改变 identity 或 output boundary。** collection、exact-input fingerprint 和 Record 继续使用原始 project-relative slash paths。jscpd 继续以 `absolute: true` 生成 report；报告中 `name` 若以同一 duplicate 的 `format` 值形成 `:format` suffix，parser 只在 path normalization 前剥离该精确 suffix，再以原 approved relative path set 做整批 exact-scope reconciliation。这是已由真实 Markdown output 暴露的 jscpd report protocol，不接受或猜测其它 suffix。
3. **保持现有 temp/process ownership。** config 和 report 留在 invocation-owned 项目根外临时目录，`finally` 清理不变。process 仍以 project root 为 `cwd`；路径正确性只由 config 中绝对 `path` 保证。
4. **只升级 duplicate raw-scan version。** 将 `RAW_SCAN_CONFIGURATION_VERSION` 的值递增。不要改变 cache directory name、payload schema 或其它 scanner identity fields；version 变化必须导致旧 key miss，而相同修复后 identity 仍命中新写 entry。
5. **用源码与发布物两层真实回归固定边界。** 在 `scanner.test.ts` 将现有真实 jscpd test 改为从该 test project root 的 relative `a.ts`、`b.ts` 输入 adapter，仍断言一个 measurement 及 relative report locations。另在 `default-check.test.ts` 创建实际重复的 project-relative source files、使用 package jscpd 和 blocking area policy，断言 trusted Record、failed Check 及 explicit `all` aggregate failed；该测试不得以 fake report 或绝对 input 代替真实 handoff。
6. **修正 installed consumer 的预期并投影 Record evidence。** `scripts/package/candidate/external-consumer/runtime.ts` 已写入两份相同的 duplicate source；`fixtures/runtime.mjs` 必须从 completed snapshot 或已发布 `records.ndjson` 投影该 Check 的 Record evidence，`runtime-evidence.ts` 断言 package candidate 的 `duplicateOutcome` 为 `passed`、final data 精确为 `{ blockingFindingCount: 0, findingCount: 1 }`，且恰有一个 `duplicate-detection` non-blocking trusted Record，且 locations 为两份 fixture files。不要只把 final finding count 作为 Record 的替代证据。
7. **保留独立 parser evidence。** `parserEvidence.duplicate` 是 fixture 对 `parseDuplicateDetectionData({ blockingFindingCount: 0, findingCount: 0 })` 的零值 parser-contract 断言，不描述这次 jscpd Run；无需因 runtime duplicate Finding 更改。保留现有 fake-command tests 以证明 config `path` 等于 `resolve(root, relativePath)`，并在 parser test 覆盖 `format` 对应 suffix 的剥离，同时保留现有 failure projection。

数据流：

```text
approved project-relative exact paths
  -> adapter: resolve(invocation cwd, path)
  -> absolute paths in temporary jscpd config
  -> jscpd JSON report (absolute locations)
  -> parser normalization to project-relative paths
  -> existing exact-scope reconciliation, Records, and settlement
```

### Resulting Impacts

- raw-cache version change 只让 duplicate raw evidence rescan 一次；cache key/payload tests 必须证明新旧 version key 不同及新 entry 可读回。
- custom command protocol 未扩张：custom executable 仍只获得 adapter 生成的 version/scan invocation；其 config reader 现在接收绝对 `path`，这是私有 protocol 的兼容性变化。
- 每次测试正文或 entity 变动，实施者必须按 `test-evidence-review` 重审受影响 Case 的 owner、membership、Proves、证明信号与维护价值；语义改变时同步更新 Case，语义连续时保留 Case ID，不创建重复 Case。
- installed consumer acceptance 必须读 candidate 安装后的 Run/Record evidence；它证明发布物而非源码树，但不替代上述真实 public-handoff regression。
- `parserEvidence.duplicate` 不承接 runtime scan result，故不随这项 fixture 行为改动；若实施中改变它的 parser 契约输入，才另行重审该 evidence。

## Risks / Trade-offs

- 绝对路径短暂存在于本机 invocation-owned config 与子进程输入；config 在 `finally` 清理，公开 Records 和 machine facts 继续只保存 project-relative identity。
- 启用 blocking policy 的消费者可能首次发现之前被漏掉的 duplicate 并失败；这是恢复既有门禁，而非收紧 threshold。
- 全部旧 duplicate raw entries miss 会增加一次扫描，但保留可能错误的空 entry 会继续导致 false pass。

## Open Questions

无。转换位置、cache invalidation、测试层级和 public compatibility 边界均由现有 owner 与隔离复现确定；实施不需要新增产品决策。

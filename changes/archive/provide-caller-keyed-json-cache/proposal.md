# Proposal

本 Change 提供 package-root `cacheJsonByKey(...)`，让 custom Check 和普通项目代码用自己生成的完整 key 复用本地 canonical JSON object。它是 caller-owned computation 的持久化 helper，不是 Project Run cache，也不缓存或重放整个 Check。

## Why

项目通常已经知道哪些输入、实现、options、工具或环境会改变一次昂贵计算，也可以自行形成 hash；但每个 consumer 仍需重复实现 identity 隔离、磁盘 payload validation、corruption fallback 和 atomic publication。把依赖发现交给 Product 会形成不可靠的语言/构建系统推断，把整个 Check 交给 Run cache 又会要求重放 outcome、Records、messages、duration 和 side effects。

当前 duplicate detection 具有 Check-local raw fragment cache，但其 identity、payload 和失败结算只服务该 Check，不能直接成为 custom consumer contract。新的公共能力只提炼 caller-keyed JSON storage 的稳定机械责任，并继续让实际 consumer 拥有缓存语义。

## Outcome

调用方显式传入 absolute directory、`namespace`、payload `version`、opaque `key`、payload parser 和 computation。helper 对规范 identity 做 SHA-256、按 digest 查找 entry、把 disk bytes 当作不可信 JSON、在 miss/invalid/read failure 后 compute，并用同目录临时文件和 atomic rename 发布。

成功 hit 与成功 compute 都返回当前 invocation 的 typed value 和闭合 cache observation。cache I/O failure 只影响 observation；只要 computation 成功，就不改变 value，也不替调用方产生 Check message、Record 或 terminal status。

## Scope

### Intended Change

- 从 package root 导出异步泛型 `cacheJsonByKey(...)` 及其 options/result 类型；它是 standalone public utility，不进入 `ProjectDefinition`、`RunControls` 或 `CheckExecutionContext`。
- closed input 要求 absolute、非空且不含 U+0000 的 directory，以及非空 `namespace`、`version` 和 `key`；`parse` 必须同步，`compute` 可以同步或异步。
- 将 cache API version、namespace、payload version 和 caller key 作为结构化 identity 做 SHA-256；文件名只使用 digest，entry 和 diagnostic observation 都不保存 raw key。
- 只接受 canonical JSON object payload。hit 前验证 format/identity envelope 并调用 caller parser；miss、malformed JSON、envelope mismatch 或 parser rejection 都重新 compute。
- computed candidate 先 snapshot 为 detached canonical JSON object，再通过同一 parser，之后才返回并尝试写入；throw、cancel、noncanonical candidate 或 computed parser rejection 不写 entry。
- hit 返回 `{ source: "cache", read: "hit", write: "not-attempted", value }`。compute 返回 `{ source: "computed", read: "miss" | "invalid" | "failed", write: "stored" | "failed", value }`；完整 result object 冻结。
- 写入使用目标目录中的唯一临时文件和 atomic rename；并发 miss 允许重复 compute，但不能暴露 partial target。rename 因并发 target 冲突而失败时，重读并按完整 hit boundary 验证 target；只有 valid target 才视为 stored。
- cache directory 是 caller 信任且可随时删除的本地状态空间。第一版不提供 secret protection、tamper resistance、containment、remote sharing、locks、eviction 或 cleanup。
- 保持 duplicate-detection cache 的配置、domain identity、payload parser 和 unavailable mapping 不变；本 Change 不迁移该 store，也不改变 Run/Check settlement。

### Resulting Impacts

- 新建独立 public cache owner，并由 `src/index.ts`、package declaration/material inventory 和 installed consumer 承接公开入口。
- Architecture 与 API mechanics 需要说明 shared storage mechanics、caller-owned key/payload/computation 和 Check-owned adoption policy 的分层。
- 新 helper 会执行显式 filesystem I/O，但不获得 project root、scanner、Check facts、diagnostic logger 或 output capability。
- [`provide-caller-keyed-json-cache-without-run-caching.md`](../../docs/decisions/provide-caller-keyed-json-cache-without-run-caching.md) 是长期方向 owner；Change 完成后再核对 alignment。

## Success Criteria

- 相同有效 identity 的第二次调用不执行 `compute`，通过 caller parser 返回 typed cache value，并报告 `cache/hit/not-attempted`。
- namespace、payload version 或 key 任一改变都会使用不同 identity；raw key 不出现在文件名、cache envelope、result 或 helper-owned diagnostics。
- missing entry 报告 `miss`；malformed JSON、identity mismatch 和 parser rejection 报告 `invalid`；其它 read I/O failure 报告 `failed`。三者均在 computation 成功后返回 computed value。
- computed value 在 hit/miss 两条路径使用相同 canonical JSON object 与 parser boundary；noncanonical value 或 computed parser rejection 抛出且不发布 entry。
- write failure 报告 `write: "failed"` 但仍返回 computed value；临时或最终 entry 不完整时永不形成 hit。
- 两个进程或并发调用使用同一 identity 时可以重复 compute，但只观察完整 valid entry；不引入 lock、single-flight 或全局 mutable cache state。
- absolute-directory grammar、trusted-directory/security 边界、caller key 义务、无自动依赖发现和无 whole-Check replay 在 public JSDoc、README/API docs 与 external consumer 中一致。
- Product Run、Definition、scheduler、Check facts、Records、messages、machine output 和 duplicate-detection cache observable behavior 不变。

## Affected Owners

- `src/cache/**`：public identity、envelope、read/compute/write orchestration 与 atomic local store。
- `src/index.ts`、`scripts/docs/package-api/**`：package-root export、declaration 和 public inventory。
- [`README.md`](../../README.md)、[`docs/api-mechanics.md`](../../docs/api-mechanics.md)：consumer usage、key obligation、observations 与安全边界。
- [`docs/architecture.md`](../../docs/architecture.md)：standalone cache utility 与 Run/Check owner 分层。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：public cache semantic Cases 与 installed consumer evidence。

# Tasks

任务先固定公共契约和 evidence，再实现 standalone cache owner；不得把 convenience helper 扩大为 Run cache 或通用 artifact store。

## Readiness

- [x] 0.1 已建立 active unaligned Decision `provide-caller-keyed-json-cache-without-run-caching.md`，并以修订关系归档旧的 duplicate-only cache 判断；后继保留 duplicate Check ownership，同时明确公共 helper 不进入 Run settlement。
- [x] 0.2 按 Test Evidence 流程登记 public contract Cases，覆盖 identity/input grammar、hit/miss/invalid/read-failed、computed validation、write failure、concurrency、raw-key canary 和 installed consumer。

## Implementation

- [x] 1.1 在独立 `src/cache/**` owner 实现 closed options validation、canonical structured identity、SHA-256 digest、closed on-disk envelope 和 parser-backed hit validation；复用现有 canonical JSON object boundary，不建立 parser registry。
- [x] 1.2 实现 read classification、exactly-once miss computation、computed snapshot/parser parity、同目录临时文件、atomic publication、concurrent-writer conflict 和 best-effort temp cleanup；cache I/O failure只进入 result observation。
- [x] 1.3 从 package root 导出 `cacheJsonByKey` 与 public types，补齐 JSDoc、package inventory/declaration、README custom Check 示例、API mechanics 和 Architecture owner；明确 key/security/disposable-directory 义务及所有 non-goals。
- [x] 1.4 扩展真实 installed external consumer：使用 caller-generated key 连续运行两次 custom computation，证明第一次 computed、第二次 hit、parser/type 可用且两次 Check execution 都正常结算；不迁移 duplicate-detection store。

## Verification

- [x] 2.1 运行 cache owner 最窄 tests，证明 unknown/malformed inputs、identity isolation、raw-key absence、parser hit/miss parity、corrupt/mismatch recovery、compute throw/cancel/no-write 和 write-failed value preservation。
- [x] 2.2 运行并发/atomic filesystem tests，证明 reader 不接受 partial target、竞争 writer 只发布完整 envelope、临时文件 best-effort cleanup 且没有 lock、single-flight 或 global mutable state。
- [x] 2.3 闭合 semantic Cases，运行 product typecheck、lint、format、docs、Decisions、package candidate 与 installed consumer，再运行 required/full workspace Gate；复核 RunResult、machine artifacts、duplicate cache behavior 不变，并在事实 owner 同步后核对 Decision alignment。

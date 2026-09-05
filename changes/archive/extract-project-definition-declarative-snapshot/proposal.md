# Proposal

将声明快照与指纹的实现移到 Project Definition public façade 背后的单一私有 owner，同时保持既有公开入口和可观察行为。

## Why

`src/project-definition/project-definition.ts` 的 file code-lines quality Record 为 312，超过 300 行上限；声明快照构造、规范序列化和 SHA-256 指纹是可独立归属的内部职责。

## Outcome

经既有 `project-definition.ts` public façade 使用 Project Definition 的调用者，继续得到相同的 grammar、authoring defaults、runtime normalization、callback identity、immutable declarative snapshot 和 SHA-256 fingerprint。快照构造、canonical serialization 与 hash 只有 `declarative-snapshot.ts` 这一个内部实现 owner；本 Change 不新增 public API、public import path 或独立的 snapshot façade。

## Scope

### Intended Change

新增 private `declarative-snapshot.ts`，将既有 declarative snapshot、stable JSON 和 SHA-256 fingerprint 实现移入其中。`project-definition.ts` 继续拥有并导出 public types/API、authoring defaults 与 runtime normalization；它在 normalization 时委派 snapshot 构造，并从同一既有 public façade re-export `createDeclarativeFingerprint`。

### Resulting Impacts

- 对 public consumers：导入位置和 public type/API 不变；它们不需要感知或直接使用私有 snapshot owner。
- 对 snapshot owner：仅接收 validated definition 与 normalized checks，保留 normalized Check declarations、scheduler declarative projection、deep freeze 与 stable serialization。
- 对声明边界：`execution`、`preflight`、custom callbacks 和 measurement hooks 不进入 snapshot/fingerprint；runtime policy 继续保留 callbacks，learned `stateDirectory` 继续进入声明 identity。

## Success Criteria

- `project-definition.ts` 的 code-lines 从 312 降至 256，focused quality 从 36 Records 降至 35，且不再报告该文件。
- 原 public import/API、Project Definition grammar、normalization 的 callback identity，以及同一 declarative input 的 fingerprint 兼容性保持不变。
- 已运行最窄 fingerprint test、test-evidence integrity、product engineering checks、focused quality、一次 default Gate 和 Change check；这些证据不宣称 full Gate 或发布验收已完成。

## Affected Owners

`docs/configuration.md` 是 Project Definition contract owner，`docs/coding-style.md` 是实现质量 owner；`src/project-definition/**` 是实现与测试 owner。Change Plan artifacts 只记录本次实施、验证证据与未覆盖边界，不替代这些稳定 owner。

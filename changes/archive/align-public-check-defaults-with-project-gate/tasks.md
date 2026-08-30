# Tasks

任务先建立长期方向与测试起点，再分离 Product defaults 和 Gate policy，最后同步 package material 与验证证据。

## Readiness

- [x] 0.1 已读取 Configuration、Quality Metrics、Scan Scope、Coding Style、Testing、Decision 与 Change owners，以及相邻 Product/Gate 实现和测试。
- [x] 0.2 已运行修改前 `bun run test-evidence -- check --root .`，确认 269 个当前测试实体全部由 81 个语义 Case 映射。
- [x] 0.3 已确认公共 files value、advisory defaults 与 Gate strict policy 是两个独立长期判断；不存在需要继续由实施者选择的 preset、merge 或兼容方案。
- [x] 0.4 已将本 Change 固化为 Plan；实现范围包含 public inventory、installed consumer、documentation projection、Case 与 Gate policy，不把当前质量 Finding 清理纳入本次验收。

## Implementation

- [x] 1.1 公开并深冻结 `defaultProjectFileSelection`，补齐常见 log/coverage/temporary/Python outputs，并让全部 file-selecting constructors 继续从该 owner 物化完整 files branch。
- [x] 1.2 将四项质量 Finding 的 package default 改为 non-blocking，并更新 duplicate/file/function 的固定宽松阈值与 public JSDoc。
- [x] 1.3 在 Project Gate 显式固定当前 repository file/function thresholds、既有 duplicate area thresholds 与 non-blocking policy。
- [x] 1.4 更新 public contract/defaults inventory、runtime artifact audit 和 isolated consumer，证明 root export、类型与 object/array composition。
- [x] 1.5 更新 Configuration、Scan Scope、Quality Metrics、四份 Check guide、README/API mechanics 及受管 documentation projections。
- [x] 1.6 更新目标测试和既有 Case `Proves`，覆盖默认文件剔除、advisory outcome、relaxed thresholds 和 Gate strict policy。

## Verification

- [x] 2.1 运行 project-files、四项 quality constructor/runtime、Gate quality、public inventory 与 isolated consumer 目标测试。
- [x] 2.2 运行 Test Evidence closure、package API documentation `--check`、Decision check 与 Change check。
- [x] 2.3 运行 Product/Script typecheck、lint、format check 与 package candidate/acceptance 相关验证。
- [x] 2.4 运行 `bun run verify:vibe-check-workspace:required`，复核本次 Gate logs 与 quality Check statuses 没有因 public defaults 漂移。
- [x] 2.5 使用 ai-ready-docs 复审本次 Change 与 public documentation delta，并以 `docs/coding-style.md` 复审全部代码 delta；修订后重跑受影响验证。

# Tasks

任务先固定 owner、行为护栏与验证边界，再进行纯内部职责拆分；全部勾选表示已完成 Plan 工作，不构成归档、提交或全仓库 Gate 授权。

## Readiness

- [x] 0.1 已读取 diagnostic output owner、coding style、相邻 logger/detail renderer 和共置 tests，确认 scope 不进入 invocation/completion、scheduler/admission、detail safety 或 public contract。
- [x] 0.2 已确认 406-line logger 的 rendering/fact/continuation 逻辑是独立输出表达职责，现有 tests 覆盖其可观察边界；“字节不变”限于这些已覆盖 formatter 输入，不是全输入空间声明。

## Implementation

- [x] 1.1 新建具名 observation-rendering module，迁移既有安全 header/fact/continuation rendering 而不改变输出算法、常量或 bounds。
- [x] 1.2 将 logger 收敛为 router/channel writer lifecycle，保持 local/router sequence、failure containment 和 close ordering；在原 append 点向 renderer 传递同一 correlation/observation/sequence 输入并写入其返回 buffer。
- [x] 1.3 审阅局部 diff，确认旧 formatter 整体迁移、没有 formatter 行为改写，也没有跨 owner、public surface、producer 或 output-contract drift。

## Verification

- [x] 2.1 运行 logger tests 与必要的 invocation diagnostic tests，证明已覆盖格式化输入的精确输出、correlation、writer isolation 和 close behavior；它们不证明任意未构造输入的全域字节等价。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`、产品 typecheck/lint/format 及 Change Plan check；这些检查不代替 formatter 行为测试或 default/full Gate。
- [x] 2.3 运行定向 file-metrics quality verification，确认 quality Record 37 → 36、logger `code-lines` finding 消失且没有新增；不运行 default/full Gate，因为该 aggregate 超出本 Change 的验证边界。

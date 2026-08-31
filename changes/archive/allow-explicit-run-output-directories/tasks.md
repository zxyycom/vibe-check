# Tasks

任务先记录可信target方向，再统一两个配置边界和运行解析，最后证明外部及同目录输出不会扩大file ownership。

## Readiness

- [x] 0.1 使用Decision Records记录Run output directory允许明确root外target、不是filesystem sandbox，并保留每项output独立配置。
- [x] 0.2 复核Definition fingerprint、RunControls merge、diagnostic readback、machine atomic publication和跨平台Node path语义，固定共同grammar与精确file ownership。

## Implementation

- [x] 1.1 统一Definition与RunControls的machine/diagnostic directory解析，接受非空无U+0000的相对、`..`和绝对target并在I/O前拒绝其它值。
- [x] 1.2 调整invocation/completion/readback及相邻tests，证明两个output解析一致、root外文件可定位、同目录无冲突且failure isolation不变。
- [x] 1.3 更新README、Configuration、API mechanics、Output、Decision与语义Cases，移除containment主张并说明可移植Definition建议和非sandbox边界。

## Verification

- [x] 2.1 运行最窄Definition、RunControls、machine publication与diagnostic logging tests，覆盖子目录、父级、绝对、空/非法、同目录、失败清理与零pre-work I/O。
- [x] 2.2 运行typecheck、lint、format、docs validation和Test Evidence closure，审查没有共享`outputRoot`、目录清空或realpath sandbox抽象。
- [x] 2.3 运行`bun run verify:vibe-check-workspace:required`与package candidate acceptance，证明公共文档、declarations、machine schema及仓库Gate默认evidence保持闭合。

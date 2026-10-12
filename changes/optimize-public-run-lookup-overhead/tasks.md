# Tasks

先冻结基线，再实施两个独立 owner，停止写入后测量与独立审查；Git 提交与 Plan 结项删除分别按当前授权及门禁执行。

## Readiness

- [x] 0.1 恢复调查、相关稳定 owner 和 Decisions，确认不激活其它 admission Changes。
- [x] 0.2 冻结 C02 与 R01/R02/R03 的实现边界、行为风险、Case 归属与测量协议。
- [x] 0.3 完成公共入口 before baseline 与源码/harness 身份记录，再允许源码写入。

## Implementation

- [x] 1.1 实施 session Map/Set 复用并加强注册、opaque ID 与 lifecycle 行为证据。
- [x] 1.2 实施 blocker、scope 与 fingerprint 复用并加强分类、顺序和观察证据。
- [x] 1.3 同步实际改变的内部 owner 事实并完成实现自验证。

## Verification

- [x] 2.1 在稳定源码上完成同协议 after 与操作计数，说明收益、噪声和未覆盖边界。
- [x] 2.2 由非实施代理审查正确性、测试证据和实际 diff 的文档影响，处理实质阻断。
- [x] 2.3 完成受影响验证、Case 完整性与完整 Gate，并核对局部 diff。
- [x] 2.4 将形成时证据交接 Investigation，复核成功标准并说明 Git 与 Plan 生命周期的实际边界。

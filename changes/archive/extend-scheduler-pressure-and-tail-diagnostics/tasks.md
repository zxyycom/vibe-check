# Tasks

本 Plan 先锁定已确认的事实分类、tail 与 identity 边界，再由 Scheduler/Invocation owner 实现和测试；最后分别完成正确性、AI-ready 文档、编码规范、workspace 门禁与本机观察。只有有直接证据的 readiness 已勾选，其余任务保持未完成。

## Readiness

- [x] 0.1 已审阅当前 Scheduler decision inspection、execution shell、performance accumulator、Invocation fingerprint handoff和稳定 architecture/API/testing owner；确认 constructor与每次真实 mutation后的 state capture足以原子安装 post-state projection且不需额外 sample，archived `add-scheduler-performance-diagnostics` 不能修改。
- [x] 0.2 已固定 admission-viable universe与 mutex-blocked → capacity-blocked → admissible-pending互斥顺序；确认 actually admitted Task从首次 admission-viable logical state boundary到 admission的三类区间在语义上覆盖其 graph-ready-to-admission delay，而 failed-dependency blocked Task排除于 queue pressure。
- [x] 0.3 已固定 flat summary shape、top-delay求和不变量、`discrete.completionTailActiveTaskCount` 与 `topCompletionTailContributors` membership/top-three排序、exact Invocation declarative fingerprint复用及无 public/machine/OS/policy-version/callback-identity边界；以 active + unaligned 后继 Decision承接未来方向。

## Implementation

- [x] 1.1 在 accumulator constructor与每次真实 mutation后的 `captureState` 原子安装 enabled-only immutable post-state admission-pressure projection，复用 canonical relation/mutex/`canAdmit` 事实，并在下一既有 boundary实现 total/三类 flat task·ms与 timing-independent total/分类 peak counts；不得新增 clock sample、第二状态机或 disabled-path工作。
- [x] 1.2 扩展 actually admitted chronology，使 top-three admission delay item平铺三类 breakdown并验证求和；实现 `discrete.completionTailActiveTaskCount`、bounded `topCompletionTailContributors` 及稳定排序，保持 cancel/policy-fault drain与 timing unavailable语义。
- [x] 1.3 通过 Invocation → resolved Check execution → Scheduler private diagnostics handoff原样传递 existing `declarativeFingerprint`；不新增 graph hash、policyVersion、callback identity或公共类型字段。
- [x] 1.4 增加最小 deterministic原生测试：constructor/post-mutation capture与下一既有 boundary、无独立新增 clock sample、projection互斥/闭合、mutex/capacity/admissible时段、prospective scope capacity、custom wait、breakdown求和、tail membership/bound/order、fingerprint exact handoff、zero span/unavailable、disabled、cancel与policy-fault terminal。
- [x] 1.5 同步 `docs/architecture.md`、`docs/api-mechanics.md`、`docs/testing.md` 与 semantic Case owner，准确说明 admission-viable versus broader graph-ready、task·ms/peaks、delay/tail、identity限制、human-only边界及 future capacity re-review trigger。

## Verification

- [x] 2.1 按 Test Evidence流程在修改测试前后运行 `bun run test-evidence -- check --root .`，闭合新增/修改 Case与稳定 Proves，并运行最窄 Scheduler、Invocation/diagnostic、progress/machine边界测试。
- [x] 2.2 派发独立 correctness reviewer，只审核分类、边界、求和、tail membership、identity handoff、failure containment及无公共契约回归；修复全部阻断性正确性问题。
- [x] 2.3 最终使用 `ai-ready-docs` 审阅并优化本 Change影响的稳定文档与 Plan，使用 `docs/coding-style.md` 作为全局权威审阅并优化本次代码；删除无必要 abstraction，不以相邻旧代码替代编码规范。
- [x] 2.4 运行受影响 typecheck、lint、format、documentation、Decision Records与 Change Plan检查，以及 `bun run verify:vibe-check-workspace:required`，全部通过并记录实际证据。
- [x] 2.5 运行 `bun run verify:vibe-check-workspace:full` 完成最终全量验收；若环境造成非产品失败，保留可复核日志并在完成前解决或明确阻断，不以 required代替 full。
- [x] 2.6 在本机 diagnostic-enabled Gate运行中观察 declarative fingerprint、total/三类 queue task·ms、total/分类四个 peaks、top delay breakdown与tail contributors，记录实际数值和解释边界；不从单次样本声称性能优化、capacity因果或benchmark budget。

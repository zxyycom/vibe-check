# Gate 预算阻断验收

本文件保存 2026-10-22 本轮实现与验收结果，不定义新的阈值或测试清理任务。

## 改动与验证边界

- 三项严格超标均为 error / blocks，沿用相等通过、原统计口径、focused 豁免及初步非 passed 不提升。
- 现场沿用 gate.log，新增安全 JSON 投影；Product facts、machine schema、调度和测试选择未改。
- 原本机预算文件逐字未变，SHA-256 为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`。
- required / all 正式入口各运行一次；没有因性能失败重跑，也未自动重试或放宽预算。

## 局部证明

| 验证 | 结果 |
| --- | --- |
| 两个 Gate 目标测试文件 | 25 pass / 0 fail；覆盖两个 profile 的独立及组合超标、只执行一次、事实不改写和真实 transcript 落盘。 |
| 全树 Test Evidence | 前后均 766 entities / 190 Cases / 16 topics；没有增删测试实体。 |
| typecheck / lint / validate | 通过；validate 包含严格 JSON、schema、机器示例与 Markdown 链接。 |
| Decisions / Change 集合 | 决策严格检查通过，22/22 当前 Change 有效。 |
| 独立实际 diff 与文档影响审查 | 通过；本次不影响 src、公开 API、schema 或随包说明，无需同步用户材料。 |

独立审查发现 JSON.stringify 不转义全部终端禁用字符，曾可能使 contribution 被拒绝而丢失现场。
现编码器与校验器共享终端 code-point 策略；既有用例覆盖转义、contribution 接受与原值读回，
reviewer 另以 163 个代表字符点轻量复验通过。首次局部 lint 的控制字符正则错误与决策归档后的相对链接错误均已修复并复验。

## 正式入口结果

| 场景 | Product Check facts | 总反馈 / 预算 | 均值 / 预算 | P95 / 预算 | Gate 结果 |
| --- | --- | --- | --- | --- | --- |
| `bun run check` | 18 passed / 25 not-applicable | 13248.4 / 30000ms | 1798.9 / 2000ms | **5188.7 / 5000ms** | failed / exit 1；P95 超标 |
| `bun run check -- --all` | 43 passed | 35779.0 / 90000ms | **2125.6 / 2000ms** | 4781.8 / 5000ms | failed / exit 1；均值超标 |

required 最慢三项为 tests-scripts-project 5188.7ms、function-metrics 4696.5ms、tests-scripts-layout 3833.6ms。
all 最慢三项为 prepared-external-package-consumer 9691.5ms、function-metrics 7103.4ms、tests-package-consumer-types 4781.8ms。
这些是本次执行成本，不直接证明根因，也不作为删测试的理由。

两次均使用同一 candidate，实际 preparationAction/reason 为 reuse / installation-current：

- version：`0.0.0-local.68ffc5818fc2`
- artifact SHA-256：`9a3775fa72349b292dd1dded957cc2df339cf9539167bfcd290c8637ca9509a3`
- candidate inputFingerprint：`68ffc5818fc21fa054725f2a11d18679a66dc2c713e489ed280c87adbfd15a91`
- Definition declarativeFingerprint：`80d92019326a366180c93361b357261f016fb954421d6b82d98b03efa5125081`

这两类输入身份不覆盖整个脏工作区，也不证明两次机器竞争状态相同。本轮没有进行 before/after 性能优化比较。

## 本地现场与复核

本机证据位于 Git 忽略目录，不作为可跨环境解析的规范或提交材料：

- required：`.log/project-gate/2026-10-22T07-12-01.379Z-3325844-9fe44ae3-f8a8-49c3-9e3d-7db88d519657/`
- all：`.log/project-gate/2026-10-22T07-12-25.224Z-3330217-9310c6e9-5113-494a-bf45-c1ba74e12157/`
- 本轮命令输出与独立核对摘要：`.log/gate-performance-enforcement/20261022-bM6W8z/`

已读回两次 gate.log：现场消息各一条，包含原始预算/测量、全部 duration facts、候选身份/准备动作与日志目录；
各有唯一 failed / exit 1。独立计算核对均值和 nearest-rank P95；machine/run.json 的 outcome counts
与上表一致，Product Check 均未因性能改写为失败。正式 Gate 的性能失败仍真实存在，后续按 owner 审查测试，
本轮未清理测试或开展额外优化。

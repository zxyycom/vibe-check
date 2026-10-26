# AI-ready 第二阶段 fresh 最终机械验收

## 机械闭合

- 工作区为 `main` / HEAD `9a5be25bf02886e5271b96b31da35ae98c3ca680`，cached 为空。422 tracked 与31 untracked 非忽略改动均在 Decision、Investigation、指定协调文档和 `refresh-governance-records` Change 范围内，越界路径0。
- `_resources` 树逐路径/类型/内容哈希与 HEAD 完全一致：两侧974项，新增/删除/变化/ignored 路径均0。
- 阶段二 ledger SHA-256 与授权值一致；504行/504唯一ID，无漏项、重复、额外 ID。504个 phase-two final source hashes 全部吻合；phase-one final → phase-two before 哈希逐ID闭合，路径与 phase1 ledger 一致。Decision 最终 index 路径/status/alignment 与 ledger 一致。
- 504项分类：semantic-or-heading 61、blank-lines-only 71、unchanged 372；五分区分别 active127/archive251/investigation A40/B43/C43，无重叠或遗漏。每条都有五维字段。独立 review coverage 504/504，R1/R2/R3 均关闭并独立复核，无 open findings。
- 独立把五份 owner patches 在临时目录反向应用：五组 exit 0、哈希匹配，132个唯一源路径；504个重建的 phase-two before 哈希全部吻合。frontmatter 与 phase-two before 相比仅 A/C 两篇 Investigation 的 `question` 发生获准改写；其余字段保持。
- 集成的 `stage.patch` SHA 为指定 `dee6b21…`，并已验证字节与五份 source patch 按序拼接完全相同（两侧339,485 bytes），相对路径唯一数132，解决先前混合 unified-header 格式导致的初步漏计。
- 新旧索引最终计数：Decision 378（active127：124 aligned、3 unaligned；archived251），Investigation126。对当前31个未跟踪交付文件及 patch 新增内容行检查 trailing whitespace 均0；`git diff --check` 另通过。

## 最终命令

所有命令均已实际运行，exit 0；最小日志见 `logs/`，退出码与摘要见 `command-results.json`：

- `bun run decisions -- check`
- `bun run investigations`
- `bun run validate`
- `bun run test-evidence -- check --root .`
- `bun run change-plan -- check changes/refresh-governance-records`
- `bun run change-plan -- check-all changes`
- `git diff --check`

Change 检查显示16/18 tasks complete，2.4/2.5待集成者根据本验收证据勾选，属预期，不作为失败。

## 边界

未运行历史附件测试或产品 Gate/build/consumer/install acceptance；未安装依赖。审计器只在 `tmp/governance-ai-ready/verification/` 写证据，未改正式记录、索引、Change 或 Case，也未执行 git stage/commit/push。

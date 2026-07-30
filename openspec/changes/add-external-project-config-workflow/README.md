# add-external-project-config-workflow

## 状态

- **就绪度**：planning audit 已完成；implementation 被 `tasks.md` 0.4 阻塞。
- **已实现行为**：显式完整 `--config` 已可用；discovery 与 `init` 尚未实现。
- **阻塞依赖**：生成长期 starter 和 dogfood config 前，先与活动中的 Lizard TypeScript
  port 收敛最终 `QualityConfig.tools` 形状。
- **推荐顺序**：先完成 `stabilize-machine-readable-output`，再完成或明确取消/收缩
  Lizard port，最后实施本 change。

## 目标结果

每个被扫描项目拥有一份完整、可信的 `vibe-check.config.json`。Product CLI 只在 normalized
project root 发现该文件，或采用显式 `--config`；`init` 可以生成单一
repository-neutral starter，但不扫描、不联网、也不覆盖已有内容。Vibe Check 仓库通过显式
选择 checked-in dogfood config 复用同一 public config path。

## 范围边界

本 change 拥有 config discovery、initialization、selection provenance、已声明 tool
environment override precedence、dogfood config 迁移和 formal-entry acceptance。它不引入
partial config、preset、parent-directory search、remote config、package distribution 或新
scanner。

## AI 执行路径

1. 先读 `proposal.md` 恢复产品结果和成功边界。
2. 再读 `design.md` 恢复当前事实、决策、config precedence、跨 change 顺序和 deferred
   triggers。
3. 把 `specs/**` 作为目标可观察 contract。
4. task 0.4 未完成时不得实施；关闭后按 `tasks.md` 顺序推进。修改测试正文或实体时同步维护
   semantic Case。

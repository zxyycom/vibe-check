# 在项目内采用长期决策记录

## 索引摘要
- 目的: 让长期工程取舍可恢复、可审阅，并能在后续任务中一致沿用。
- 背景: 项目已有规范与 OpenSpec，但缺少跨任务长期判断的独立生命周期索引。
- 决策: 在仓库内安装 decision-records skill，并用 docs/decisions 维护确认过的长期判断。

## 目的
- 为会持续影响后续工作的工程取舍保留可版本化、可检索、可演进的判断依据。
- 让后续维护先恢复相关目的、背景和采用方向，再对照当前 owner 判断是否继续沿用。

## 背景
- `docs/` 已承接长期规范，OpenSpec 已承接较大 change，代码和测试已承接当前实现证据。
- 这些材料没有统一表达长期取舍的生命周期、精简投影和直接演进关系，跨任务恢复仍依赖分散上下文。
- 引入的 skill 同时提供确定性 CLI 与 ESM 接口，可以在不进入产品 runtime 的前提下服务仓库开发工作流。

## 决策
- 采用: 将上游 `decision-records` 原样安装在 `.codex/skills/decision-records`；项目接入文件留在 skill 目录外，升级时替换 skill 并严格检查现有决策集合。
- 采用: 使用 `docs/decisions` 保存已确认的长期决策；代码、配置、规范和项目文档继续承接当前事实与行为。
- 采用: 由 `scripts/decision-records.ts` 显式传入仓库根并复用 skill 的 ESM 导出，package scripts 提供查询、校验和显式维护入口。

# Proposal

本 Draft 梳理 Product 与 Project Gate 的扩展生命周期，明确每个位置对应的函数角色、顺序、权限、失败和依赖边界。

## Why

当前公开说明分别描述 Check `preflight` / `execution`、admission strategy、terminal `measurementHooks`、prepared `complete` 和项目私有 `afterGate`，但缺少一条能恢复整体顺序和责任差异的阅读路径。相近的 callback 形式容易被统称为 Hook，进而把配置依赖、Check 数据依赖和运行时副作用顺序混为一体。

可组合功能配置需要先知道每项贡献属于哪个稳定扩展槽位、哪些槽位可累加、哪些必须独占，以及依赖应由配置、Check graph 还是同一 owner 的内部流程表达。这份基线决定配置包可以安全组合的内容。

## Outcome

完成后，package consumer 与维护者可以从唯一导航路径恢复 Product Run 到 Project Gate 后处理的生命周期，并为每个扩展点确定角色、owner、调用条件、输入、可改变范围、顺序、失败语义及合法依赖表达。配置组合直接复用这些稳定槽位，跨扩展依赖保持显式。

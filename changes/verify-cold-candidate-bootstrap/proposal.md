# Proposal

保留前轮 cold candidate 入口异常的未决线索，在隔离环境确认可复现性；不把推测登记为已确认 Bug。

## Why

前轮验证曾在 cold preparation 后遇到 root Gate 加载 installed entry 失败，随后 status/current 与重跑成功；另一次直接运行 cold integration 测试因超时未到语义断言。暖态完整 Gate 通过不能回答首次启动是否稳定。

## Outcome

通过正式入口在隔离、可重建 fixture 中区分环境/runner 超时、解析缓存和真实 candidate lifecycle 缺陷，并形成可复核结论；只有确认缺陷且方案获批后才修复。

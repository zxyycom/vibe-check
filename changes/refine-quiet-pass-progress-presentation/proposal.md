# Proposal

本 Draft 定义 quiet-pass 省略策略，使低信息量的基础设施 Check 保持运行可见，并在安静通过后退出人读结果列表。

## Why

环境探测、共享输入准备和纯计算 provider 需要参与调度、依赖传播与失败诊断，但安静通过时通常没有值得永久保留的独立结果。当前 `visibility: "attention"` 让这类 Check 先以普通 `[n/total]` running 行出现，再在通过后移除；总量和 settlement accounting 仍包含它，因而容易被理解为漏跑或结果缺失。

默认输出需要同时保留长运行反馈和成功降噪。逐项补列省略名称会失去降噪价值，独立设计 live/results 界面又会扩大 TTY 与 append-only 输出的差异，因此本 Change 沿用现有 renderer，只调整行策略与计数说明。

## Outcome

Check author 通过直接描述效果的显式字段启用 quiet-pass 省略。启用后，Check 的 progress 行始终不带 `[n/total]`：TTY 运行时显示并刷新 elapsed，quiet pass 后不保留 settled 行，其它终态或带明细的通过结果保留。Run 开始时报告配置数量，结束时报告实际省略数量；全局 Check facts、总量、依赖、aggregation、duration readback 和 machine output 保持完整。

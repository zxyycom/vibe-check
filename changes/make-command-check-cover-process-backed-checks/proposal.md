# Proposal

本 Draft 拟让 `commandCheck` 成为普通 Check `execute` 的进程包装，承接单次外部命令后的领域处理。

## Why

当前 `commandCheck` 已统一 no-shell 启动、取消、超时、受限捕获和退出码结算。实际调用方还需要从完整命令结果形成 typed final data、messages 或安全 Records；现有接口无法交给普通 Check 风格的用户函数，调用方因此重复包装进程生命周期。本仓 Gate 的结构化失败和 typed stdout provider 是现实用例。Gate 的候选包验收还需要在启动命令前从 direct dependency 派生环境值，现有静态 environment 不能表达这一输入。

范围是 **Check-owned 的单次外部进程调用**；多步骤工具协议和非 Check 脚本保持原 owner。

## Outcome

Package consumer 配置 executable/arguments 后，可选择在命令启动前从普通 execution context 解析闭合的 environment policy；命令**正常结束且输出完整**时，再从附带命令结果的 context 执行自己的 `execute`，返回 `CheckResult` 并按需报告 Records。省略用户函数时保留简单退出码模式。Product 拥有进程生命周期与 raw output 边界，调用方拥有工具协议、环境值来源和安全投影。

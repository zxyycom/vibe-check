# Proposal

本 Draft 探索 package-root `commandCheck(...)`：项目可把外部命令组成 ordinary Check，并复用 Product 拥有的子进程生命周期。

## Why

`defineCheck` consumer 目前需要各自处理 no-shell spawn、取消、超时、输出上限以及 exit、signal 和 startup failure。Product 内置 Check 已有这些机械能力，公共构造器可统一它们，同时让调用方继续拥有工具协议与结果解释。

## Outcome

Package consumer 可用经 runtime validation 的 executable 与 arguments 构造普通 Check。Product 负责进程生命周期并只发布闭合的 Check facts；本 Draft 收敛结果映射、输出处置、environment 和默认值后再进入 Plan。

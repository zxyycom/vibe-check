# Proposal

本 Change 从 package root 提供 `commandCheck(...)`，让项目把一个 no-shell 外部命令作为 ordinary Check 参与组合、调度与结算。

## Why

`defineCheck` consumer 目前必须自行处理 spawn、取消、超时、输出上限及 process terminal cause。Product 已有 execa-backed process helper，但 async runner 尚未接入 Check 的 `AbortSignal`，也没有保留 timeout、output overflow 与 cancellation 的封闭原因，不能直接作为公共契约使用。

Git、jscpd、SCC 与 Project Gate 已证明 process lifecycle 是现实共性，工具协议、结构化 parser、Records、脱敏与 Gate policy 则由各自 owner 解释。本 Change 只统一前者，使 exit-status command 不再重复实现机械生命周期。

## Outcome

Package consumer 可用 caller-owned Check identity、独立 executable/arguments 和 closed execution policy 构造 command Check。Product 在同一 Check lifecycle 内完成 runtime validation、no-shell execution、cooperative cancellation、timeout、bounded capture 与 terminal mapping；公共 facts 和默认 outputs 只包含 exit code 或稳定 reason code。

## Scope

### Intended Change

1. 新增 package-root `commandCheck` 及其 public input、environment、output、final-data、reason 与 return types；返回值复用 ordinary Check 的 selection、dependency 和 scheduling fields。
2. 扩展 Product-private async process runner，使其接收 `AbortSignal` 并保留 startup、exit、signal、timeout、output overflow 与 cancellation 的可判别原因；execa 与 private process types 不进入 package root。
3. 固定 exit mapping：`0` 为 `passed`，numeric nonzero 为 `failed`，不能形成可信 exit fact 的分支为 `unavailable`；command Check 不解释 child output。
4. 默认使用 exact-empty environment 与 discarded output；调用方可显式选择 invocation-start ambient environment 或 Check-owned transcript。两种 opt-in 均使用 closed policy 和 fail-closed lifecycle。
5. 同步随包 guide、可执行示例、README/navigation、JSDoc/declarations、changelog、public API inventory、package material audit 与 installed-consumer acceptance。

### Resulting Impacts

- Product process owner 的 result model、async runner 和相邻 tests 需要扩展，同时保持 Git sync path、jscpd 与 SCC 的既有 tool-specific behavior。
- Command constructor 与 preparation 需要分别验证并 snapshot public input，覆盖 hostile objects、mutation、arguments、environment、path 和 limit grammar。
- Transcript 成为显式的 Check artifact capability；缺失 capability 或写入失败使 command Check unavailable，不转移为 Run output failure。
- Public material、type/runtime acceptance、canary leak audit 与 Test Evidence Case 需要随实现闭合。

## Success Criteria

1. Installed consumer 能用 `process.execPath` 构造 command Check，并在普通 Definition 中使用 selection、dependency 和 scheduling fields。
2. Exit `0`、nonzero exit、startup failure、timeout、output overflow、signal 与 caller cancellation 均产生 design 规定的 terminal outcome。
3. Constructor 和 preparation 都拒绝不符合 closed grammar 的 input；执行始终使用单一 executable 与独立 dense argument array。
4. 默认策略下，RunResult、Records、messages、progress、diagnostic 与 machine publication 均不包含 canary executable、argument、environment value、stdout、stderr 或 native error text。
5. Transcript 只在显式 opt-in 且 Check artifact capability 可用时写入固定 `process.log`；其 failure branches 有直接测试。
6. 既有 Product process consumers 通过回归测试；package inventory、docs、declarations 与 installed-consumer evidence 对同一公共契约闭合。

## Affected Owners

- Check authoring 与 settlement：`src/check/**`、`docs/api-mechanics.md`、`docs/guides/extending-check-lifecycle.md`。
- Process lifecycle 与 command Check：`src/package-checks/host-environment/process/**`、`src/package-checks/command-check/**`。
- 公开说明与投影：`README.md`、`docs/navigation.md`、`docs/package-documents.json`、`docs/guides/**`、`docs/examples/package-api/**`、`scripts/docs/package-api/**`、`docs/changelog.md`。
- Package contract 与验收：`src/index.ts`、`scripts/package/public-api-inventory.ts`、package artifact tests、installed-consumer type/runtime/documentation acceptance。
- 测试证据：相邻 tests、`docs/testing/cases/**`。

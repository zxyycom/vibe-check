# Proposal

本 Plan 保留显式授权、SSRF-safe 的 Network Link Check 方向，但在首次公开发布后、出现真实 consumer 与安全输入边界时才恢复实施。

## Why

外链可达性有价值，却引入 DNS rebinding、私网访问、redirect、ambient credentials、速率限制与临时故障。旧计划依赖 Markdown Link Check发布 invocation-private request snapshot和不存在的 Check-level private handoff；当前 `dependencies.get`只读取会进入 Core/machine的 canonical final data，不能安全承载 raw URL或凭据材料。

## Outcome

未来在真实 consumer明确目标和授权后，Package 可提供 ordinary `networkLinkValidation` Check。它通过 Check-owned closed options显式 opt-in，在独立 transport boundary内获取自己的目标输入，执行有界 SSRF-safe requests，只发布脱敏 Records/final counts，并用四态结果区分领域失败与 transport不可用。

## Scope

### Intended Change

- 恢复前先选择不持久化敏感材料的输入 acquisition：独立重解析 approved Markdown inputs，或经新的、明确评审的 Product private invocation service；不能把 raw URL写入 dependency final data、Records、cache或 artifacts。
- Check-owned options必须显式 `enabled` 并定义 allowlisted schemes/hosts/ports、redirect、timeout、request/host并发和响应 byte上限；缺失/false永不访问网络。
- DNS与每次 redirect hop都执行 public-address policy，禁止 loopback、link-local、private、metadata和未授权地址；不传播 ambient cookies/auth/proxy credentials。
- 正常 reachability defect形成 safe Records；DNS/transport/protocol不确定性按 closed policy映射为 domain result或 `unavailable`，不能伪装为 clean。
- 不纳入首次公开 release gate，也不修改离线 Markdown Link Check。

### Resulting Impacts

Network Check需要独立的授权、transport、redaction、rate/resource和 nondeterminism证据；任何“简单 fetch”实现都不足以解除暂停。

## Success Criteria

- 缺失或 disabled opt-in、Gate/profile/environment变量都不能发起 DNS/HTTP；只有 owning Check options明确授权。
- Hostname与每次 redirect解析均拒绝非公共地址，且不会通过 DNS rebinding、mixed answers、userinfo、proxy或 scheme转换绕过。
- Logs/Records/final data/cache/artifacts不含 raw query values、userinfo、authorization、cookies或 credential-derived digest。
- Timeout、TLS、DNS、status、redirect、rate limit与取消有有界、可测试的四态语义；网络临时状态不被当作稳定全局事实。
- 实施后的 public/package/docs/Case与 required/full Gate证据完整，并包含隔离网络测试环境。

## Affected Owners

- `docs/configuration.md`：future Check-owned network authorization/options。
- `docs/architecture.md`：transport与敏感材料 private boundary。
- `docs/quality-metrics.md`、`docs/output.md`：safe Records/final status/redaction。
- `src/checks/**`、`src/definition/**`、`src/index.ts`：future implementation/public surface。
- `docs/testing/cases/**`：SSRF、redirect、credentials、resources、nondeterminism与 consumer evidence。

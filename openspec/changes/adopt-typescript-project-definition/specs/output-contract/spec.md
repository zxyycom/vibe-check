> **核心句：**本 delta 让 machine output 诚实标识本次 Project Definition 的数据来源与身份，同时不把 opaque runner 或主机路径伪装成可序列化、可重放的配置证据。

## ADDED Requirements

### Requirement: Machine output identifies resolved Project Definition data

Current machine run summary SHALL 从 final resolved context 机械投影一个 Project Definition provenance，
至少包含 `source`（`default | explicit | discovered | disabled`）、literal `apiVersion` 与 deterministic
normalized data fingerprint。Output MUST 使用 Project Definition owner 提供的 final values，不得重新读取
module、重算 policy、inspect runner 或根据 console text 推断 source。

Machine provenance MUST NOT 序列化 normalized absolute config path、function source、closure state、
transitive module graph、ambient environment 或完整 resolved policy body。Contract descriptions MUST 把
data fingerprint 限定为 validated serializable policy、built-in references、custom public check metadata
与 schedule metadata 的 identity；它不是 custom result cache key、runner/planner code attestation、sandbox
proof 或独立重放保证。Private execution binding、planner factory、Task function 及其它 opaque handle MUST 不
进入 fingerprint。Public check/catalog fingerprint 继续由其 owning contract 独立维护，不得与 Project
Definition data fingerprint 换义复用。第一版 custom runner MUST 不使用 result cache；built-in cache 继续服从
其 owner 定义的完整 identity contract。

#### Scenario: Module-backed run publishes data provenance

- **WHEN**scan 使用 valid explicit 或 discovered Project Definition 完成 final model
- **THEN**machine summary 发布对应 source、API version 与 normalized data fingerprint
- **AND**artifact 不包含 selected module 的 host-absolute path 或 opaque runner representation

#### Scenario: Disabled run proves project code was not loaded

- **WHEN**scan 通过 `--no-project-definition` 使用 neutral definition
- **THEN**machine source 精确为 `disabled` 并发布 neutral resolved data fingerprint
- **AND**consumer 不需要从 path absence 或 console message 猜测是否 import 了 project code

#### Scenario: Fingerprint wording preserves its boundary

- **WHEN**reviewer 检查 runtime schema、generated schema、example 和 owner docs
- **THEN**它们一致说明 fingerprint 覆盖 normalized serializable definition data
- **AND**它们不声称相同 fingerprint 证明 runner/planner implementation、imports 或 environment 相同
- **AND**它们不把 fingerprint 用作 custom result cache identity

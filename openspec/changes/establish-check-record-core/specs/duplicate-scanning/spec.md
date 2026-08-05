> **核心句：**本 delta 让 duplicate scanner 只作为 `duplicate-detection` CheckRunner 的私有 dependency，公共结果由 Check 与 Record contract 表达。

## MODIFIED Requirements

### Requirement: Product-owned jscpd integration boundary

Duplicate scanning SHALL 从 Product-owned dependency snapshot 接收 jscpd executable、args、availability protocol 与 bounded concurrency；project semantic settings MUST 只提供 duplication quality values。Adapter MUST 把 temporary config、process protocol、reporter output、format detection 与 private options 限制在 adapter boundary，并只向 `duplicate-detection` runner 返回 Vibe Check-owned duplicate fragments 或 typed execution failure。

Runner SHALL 使用 resolved semantic settings 把 normalized fragments 转换为 CheckResult 和 catalog-valid QualityRecords。Adapter 不得直接创建 public CheckRun、record、gate 或 output；backend failure 不得撤销 runner 此前通过 bound sink 提交的 records。

#### Scenario: jscpd result is normalized

- **WHEN**resolved internal jscpd dependency 扫描 Product-approved exact paths
- **THEN**runner 只消费 Vibe Check-owned DuplicateCodeFragment data 或 typed failure
- **AND**Core、public records 和 semantic settings 不依赖 reporter structure 或 backend format name

#### Scenario: Reporter and detection details are not stable public config

- **WHEN**adapter 保存 temporary config、format detection 或 reporter output 用于复现
- **THEN**这些材料保持 scanner-private
- **AND**不进入 CheckDefinition、QualityRecord 或 project semantic input

#### Scenario: Backend failure retains earlier records

- **WHEN**runner 已提交部分 duplicate records 后 adapter execution 失败
- **THEN**records 保留且所属 CheckRun 最终为 failed
- **AND**adapter 不固定 gate 或全局 process outcome

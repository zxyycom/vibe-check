# test-fixtures Specification

## Purpose
定义 TypeScript/Bun 产品测试资产和 support fixtures 的仓库所有权、adapter boundary、
证明目标追溯与 testing owner materials 维护规则，确保测试只观察当前产品契约。
## Requirements
### Requirement: TypeScript product test assets remain traceable
Vibe Check product tests and their support fixtures SHALL 由 `src/product/**` 拥有，并且 SHALL 只证明当前 owner 定义的 TypeScript/Bun behavior。迁移后的 quality-core tests 和 support fixtures MUST 保留在 `src/product/quality-core/**`；testing owner materials MUST 将已记录的 proof target 映射到实际 test path 和唯一 `@case` marker。Scanner-private CSV rows、reporter objects 和 inline samples MAY 作为 adapter 或 parser fixture 输入，但 MUST NOT 定义稳定的 Core 或 Output contract。

#### Scenario: Product test proof targets 可审计
- **WHEN** reviewer 从 testing owner materials 检查一个已记录的 TypeScript product proof target
- **THEN** case entry 指向 `src/product/**` 下实际存在的 test path
- **AND** 对应源码保留唯一 `@case` marker

#### Scenario: Scanner fixture 保持在 adapter boundary
- **WHEN** product test 使用 scc CSV row、Lizard CSV row、jscpd reporter object 或 inline scanner sample
- **THEN** test assertion 证明 Vibe Check-owned normalized model 或 failure projection
- **AND** scanner-private fixture shape 不成为稳定的 Core 或 Output contract

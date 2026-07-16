# productize-typescript-quality-tooling

把现有 `scripts/quality/**` 与 `quality-core` 的完整 TypeScript 检测能力收归为 Vibe Check-owned 正式 TS/Bun 工具，保持 scc、Lizard/Python 与 jscpd 检测链，并补齐源码与依赖所有权、稳定入口、产品边界和验证。

- [proposal.md](proposal.md)：定义产品化原因、交付结果、capability 和影响范围。
- [design.md](design.md)：记录源码收归、产品模块、固定检测栈、正式入口和本地验收决策。
- `specs/*/spec.md`：定义可验收的 capability deltas。
- [tasks.md](tasks.md)：按行为基线、源码收归、产品边界、固定组件、验收和 owner 切换组织实现步骤。

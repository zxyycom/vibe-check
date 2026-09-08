# Proposal

在资源配置、虚拟测量和简单调度算法的结论稳定后发布 `@zxyycom/vibe-check@0.0.2`。本草案确定发布范围与前置；准备和发布须按设计门禁及当次授权执行。

## Why

当前代码与材料需要形成可追溯的新版本交付，而本地候选包和一次 Gate 通过不等于正式版本已验收或已发布。资源配置、虚拟测量平台和算法采用/不采用各自完成交接后，才具备冻结发布输入的条件。

## Outcome

消费者能够安装精确的 `0.0.2`，取得相互匹配的运行时、声明、文档及法律材料；发布记录可对应 source commit、正式 tarball、receipt、完整 Gate、registry integrity 和安装后验证，并清楚说明从 0.0.1 升级的影响。

若算法 Change 以证据保留基线，算法证据收尾与稳定提交完成后仍可进入发布准备；这不构成发布授权。

## Scope

### Intended Change

- 等待 [Gate named-resource 配置](../configure-project-gate-named-resources/proposal.md)、[admission 虚拟测量平台](../build-admission-simulation-workbench/proposal.md)与[简单算法重设计](../redesign-learned-admission-heuristic/proposal.md)各自的稳定结论和继承提交；资源配置与基础平台可独立实施，平台最终 Gate 场景继承资源映射，算法在输入就绪后形成和比较候选。
- 审核相对 0.0.1 的实际公开差异，编写简短 release notes/迁移说明；沿用正式 release prepare/verify 入口形成并验收精确产物。
- 在获得当次明确外部写入授权后发布，并验证 registry 和真实安装结果；具体顺序与待定输入见[设计草案](design.md)。不顺带增加产品功能或升级依赖。

### Resulting Impacts

- 升级说明覆盖实际 API、运行宿主、配置、输出、默认行为和许可材料变化；需要修正文档时由对应 owner 承接，不复制一套发布期产品规范。
- 算法未采用时，记录其证据收尾与稳定提交；资源/平台仍须各自完成其 owner 交接，不能因不采用算法而静默跳过。
- 版本、tag、发布机制、权限核验与 registry observations 由本 Change 的当次 evidence 承接；认证材料不进入仓库或日志。
- source、artifact、Gate 和 registry 是不同证据；任一漂移都要回到其 owner 重新验收，不能重命名 local candidate 代替正式构建。

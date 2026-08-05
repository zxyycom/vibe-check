> **核心句：**本 delta 只定义声明式文件政策可依赖的长期行为；它尚未通过实现前审计，也不固定精确 authoring 或数据 shape。

## Purpose

允许 TypeScript Project Definition 为 normalized project-relative 路径声明有序的 Check 自有政策，并以一致、受 scope 约束且可解释的方式解析这些政策。

## ADDED Requirements

### Requirement: File policy is declarative and owned by its producing Check

Project Definition SHALL 能够以声明式纯数据为 resolved Check 提供文件政策。Producing Check 的 definition 或 execution contribution owner MUST 声明它接受的 policy input、允许文件级覆盖的范围及其 validation responsibility；公共 resolver MUST NOT 将未归属、未验证或 owner 未声明为可覆盖的数据交给 Check 执行。

公共 contract MUST NOT 为不同 Check 规定任意 deep merge；每个 Check 的具体政策形态与解析语义由其 owner 负责，并在 invocation work 开始前形成可冻结的 resolved value。

#### Scenario: Custom Check contributes owned file policy

- **WHEN** Project Definition 注册一个自定义 Check，并为匹配文件声明该 Check owner 接受的政策数据
- **THEN** resolution 在 Check work 前验证归属并形成该 Check 的 frozen resolved policy
- **AND** Core 不需要预先知道该 Check 的功能专属字段

#### Scenario: Unowned policy data is rejected

- **WHEN** 文件政策声明的数据没有 resolved Check owner，或超出 owner 声明为可覆盖的 policy input
- **THEN** invocation 在 Check work 开始前以可定位的 validation failure 停止
- **AND** resolver 不猜测字段含义或使用通用 deep merge 接受该数据

### Requirement: File policy resolution is ordered, scope-bounded, and reference-stable

File policy resolution SHALL 使用 normalized project-relative path，并按 Project Definition 的声明顺序处理全部匹配项。Resolver SHALL 在 Check execution 前冻结本次 invocation 的声明、匹配结果和各 Check resolved policy。

文件政策 MUST NOT 将全局 inventory 之外的路径加入任何 Check input。Current 与显式 reference 对同一个 normalized project-relative path MUST 使用同一 invocation policy snapshot 与相同 resolved value，不得因 reference workspace 的实际位置而改变匹配。

#### Scenario: Overlapping declarations resolve in declared order

- **WHEN** 同一路径匹配多个属于同一 Check 的文件政策声明
- **THEN** Check owner 按公共 resolver 提供的稳定声明顺序解析其最终政策
- **AND** invocation 在执行该 Check 前冻结结果

#### Scenario: Policy cannot expand global inventory

- **WHEN** 文件政策的路径模式也匹配一个未进入全局 inventory 的路径
- **THEN** 该路径仍不进入任何 Check input
- **AND** 文件政策不触发第二次项目收集

#### Scenario: Current and reference share one resolved value

- **WHEN** current 与显式 reference 都包含同一个 normalized project-relative path
- **THEN** 两侧消费同一 invocation 中解析的 Check policy value
- **AND** reference checkout 或临时目录位置不改变声明匹配结果

### Requirement: File policy provenance is explainable

Product SHALL 能够解释目标 normalized project-relative path 的有序匹配来源、所属 Check 和最终 resolved policy 的来源。解释能力 MUST 使用与执行相同的 frozen resolution evidence，但本 requirement 不规定具体入口或输出格式。

#### Scenario: User can identify matching policy sources

- **WHEN** 调用者请求解释一个匹配多个文件政策声明的项目内路径
- **THEN** 产品提供足以识别有序匹配声明、所属 Check 与最终来源的解释
- **AND** 解释结果不声称文件政策能够纳入全局 inventory 之外的路径

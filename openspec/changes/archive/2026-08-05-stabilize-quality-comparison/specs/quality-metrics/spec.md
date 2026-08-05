## ADDED Requirements

### Requirement: Explicit baseline provenance is immutable

当显式 baseline comparison 被启用时，Quality metrics SHALL 将已解析的不可变完整 commit SHA 作为唯一 baseline commit identity，并在 baseline metadata、materialization、cache identity、changed-input detection 与 comparison 中保持一致。调用者提供的 branch、tag、abbreviated SHA 或其它 revision spelling MUST NOT 在解析后被重复求值。

#### Scenario: Mutable revision is pinned for one invocation

- **WHEN** 调用者提供的显式 revision 在 invocation 开始时解析到一个 commit
- **THEN** metrics 记录该 commit 的不可变完整 SHA
- **AND** 后续 baseline 工作不因同名 branch 或 tag 移动而改变 target

#### Scenario: Comparison artifacts share one baseline identity

- **WHEN** baseline scan、cache 与 warning comparison 成功完成
- **THEN** 它们使用 metrics 中同一个完整 baseline commit SHA
- **AND** artifact 不混合原始 revision spelling 与重新解析后的不同 commit

### Requirement: Function comparison uses line-independent unambiguous identity

Function baseline comparison SHALL 使用 normalized file path 与 exact stable function name 匹配 current 与 baseline metric，MUST NOT 将 start line、end line 或其它源码位置加入 comparison identity。`(anonymous)`、`unknown`、空名称与全空白名称 MUST NOT 形成 comparison identity。对可识别名称，只有 current 与 baseline 两侧都恰好存在一个候选时才计算 matched baseline value 与 delta；任一侧存在重名歧义时 MUST 保持不可比较，并且 MUST NOT 通过行号、候选顺序或跨文件搜索猜测对应关系。源码位置 SHALL 继续作为 current warning location 输出，而不是 identity。

#### Scenario: Preceding line edits preserve function comparison

- **WHEN** 同文件同名函数的实现 metric 可比较，但前置源码增删只改变了函数行号
- **THEN** function warning 使用对应 baseline metric 计算 baseline value 与 delta
- **AND** 行号移动本身不把该函数分类为新 regression

#### Scenario: Same-file duplicate names remain unmatched

- **WHEN** current 或 baseline 在同一文件内对一个函数名称存在多个候选
- **THEN** comparison 不为这些候选选择 baseline function，且 warning 的 baseline value 与 delta 为 null
- **AND** comparison 不使用行号或扫描顺序消除歧义

#### Scenario: Anonymous and unknown names are not identities

- **WHEN** function metric 的 name 是 `(anonymous)`、`unknown`、空值或全空白值
- **THEN** comparison 不为该 function 选择 baseline function，且 warning 的 baseline value 与 delta 为 null
- **AND** 即使同文件两侧各只有一个这样的名称也不使用行号或位置匹配

#### Scenario: New named function preserves new-function semantics

- **WHEN** current 中存在一个同文件唯一的可识别具名函数，而 baseline 中没有同 identity candidate
- **THEN** comparison 保持既有 new-function baseline-zero semantics
- **AND** 该函数仍可按 threshold 与 delta policy 进入 regressions

#### Scenario: Cross-file move is not guessed

- **WHEN** 同名函数只在另一文件中存在 baseline candidate
- **THEN** current function 按同文件无 baseline candidate 的既有 new-function semantics 处理
- **AND** comparison 不执行跨文件匹配

#### Scenario: Warning location remains current

- **WHEN** matched function 产生 current warning
- **THEN** warning location 使用 current function 的文件与行号
- **AND** location 不参与 baseline identity

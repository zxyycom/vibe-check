This delta spec defines typed file-policy patches and deterministic resolution; it is a temporary change artifact and has not passed its implementation audit.

## Purpose

定义文件级质量政策覆盖的可表达范围、确定性合并顺序、路径匹配、解析结果与可解释性，使不同文件能够使用不同 check settings，而不绕过项目全局扫描边界。

## ADDED Requirements

### Requirement: File overrides are typed policy patches

Semantic project config v2 SHALL 包含 required `overrides` array。每个 override MUST 是 closed object，精确包含 non-empty unique string `name`、non-empty string-array `files` 与 non-empty closed partial `checks` patch。`files` 中每个 pattern MUST 使用与项目 scope 相同的 project-relative glob semantics，并 MUST 拒绝 absolute path、project-root escape 与 invalid glob。

Override `checks` schema MUST 从 producing Product revision 的 registry-composed `checks` schema 同一 source 派生：它 MAY 省略任意 object branch 或 overrideable leaf，但每个已声明 leaf MUST 满足对应 base leaf 的类型、enum 与 semantic constraints。Patch MUST NOT 接受 unknown key、backend/tool identity、`null` deletion、untyped value 或 capability 标记为 base-only 的 leaf；新增 capability 的 settings 只有在其独立 change 注册 optional closed base section 与 override metadata 后才能被覆盖。

Selected base config 未声明某个 optional feature section 时，该 capability MUST 保持未配置，任一 override MUST NOT 新建或部分构造该 section。Config semantic validation SHALL 在 scan work 前拒绝引用 absent base section 的 patch。Section 已在 base 中声明时，patch MAY 只声明其允许覆盖的 leaves。

#### Scenario: A valid partial check patch is accepted

- **WHEN** 两个不同名称的 overrides 分别以 project-relative globs 选择文件，并仅声明 base schema 中存在的 check leaves
- **THEN** config parser 保留 document order 与声明值，生成 detached typed override patches
- **AND** 未声明的 check branches 不会被默认值填入 patch

#### Scenario: Invalid override shape is rejected before scan

- **WHEN** override 缺少 name/files/checks、名称重复、files 为空、pattern 越出 project root、checks 没有 leaf，或 patch 包含 unknown/null/wrong-type leaf
- **THEN** selected config validation 以 path-aware diagnostic 失败
- **AND** scanner、baseline、cache 与 artifact work 均不启动

#### Scenario: Override cannot create an absent feature policy

- **WHEN** producing revision 已注册 optional `checks.exampleFeature`，selected base config 省略该 section，但 override 尝试声明其中 leaf
- **THEN** config semantic validation 在 scan work 前拒绝该 patch，并指向 override 与 absent base section
- **AND** loader 不补 neutral default、不构造 partial section，也不请求该 capability

### Requirement: Matching overrides resolve deterministically

Config owner SHALL 以 normalized project-relative file path 匹配 overrides，并从 selected base 中所有 required core sections 与已声明 optional feature sections 开始，按 document array 顺序应用全部匹配项。Object patch MUST 只递归替换已声明 leaves；array-valued leaf MUST 整体替换而不得拼接；后匹配 override MUST 覆盖先匹配 override 对同一 leaf 的值。缺少匹配项时，resolved file policy MUST 等于 selected base checks；resolver MUST NOT 注入 selected document 省略的 optional section。

每个解析结果 MUST 是 immutable `ResolvedFilePolicy` semantic value，至少保留 normalized path、最终 complete checks value、按应用顺序排列的 matched override names，以及每个最终覆盖 leaf 的 winning override。Current、baseline 与 Git-failure fallback 对相同 normalized path MUST 使用同一 invocation-owned base/override snapshot与合并规则。

#### Scenario: Later matching override wins one leaf

- **WHEN** 两个 matching overrides 都声明同一个 threshold，而第二个还声明另一个 check leaf
- **THEN** 最终 threshold 使用第二个值，另一 leaf 也使用第二个声明值
- **AND** 其它未声明 leaves 保持 base 或较早 matching override 的最终值

#### Scenario: Arrays replace instead of concatenate

- **WHEN** capability-owned check schema 含 array leaf，且 matching override 为该 leaf 声明新 array
- **THEN** resolved policy 使用该完整新 array
- **AND** resolver 不与 base 或较早 override 的 array 隐式拼接

#### Scenario: No override preserves base policy

- **WHEN** normalized file path 不匹配任何 override
- **THEN** resolved complete checks 与 invocation base checks 语义相等
- **AND** matched override list 和 winning override provenance 为空

### Requirement: Overrides cannot escape global or ownership boundaries

File override SHALL 只修改 `checks` 下 capability-owned settings。它 MUST NOT 修改或派生 `version`、global `include` / `excludeDirs` / `generatedFiles`、code-area assignment、accepted warnings、report settings、artifact/cache paths、config selection metadata或scanner dependency settings。

Resolved file policy MAY 使 capability selector 因 capability-owned enablement或target settings 排除一个 global-inventory file；它 MUST NOT 把 global normalized inventory 外的 path 加入任何 capability exact inputs。Accepted-warning matching MUST 在 finding 生成之后继续使用 invocation-level acceptance policy，而不是由 file override重写。

#### Scenario: Override cannot reinclude a globally excluded file

- **WHEN** override glob 匹配一个被 global exclude/generated rules 排除的 path
- **THEN**该 path 仍不进入 normalized inventory或任何 capability exact inputs
- **AND** override不改变其 code-area、acceptance 或 output policy

#### Scenario: Capability setting can narrow exact inputs

- **WHEN** global inventory 包含文件，但其 resolved file policy 禁用或排除某项 capability
- **THEN**该 capability selector不把文件加入自身 exact inputs
- **AND**其它 capability 仍按各自 descriptor与resolved settings独立选择

### Requirement: Resolution is explainable without scan side effects

Product config workflow SHALL 能够为 project root 内的 normalized candidate path 产生 deterministic explanation，包含 selected config provenance、base policy、按 document order 匹配的 override names、每项 override 声明的 leaves、最终 winning leaf provenance与complete resolved checks。Candidate path 可不存在，但 MUST 归一化为 project-relative path；absolute path 越出 root或包含 root escape MUST 被拒绝。

Explanation MUST 明确区分 pure config/glob resolution 与实际 inventory membership：它 MAY 报告 global config scope 是否匹配，但 MUST NOT 声称不存在的文件、VCS ignored state或运行时 discovery 已被扫描验证。生成 explanation MUST NOT 启动 capability adapter、baseline、cache read/write或artifact creation。

#### Scenario: Explanation shows ordered provenance

- **WHEN** candidate path 匹配多个 overrides
- **THEN** explanation按document order列出匹配项并标出每个最终覆盖leaf的winning override
- **AND** reported complete checks与正式scan resolver对相同path的结果相同

#### Scenario: Candidate outside project root is rejected

- **WHEN** caller 提供归一化后越出 project root 的 candidate path
- **THEN** explanation workflow 以 path-aware usage/config diagnostic失败
- **AND** 不读取或执行 scanner、baseline、cache与artifact workflow

> **核心句：**本 change 统一内置quality capability与Core的契约：capability逐条提交final records并报告execution summary，Core finalize runs后只用selected `DecisionPolicy`产生决策与输出。

## Why

当前产品把measurement、warning、capability完成状态和固定gate channels绑定在一起。结果是每增加一种检查，Core都要理解新的领域输出；某个capability后续失败时，此前已经验证的数据也无法继续作为可见证据。该模型不能稳定承载计划中的Markdown、JSON、secret和network检查。

## What Changes

- 建立 Product 编译期拥有的 capability registry；不提供第三方或运行时插件加载。
- 建立统一 `QualityRecord`。Capability 直接输出包含最终 level、稳定身份、subject、message、typed data、causal paths 和可选 comparison relations 的标准数据条；Core 不重新判断领域语义。
- 将单条record的commit状态与`CapabilityRun`的status、coverage和diagnostic分开；后续失败不撤销此前已经committed的records。
- 建立named `DecisionPolicy` catalog。每个selected policy通过acceptance、named views、closed boolean/reducer operations和一个`blockWhen`组合records、comparison relations与capability runs；capability failure和partial coverage只是policy operands。
- 将 `changed`、`regression` 等作为相对显式 named reference 的普通 relation/view，不再作为 Core 固定 channel。
- **BREAKING:** machine contract hard cut 到 `run.json` / `records.ndjson`。`run.json` 发布 policy ID/fingerprint、最终 gate 结果和 evidence references，但不复制完整 resolved policy；consumer 不承担第二套 gate evaluation。
- **BREAKING:** `--gate`选择一个resolved `DecisionPolicy` ID；省略gate保持观察行为，process outcome只服从selected policy和基础设施结果。
- Public config v2的authoring shape、file overrides和自定义policy JSON仍由`add-file-policy-overrides`拥有；本change只固定config必须单向产生的`CapabilityPolicyProjection`与normalized `DecisionPolicy` catalog，并为current config提供built-in adapter。

## Capabilities

### New Capabilities

- `quality-records`: compile-time capability registry、统一 record envelope、逐条提交、稳定身份、catalog 和 record/run 分离。
- `quality-decision-policy`: named `DecisionPolicy` catalog、explicit references、acceptance annotations、named views、closed `blockWhen` operations、gate result和evidence contract。

### Modified Capabilities

- `scan-scope`: 从一个 normalized inventory 为每个 capability 构造 exact work，不允许 runner 重新发现或扩大输入。
- `scan-completeness`: 以独立 capability run status 与 coverage 取代原子 capability bundle 和 overall reducer。
- `quality-metrics`: 现有 file/function/duplicate checks 迁移为标准 record producers，并移除旧 warning/channel owner 责任。
- `output-contract`: machine output 改为一个 run summary 与一个统一 record stream，所有 consumer 使用同一 final model。
- `cli-contract`: gate selection、reference prerequisite和exit mapping改为named `DecisionPolicy` contract。
- `scanner-dependencies`: backend failure 只形成所属 capability 的 run diagnostic，不再决定全局 verdict。
- `test-fixtures`: acceptance-test matrix、canonical examples、drift proof和annotation handoff迁移到record/run/policy contract。

## Impact

- Product Core：registry、record sink、run finalization、policy evaluator、gate result、cache boundary。
- Existing capabilities：file、function 和 duplicate scanning 改为标准 record producers。
- Output/API：删除 current machine v1 warning streams，更新 runtime schemas、DTO、serializer、validator、report 和 annotation consumer。
- CLI：更新 `--gate`、reference planning、help、artifact paths 和 exits。
- Follow-up changes：下表中的active changes必须在各自实现门禁前按新contract修订；本change只记录依赖义务，不修改这些change的feature contract。

Dependent change的artifact可在本contract稳定后开始修订；产品实现顺序是：

1. 先完成本change的实现，建立record/run/policy contract。
2. 再实现`add-file-policy-overrides`对public config v2到normalized policy的投影。
3. 然后实现其余七个feature changes，使各capability直接产生standard records与execution summary。
4. `port-lizard-function-metrics-to-typescript`继续deferred，恢复前单独重建migration baseline。

| Dependent change | Required follow-up |
| --- | --- |
| `add-file-policy-overrides` | 让public config v2拥有capability settings、named references、views、acceptance和gate authoring shape，并单向投影`CapabilityPolicyProjection`与`DecisionPolicy`。 |
| `add-markdown-structure-validation` | 直接emit final records；Markdown parsing与level判断留在capability。 |
| `add-markdown-link-validation` | 直接emit offline link records；与network capability的private handoff显式注册。 |
| `add-path-reference-validation` | 保留stable identity与redaction，删除fixed channel membership。 |
| `add-json-validation` | 以完成的file/work unit提交records，后续failure不抹除已有结果。 |
| `add-json-schema-validation` | 按binding/instance提交records，并用run coverage表达未评价work。 |
| `add-secret-detection` | 保留safe partial records；完整coverage要求进入policy而不是Core reducer。 |
| `add-network-link-validation` | 每个request work unit独立提交terminal record；timeout/indeterminate进入run/policy。 |

上表共包含一个config change和七个feature changes。`port-lizard-function-metrics-to-typescript`不在表内，其deferred状态不变。

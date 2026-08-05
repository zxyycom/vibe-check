> **核心句：**本delta让CLI通过`--gate <policy-id>`选择一个named `DecisionPolicy`并提供其explicit references；CLI不从capability state硬编码process verdict。

## MODIFIED Requirements

### Requirement: CLI owner documentation

CLI owner SHALL记录正式入口、project-root normalization、scan flags、`--gate <policy-id>`、explicit named reference inputs、`run.json`/`records.ndjson`boundary和exit mapping，并由`docs/navigation.md`引用。Current `--baseline <revision>` SHALL提供名为`baseline`的reference；CLI不得自动推断其它reference。

#### Scenario: Help explains named policy

- **WHEN**调用者运行`scan --help`
- **THEN**help说明`--gate`选择resolved `DecisionPolicy`并列出available policy IDs
- **AND**不把`all|changed|regressions`描述为Core closed enum

### Requirement: Exit code mapping

Product Core与output成功且gate disabled或passed时，CLI SHALL exit0；evaluated gate failed且artifacts验证/发布成功时 SHALL exit1；Core/policy evaluation/output failure SHALL exit2；usage/config/reference-request error SHALL exit3。

Capability run failed、partial coverage、warning/error record或empty record set本身 MUST NOT绕过selected policy决定exit。Ungated invocation在Core/output成功时 SHALL exit0，同时完整显示domain states；output failure优先于computed gate。

#### Scenario: Ungated partial run remains observational

- **WHEN**gate disabled且一个capability failed并保留records
- **THEN**CLI发布artifacts、显示failed run/coverage并exit0
- **AND**不声称gate passed

#### Scenario: Policy blocks a failed run

- **WHEN**selected policy阻断failed capability且artifacts发布成功
- **THEN**CLI exit1
- **AND**同一run不被CLI固定映射为exit2

### Requirement: Standard stream boundaries

CLI SHALL把banner、profile、progress、artifact paths、run/record summary、bounded preview和completion写stdout；把Core/output fatal details与unhandled errors写stderr。Machine/human reports由`run.json`、`records.ndjson`与`report.md`交付，不成为stdout mode；backend native streams不得成为stable product output。

#### Scenario: Console reports records and runs

- **WHEN**scan完成并发布artifacts
- **THEN**stdout显示paths、capability run/coverage summary与bounded records
- **AND**不直接转发backend output或完整machine stream

### Requirement: Gate policy selection

CLI `scan` SHALL接受至多一个`--gate <policy-id>`。省略 MUST传递disabled gate request并保持collection非阻断。合法ID MUST来自resolved `DecisionPolicy` catalog；CLI不得维护hardcoded channel enum。Missing value、duplicate option或unknown ID MUST在capability/cache/artifact work前exit3。

Selected policy MAY声明required capabilities、views、named references和decision expression。CLI SHALL把policy ID交给Product planner/evaluator；launch cwd、backend availability或wrapper不得覆盖它。

#### Scenario: Omitted gate collects data

- **WHEN**scan省略`--gate`
- **THEN**Product执行requested capabilities并发布records/runs与disabled result
- **AND**record level或run failure不自动产生nonzero gate exit

#### Scenario: Unknown policy fails before work

- **WHEN**调用者选择resolved catalog不存在的policy ID
- **THEN**CLI报告unknown ID和available IDs并exit3
- **AND**不启动capability或创建scan artifacts

### Requirement: Gate prerequisite planning

Planner SHALL从selected policy解析required capabilities、profile constraints和named references，不得按policy名称硬编码full profile或comparison channel。Required capabilities MUST进入resolved scan plan；required reference MUST由调用者提供并在capability/cache/artifact work前解析一次为immutable identity。

`--baseline <revision>` SHALL提供`baseline`reference。Selected policy不需要baseline时，该option不得隐式改变policy；需要而缺失、无效或与`--skip-baseline`冲突时 MUST以actionable exit3失败。Reference可用但comparison coverage partial时，records/runs进入policy evaluation，CLI不得固定not-evaluated result。

#### Scenario: Policy requests capabilities

- **WHEN**selected policy需要secret和JSON capabilities
- **THEN**planner请求两个registered capabilities
- **AND**其它capabilities是否运行由同一resolved plan决定

#### Scenario: Missing reference fails before scan

- **WHEN**selected policy需要`baseline`但调用者未提供
- **THEN**CLI在capability work前报告恢复方式并exit3
- **AND**不从Git history或remote选择替代reference

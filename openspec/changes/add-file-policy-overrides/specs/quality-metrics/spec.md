This delta spec makes findings and cache identity consume resolved per-file policy; it is a temporary change artifact and has not passed its implementation audit.

## ADDED Requirements

### Requirement: Findings consume the resolved policy for their file

每项 capability SHALL 对每个 exact input 使用该 normalized project-relative path 的 complete `ResolvedFilePolicy` 计算measurement、threshold、allowance、enablement与acceptance前finding generation。Current与baseline对同一路径 MUST 使用相同 semantic policy；scanner backend MUST NOT重新解析 raw override globs或从temporary baseline path推断policy。

Capability cache identity MUST 包含会影响该capability结果的resolved per-file policy projection及exact input identity，并 MUST 排除不相关capability settings、override name-only变化和explanation-only provenance。Equivalent base/override documents若产生相同capability-ownedresolved policy与inputs，MAY复用cache；任何影响结果的resolved leaf变化MUST使对应cache entry失效。

#### Scenario: Threshold override changes one file's finding

- **WHEN** 两个文件产生相同measurement，但只有其中一个文件的matched override提高对应threshold
- **THEN** capability按各自resolved policy决定finding
- **AND** acceptance随后仍按invocation-levelsemantic acceptance policy运行

#### Scenario: Relevant policy change invalidates only affected capability cache

- **WHEN** override修改capability A会消费的resolved leaf，但不改变capability B的exact inputs或owned settings
- **THEN** A受影响文件的cache identity改变
- **AND** B的cache identity不会仅因raw config bytes或override display name变化而改变

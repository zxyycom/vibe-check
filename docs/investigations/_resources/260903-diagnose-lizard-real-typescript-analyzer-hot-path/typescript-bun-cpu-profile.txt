# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 25.15s | 20854 | 1.0ms | 364 |

**Top 10:** ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` 68.0%, `next` 5.0%, `from` 4.3%, `(anonymous)` 2.8%, `stringSplitFast` 2.5%, `generatorResume` 2.1%, `regExpExec` 1.9%, `(anonymous)` 0.7%, `_state_global` 0.6%, `(anonymous)` 0.6%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 68.0% | 17.10s | 68.0% | 17.10s | ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 5.0% | 1.27s | 100.0% | 189.24s | `next` | `[native code]` |
| 4.3% | 1.09s | 81.4% | 20.48s | `from` | `[native code]` |
| 2.8% | 712.0ms | 2.8% | 712.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:98` |
| 2.5% | 651.6ms | 2.5% | 651.6ms | `stringSplitFast` | `[native code]` |
| 2.1% | 540.5ms | 100.0% | 187.10s | `generatorResume` | `[native code]` |
| 1.9% | 479.6ms | 69.9% | 17.59s | `regExpExec` | `[native code]` |
| 0.7% | 182.8ms | 1.0% | 252.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:72` |
| 0.6% | 163.3ms | 0.6% | 163.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:334` |
| 0.6% | 159.1ms | 0.6% | 159.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:13` |
| 0.5% | 131.1ms | 9.9% | 2.49s | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:231` |
| 0.5% | 126.9ms | 0.5% | 126.9ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:68` |
| 0.5% | 126.8ms | 0.5% | 126.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:168` |
| 0.4% | 108.4ms | 0.4% | 108.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:332` |
| 0.3% | 95.1ms | 0.3% | 95.1ms | `stringify` | `[native code]` |
| 0.3% | 93.1ms | 0.3% | 93.1ms | `freeze` | `[native code]` |
| 0.3% | 81.0ms | 98.0% | 24.65s | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1118` |
| 0.2% | 74.9ms | 2.8% | 726.5ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1060` |
| 0.2% | 68.9ms | 0.2% | 68.9ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:36` |
| 0.2% | 68.1ms | 0.9% | 240.8ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:114` |
| 0.2% | 67.9ms | 0.2% | 72.4ms | `escapeRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:680` |
| 0.2% | 61.8ms | 0.2% | 61.8ms | `/^\p{White_Space}$/u` | `[native code]` |
| 0.2% | 56.3ms | 0.2% | 56.3ms | `join` | `[native code]` |
| 0.2% | 55.6ms | 0.2% | 59.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:82` |
| 0.2% | 55.0ms | 0.2% | 55.0ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1081` |
| 0.2% | 54.3ms | 0.2% | 54.3ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.2% | 51.0ms | 0.2% | 51.0ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:73` |
| 0.1% | 50.2ms | 0.1% | 50.2ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:92` |
| 0.1% | 47.6ms | 0.2% | 59.6ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:91` |
| 0.1% | 39.6ms | 0.1% | 39.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:538` |
| 0.1% | 37.1ms | 0.1% | 37.1ms | `Set` | `[native code]` |
| 0.1% | 35.0ms | 8.0% | 2.03s | `isPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:70` |
| 0.1% | 34.8ms | 0.1% | 34.8ms | `next` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:181` |
| 0.1% | 33.1ms | 0.1% | 33.1ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:229` |
| 0.1% | 32.7ms | 0.1% | 32.7ms | `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u` | `[native code]` |
| 0.1% | 32.0ms | 22.2% | 5.59s | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:214` |
| 0.1% | 29.0ms | 99.3% | 24.98s | `facade` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:22` |
| 0.1% | 28.4ms | 0.1% | 29.7ms | `isFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:583` |
| 0.1% | 28.0ms | 9.3% | 2.35s | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:602` |
| 0.0% | 25.1ms | 0.5% | 134.9ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1018` |
| 0.0% | 24.6ms | 0.1% | 28.1ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:300` |
| 0.0% | 24.5ms | 0.1% | 25.6ms | `get flags` | `[native code]` |
| 0.0% | 23.3ms | 0.2% | 56.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:279` |
| 0.0% | 22.0ms | 0.0% | 22.0ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` |
| 0.0% | 21.3ms | 0.0% | 21.3ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 20.1ms | 0.0% | 20.1ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:42` |
| 0.0% | 20.0ms | 0.4% | 105.4ms | `anonymous` | `[native code]` |
| 0.0% | 19.8ms | 82.5% | 20.75s | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1017` |
| 0.0% | 19.8ms | 0.7% | 180.1ms | `map` | `[native code]` |
| 0.0% | 19.8ms | 0.0% | 21.1ms | `raw` | `[native code]` |
| 0.0% | 19.5ms | 0.0% | 19.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:287` |
| 0.0% | 19.3ms | 0.0% | 19.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 18.6ms | 0.0% | 18.6ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:473` |
| 0.0% | 17.0ms | 0.3% | 83.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:83` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:587` |
| 0.0% | 13.5ms | 0.0% | 13.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 13.3ms | 0.0% | 14.5ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:605` |
| 0.0% | 12.4ms | 0.0% | 12.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:141` |
| 0.0% | 12.3ms | 0.0% | 12.3ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 11.7ms | 0.0% | 11.7ms | `esSpecIsRegExp` | `[native code]` |
| 0.0% | 11.5ms | 0.9% | 242.9ms | `addParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:311` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 11.2ms | 0.0% | 17.2ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1117` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `/^[\p{L}\p{N}_]+$/u` | `[native code]` |
| 0.0% | 10.3ms | 87.9% | 22.12s | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:595` |
| 0.0% | 10.0ms | 0.0% | 10.0ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:559` |
| 0.0% | 9.6ms | 0.0% | 9.6ms | `WeakMap` | `[native code]` |
| 0.0% | 9.5ms | 0.7% | 184.7ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:481` |
| 0.0% | 9.3ms | 0.0% | 11.8ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:590` |
| 0.0% | 9.2ms | 0.0% | 9.2ms | `performIteration` | `[native code]` |
| 0.0% | 9.1ms | 0.0% | 9.1ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:64` |
| 0.0% | 9.0ms | 72.7% | 18.30s | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:30` |
| 0.0% | 8.9ms | 0.0% | 8.9ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:331` |
| 0.0% | 8.4ms | 1.1% | 278.5ms | `every` | `[native code]` |
| 0.0% | 8.4ms | 0.0% | 10.6ms | `normalizePythonRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:676` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:571` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `pythonLineBoundaryLengthAt` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:657` |
| 0.0% | 8.2ms | 0.0% | 8.2ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 8.1ms | 0.0% | 8.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:325` |
| 0.0% | 8.0ms | 0.8% | 204.1ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:477` |
| 0.0% | 8.0ms | 0.0% | 8.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:80` |
| 0.0% | 7.5ms | 0.0% | 7.5ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:303` |
| 0.0% | 7.4ms | 0.1% | 30.4ms | `hasCompleteNestingStackSurface` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` |
| 0.0% | 7.3ms | 0.0% | 8.4ms | `(anonymous)` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:17` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `_to_camel_case` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:539` |
| 0.0% | 7.2ms | 0.0% | 7.2ms | `globalState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 7.2ms | 0.0% | 7.2ms | `splitPythonLines` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:90` |
| 0.0% | 7.1ms | 0.0% | 7.1ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 6.9ms | 0.0% | 6.9ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:72` |
| 0.0% | 6.8ms | 0.0% | 15.3ms | `sort` | `[native code]` |
| 0.0% | 6.8ms | 0.0% | 18.0ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:591` |
| 0.0% | 6.5ms | 0.0% | 6.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:73` |
| 0.0% | 6.3ms | 0.0% | 6.3ms | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:95` |
| 0.0% | 6.0ms | 0.0% | 6.0ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 5.9ms | 0.0% | 5.9ms | `stringIncludesInternal` | `[native code]` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `/\(\?[aiLmsux]+\)/gu` | `[native code]` |
| 0.0% | 5.5ms | 3.4% | 859.4ms | `TypeScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:160` |
| 0.0% | 5.3ms | 0.0% | 5.3ms | `push` | `[native code]` |
| 0.0% | 5.2ms | 0.0% | 5.2ms | `update` | `[native code]` |
| 0.0% | 5.2ms | 0.6% | 175.1ms | `addToLongFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:972` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:444` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `_field` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:457` |
| 0.0% | 4.9ms | 0.0% | 4.9ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 4.7ms | 0.0% | 16.8ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:491` |
| 0.0% | 4.7ms | 0.0% | 22.7ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1024` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:58` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:469` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:333` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `/[\|\\{}()[\]^$+*?.]/gu` | `[native code]` |
| 0.0% | 4.4ms | 0.0% | 4.4ms | `asciiAlphanumericFinalSuffix` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:106` |
| 0.0% | 4.3ms | 0.0% | 4.3ms | `[Symbol.matchAll]` | `[native code]` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 3.6ms | 0.0% | 6.0ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:404` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `FileInformation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:335` |
| 0.0% | 3.5ms | 71.2% | 17.90s | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:81` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `/^\p{L}$/u` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `Nesting` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `parse` | `[native code]` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:606` |
| 0.0% | 3.2ms | 0.0% | 4.5ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:53` |
| 0.0% | 3.0ms | 0.4% | 108.0ms | `_consume_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:532` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1043` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:501` |
| 0.0% | 2.6ms | 74.2% | 18.67s | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1507` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `/^[\p{L}]/u` | `[native code]` |
| 0.0% | 2.5ms | 0.0% | 13.2ms | `confirmNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:937` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `addParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:319` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1494` |
| 0.0% | 2.4ms | 0.3% | 78.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:534` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `splitPythonLines` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:94` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `resolveLizardReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:96` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_to_camel_case` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:540` |
| 0.0% | 2.4ms | 0.2% | 60.7ms | `parameterCount` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.3ms | 0.0% | 18.1ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:924` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `_field` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:45` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:43` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1016` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1029` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu` | `[native code]` |
| 0.0% | 2.1ms | 0.5% | 129.7ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1028` |
| 0.0% | 2.0ms | 0.2% | 56.3ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:636` |
| 0.0% | 1.5ms | 0.0% | 19.6ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1112` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `isFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:472` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `resolveLizardReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:94` |
| 0.0% | 1.3ms | 0.0% | 3.7ms | `exec` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1506` |
| 0.0% | 1.3ms | 0.0% | 4.7ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:556` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `getOwnPropertyDescriptor` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:223` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_template_literal` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:44` |
| 0.0% | 1.3ms | 0.4% | 103.5ms | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:422` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:185` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `[Symbol.iterator]` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 12.0ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:929` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:99` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_consume_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `returnFromState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:195` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:85` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:55` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `startsWith` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `/^[\p{L}_$#]/u` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:42` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `statemachine_before_return` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:164` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `indexOf` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `collect` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:513` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `fields` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:20` |
| 0.0% | 1.2ms | 0.0% | 5.7ms | `resolveLizardReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:93` |
| 0.0% | 1.2ms | 0.0% | 3.3ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:401` |
| 0.0% | 1.2ms | 0.0% | 9.1ms | `_arrow_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:435` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:25` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `canonical` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:17` |
| 0.0% | 1.2ms | 98.5% | 24.77s | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:69` |
| 0.0% | 1.2ms | 0.0% | 2.4ms | `_pop_function_from_stack` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:403` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `Hash` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 7.2ms | `_function_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:578` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `endOfFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:280` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:312` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:564` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `TokenMatch` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:17` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:40` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:184` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:448` |
| 0.0% | 1.1ms | 70.1% | 17.64s | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:561` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:396` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `localeCompare` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:80` |
| 0.0% | 1.1ms | 0.0% | 12.9ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:642` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:775` |
| 0.0% | 1.1ms | 0.2% | 53.0ms | `_expecting_func_opening_bracket` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:486` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:590` |
| 0.0% | 1.0ms | 87.0% | 21.89s | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1071` |
| 0.0% | 1.0ms | 0.0% | 21.2ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:477` |
| 0.0% | 1.0ms | 0.0% | 3.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:553` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:115` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:291` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1039` |
| 0.0% | 1.0ms | 0.0% | 2.1ms | `readFileSync` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:346` |
| 0.0% | 1.0ms | 0.3% | 78.5ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:503` |
| 0.0% | 1.0ms | 0.0% | 2.4ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:639` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `collect` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:603` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `flatIntoArray` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `get unicode` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(unknown)` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 9.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:307` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:187` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.0ms | 0.0% | 12.0ms | `collect` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:509` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:464` |
| 0.0% | 1.0ms | 0.1% | 30.0ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:400` |
| 0.0% | 1.0ms | 0.0% | 16.8ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:144` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:563` |
| 0.0% | 989us | 0.3% | 95.4ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:299` |
| 0.0% | 987us | 0.0% | 987us | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1020` |
| 0.0% | 978us | 87.3% | 21.95s | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1080` |
| 0.0% | 963us | 0.0% | 963us | `fields` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 189.24s | 5.0% | 1.27s | `next` | `[native code]` |
| 100.0% | 187.10s | 2.1% | 540.5ms | `generatorResume` | `[native code]` |
| 99.3% | 24.98s | 0.1% | 29.0ms | `facade` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:22` |
| 98.5% | 24.77s | 0.0% | 1.2ms | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:69` |
| 98.0% | 24.65s | 0.3% | 81.0ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1118` |
| 93.3% | 23.46s | 0.0% | 0us | `(module)` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:35` |
| 87.9% | 22.12s | 0.0% | 10.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:595` |
| 87.3% | 21.95s | 0.0% | 978us | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1080` |
| 87.0% | 21.89s | 0.0% | 1.0ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1071` |
| 83.9% | 21.11s | 0.0% | 0us | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1053` |
| 82.5% | 20.75s | 0.0% | 19.8ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1017` |
| 81.4% | 20.48s | 4.3% | 1.09s | `from` | `[native code]` |
| 74.2% | 18.67s | 0.0% | 2.6ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1507` |
| 72.7% | 18.30s | 0.0% | 9.0ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:30` |
| 71.2% | 17.90s | 0.0% | 3.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:81` |
| 70.1% | 17.64s | 0.0% | 1.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:561` |
| 69.9% | 17.59s | 1.9% | 479.6ms | `regExpExec` | `[native code]` |
| 68.0% | 17.10s | 68.0% | 17.10s | ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 22.2% | 5.59s | 0.1% | 32.0ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:214` |
| 9.9% | 2.49s | 0.5% | 131.1ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:231` |
| 9.3% | 2.35s | 0.1% | 28.0ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:602` |
| 8.0% | 2.03s | 0.1% | 35.0ms | `isPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:70` |
| 7.9% | 2.00s | 0.0% | 0us | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1508` |
| 7.9% | 1.99s | 0.0% | 0us | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:230` |
| 6.5% | 1.64s | 0.0% | 0us | `(module)` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:34` |
| 3.4% | 859.4ms | 0.0% | 5.5ms | `TypeScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:160` |
| 3.3% | 843.6ms | 0.0% | 0us | `statemachine_clone` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:177` |
| 3.3% | 842.3ms | 0.0% | 0us | `cloneState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:172` |
| 2.8% | 726.5ms | 0.2% | 74.9ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1060` |
| 2.8% | 712.0ms | 2.8% | 712.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:98` |
| 2.5% | 651.6ms | 2.5% | 651.6ms | `stringSplitFast` | `[native code]` |
| 1.1% | 278.5ms | 0.0% | 8.4ms | `every` | `[native code]` |
| 1.0% | 267.4ms | 0.0% | 0us | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:298` |
| 1.0% | 254.1ms | 0.0% | 0us | `next` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:182` |
| 1.0% | 252.0ms | 0.7% | 182.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:72` |
| 0.9% | 245.4ms | 0.0% | 0us | `parameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:988` |
| 0.9% | 242.9ms | 0.0% | 11.5ms | `addParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:311` |
| 0.9% | 240.8ms | 0.2% | 68.1ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:114` |
| 0.8% | 204.1ms | 0.0% | 8.0ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:477` |
| 0.7% | 184.7ms | 0.0% | 9.5ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:481` |
| 0.7% | 180.1ms | 0.0% | 19.8ms | `map` | `[native code]` |
| 0.7% | 176.4ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:342` |
| 0.6% | 175.1ms | 0.0% | 5.2ms | `addToLongFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:972` |
| 0.6% | 163.3ms | 0.6% | 163.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:334` |
| 0.6% | 160.2ms | 0.0% | 0us | `read_object` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:384` |
| 0.6% | 160.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:359` |
| 0.6% | 159.1ms | 0.6% | 159.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:13` |
| 0.5% | 134.9ms | 0.0% | 25.1ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1018` |
| 0.5% | 129.7ms | 0.0% | 2.1ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1028` |
| 0.5% | 126.9ms | 0.5% | 126.9ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:68` |
| 0.5% | 126.8ms | 0.5% | 126.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:168` |
| 0.4% | 118.2ms | 0.0% | 0us | `assertEquivalent` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:27` |
| 0.4% | 108.4ms | 0.4% | 108.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:332` |
| 0.4% | 108.0ms | 0.0% | 3.0ms | `_consume_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:532` |
| 0.4% | 107.7ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:358` |
| 0.4% | 106.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:355` |
| 0.4% | 105.4ms | 0.0% | 20.0ms | `anonymous` | `[native code]` |
| 0.4% | 105.0ms | 0.0% | 0us | `TypeScriptTypeAnnotationStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:548` |
| 0.4% | 103.5ms | 0.0% | 1.3ms | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:422` |
| 0.4% | 101.6ms | 0.0% | 0us | `hash` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:15` |
| 0.3% | 97.2ms | 0.0% | 0us | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:72` |
| 0.3% | 95.4ms | 0.0% | 989us | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:299` |
| 0.3% | 95.1ms | 0.3% | 95.1ms | `stringify` | `[native code]` |
| 0.3% | 93.1ms | 0.3% | 93.1ms | `freeze` | `[native code]` |
| 0.3% | 91.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:553` |
| 0.3% | 89.8ms | 0.0% | 0us | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:220` |
| 0.3% | 89.4ms | 0.0% | 0us | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:426` |
| 0.3% | 83.1ms | 0.0% | 17.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:83` |
| 0.3% | 80.6ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:453` |
| 0.3% | 78.8ms | 0.0% | 2.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:534` |
| 0.3% | 78.5ms | 0.0% | 1.0ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:503` |
| 0.2% | 75.2ms | 0.0% | 0us | `pushNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:956` |
| 0.2% | 75.2ms | 0.0% | 0us | `_push_function_to_stack` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:399` |
| 0.2% | 72.4ms | 0.2% | 67.9ms | `escapeRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:680` |
| 0.2% | 71.1ms | 0.0% | 0us | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1113` |
| 0.2% | 68.9ms | 0.2% | 68.9ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:36` |
| 0.2% | 68.1ms | 0.0% | 0us | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:71` |
| 0.2% | 67.5ms | 0.0% | 0us | `getCommentFromToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:615` |
| 0.2% | 64.4ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:451` |
| 0.2% | 64.0ms | 0.0% | 0us | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:79` |
| 0.2% | 62.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:79` |
| 0.2% | 61.9ms | 0.0% | 0us | `restartNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:946` |
| 0.2% | 61.8ms | 0.2% | 61.8ms | `/^\p{White_Space}$/u` | `[native code]` |
| 0.2% | 61.1ms | 0.0% | 0us | `_expecting_func_opening_bracket` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:498` |
| 0.2% | 60.7ms | 0.0% | 2.4ms | `parameterCount` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` |
| 0.2% | 60.7ms | 0.0% | 0us | `parameter_count` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` |
| 0.2% | 59.7ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.2% | 59.6ms | 0.1% | 47.6ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:91` |
| 0.2% | 59.0ms | 0.2% | 55.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:82` |
| 0.2% | 57.4ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:374` |
| 0.2% | 56.3ms | 0.2% | 56.3ms | `join` | `[native code]` |
| 0.2% | 56.3ms | 0.0% | 2.0ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:636` |
| 0.2% | 56.0ms | 0.0% | 23.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:279` |
| 0.2% | 55.3ms | 0.0% | 0us | `TypeScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:33` |
| 0.2% | 55.1ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:309` |
| 0.2% | 55.0ms | 0.2% | 55.0ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1081` |
| 0.2% | 54.3ms | 0.2% | 54.3ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.2% | 53.0ms | 0.0% | 1.1ms | `_expecting_func_opening_bracket` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:486` |
| 0.2% | 52.1ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:349` |
| 0.2% | 51.0ms | 0.2% | 51.0ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:73` |
| 0.1% | 50.2ms | 0.1% | 50.2ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:92` |
| 0.1% | 49.4ms | 0.0% | 0us | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:466` |
| 0.1% | 45.9ms | 0.0% | 0us | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:475` |
| 0.1% | 45.8ms | 0.0% | 0us | `flatMap` | `[native code]` |
| 0.1% | 43.3ms | 0.0% | 0us | `matchAll` | `[native code]` |
| 0.1% | 40.8ms | 0.0% | 0us | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:188` |
| 0.1% | 39.6ms | 0.1% | 39.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:538` |
| 0.1% | 38.1ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:293` |
| 0.1% | 37.1ms | 0.1% | 37.1ms | `Set` | `[native code]` |
| 0.1% | 34.8ms | 0.1% | 34.8ms | `next` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:181` |
| 0.1% | 33.8ms | 0.0% | 0us | `asNestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:731` |
| 0.1% | 33.8ms | 0.0% | 0us | `nestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` |
| 0.1% | 33.1ms | 0.1% | 33.1ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:229` |
| 0.1% | 32.7ms | 0.1% | 32.7ms | `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u` | `[native code]` |
| 0.1% | 31.7ms | 0.0% | 0us | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:925` |
| 0.1% | 30.4ms | 0.0% | 7.4ms | `hasCompleteNestingStackSurface` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` |
| 0.1% | 30.0ms | 0.0% | 1.0ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:400` |
| 0.1% | 29.7ms | 0.1% | 28.4ms | `isFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:583` |
| 0.1% | 29.3ms | 0.0% | 0us | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:831` |
| 0.1% | 28.1ms | 0.0% | 24.6ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:300` |
| 0.1% | 25.6ms | 0.0% | 24.5ms | `get flags` | `[native code]` |
| 0.0% | 22.7ms | 0.0% | 4.7ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1024` |
| 0.0% | 22.6ms | 0.0% | 0us | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:216` |
| 0.0% | 22.0ms | 0.0% | 22.0ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` |
| 0.0% | 21.8ms | 0.0% | 0us | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:91` |
| 0.0% | 21.3ms | 0.0% | 21.3ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 21.2ms | 0.0% | 1.0ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:477` |
| 0.0% | 21.1ms | 0.0% | 19.8ms | `raw` | `[native code]` |
| 0.0% | 20.1ms | 0.0% | 20.1ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:42` |
| 0.0% | 19.6ms | 0.0% | 1.5ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1112` |
| 0.0% | 19.5ms | 0.0% | 19.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:287` |
| 0.0% | 19.3ms | 0.0% | 19.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 18.6ms | 0.0% | 18.6ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:473` |
| 0.0% | 18.1ms | 0.0% | 2.3ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:924` |
| 0.0% | 18.0ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 18.0ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.0% | 18.0ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.0% | 18.0ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.0% | 18.0ms | 0.0% | 6.8ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:591` |
| 0.0% | 17.2ms | 0.0% | 11.2ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1117` |
| 0.0% | 16.8ms | 0.0% | 1.0ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:144` |
| 0.0% | 16.8ms | 0.0% | 4.7ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:491` |
| 0.0% | 15.8ms | 0.0% | 0us | `TypeScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:34` |
| 0.0% | 15.6ms | 0.0% | 0us | `internal:streams/legacy` | `internal:streams/legacy:2` |
| 0.0% | 15.3ms | 0.0% | 6.8ms | `sort` | `[native code]` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:587` |
| 0.0% | 14.5ms | 0.0% | 13.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:605` |
| 0.0% | 13.5ms | 0.0% | 13.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 13.2ms | 0.0% | 0us | `restartNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:947` |
| 0.0% | 13.2ms | 0.0% | 2.5ms | `confirmNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:937` |
| 0.0% | 12.9ms | 0.0% | 1.1ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:642` |
| 0.0% | 12.4ms | 0.0% | 12.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:141` |
| 0.0% | 12.3ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:446` |
| 0.0% | 12.3ms | 0.0% | 12.3ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 12.0ms | 0.0% | 1.0ms | `collect` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:509` |
| 0.0% | 12.0ms | 0.0% | 1.3ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:929` |
| 0.0% | 11.8ms | 0.0% | 9.3ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:590` |
| 0.0% | 11.7ms | 0.0% | 11.7ms | `esSpecIsRegExp` | `[native code]` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `/^[\p{L}\p{N}_]+$/u` | `[native code]` |
| 0.0% | 10.9ms | 0.0% | 0us | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:772` |
| 0.0% | 10.8ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:301` |
| 0.0% | 10.7ms | 0.0% | 0us | `_arrow_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:431` |
| 0.0% | 10.6ms | 0.0% | 0us | `startNewFunctionNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:855` |
| 0.0% | 10.6ms | 0.0% | 8.4ms | `normalizePythonRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:676` |
| 0.0% | 10.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:339` |
| 0.0% | 10.0ms | 0.0% | 10.0ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:559` |
| 0.0% | 9.6ms | 0.0% | 9.6ms | `WeakMap` | `[native code]` |
| 0.0% | 9.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:770` |
| 0.0% | 9.5ms | 0.0% | 0us | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:66` |
| 0.0% | 9.5ms | 0.0% | 0us | `get currentNestingLevel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` |
| 0.0% | 9.5ms | 0.0% | 0us | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:83` |
| 0.0% | 9.2ms | 0.0% | 9.2ms | `performIteration` | `[native code]` |
| 0.0% | 9.2ms | 0.0% | 0us | `(module)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:48` |
| 0.0% | 9.1ms | 0.0% | 1.2ms | `_arrow_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:435` |
| 0.0% | 9.1ms | 0.0% | 9.1ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:64` |
| 0.0% | 9.1ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:307` |
| 0.0% | 8.9ms | 0.0% | 8.9ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:331` |
| 0.0% | 8.4ms | 0.0% | 7.3ms | `(anonymous)` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:17` |
| 0.0% | 8.4ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:283` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:571` |
| 0.0% | 8.3ms | 0.0% | 0us | `splitPythonLines` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:85` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `pythonLineBoundaryLengthAt` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:657` |
| 0.0% | 8.2ms | 0.0% | 8.2ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 8.1ms | 0.0% | 8.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:325` |
| 0.0% | 8.0ms | 0.0% | 8.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:80` |
| 0.0% | 7.5ms | 0.0% | 7.5ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:303` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `_to_camel_case` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:539` |
| 0.0% | 7.2ms | 0.0% | 7.2ms | `globalState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 7.2ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:391` |
| 0.0% | 7.2ms | 0.0% | 1.2ms | `_function_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:578` |
| 0.0% | 7.2ms | 0.0% | 7.2ms | `splitPythonLines` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:90` |
| 0.0% | 7.1ms | 0.0% | 7.1ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 6.9ms | 0.0% | 6.9ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:72` |
| 0.0% | 6.5ms | 0.0% | 6.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:73` |
| 0.0% | 6.3ms | 0.0% | 6.3ms | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:95` |
| 0.0% | 6.0ms | 0.0% | 3.6ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:404` |
| 0.0% | 6.0ms | 0.0% | 6.0ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 5.9ms | 0.0% | 5.9ms | `stringIncludesInternal` | `[native code]` |
| 0.0% | 5.9ms | 0.0% | 0us | `get parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:278` |
| 0.0% | 5.9ms | 0.0% | 0us | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:419` |
| 0.0% | 5.8ms | 0.0% | 0us | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:643` |
| 0.0% | 5.7ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:504` |
| 0.0% | 5.7ms | 0.0% | 1.2ms | `resolveLizardReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:93` |
| 0.0% | 5.6ms | 0.0% | 0us | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:427` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `/\(\?[aiLmsux]+\)/gu` | `[native code]` |
| 0.0% | 5.3ms | 0.0% | 5.3ms | `push` | `[native code]` |
| 0.0% | 5.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:554` |
| 0.0% | 5.2ms | 0.0% | 5.2ms | `update` | `[native code]` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:444` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `_field` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:457` |
| 0.0% | 4.9ms | 0.0% | 4.9ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 4.9ms | 0.0% | 0us | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:562` |
| 0.0% | 4.7ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:556` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:58` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:469` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:333` |
| 0.0% | 4.5ms | 0.0% | 3.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:53` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `/[\|\\{}()[\]^$+*?.]/gu` | `[native code]` |
| 0.0% | 4.4ms | 0.0% | 0us | `(module)` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:12` |
| 0.0% | 4.4ms | 0.0% | 4.4ms | `asciiAlphanumericFinalSuffix` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:106` |
| 0.0% | 4.3ms | 0.0% | 4.3ms | `[Symbol.matchAll]` | `[native code]` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 3.8ms | 0.0% | 0us | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:558` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 3.7ms | 0.0% | 1.3ms | `exec` | `[native code]` |
| 0.0% | 3.6ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:542` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `FileInformation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:335` |
| 0.0% | 3.6ms | 0.0% | 0us | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:773` |
| 0.0% | 3.5ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:553` |
| 0.0% | 3.5ms | 0.0% | 0us | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:58` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `/^\p{L}$/u` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `Nesting` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `parse` | `[native code]` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:606` |
| 0.0% | 3.3ms | 0.0% | 1.2ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:401` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1043` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:501` |
| 0.0% | 2.5ms | 0.0% | 0us | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:525` |
| 0.0% | 2.5ms | 0.0% | 0us | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:296` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `/^[\p{L}]/u` | `[native code]` |
| 0.0% | 2.5ms | 0.0% | 0us | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1114` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `addParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:319` |
| 0.0% | 2.4ms | 0.0% | 0us | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1495` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1494` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `splitPythonLines` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:94` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `resolveLizardReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:96` |
| 0.0% | 2.4ms | 0.0% | 1.2ms | `_pop_function_from_stack` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:403` |
| 0.0% | 2.4ms | 0.0% | 0us | `_inline_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:570` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_to_camel_case` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:540` |
| 0.0% | 2.4ms | 0.0% | 1.0ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:639` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.3ms | 0.0% | 0us | `_state_generic_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:574` |
| 0.0% | 2.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:352` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `_field` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:45` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:43` |
| 0.0% | 2.2ms | 0.0% | 0us | `internal:fs/glob` | `internal:fs/glob:2` |
| 0.0% | 2.2ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.0% | 2.2ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1016` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1029` |
| 0.0% | 2.1ms | 0.0% | 0us | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:402` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 1.0ms | `readFileSync` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `isFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `get parameterCount` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` |
| 0.0% | 1.4ms | 0.0% | 0us | `get parameter_count` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:472` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `resolveLizardReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:94` |
| 0.0% | 1.3ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:551` |
| 0.0% | 1.3ms | 0.0% | 0us | `preprocessing` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1012` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1506` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `internal:primordials:32` |
| 0.0% | 1.3ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:71` |
| 0.0% | 1.3ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `getOwnPropertyDescriptor` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `makeSafe` | `internal:primordials:30` |
| 0.0% | 1.3ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:223` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_template_literal` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:44` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:185` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `[Symbol.iterator]` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:769` |
| 0.0% | 1.3ms | 0.0% | 0us | `NestingStack` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:99` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:306` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_consume_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:206` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `returnFromState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:195` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:361` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:85` |
| 0.0% | 1.2ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:554` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `splitTemplateLiteral` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:55` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `startsWith` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `/^[\p{L}_$#]/u` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:42` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `indexOf` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `collect` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:513` |
| 0.0% | 1.2ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:540` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `statemachine_before_return` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:164` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `fields` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:20` |
| 0.0% | 1.2ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:25` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `canonical` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:17` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `Hash` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `Hash` | `node:crypto:178` |
| 0.0% | 1.2ms | 0.0% | 0us | `createHash` | `node:crypto:201` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `endOfFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:280` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:312` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:564` |
| 0.0% | 1.1ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:562` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `TokenMatch` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:17` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:40` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:184` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:448` |
| 0.0% | 1.1ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:550` |
| 0.0% | 1.1ms | 0.0% | 0us | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:403` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:396` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `localeCompare` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `currentNestingLevel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:80` |
| 0.0% | 1.1ms | 0.0% | 0us | `_consume_generic_type_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:528` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:775` |
| 0.0% | 1.1ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:441` |
| 0.0% | 1.1ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:543` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:590` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 1.0ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:115` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:291` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1039` |
| 0.0% | 1.0ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:552` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:346` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `collect` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:547` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:603` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `flatIntoArray` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `get unicode` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `stripPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(unknown)` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `handleTypeAlias` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:187` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:464` |
| 0.0% | 1.0ms | 0.0% | 0us | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:774` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:563` |
| 0.0% | 987us | 0.0% | 987us | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1020` |
| 0.0% | 963us | 0.0% | 963us | `fields` | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts` |

## Function Details

### ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 68.0% (17.10s) | Total: 68.0% (17.10s) | Samples: 14270

**Called by:**
- `regExpExec` (14268)
- `exec` (2)

### `next`
`[native code]` | Self: 5.0% (1.27s) | Total: 100.0% (189.24s) | Samples: 1041

**Called by:**
- `analyzeSourceCode` (20376)
- `conditionCounter` (18208)
- `tokenCounter` (18162)
- `lineCounter` (17508)
- `from` (16087)
- `withoutWhitespace` (15550)
- `process` (14707)
- `generateTokens` (14703)
- `(anonymous)` (12278)
- `commentCounter` (9746)
- `(anonymous)` (32)
- `(anonymous)` (6)

**Calls:**
- `generatorResume` (141655)
- `regExpExec` (14664)
- `exec` (3)

### `from`
`[native code]` | Self: 4.3% (1.09s) | Total: 81.4% (20.48s) | Samples: 864

**Called by:**
- `generateTokensWithRegex` (15244)
- `isPythonWhitespace` (1405)
- `addToLongName` (216)
- `addToLongName` (78)
- `stripPythonWhitespace` (50)
- `tokenizerFlags` (11)
- `tokenizerFlags` (1)

**Calls:**
- `next` (16087)
- `arrayFromFastWithoutMapFn` (47)
- `generatorResume` (7)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:98` | Self: 2.8% (712.0ms) | Total: 2.8% (712.0ms) | Samples: 583

**Called by:**
- `TypeScriptStates` (524)
- `TypeScriptTypeAnnotationStates` (59)

### `stringSplitFast`
`[native code]` | Self: 2.5% (651.6ms) | Total: 2.5% (651.6ms) | Samples: 543

**Called by:**
- `lineCounter` (543)

### `generatorResume`
`[native code]` | Self: 2.1% (540.5ms) | Total: 100.0% (187.10s) | Samples: 447

**Called by:**
- `next` (141655)
- `commentCounter` (7473)
- `process` (3661)
- `(anonymous)` (2646)
- `conditionCounter` (28)
- `tokenCounter` (27)
- `lineCounter` (26)
- `analyzeSourceCode` (19)
- `withoutWhitespace` (9)
- `from` (7)
- `(anonymous)` (4)

**Calls:**
- `process` (18377)
- `conditionCounter` (18237)
- `tokenCounter` (18190)
- `lineCounter` (17534)
- `commentCounter` (17235)
- `withoutWhitespace` (15561)
- `generateTokensWithRegex` (15252)
- `(anonymous)` (14928)
- `generateTokens` (14707)
- `process` (1942)
- `withoutWhitespace` (1607)
- `lineCounter` (604)
- `commentCounter` (115)
- `commentCounter` (105)
- `generateTokensWithRegex` (104)
- `generateTokens` (76)
- `(anonymous)` (70)
- `generateTokens` (67)
- `generateTokensWithRegex` (58)
- `(anonymous)` (49)
- `conditionCounter` (46)
- `generateTokensWithRegex` (43)
- `generateTokens` (33)
- `commentCounter` (19)
- `conditionCounter` (18)
- `generateTokensWithRegex` (17)
- `process` (12)
- `commentCounter` (9)
- `splitTemplateLiteral` (8)
- `splitTemplateLiteral` (7)
- `generateTokens` (7)
- `lineCounter` (7)
- `splitTemplateLiteral` (6)
- `generateTokens` (5)
- `generateTokens` (4)
- `splitTemplateLiteral` (4)
- `(anonymous)` (4)
- `splitTemplateLiteral` (4)
- `process` (3)
- `generateTokensWithRegex` (3)
- `generateTokens` (3)
- `commentCounter` (2)
- `process` (2)
- `splitTemplateLiteral` (2)
- `splitTemplateLiteral` (2)
- `commentCounter` (2)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokensWithRegex` (1)
- `generateTokens` (1)
- `process` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `commentCounter` (1)
- `generateTokens` (1)
- `generateTokensWithRegex` (1)
- `generateTokens` (1)
- `commentCounter` (1)
- `generateTokens` (1)
- `splitTemplateLiteral` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `tokenCounter` (1)

### `regExpExec`
`[native code]` | Self: 1.9% (479.6ms) | Total: 69.9% (17.59s) | Samples: 392

**Called by:**
- `next` (14664)

**Calls:**
- ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (14268)
- `/\(\?[aiLmsux]+\)/gu` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:72` | Self: 0.7% (182.8ms) | Total: 1.0% (252.0ms) | Samples: 152

**Called by:**
- `every` (210)

**Calls:**
- `/^\p{White_Space}$/u` (52)
- `next` (6)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:334` | Self: 0.6% (163.3ms) | Total: 0.6% (163.3ms) | Samples: 135

**Called by:**
- `invokeCurrentState` (135)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:13` | Self: 0.6% (159.1ms) | Total: 0.6% (159.1ms) | Samples: 131

**Called by:**
- `CodeStateMachine` (131)

### `invokeCurrentState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:231` | Self: 0.5% (131.1ms) | Total: 9.9% (2.49s) | Samples: 110

**Called by:**
- `consume` (2056)

**Calls:**
- `_dec` (167)
- `_dec` (150)
- `_state_global` (146)
- `_state_global` (135)
- `_state_global` (134)
- `_state_global` (103)
- `_state_global` (89)
- `_state_global` (89)
- `_expecting_condition_and_statement_block` (86)
- `_state_global` (85)
- `_expecting_statement_or_block` (73)
- `_function` (65)
- `_function` (54)
- `_expecting_func_opening_bracket` (51)
- `_state_global` (48)
- `_state_global` (46)
- `_state_global` (44)
- `_expecting_func_opening_bracket` (43)
- `_dec` (40)
- `_dec` (38)
- `handleTypeAlias` (34)
- `_state_global` (29)
- `_dec` (16)
- `_state_global` (16)
- `collect` (10)
- `_arrow_function` (9)
- `_state_global` (9)
- `_arrow_function` (8)
- `_state_global` (8)
- `_state_global` (8)
- `_state_simple_type` (8)
- `_state_global` (7)
- `_state_global` (7)
- `_state_global` (7)
- `_function_type_annotation` (6)
- `globalState` (6)
- `_expecting_statement_or_block` (5)
- `_expecting_condition_and_statement_block` (5)
- `_state_global` (4)
- `_state_global` (4)
- `_dec` (4)
- `_field` (4)
- `_state_simple_type` (4)
- `_function` (4)
- `_state_global` (3)
- `_function` (3)
- `_state_simple_type` (3)
- `_field` (2)
- `_inline_type_annotation` (2)
- `_state_generic_type` (2)
- `consume` (2)
- `_state_global` (2)
- `handleTypeAlias` (1)
- `handleTypeAlias` (1)
- `_state_global` (1)
- `_state_template_literal` (1)
- `collect` (1)
- `_expecting_statement_or_block` (1)
- `handleTypeAlias` (1)
- `_function` (1)
- `_dec` (1)
- `_dec` (1)
- `_state_simple_type` (1)
- `handleTypeAlias` (1)
- `_state_simple_type` (1)
- `collect` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_function` (1)
- `_expecting_condition_and_statement_block` (1)
- `_state_global` (1)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:68` | Self: 0.5% (126.9ms) | Total: 0.5% (126.9ms) | Samples: 104

**Called by:**
- `generatorResume` (104)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:168` | Self: 0.5% (126.8ms) | Total: 0.5% (126.8ms) | Samples: 104

**Called by:**
- `invokeCurrentState` (103)
- `handleTypeAlias` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:332` | Self: 0.4% (108.4ms) | Total: 0.4% (108.4ms) | Samples: 89

**Called by:**
- `invokeCurrentState` (89)

### `stringify`
`[native code]` | Self: 0.3% (95.1ms) | Total: 0.3% (95.1ms) | Samples: 79

**Called by:**
- `hash` (79)

### `freeze`
`[native code]` | Self: 0.3% (93.1ms) | Total: 0.3% (93.1ms) | Samples: 77

**Called by:**
- `analyzeLizardSource` (57)
- `map` (14)
- `facade` (6)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1118` | Self: 0.3% (81.0ms) | Total: 98.0% (24.65s) | Samples: 69

**Called by:**
- `analyzeLizardSource` (20467)

**Calls:**
- `next` (20376)
- `generatorResume` (19)
- `process` (1)
- `__call__` (1)
- `[Symbol.iterator]` (1)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1060` | Self: 0.2% (74.9ms) | Total: 2.8% (726.5ms) | Samples: 61

**Called by:**
- `generatorResume` (604)

**Calls:**
- `stringSplitFast` (543)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:36` | Self: 0.2% (68.9ms) | Total: 0.2% (68.9ms) | Samples: 58

**Called by:**
- `generatorResume` (58)

### `CodeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:114` | Self: 0.2% (68.1ms) | Total: 0.9% (240.8ms) | Samples: 58

**Called by:**
- `TypeScriptStates` (173)
- `TypeScriptTypeAnnotationStates` (28)

**Calls:**
- `(anonymous)` (131)
- `(anonymous)` (12)

### `escapeRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:680` | Self: 0.2% (67.9ms) | Total: 0.2% (72.4ms) | Samples: 56

**Called by:**
- `map` (60)

**Calls:**
- `/[\|\\{}()[\]^$+*?.]/gu` (4)

### `/^\p{White_Space}$/u`
`[native code]` | Self: 0.2% (61.8ms) | Total: 0.2% (61.8ms) | Samples: 52

**Called by:**
- `(anonymous)` (52)

### `join`
`[native code]` | Self: 0.2% (56.3ms) | Total: 0.2% (56.3ms) | Samples: 47

**Called by:**
- `commentCounter` (21)
- `withNamespace` (9)
- `generateTokens` (8)
- `tokenizerFlags` (4)
- `generateTokensWithRegex` (3)
- `collect` (1)
- `raw` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:82` | Self: 0.2% (55.6ms) | Total: 0.2% (59.0ms) | Samples: 46

**Called by:**
- `generatorResume` (49)

**Calls:**
- `generateTokens` (2)
- `startsWith` (1)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1081` | Self: 0.2% (55.0ms) | Total: 0.2% (55.0ms) | Samples: 47

**Called by:**
- `generatorResume` (46)
- `consume` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.2% (54.3ms) | Total: 0.2% (54.3ms) | Samples: 47

**Called by:**
- `from` (47)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:73` | Self: 0.2% (51.0ms) | Total: 0.2% (51.0ms) | Samples: 43

**Called by:**
- `generatorResume` (43)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:92` | Self: 0.1% (50.2ms) | Total: 0.1% (50.2ms) | Samples: 43

**Called by:**
- `getCommentFromToken` (32)
- `commentCounter` (11)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:91` | Self: 0.1% (47.6ms) | Total: 0.2% (59.6ms) | Samples: 40

**Called by:**
- `getCommentFromToken` (26)
- `commentCounter` (24)

**Calls:**
- `withoutWhitespace` (10)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:538` | Self: 0.1% (39.6ms) | Total: 0.1% (39.6ms) | Samples: 33

**Called by:**
- `generatorResume` (33)

### `Set`
`[native code]` | Self: 0.1% (37.1ms) | Total: 0.1% (37.1ms) | Samples: 31

**Called by:**
- `buildConditions` (16)
- `CodeReader` (7)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (2)
- `tokenizerFlags` (1)
- `CodeReader` (1)

### `isPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:70` | Self: 0.1% (35.0ms) | Total: 8.0% (2.03s) | Samples: 28

**Called by:**
- `withoutWhitespace` (1615)
- `stripPythonWhitespace` (17)
- `stripPythonWhitespace` (8)

**Calls:**
- `from` (1405)
- `every` (207)

### `next`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:181` | Self: 0.1% (34.8ms) | Total: 0.1% (34.8ms) | Samples: 29

**Called by:**
- `consume` (19)
- `(anonymous)` (6)
- `consume` (2)
- `_consume_generic_type_params` (1)
- `_state_simple_type` (1)

### `invokeCurrentState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:229` | Self: 0.1% (33.1ms) | Total: 0.1% (33.1ms) | Samples: 28

**Called by:**
- `consume` (28)

### `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u`
`[native code]` | Self: 0.1% (32.7ms) | Total: 0.1% (32.7ms) | Samples: 27

**Called by:**
- `(anonymous)` (27)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:214` | Self: 0.1% (32.0ms) | Total: 22.2% (5.59s) | Samples: 27

**Called by:**
- `process` (1866)
- `invokeCurrentState` (1635)
- `consume` (827)
- `next` (205)
- `(anonymous)` (57)
- `_expecting_func_opening_bracket` (9)
- `_arrow_function` (5)
- `_function` (5)

**Calls:**
- `invokeCurrentState` (2056)
- `invokeCurrentState` (1645)
- `consume` (827)
- `invokeCurrentState` (28)
- `consume` (13)
- `consume` (7)
- `consume` (5)
- `conditionCounter` (1)

### `facade`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:22` | Self: 0.1% (29.0ms) | Total: 99.3% (24.98s) | Samples: 24

**Called by:**
- `(module)` (19386)
- `(module)` (1358)

**Calls:**
- `analyzeLizardSource` (20562)
- `analyzeLizardSource` (80)
- `analyzeLizardSource` (57)
- `analyzeLizardSource` (8)
- `freeze` (6)
- `push` (5)
- `fields` (1)
- `fields` (1)

### `isFunctionName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:583` | Self: 0.1% (28.4ms) | Total: 0.1% (29.7ms) | Samples: 23

**Called by:**
- `_function` (10)
- `_state_global` (7)
- `_state_global` (7)

**Calls:**
- `/^[\p{L}_$#]/u` (1)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:602` | Self: 0.1% (28.0ms) | Total: 9.3% (2.35s) | Samples: 22

**Called by:**
- `generatorResume` (1942)

**Calls:**
- `consume` (1866)
- `consume` (54)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1018` | Self: 0.0% (25.1ms) | Total: 0.5% (134.9ms) | Samples: 22

**Called by:**
- `generatorResume` (115)

**Calls:**
- `getCommentFromToken` (58)
- `get_comment_from_token` (24)
- `get_comment_from_token` (11)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:300` | Self: 0.0% (24.6ms) | Total: 0.1% (28.1ms) | Samples: 20

**Called by:**
- `addToLongFunctionName` (12)
- `addParameter` (11)

**Calls:**
- `/^\p{L}$/u` (3)

### `get flags`
`[native code]` | Self: 0.0% (24.5ms) | Total: 0.1% (25.6ms) | Samples: 20

**Called by:**
- `matchAll` (21)

**Calls:**
- `get unicode` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:279` | Self: 0.0% (23.3ms) | Total: 0.2% (56.0ms) | Samples: 20

**Called by:**
- `flatIntoArrayWithCallback` (47)

**Calls:**
- `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u` (27)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` | Self: 0.0% (22.0ms) | Total: 0.0% (22.0ms) | Samples: 18

**Called by:**
- `generatorResume` (17)
- `analyzeSourceCode` (1)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (21.3ms) | Total: 0.0% (21.3ms) | Samples: 18

**Called by:**
- `generatorResume` (18)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:42` | Self: 0.0% (20.1ms) | Total: 0.0% (20.1ms) | Samples: 17

**Called by:**
- `(anonymous)` (17)

### `anonymous`
`[native code]` | Self: 0.0% (20.0ms) | Total: 0.4% (105.4ms) | Samples: 5

**Called by:**
- `internal:streams/lazy_transform` (4)
- `internal:streams/transform` (4)
- `node:crypto` (4)
- `internal:streams/duplex` (4)
- `internal:streams/legacy` (2)
- `node:events` (1)
- `node:stream` (1)
- `internal:shared` (1)
- `internal:streams/readable` (1)
- `internal:streams/operators` (1)
- `internal:fs/streams` (1)
- `internal:fs/glob` (1)
- `node:fs` (1)
- `internal:stream` (1)
- `internal:validators` (1)
- `get ReadStream` (1)
- `node:fs/promises` (1)

**Calls:**
- `internal:streams/transform` (4)
- `internal:streams/duplex` (4)
- `internal:streams/lazy_transform` (4)
- `internal:streams/legacy` (2)
- `node:stream` (1)
- `node:fs/promises` (1)
- `internal:primordials` (1)
- `internal:validators` (1)
- `internal:stream` (1)
- `internal:fs/glob` (1)
- `internal:fs/streams` (1)
- `internal:streams/operators` (1)
- `internal:streams/readable` (1)
- `internal:shared` (1)
- `node:events` (1)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1017` | Self: 0.0% (19.8ms) | Total: 82.5% (20.75s) | Samples: 16

**Called by:**
- `generatorResume` (17235)

**Calls:**
- `next` (9746)
- `generatorResume` (7473)

### `map`
`[native code]` | Self: 0.0% (19.8ms) | Total: 0.7% (180.1ms) | Samples: 17

**Called by:**
- `analyzeLizardSource` (80)
- `generateTokens` (68)
- `withNamespace` (1)

**Calls:**
- `escapeRegex` (60)
- `(anonymous)` (52)
- `freeze` (14)
- `(anonymous)` (5)
- `(anonymous)` (1)

### `raw`
`[native code]` | Self: 0.0% (19.8ms) | Total: 0.0% (21.1ms) | Samples: 17

**Called by:**
- `generateTokens` (5)
- `generateTokens` (3)
- `generateTokens` (3)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)

**Calls:**
- `join` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:287` | Self: 0.0% (19.5ms) | Total: 0.0% (19.5ms) | Samples: 16

**Called by:**
- `invokeCurrentState` (16)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (19.3ms) | Total: 0.0% (19.3ms) | Samples: 17

**Called by:**
- `every` (16)
- `flatIntoArrayWithCallback` (1)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:473` | Self: 0.0% (18.6ms) | Total: 0.0% (18.6ms) | Samples: 16

**Called by:**
- `invokeCurrentState` (16)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:83` | Self: 0.0% (17.0ms) | Total: 0.3% (83.1ms) | Samples: 15

**Called by:**
- `generatorResume` (70)

**Calls:**
- `next` (32)
- `splitTemplateLiteral` (17)
- `generatorResume` (4)
- `splitTemplateLiteral` (2)

### `isParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:587` | Self: 0.0% (15.0ms) | Total: 0.0% (15.0ms) | Samples: 12

**Called by:**
- `_dec` (12)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (13.5ms) | Total: 0.0% (13.5ms) | Samples: 12

**Called by:**
- `CodeStateMachine` (12)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:605` | Self: 0.0% (13.3ms) | Total: 0.0% (14.5ms) | Samples: 11

**Called by:**
- `generatorResume` (12)

**Calls:**
- `statemachine_before_return` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:141` | Self: 0.0% (12.4ms) | Total: 0.0% (12.4ms) | Samples: 10

**Called by:**
- `FunctionInfo` (10)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (12.3ms) | Total: 0.0% (12.3ms) | Samples: 10

**Called by:**
- `generatorResume` (8)
- `(anonymous)` (2)

### `esSpecIsRegExp`
`[native code]` | Self: 0.0% (11.7ms) | Total: 0.0% (11.7ms) | Samples: 10

**Called by:**
- `matchAll` (10)

### `addParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:311` | Self: 0.0% (11.5ms) | Total: 0.9% (242.9ms) | Samples: 10

**Called by:**
- `parameter` (198)

**Calls:**
- `addToLongName` (120)
- `addToLongName` (53)
- `addToLongName` (11)
- `addToLongName` (2)
- `addToLongName` (2)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (11.3ms) | Total: 0.0% (11.3ms) | Samples: 9

**Called by:**
- `TypeScriptReader` (9)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1117` | Self: 0.0% (11.2ms) | Total: 0.0% (17.2ms) | Samples: 10

**Called by:**
- `analyzeLizardSource` (15)

**Calls:**
- `applyProcessor` (2)
- `applyProcessor` (2)
- `commentCounter` (1)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (11.1ms) | Total: 0.0% (11.1ms) | Samples: 9

**Called by:**
- `generatorResume` (9)

### `/^[\p{L}\p{N}_]+$/u`
`[native code]` | Self: 0.0% (11.1ms) | Total: 0.0% (11.1ms) | Samples: 9

**Called by:**
- `isParameter` (9)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:595` | Self: 0.0% (10.3ms) | Total: 87.9% (22.12s) | Samples: 9

**Called by:**
- `generatorResume` (18377)

**Calls:**
- `next` (14707)
- `generatorResume` (3661)

### `_state_simple_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:559` | Self: 0.0% (10.0ms) | Total: 0.0% (10.0ms) | Samples: 8

**Called by:**
- `invokeCurrentState` (8)

### `WeakMap`
`[native code]` | Self: 0.0% (9.6ms) | Total: 0.0% (9.6ms) | Samples: 8

**Called by:**
- `(anonymous)` (8)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:481` | Self: 0.0% (9.5ms) | Total: 0.7% (184.7ms) | Samples: 8

**Called by:**
- `invokeCurrentState` (150)

**Calls:**
- `addToLongFunctionName` (142)

### `isParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:590` | Self: 0.0% (9.3ms) | Total: 0.0% (11.8ms) | Samples: 8

**Called by:**
- `_dec` (10)

**Calls:**
- `/^[\p{L}]/u` (2)

### `performIteration`
`[native code]` | Self: 0.0% (9.2ms) | Total: 0.0% (9.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:64` | Self: 0.0% (9.1ms) | Total: 0.0% (9.1ms) | Samples: 7

**Called by:**
- `generatorResume` (7)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:30` | Self: 0.0% (9.0ms) | Total: 72.7% (18.30s) | Samples: 7

**Called by:**
- `generatorResume` (15252)

**Calls:**
- `from` (15244)
- `(anonymous)` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:331` | Self: 0.0% (8.9ms) | Total: 0.0% (8.9ms) | Samples: 7

**Called by:**
- `invokeCurrentState` (7)

### `every`
`[native code]` | Self: 0.0% (8.4ms) | Total: 1.1% (278.5ms) | Samples: 7

**Called by:**
- `isPythonWhitespace` (207)
- `hasCompleteNestingStackSurface` (20)
- `asNestingStackAdapter` (3)
- `withoutWhitespace` (2)
- `stripPythonWhitespace` (1)

**Calls:**
- `(anonymous)` (210)
- `(anonymous)` (16)

### `normalizePythonRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:676` | Self: 0.0% (8.4ms) | Total: 0.0% (10.6ms) | Samples: 7

**Called by:**
- `tokenizerFlags` (9)

**Calls:**
- `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:571` | Self: 0.0% (8.3ms) | Total: 0.0% (8.3ms) | Samples: 7

**Called by:**
- `generatorResume` (7)

### `pythonLineBoundaryLengthAt`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:657` | Self: 0.0% (8.3ms) | Total: 0.0% (8.3ms) | Samples: 7

**Called by:**
- `splitPythonLines` (7)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (8.2ms) | Total: 0.0% (8.2ms) | Samples: 7

**Called by:**
- `generatorResume` (7)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:325` | Self: 0.0% (8.1ms) | Total: 0.0% (8.1ms) | Samples: 7

**Called by:**
- `invokeCurrentState` (7)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:477` | Self: 0.0% (8.0ms) | Total: 0.8% (204.1ms) | Samples: 7

**Called by:**
- `invokeCurrentState` (167)

**Calls:**
- `parameter` (160)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:80` | Self: 0.0% (8.0ms) | Total: 0.0% (8.0ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:303` | Self: 0.0% (7.5ms) | Total: 0.0% (7.5ms) | Samples: 6

**Called by:**
- `addToLongFunctionName` (4)
- `addParameter` (2)

### `hasCompleteNestingStackSurface`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` | Self: 0.0% (7.4ms) | Total: 0.1% (30.4ms) | Samples: 6

**Called by:**
- `asNestingStackAdapter` (26)

**Calls:**
- `every` (20)

### `(anonymous)`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:17` | Self: 0.0% (7.3ms) | Total: 0.0% (8.4ms) | Samples: 6

**Called by:**
- `sort` (7)

**Calls:**
- `localeCompare` (1)

### `_to_camel_case`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:539` | Self: 0.0% (7.3ms) | Total: 0.0% (7.3ms) | Samples: 6

**Called by:**
- `collect` (6)

### `globalState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (7.2ms) | Total: 0.0% (7.2ms) | Samples: 6

**Called by:**
- `invokeCurrentState` (6)

### `splitPythonLines`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:90` | Self: 0.0% (7.2ms) | Total: 0.0% (7.2ms) | Samples: 6

**Called by:**
- `commentCounter` (6)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (7.1ms) | Total: 0.0% (7.1ms) | Samples: 6

**Called by:**
- `_function_type_annotation` (4)
- `_state_generic_type` (2)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:72` | Self: 0.0% (6.9ms) | Total: 0.0% (6.9ms) | Samples: 6

**Called by:**
- `generatorResume` (6)

### `sort`
`[native code]` | Self: 0.0% (6.8ms) | Total: 0.0% (15.3ms) | Samples: 6

**Called by:**
- `assertEquivalent` (13)

**Calls:**
- `(anonymous)` (7)

### `isParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:591` | Self: 0.0% (6.8ms) | Total: 0.0% (18.0ms) | Samples: 6

**Called by:**
- `_dec` (15)

**Calls:**
- `/^[\p{L}\p{N}_]+$/u` (9)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:73` | Self: 0.0% (6.5ms) | Total: 0.0% (6.5ms) | Samples: 5

**Called by:**
- `map` (5)

### `stripPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:95` | Self: 0.0% (6.3ms) | Total: 0.0% (6.3ms) | Samples: 5

**Called by:**
- `commentCounter` (5)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (6.0ms) | Total: 0.0% (6.0ms) | Samples: 5

**Called by:**
- `consume` (5)

### `stringIncludesInternal`
`[native code]` | Self: 0.0% (5.9ms) | Total: 0.0% (5.9ms) | Samples: 5

**Called by:**
- `matchAll` (5)

### `/\(\?[aiLmsux]+\)/gu`
`[native code]` | Self: 0.0% (5.6ms) | Total: 0.0% (5.6ms) | Samples: 5

**Called by:**
- `regExpExec` (4)
- `tokenizerFlags` (1)

### `TypeScriptStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:160` | Self: 0.0% (5.5ms) | Total: 3.4% (859.4ms) | Samples: 5

**Called by:**
- `statemachine_clone` (694)
- `TypeScriptReader` (13)

**Calls:**
- `(anonymous)` (524)
- `CodeStateMachine` (173)
- `CodeStateMachine` (4)
- `CodeStateMachine` (1)

### `push`
`[native code]` | Self: 0.0% (5.3ms) | Total: 0.0% (5.3ms) | Samples: 5

**Called by:**
- `facade` (5)

### `update`
`[native code]` | Self: 0.0% (5.2ms) | Total: 0.0% (5.2ms) | Samples: 4

**Called by:**
- `hash` (4)

### `addToLongFunctionName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:972` | Self: 0.0% (5.2ms) | Total: 0.6% (175.1ms) | Samples: 4

**Called by:**
- `_dec` (142)

**Calls:**
- `addToLongName` (96)
- `addToLongName` (26)
- `addToLongName` (12)
- `addToLongName` (4)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:444` | Self: 0.0% (5.1ms) | Total: 0.0% (5.1ms) | Samples: 5

**Called by:**
- `invokeCurrentState` (3)
- `_state_global` (2)

### `_field`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:457` | Self: 0.0% (5.0ms) | Total: 0.0% (5.0ms) | Samples: 4

**Called by:**
- `invokeCurrentState` (4)

### `CodeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (4.9ms) | Total: 0.0% (4.9ms) | Samples: 4

**Called by:**
- `TypeScriptStates` (4)

### `withNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:491` | Self: 0.0% (4.7ms) | Total: 0.0% (16.8ms) | Samples: 4

**Called by:**
- `withNamespace` (14)

**Calls:**
- `join` (9)
- `map` (1)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1024` | Self: 0.0% (4.7ms) | Total: 0.0% (22.7ms) | Samples: 4

**Called by:**
- `generatorResume` (19)

**Calls:**
- `splitPythonLines` (7)
- `splitPythonLines` (6)
- `splitPythonLines` (2)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:58` | Self: 0.0% (4.6ms) | Total: 0.0% (4.6ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:469` | Self: 0.0% (4.6ms) | Total: 0.0% (4.6ms) | Samples: 4

**Called by:**
- `invokeCurrentState` (4)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:333` | Self: 0.0% (4.5ms) | Total: 0.0% (4.5ms) | Samples: 4

**Called by:**
- `invokeCurrentState` (4)

### `/[\|\\{}()[\]^$+*?.]/gu`
`[native code]` | Self: 0.0% (4.5ms) | Total: 0.0% (4.5ms) | Samples: 4

**Called by:**
- `escapeRegex` (4)

### `asciiAlphanumericFinalSuffix`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:106` | Self: 0.0% (4.4ms) | Total: 0.0% (4.4ms) | Samples: 4

**Called by:**
- `resolveLizardReader` (4)

### `[Symbol.matchAll]`
`[native code]` | Self: 0.0% (4.3ms) | Total: 0.0% (4.3ms) | Samples: 4

**Called by:**
- `tokenizerFlags` (4)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `generatorResume` (2)
- `analyzeSourceCode` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `readInsideBracketsThen` (2)
- `generatorResume` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:404` | Self: 0.0% (3.6ms) | Total: 0.0% (6.0ms) | Samples: 3

**Called by:**
- `TypeScriptReader` (5)

**Calls:**
- `Set` (2)

### `FileInformation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:335` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `FileInfoBuilder` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:81` | Self: 0.0% (3.5ms) | Total: 71.2% (17.90s) | Samples: 3

**Called by:**
- `generatorResume` (14928)

**Calls:**
- `next` (12278)
- `generatorResume` (2646)
- `generateTokens` (1)

### `/^\p{L}$/u`
`[native code]` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 3

**Called by:**
- `addToLongName` (3)

### `Nesting`
`[native code]` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 3

**Called by:**
- `FunctionInfo` (3)

### `parse`
`[native code]` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 3

**Called by:**
- `(module)` (3)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:606` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:53` | Self: 0.0% (3.2ms) | Total: 0.0% (4.5ms) | Samples: 3

**Called by:**
- `generatorResume` (4)

**Calls:**
- `indexOf` (1)

### `_consume_type_annotation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:532` | Self: 0.0% (3.0ms) | Total: 0.4% (108.0ms) | Samples: 2

**Called by:**
- `_state_global` (48)
- `_expecting_func_opening_bracket` (41)

**Calls:**
- `TypeScriptTypeAnnotationStates` (87)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 2

**Called by:**
- `addParameter` (2)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1043` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:501` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1507` | Self: 0.0% (2.6ms) | Total: 74.2% (18.67s) | Samples: 2

**Called by:**
- `generatorResume` (15561)

**Calls:**
- `next` (15550)
- `generatorResume` (9)

### `/^[\p{L}]/u`
`[native code]` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `isParameter` (2)

### `confirmNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:937` | Self: 0.0% (2.5ms) | Total: 0.0% (13.2ms) | Samples: 2

**Called by:**
- `restartNewFunction` (11)

**Calls:**
- `startNewFunctionNesting` (9)

### `addParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:319` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `parameter` (2)

### `applyProcessor`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1494` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:534` | Self: 0.0% (2.4ms) | Total: 0.3% (78.8ms) | Samples: 2

**Called by:**
- `consume` (63)

**Calls:**
- `consume` (57)
- `consume` (4)

### `splitPythonLines`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:94` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `commentCounter` (2)

### `resolveLizardReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:96` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `analyzeLizardSource` (2)

### `_to_camel_case`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:540` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `collect` (2)

### `parameterCount`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` | Self: 0.0% (2.4ms) | Total: 0.2% (60.7ms) | Samples: 2

**Called by:**
- `parameter_count` (51)

**Calls:**
- `flatMap` (34)
- `flatIntoArrayWithCallback` (10)
- `get parameters` (5)

### `withNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `tryNewFunction` (2)

### `tryNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:924` | Self: 0.0% (2.3ms) | Total: 0.0% (18.1ms) | Samples: 2

**Called by:**
- `restartNewFunction` (15)

**Calls:**
- `FunctionInfo` (13)

### `_field`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `analyzeLizardSource` (2)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:45` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:43` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1016` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (1)
- `applyProcessor` (1)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1029` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu`
`[native code]` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `normalizePythonRegex` (2)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1028` | Self: 0.0% (2.1ms) | Total: 0.5% (129.7ms) | Samples: 2

**Called by:**
- `generatorResume` (105)

**Calls:**
- `stripPythonWhitespace` (50)
- `join` (21)
- `stripPythonWhitespace` (18)
- `stripPythonWhitespace` (8)
- `stripPythonWhitespace` (5)
- `stripPythonWhitespace` (1)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:636` | Self: 0.0% (2.0ms) | Total: 0.2% (56.3ms) | Samples: 2

**Called by:**
- `generateTokens` (48)

**Calls:**
- `matchAll` (31)
- `from` (11)
- `[Symbol.matchAll]` (4)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1112` | Self: 0.0% (1.5ms) | Total: 0.0% (19.6ms) | Samples: 1

**Called by:**
- `analyzeLizardSource` (16)

**Calls:**
- `FileInfoBuilder` (9)
- `FileInfoBuilder` (3)
- `FileInfoBuilder` (1)
- `FileInfoBuilder` (1)
- `FileInfoBuilder` (1)

### `isFunctionName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `_state_simple_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:472` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `resolveLizardReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:94` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeLizardSource` (1)

### `exec`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (3.7ms) | Samples: 1

**Called by:**
- `next` (3)

**Calls:**
- ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (2)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1506` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `preprocessing` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:556` | Self: 0.0% (1.3ms) | Total: 0.0% (4.7ms) | Samples: 1

**Called by:**
- `generatorResume` (4)

**Calls:**
- `raw` (3)

### `getOwnPropertyDescriptor`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:223` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `next` (1)

### `_state_template_literal`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_expecting_statement_or_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:44` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `_expecting_condition_and_statement_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:422` | Self: 0.0% (1.3ms) | Total: 0.4% (103.5ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (86)

**Calls:**
- `cloneState` (85)

### `handleTypeAlias`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:185` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `[Symbol.iterator]`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `tryNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:929` | Self: 0.0% (1.3ms) | Total: 0.0% (12.0ms) | Samples: 1

**Called by:**
- `restartNewFunction` (10)

**Calls:**
- `get currentNestingLevel` (8)
- `currentNestingLevel` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:99` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `NestingStack` (1)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_consume_type_annotation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `_expecting_func_opening_bracket` (1)

### `returnFromState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:195` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:85` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `splitTemplateLiteral`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:55` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `startsWith`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `/^[\p{L}_$#]/u`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `isFunctionName` (1)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:42` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `statemachine_before_return`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:164` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `process` (1)

### `indexOf`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `splitTemplateLiteral` (1)

### `collect`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:513` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `fields`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:20` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `facade` (1)

### `resolveLizardReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:93` | Self: 0.0% (1.2ms) | Total: 0.0% (5.7ms) | Samples: 1

**Called by:**
- `analyzeLizardSource` (5)

**Calls:**
- `asciiAlphanumericFinalSuffix` (4)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:401` | Self: 0.0% (1.2ms) | Total: 0.0% (3.3ms) | Samples: 1

**Called by:**
- `TypeScriptReader` (3)

**Calls:**
- `Set` (2)

### `_arrow_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:435` | Self: 0.0% (1.2ms) | Total: 0.0% (9.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (8)

**Calls:**
- `consume` (5)
- `next` (2)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:25` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `canonical`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:17` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `assertEquivalent` (1)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:69` | Self: 0.0% (1.2ms) | Total: 98.5% (24.77s) | Samples: 1

**Called by:**
- `facade` (20562)

**Calls:**
- `analyzeSourceCode` (20467)
- `analyzeSourceCode` (59)
- `analyzeSourceCode` (16)
- `analyzeSourceCode` (15)
- `analyzeSourceCode` (2)
- `analyzeSourceCode` (2)

### `_pop_function_from_stack`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:403` | Self: 0.0% (1.2ms) | Total: 0.0% (2.4ms) | Samples: 1

**Called by:**
- `consume` (2)

**Calls:**
- `endOfFunction` (1)

### `Hash`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `Hash` (1)

### `_function_type_annotation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:578` | Self: 0.0% (1.2ms) | Total: 0.0% (7.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `readInsideBracketsThen` (4)
- `readInsideBracketsThen` (1)

### `endOfFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `_pop_function_from_stack` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:280` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:312` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:564` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `TokenMatch`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:17` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generateTokens` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:40` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generateTokensWithRegex` (1)

### `handleTypeAlias`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:184` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:448` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:561` | Self: 0.0% (1.1ms) | Total: 70.1% (17.64s) | Samples: 1

**Called by:**
- `generatorResume` (14707)
- `(anonymous)` (2)

**Calls:**
- `next` (14703)
- `matchAll` (5)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:396` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `TypeScriptReader` (1)

### `localeCompare`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:80` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:642` | Self: 0.0% (1.1ms) | Total: 0.0% (12.9ms) | Samples: 1

**Called by:**
- `generateTokens` (11)

**Calls:**
- `normalizePythonRegex` (9)
- `/\(\?[aiLmsux]+\)/gu` (1)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:775` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_expecting_func_opening_bracket`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:486` | Self: 0.0% (1.1ms) | Total: 0.2% (53.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (43)

**Calls:**
- `_consume_type_annotation` (41)
- `_consume_type_annotation` (1)

### `tokenCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:590` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `tokenCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1071` | Self: 0.0% (1.0ms) | Total: 87.0% (21.89s) | Samples: 1

**Called by:**
- `generatorResume` (18190)

**Calls:**
- `next` (18162)
- `generatorResume` (27)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:477` | Self: 0.0% (1.0ms) | Total: 0.0% (21.2ms) | Samples: 1

**Called by:**
- `CodeReader` (17)

**Calls:**
- `Set` (16)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:553` | Self: 0.0% (1.0ms) | Total: 0.0% (3.5ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `next` (2)

### `CodeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:115` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `TypeScriptStates` (1)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:291` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_inline_type_annotation` (1)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1039` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `readFileSync`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `readFileSync` (1)
- `(module)` (1)

**Calls:**
- `readFileSync` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:346` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:503` | Self: 0.0% (1.0ms) | Total: 0.3% (78.5ms) | Samples: 1

**Called by:**
- `generatorResume` (67)

**Calls:**
- `tokenizerFlags` (48)
- `tokenizerFlags` (11)
- `tokenizerFlags` (5)
- `tokenizerFlags` (2)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:639` | Self: 0.0% (1.0ms) | Total: 0.0% (2.4ms) | Samples: 1

**Called by:**
- `generateTokens` (2)

**Calls:**
- `Set` (1)

### `collect`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:603` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `flatIntoArray`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `_expecting_condition_and_statement_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `get unicode`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `get flags` (1)

### `stripPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `commentCounter` (1)

### `(unknown)`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:307` | Self: 0.0% (1.0ms) | Total: 0.0% (9.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (8)

**Calls:**
- `_function` (5)
- `_function` (2)

### `handleTypeAlias`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:187` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `isParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_dec` (1)

### `collect`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:509` | Self: 0.0% (1.0ms) | Total: 0.0% (12.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (10)

**Calls:**
- `_to_camel_case` (6)
- `_to_camel_case` (2)
- `join` (1)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:464` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:400` | Self: 0.0% (1.0ms) | Total: 0.1% (30.0ms) | Samples: 1

**Called by:**
- `TypeScriptReader` (25)

**Calls:**
- `buildConditions` (17)
- `Set` (7)

### `FunctionInfo`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:144` | Self: 0.0% (1.0ms) | Total: 0.0% (16.8ms) | Samples: 1

**Called by:**
- `tryNewFunction` (13)
- `FileInfoBuilder` (1)

**Calls:**
- `(anonymous)` (10)
- `Nesting` (3)

### `_state_simple_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:563` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:299` | Self: 0.0% (989us) | Total: 0.3% (95.4ms) | Samples: 1

**Called by:**
- `addParameter` (53)
- `addToLongFunctionName` (26)

**Calls:**
- `from` (78)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1020` | Self: 0.0% (987us) | Total: 0.0% (987us) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1080` | Self: 0.0% (978us) | Total: 87.3% (21.95s) | Samples: 1

**Called by:**
- `generatorResume` (18237)

**Calls:**
- `next` (18208)
- `generatorResume` (28)

### `fields`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts` | Self: 0.0% (963us) | Total: 0.0% (963us) | Samples: 1

**Called by:**
- `facade` (1)

### `internal:fs/glob`
`internal:fs/glob:2` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:446` | Self: 0.0% (0us) | Total: 0.0% (12.3ms) | Samples: 0

**Called by:**
- `_state_global` (5)
- `invokeCurrentState` (4)
- `_state_global` (1)

**Calls:**
- `isFunctionName` (10)

### `createHash`
`node:crypto:201` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `hash` (1)

**Calls:**
- `Hash` (1)

### `_expecting_statement_or_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:426` | Self: 0.0% (0us) | Total: 0.3% (89.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (73)

**Calls:**
- `cloneState` (73)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:550` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `parameter_count`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` | Self: 0.0% (0us) | Total: 0.2% (60.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (51)

**Calls:**
- `parameterCount` (51)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `bound call` (1)

**Calls:**
- `(anonymous)` (1)

### `cloneState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:172` | Self: 0.0% (0us) | Total: 3.3% (842.3ms) | Samples: 0

**Called by:**
- `_state_global` (146)
- `read_object` (134)
- `_state_global` (88)
- `_state_global` (85)
- `_expecting_condition_and_statement_block` (85)
- `_expecting_statement_or_block` (73)
- `_state_global` (44)
- `_state_global` (29)
- `_state_global` (9)

**Calls:**
- `statemachine_clone` (693)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.0% (18.0ms) | Samples: 0

**Calls:**
- `anonymous` (4)

### `asNestingStackAdapter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:731` | Self: 0.0% (0us) | Total: 0.1% (33.8ms) | Samples: 0

**Called by:**
- `nestingStackAdapter` (29)

**Calls:**
- `hasCompleteNestingStackSurface` (26)
- `every` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:374` | Self: 0.0% (0us) | Total: 0.2% (57.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (48)

**Calls:**
- `_consume_type_annotation` (48)

### `preprocessing`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1012` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `applyProcessor` (1)

**Calls:**
- `withoutWhitespace` (1)

### `getCommentFromToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:615` | Self: 0.0% (0us) | Total: 0.2% (67.5ms) | Samples: 0

**Called by:**
- `commentCounter` (58)

**Calls:**
- `get_comment_from_token` (32)
- `get_comment_from_token` (26)

### `_state_simple_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:558` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `next` (3)

### `statemachine_clone`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:177` | Self: 0.0% (0us) | Total: 3.3% (843.6ms) | Samples: 0

**Called by:**
- `cloneState` (693)
- `_state_global` (1)

**Calls:**
- `TypeScriptStates` (694)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:769` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `FileInfoBuilder` (1)

**Calls:**
- `NestingStack` (1)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:66` | Self: 0.0% (0us) | Total: 0.0% (9.5ms) | Samples: 0

**Called by:**
- `facade` (8)

**Calls:**
- `resolveLizardReader` (5)
- `resolveLizardReader` (2)
- `resolveLizardReader` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:339` | Self: 0.0% (0us) | Total: 0.0% (10.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (8)

**Calls:**
- `isFunctionName` (7)
- `isFunctionName` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:554` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:220` | Self: 0.0% (0us) | Total: 0.3% (89.8ms) | Samples: 0

**Called by:**
- `process` (54)
- `consume` (7)
- `invokeCurrentState` (4)
- `(anonymous)` (4)
- `next` (3)

**Calls:**
- `(anonymous)` (63)
- `(anonymous)` (6)
- `_pop_function_from_stack` (2)
- `next` (1)

### `(module)`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:35` | Self: 0.0% (0us) | Total: 93.3% (23.46s) | Samples: 0

**Calls:**
- `facade` (19386)
- `assertEquivalent` (91)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.0% (18.0ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:475` | Self: 0.0% (0us) | Total: 0.1% (45.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (38)

**Calls:**
- `isParameter` (15)
- `isParameter` (12)
- `isParameter` (10)
- `isParameter` (1)

### `TypeScriptTypeAnnotationStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:548` | Self: 0.0% (0us) | Total: 0.4% (105.0ms) | Samples: 0

**Called by:**
- `_consume_type_annotation` (87)

**Calls:**
- `(anonymous)` (59)
- `CodeStateMachine` (28)

### `startNewFunctionNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:855` | Self: 0.0% (0us) | Total: 0.0% (10.6ms) | Samples: 0

**Called by:**
- `confirmNewFunction` (9)

**Calls:**
- `nestingStackAdapter` (9)

### `_expecting_condition_and_statement_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:419` | Self: 0.0% (0us) | Total: 0.0% (5.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `next` (5)

### `matchAll`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (43.3ms) | Samples: 0

**Called by:**
- `tokenizerFlags` (31)
- `generateTokens` (5)

**Calls:**
- `get flags` (21)
- `esSpecIsRegExp` (10)
- `stringIncludesInternal` (5)

### `get currentNestingLevel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` | Self: 0.0% (0us) | Total: 0.0% (9.5ms) | Samples: 0

**Called by:**
- `tryNewFunction` (8)

**Calls:**
- `nestingStackAdapter` (8)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:453` | Self: 0.0% (0us) | Total: 0.3% (80.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (65)

**Calls:**
- `next` (60)
- `consume` (5)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:72` | Self: 0.0% (0us) | Total: 0.3% (97.2ms) | Samples: 0

**Called by:**
- `facade` (80)

**Calls:**
- `map` (80)

### `internal:primordials`
`internal:primordials:71` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `makeSafe` (1)

**Calls:**
- `forEach` (1)

### `read_object`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:384` | Self: 0.0% (0us) | Total: 0.6% (160.2ms) | Samples: 0

**Called by:**
- `_state_global` (134)

**Calls:**
- `cloneState` (134)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:352` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `next` (2)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:298` | Self: 0.0% (0us) | Total: 1.0% (267.4ms) | Samples: 0

**Called by:**
- `addParameter` (120)
- `addToLongFunctionName` (96)

**Calls:**
- `from` (216)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:306` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `_function` (1)

### `get parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:278` | Self: 0.0% (0us) | Total: 0.0% (5.9ms) | Samples: 0

**Called by:**
- `parameterCount` (5)

**Calls:**
- `flatMap` (5)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:216` | Self: 0.0% (0us) | Total: 0.0% (22.6ms) | Samples: 0

**Called by:**
- `consume` (13)
- `invokeCurrentState` (6)

**Calls:**
- `next` (19)

### `nestingStackAdapter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` | Self: 0.0% (0us) | Total: 0.1% (33.8ms) | Samples: 0

**Called by:**
- `withNamespace` (11)
- `startNewFunctionNesting` (9)
- `get currentNestingLevel` (8)
- `currentNestingLevel` (1)

**Calls:**
- `asNestingStackAdapter` (29)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `_state_generic_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:574` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `readInsideBracketsThen` (2)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (59.7ms) | Samples: 0

**Called by:**
- `flatMap` (39)
- `parameterCount` (10)
- `get parameterCount` (1)

**Calls:**
- `(anonymous)` (47)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `flatIntoArray` (1)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (18.0ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1113` | Self: 0.0% (0us) | Total: 0.2% (71.1ms) | Samples: 0

**Called by:**
- `analyzeLizardSource` (59)

**Calls:**
- `TypeScriptReader` (46)
- `TypeScriptReader` (13)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:402` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `TypeScriptReader` (2)

**Calls:**
- `Set` (2)

### `(module)`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:34` | Self: 0.0% (0us) | Total: 6.5% (1.64s) | Samples: 0

**Calls:**
- `facade` (1358)
- `assertEquivalent` (7)

### `TypeScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:34` | Self: 0.0% (0us) | Total: 0.0% (15.8ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (13)

**Calls:**
- `TypeScriptStates` (13)

### `_arrow_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:431` | Self: 0.0% (0us) | Total: 0.0% (10.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `_push_function_to_stack` (9)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:772` | Self: 0.0% (0us) | Total: 0.0% (10.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (9)

**Calls:**
- `(anonymous)` (8)
- `(anonymous)` (1)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:774` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (1)

**Calls:**
- `FunctionInfo` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:403` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `TypeScriptReader` (1)

**Calls:**
- `Set` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:552` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:441` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `_consume_generic_type_params` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:542` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `generatorResume` (3)

**Calls:**
- `raw` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:79` | Self: 0.0% (0us) | Total: 0.2% (62.1ms) | Samples: 0

**Called by:**
- `map` (52)

**Calls:**
- `parameter_count` (51)
- `get parameter_count` (1)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:71` | Self: 0.0% (0us) | Total: 0.2% (68.1ms) | Samples: 0

**Called by:**
- `facade` (57)

**Calls:**
- `freeze` (57)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `makeSafe`
`internal:primordials:30` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `bound call` (1)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1508` | Self: 0.0% (0us) | Total: 7.9% (2.00s) | Samples: 0

**Called by:**
- `generatorResume` (1607)
- `get_comment_from_token` (10)

**Calls:**
- `isPythonWhitespace` (1615)
- `every` (2)

### `internal:streams/legacy`
`internal:streams/legacy:2` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:58` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `generatorResume` (3)

**Calls:**
- `join` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:358` | Self: 0.0% (0us) | Total: 0.4% (107.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (85)

**Calls:**
- `cloneState` (85)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:504` | Self: 0.0% (0us) | Total: 0.0% (5.7ms) | Samples: 0

**Called by:**
- `generatorResume` (5)

**Calls:**
- `raw` (5)

### `(module)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:48` | Self: 0.0% (0us) | Total: 0.0% (9.2ms) | Samples: 0

**Calls:**
- `performIteration` (1)

### `currentNestingLevel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `tryNewFunction` (1)

**Calls:**
- `nestingStackAdapter` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:553` | Self: 0.0% (0us) | Total: 0.3% (91.4ms) | Samples: 0

**Called by:**
- `generatorResume` (76)

**Calls:**
- `map` (68)
- `join` (8)

### `parameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:988` | Self: 0.0% (0us) | Total: 0.9% (245.4ms) | Samples: 0

**Called by:**
- `_dec` (160)
- `_dec` (40)

**Calls:**
- `addParameter` (198)
- `addParameter` (2)

### `_state_simple_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:562` | Self: 0.0% (0us) | Total: 0.0% (4.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `next` (3)
- `next` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.0% (18.0ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `get parameter_count`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `get parameterCount` (1)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:296` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `_inline_type_annotation` (1)
- `_function_type_annotation` (1)

**Calls:**
- `(anonymous)` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:349` | Self: 0.0% (0us) | Total: 0.2% (52.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (44)

**Calls:**
- `cloneState` (44)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:309` | Self: 0.0% (0us) | Total: 0.2% (55.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (46)

**Calls:**
- `next` (46)

### `restartNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:947` | Self: 0.0% (0us) | Total: 0.0% (13.2ms) | Samples: 0

**Called by:**
- `pushNewFunction` (11)

**Calls:**
- `confirmNewFunction` (11)

### `assertEquivalent`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:27` | Self: 0.0% (0us) | Total: 0.4% (118.2ms) | Samples: 0

**Called by:**
- `(module)` (91)
- `(module)` (7)

**Calls:**
- `hash` (84)
- `sort` (13)
- `canonical` (1)

### `_push_function_to_stack`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:399` | Self: 0.0% (0us) | Total: 0.2% (75.2ms) | Samples: 0

**Called by:**
- `_function` (54)
- `_arrow_function` (9)

**Calls:**
- `pushNewFunction` (63)

### `applyProcessor`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1495` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (2)

**Calls:**
- `preprocessing` (1)
- `commentCounter` (1)

### `_expecting_func_opening_bracket`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:498` | Self: 0.0% (0us) | Total: 0.2% (61.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (51)

**Calls:**
- `next` (42)
- `consume` (9)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:547` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:525` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `next` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:342` | Self: 0.0% (0us) | Total: 0.7% (176.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (146)

**Calls:**
- `cloneState` (146)

### `_inline_type_annotation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:570` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `readInsideBracketsThen` (1)
- `readInsideBracketsThen` (1)

### `(module)`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:12` | Self: 0.0% (0us) | Total: 0.0% (4.4ms) | Samples: 0

**Calls:**
- `parse` (3)
- `readFileSync` (1)

### `pushNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:956` | Self: 0.0% (0us) | Total: 0.2% (75.2ms) | Samples: 0

**Called by:**
- `_push_function_to_stack` (63)

**Calls:**
- `restartNewFunction` (52)
- `restartNewFunction` (11)

### `TypeScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:33` | Self: 0.0% (0us) | Total: 0.2% (55.3ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (46)

**Calls:**
- `CodeReader` (25)
- `CodeReader` (9)
- `CodeReader` (5)
- `CodeReader` (3)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)

### `hash`
`/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts:15` | Self: 0.0% (0us) | Total: 0.4% (101.6ms) | Samples: 0

**Called by:**
- `assertEquivalent` (84)

**Calls:**
- `stringify` (79)
- `update` (4)
- `createHash` (1)

### `stripPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:91` | Self: 0.0% (0us) | Total: 0.0% (21.8ms) | Samples: 0

**Called by:**
- `commentCounter` (18)

**Calls:**
- `isPythonWhitespace` (17)
- `every` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:301` | Self: 0.0% (0us) | Total: 0.0% (10.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `cloneState` (9)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:361` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `returnFromState` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:562` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `TokenMatch` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:355` | Self: 0.0% (0us) | Total: 0.4% (106.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (89)

**Calls:**
- `cloneState` (88)
- `statemachine_clone` (1)

### `next`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:182` | Self: 0.0% (0us) | Total: 1.0% (254.1ms) | Samples: 0

**Called by:**
- `_function` (60)
- `_state_global` (46)
- `_expecting_func_opening_bracket` (42)
- `handleTypeAlias` (34)
- `_expecting_condition_and_statement_block` (5)
- `_expecting_statement_or_block` (5)
- `_state_global` (4)
- `_state_simple_type` (3)
- `_state_simple_type` (3)
- `_arrow_function` (2)
- `_state_global` (2)
- `_state_global` (2)
- `consume` (1)

**Calls:**
- `consume` (205)
- `consume` (3)
- `consume` (1)

### `restartNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:946` | Self: 0.0% (0us) | Total: 0.2% (61.9ms) | Samples: 0

**Called by:**
- `pushNewFunction` (52)

**Calls:**
- `tryNewFunction` (27)
- `tryNewFunction` (15)
- `tryNewFunction` (10)

### `stripPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:83` | Self: 0.0% (0us) | Total: 0.0% (9.5ms) | Samples: 0

**Called by:**
- `commentCounter` (8)

**Calls:**
- `isPythonWhitespace` (8)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:359` | Self: 0.0% (0us) | Total: 0.6% (160.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (134)

**Calls:**
- `read_object` (134)

### `get parameterCount`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `get parameter_count` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:643` | Self: 0.0% (0us) | Total: 0.0% (5.8ms) | Samples: 0

**Called by:**
- `generateTokens` (5)

**Calls:**
- `join` (4)
- `from` (1)

### `(anonymous)`
`internal:primordials:32` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `forEach` (1)

**Calls:**
- `getOwnPropertyDescriptor` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:451` | Self: 0.0% (0us) | Total: 0.2% (64.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (54)

**Calls:**
- `_push_function_to_stack` (54)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `invokeCurrentState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:230` | Self: 0.0% (0us) | Total: 7.9% (1.99s) | Samples: 0

**Called by:**
- `consume` (1645)

**Calls:**
- `consume` (1635)
- `consume` (6)
- `consume` (4)

### `Hash`
`node:crypto:178` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `createHash` (1)

**Calls:**
- `Hash` (1)

### `stripPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:79` | Self: 0.0% (0us) | Total: 0.2% (64.0ms) | Samples: 0

**Called by:**
- `commentCounter` (50)

**Calls:**
- `from` (50)

### `tryNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:925` | Self: 0.0% (0us) | Total: 0.1% (31.7ms) | Samples: 0

**Called by:**
- `restartNewFunction` (27)

**Calls:**
- `withNamespace` (25)
- `withNamespace` (2)

### `withNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:831` | Self: 0.0% (0us) | Total: 0.1% (29.3ms) | Samples: 0

**Called by:**
- `tryNewFunction` (25)

**Calls:**
- `withNamespace` (14)
- `nestingStackAdapter` (11)

### `NestingStack`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `splitPythonLines`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:85` | Self: 0.0% (0us) | Total: 0.0% (8.3ms) | Samples: 0

**Called by:**
- `commentCounter` (7)

**Calls:**
- `pythonLineBoundaryLengthAt` (7)

### `_expecting_statement_or_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:427` | Self: 0.0% (0us) | Total: 0.0% (5.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `next` (5)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:770` | Self: 0.0% (0us) | Total: 0.0% (9.6ms) | Samples: 0

**Called by:**
- `FileInfoBuilder` (8)

**Calls:**
- `WeakMap` (8)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1114` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `analyzeLizardSource` (2)

**Calls:**
- `generateTokensWithRegex` (1)
- `generateTokensWithRegex` (1)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:773` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (3)

**Calls:**
- `FileInformation` (3)

### `handleTypeAlias`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:188` | Self: 0.0% (0us) | Total: 0.1% (40.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (34)

**Calls:**
- `next` (34)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:283` | Self: 0.0% (0us) | Total: 0.0% (8.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `isFunctionName` (7)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1053` | Self: 0.0% (0us) | Total: 83.9% (21.11s) | Samples: 0

**Called by:**
- `generatorResume` (17534)

**Calls:**
- `next` (17508)
- `generatorResume` (26)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:543` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:554` | Self: 0.0% (0us) | Total: 0.0% (5.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `next` (4)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:551` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `flatMap`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (45.8ms) | Samples: 0

**Called by:**
- `parameterCount` (34)
- `get parameters` (5)

**Calls:**
- `flatIntoArrayWithCallback` (39)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:391` | Self: 0.0% (0us) | Total: 0.0% (7.2ms) | Samples: 0

**Called by:**
- `consume` (6)

**Calls:**
- `next` (6)

### `handleTypeAlias`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:206` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `_state_global` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:293` | Self: 0.0% (0us) | Total: 0.1% (38.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (29)

**Calls:**
- `cloneState` (29)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:466` | Self: 0.0% (0us) | Total: 0.1% (49.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (40)

**Calls:**
- `parameter` (40)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `_consume_generic_type_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:528` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `_function` (1)

**Calls:**
- `next` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:540` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 86.6% | 21.77s | `[native code]` |
| 6.2% | 1.57s | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 3.8% | 956.2ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 1.9% | 489.4ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 1.1% | 281.9ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` |
| 0.1% | 39.9ms | `/tmp/vibe-lizard-real-ts-profile-20260903/profile.ts` |
| 0.0% | 18.4ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts` |

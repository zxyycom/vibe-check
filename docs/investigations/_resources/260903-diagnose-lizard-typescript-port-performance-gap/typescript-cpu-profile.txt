# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 16.83s | 13992 | 1.0ms | 866 |

**Top 10:** `/(?:\/\*.*?\*\/\/\/\|#(?:\\\n\|[^\n])*\|!(?:\\\n\|[^\n])*\|^\*(?:\\\n\|[^\n])*\|\.OR\.\|\.AND\.\|ELSE\s+IF\|MODULE\s+PROCEDURE\|END\s*PROGRAM\|END\s*MODULE\|END\s*SUBMODULE\|END\s*SUBROUTINE\|END\s*FUNCTION\|END\s*TYPE\|END\s*INTERFACE\|END\s*BLOCK\|END\s*IF\|END\s*DO\|END\s*FORALL\|END\s*WHERE\|END\s*SELECT\|END\s*ASSOCIATE\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` 9.6%, `/(?:\/\*.*?\*\/\/\/(?:\\\n\|[^\n])*\|\(\*(?:\\\n\|[^\n])*\|OR\|AND\|XOR\|NOT\|ELSE\s+IF\|END_IF\|END_FOR\|END_WHILE\|END_CASE\|END_REPEAT\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` 4.0%, `from` 3.2%, `/.*\.(c\|cpp\|cc\|cxx\|h\|hpp)$/iu` 3.1%, `/.*\.(js\|cjs\|mjs)$/iu` 2.5%, `/.*\.(cs)$/iu` 2.4%, `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:"""(?:\.\|[^"]\|"(?!"")\|""(?!"))*""")\|(?:'''(?:\.\|[^']\|'(?!'')\|''(?!'))*''')\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` 2.4%, `/.*\.(java)$/iu` 2.4%, `/.*\.(py)$/iu` 2.3%, `generatorResume` 2.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 9.6% | 1.62s | 9.6% | 1.62s | `/(?:\/\*.*?\*\/\/\/\|#(?:\\\n\|[^\n])*\|!(?:\\\n\|[^\n])*\|^\*(?:\\\n\|[^\n])*\|\.OR\.\|\.AND\.\|ELSE\s+IF\|MODULE\s+PROCEDURE\|END\s*PROGRAM\|END\s*MODULE\|END\s*SUBMODULE\|END\s*SUBROUTINE\|END\s*FUNCTION\|END\s*TYPE\|END\s*INTERFACE\|END\s*BLOCK\|END\s*IF\|END\s*DO\|END\s*FORALL\|END\s*WHERE\|END\s*SELECT\|END\s*ASSOCIATE\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` | `[native code]` |
| 4.0% | 688.0ms | 4.0% | 688.0ms | `/(?:\/\*.*?\*\/\/\/(?:\\\n\|[^\n])*\|\(\*(?:\\\n\|[^\n])*\|OR\|AND\|XOR\|NOT\|ELSE\s+IF\|END_IF\|END_FOR\|END_WHILE\|END_CASE\|END_REPEAT\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` | `[native code]` |
| 3.2% | 545.5ms | 10.5% | 1.78s | `from` | `[native code]` |
| 3.1% | 525.4ms | 3.1% | 525.4ms | `/.*\.(c\|cpp\|cc\|cxx\|h\|hpp)$/iu` | `[native code]` |
| 2.5% | 430.9ms | 2.5% | 430.9ms | `/.*\.(js\|cjs\|mjs)$/iu` | `[native code]` |
| 2.4% | 416.2ms | 2.4% | 416.2ms | `/.*\.(cs)$/iu` | `[native code]` |
| 2.4% | 406.5ms | 2.4% | 406.5ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:"""(?:\.\|[^"]\|"(?!"")\|""(?!"))*""")\|(?:'''(?:\.\|[^']\|'(?!'')\|''(?!'))*''')\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 2.4% | 404.9ms | 2.4% | 404.9ms | `/.*\.(java)$/iu` | `[native code]` |
| 2.3% | 401.8ms | 2.3% | 401.8ms | `/.*\.(py)$/iu` | `[native code]` |
| 2.2% | 380.4ms | 100.0% | 52.76s | `generatorResume` | `[native code]` |
| 2.1% | 370.2ms | 2.1% | 370.2ms | `/.*\.(m\|mm)$/iu` | `[native code]` |
| 2.1% | 367.2ms | 2.1% | 367.2ms | `/.*\.(php)$/iu` | `[native code]` |
| 2.1% | 366.1ms | 2.1% | 366.1ms | `/.*\.(rb)$/iu` | `[native code]` |
| 2.1% | 355.4ms | 2.1% | 355.4ms | `/.*\.(ttcn\|ttcnpp)$/iu` | `[native code]` |
| 2.0% | 344.9ms | 25.7% | 4.33s | `regExpExec` | `[native code]` |
| 1.9% | 332.8ms | 1.9% | 332.8ms | `/.*\.(swift)$/iu` | `[native code]` |
| 1.8% | 312.1ms | 1.8% | 312.1ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|^=begin\|^=end\|%[qQrwiI]?\{(?:\\.\|[^\}\\])*?\}\|%[qQrwiI]?\[(?:\\.\|[^\]\\])*?\]\|%[qQrwiI]?<(?:\\.\|[^>\\])*?>\|%[qQrwiI]?\((?:\\.\|[^>\\])*?\)\|\w+:\|\$\w+\|\.+\|:?@{0,2}\w+\??!?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 1.6% | 282.8ms | 1.6% | 282.8ms | `/.*\.(go)$/iu` | `[native code]` |
| 1.6% | 279.8ms | 1.6% | 279.8ms | `/.*\.(scala)$/iu` | `[native code]` |
| 1.6% | 271.5ms | 1.6% | 271.5ms | `/.*\.(gd)$/iu` | `[native code]` |
| 1.5% | 266.8ms | 1.6% | 275.2ms | `escapeRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:680` |
| 1.5% | 263.4ms | 40.8% | 6.86s | `matchFilename` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:490` |
| 1.5% | 255.9ms | 100.0% | 55.71s | `next` | `[native code]` |
| 1.4% | 247.2ms | 1.4% | 247.2ms | `/.*\.(lua)$/iu` | `[native code]` |
| 1.3% | 233.4ms | 1.3% | 233.4ms | `/.*\.(f70\|f90\|f95\|f03\|f08\|f\|for\|ftn\|fpp)$/iu` | `[native code]` |
| 1.3% | 230.6ms | 1.3% | 230.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:21` |
| 1.3% | 222.9ms | 1.3% | 222.9ms | `/.*\.(rs)$/iu` | `[native code]` |
| 1.1% | 201.5ms | 1.1% | 201.5ms | `/.*\.(ts)$/iu` | `[native code]` |
| 1.1% | 201.2ms | 1.1% | 201.2ms | `Set` | `[native code]` |
| 1.1% | 187.7ms | 1.1% | 187.7ms | `stringSplitFast` | `[native code]` |
| 1.1% | 186.1ms | 1.1% | 186.1ms | `/.*\.(kt\|kts)$/iu` | `[native code]` |
| 1.0% | 176.1ms | 1.0% | 176.1ms | `join` | `[native code]` |
| 1.0% | 172.6ms | 1.0% | 172.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:13` |
| 0.9% | 158.9ms | 0.9% | 158.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:10` |
| 0.9% | 151.4ms | 0.9% | 151.4ms | `/.*\.(sol)$/iu` | `[native code]` |
| 0.8% | 134.9ms | 0.8% | 134.9ms | `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.7% | 130.1ms | 0.7% | 130.1ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:223` |
| 0.7% | 127.5ms | 10.0% | 1.69s | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:231` |
| 0.7% | 125.9ms | 0.7% | 125.9ms | `/(?:\/\*.*?\*\/\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.7% | 122.4ms | 0.7% | 122.4ms | `/.*\.(erl\|hrl\|es\|escript)$/iu` | `[native code]` |
| 0.6% | 112.3ms | 0.6% | 112.3ms | `/.*\.(zig)$/iu` | `[native code]` |
| 0.6% | 104.6ms | 0.6% | 105.8ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:538` |
| 0.6% | 102.9ms | 0.6% | 102.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:98` |
| 0.5% | 94.3ms | 0.5% | 94.3ms | `freeze` | `[native code]` |
| 0.4% | 81.8ms | 0.4% | 81.8ms | ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.4% | 70.7ms | 0.4% | 70.7ms | `/.*\.(tsx\|jsx)$/iu` | `[native code]` |
| 0.4% | 68.7ms | 0.4% | 68.7ms | `/(?:\/\*.*?\*\/\|--[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.3% | 66.8ms | 0.3% | 66.8ms | `/.*\.(vue)$/iu` | `[native code]` |
| 0.3% | 64.3ms | 0.3% | 64.3ms | `raw` | `[native code]` |
| 0.3% | 62.6ms | 0.3% | 62.6ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:229` |
| 0.3% | 61.3ms | 0.4% | 77.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:72` |
| 0.3% | 60.8ms | 0.3% | 60.8ms | `/.*\.(pl\|pm)$/iu` | `[native code]` |
| 0.3% | 58.3ms | 2.3% | 397.9ms | `map` | `[native code]` |
| 0.3% | 56.5ms | 0.3% | 56.5ms | `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\?\?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.3% | 55.6ms | 0.3% | 55.6ms | `/(?:\/\*.*?\*\/\|(?:\$\w+)\|(?:<{3}(?<quote>\w+).*?k<quote>)\|(?:\?\?=)\|(?:\?\?)\|(?:\?->)\|(?:\?:)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.3% | 55.5ms | 0.8% | 145.5ms | `every` | `[native code]` |
| 0.3% | 54.4ms | 0.3% | 54.4ms | ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!!\|\?\?\|\?:\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.3% | 51.3ms | 0.3% | 51.3ms | `/(?:\/\*.*?\*\/\|\.\.\|->\|<@\|@>\|@lazy\|@fuzzy\|@index\|@deterministic\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 47.3ms | 0.2% | 47.3ms | ``/(?:\/\*.*?\*\/\|(?:<[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:<\/[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:#\w+)\|(?:\$\w+)\|(?:<\/\w+>)\|(?:=>)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 46.9ms | 0.2% | 46.9ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 46.8ms | 0.2% | 50.2ms | `get flags` | `[native code]` |
| 0.2% | 45.5ms | 51.3% | 8.63s | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1118` |
| 0.2% | 44.2ms | 0.2% | 44.2ms | `/(?:\/\*.*?\*\/\|(?:'\w+\b)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 43.4ms | 0.2% | 43.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:11` |
| 0.2% | 42.4ms | 0.2% | 42.4ms | ``/(?:\/\*.*?\*\/\|(?:<\/?\w+.*?>)\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 41.2ms | 0.2% | 41.2ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|<-\|->\|%[a-zA-Z_*/>]+%\|\.\.\.\|:::\|::\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 38.9ms | 4.0% | 685.3ms | `isPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:70` |
| 0.2% | 38.8ms | 0.2% | 38.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:11` |
| 0.2% | 38.4ms | 1.3% | 223.8ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1060` |
| 0.2% | 36.6ms | 0.2% | 36.6ms | ``/(?:\/\*.*?\*\/\|`[^`]*`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 34.6ms | 0.2% | 34.6ms | ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!\|\?\?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.1% | 32.2ms | 0.4% | 67.7ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1018` |
| 0.1% | 31.7ms | 99.7% | 16.79s | `operation` | `/tmp/vibe-lizard-harness-only.ts:9` |
| 0.1% | 31.4ms | 0.1% | 31.4ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|--\[\[.*?\]\]\|\[=*\[.*?\]=*\]\|--.*?$\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.1% | 30.5ms | 0.1% | 30.5ms | `/.*\.(st)$/iu` | `[native code]` |
| 0.1% | 30.3ms | 0.1% | 30.3ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.1% | 29.8ms | 0.1% | 29.8ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1081` |
| 0.1% | 26.8ms | 0.2% | 41.3ms | `preprocessing` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1012` |
| 0.1% | 26.4ms | 0.1% | 26.4ms | `/.*\.(r\|R)$/iu` | `[native code]` |
| 0.1% | 24.4ms | 0.5% | 91.8ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1117` |
| 0.1% | 24.3ms | 0.1% | 26.7ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:279` |
| 0.1% | 23.9ms | 0.1% | 23.9ms | `replaceLabel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:30` |
| 0.1% | 23.6ms | 0.1% | 23.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:150` |
| 0.1% | 23.3ms | 5.2% | 884.1ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1113` |
| 0.1% | 22.4ms | 0.1% | 22.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:66` |
| 0.1% | 22.4ms | 0.1% | 22.4ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:292` |
| 0.1% | 21.6ms | 0.1% | 28.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:556` |
| 0.1% | 20.9ms | 1.7% | 293.0ms | `statemachine_clone` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:177` |
| 0.1% | 20.7ms | 0.1% | 22.1ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:300` |
| 0.1% | 20.6ms | 0.1% | 20.6ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.1% | 20.5ms | 12.9% | 2.18s | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:214` |
| 0.1% | 19.9ms | 0.3% | 60.5ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1114` |
| 0.1% | 19.6ms | 0.1% | 19.6ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:398` |
| 0.1% | 18.9ms | 0.2% | 40.4ms | `anonymous` | `[native code]` |
| 0.1% | 18.5ms | 0.1% | 18.5ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:590` |
| 0.1% | 18.1ms | 0.1% | 18.1ms | `[Symbol.matchAll]` | `[native code]` |
| 0.1% | 17.6ms | 0.1% | 17.6ms | `globalState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:112` |
| 0.0% | 16.2ms | 1.2% | 204.3ms | `GoLikeStates` | `[native code]` |
| 0.0% | 15.2ms | 0.1% | 24.5ms | `normalizePythonRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:676` |
| 0.0% | 15.2ms | 9.2% | 1.55s | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:602` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:141` |
| 0.0% | 13.9ms | 0.0% | 13.9ms | `/^\p{White_Space}$/u` | `[native code]` |
| 0.0% | 13.6ms | 0.4% | 77.1ms | `asNestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:731` |
| 0.0% | 13.4ms | 0.0% | 13.4ms | `/\(\?[aiLmsux]+\)/gu` | `[native code]` |
| 0.0% | 13.1ms | 0.0% | 13.1ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:23` |
| 0.0% | 13.1ms | 0.0% | 13.1ms | `WeakMap` | `[native code]` |
| 0.0% | 12.8ms | 0.0% | 12.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:168` |
| 0.0% | 12.6ms | 0.1% | 18.0ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:74` |
| 0.0% | 12.2ms | 0.1% | 22.5ms | `replaceLabel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:29` |
| 0.0% | 12.2ms | 0.0% | 12.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:11` |
| 0.0% | 12.2ms | 1.2% | 214.2ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:503` |
| 0.0% | 12.0ms | 37.6% | 6.34s | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1017` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:501` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:332` |
| 0.0% | 10.9ms | 0.0% | 10.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:769` |
| 0.0% | 10.7ms | 0.0% | 10.7ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 10.4ms | 0.0% | 10.4ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 10.4ms | 0.8% | 140.4ms | `addParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:311` |
| 0.0% | 10.2ms | 0.1% | 24.8ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:220` |
| 0.0% | 10.1ms | 0.0% | 10.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:334` |
| 0.0% | 9.7ms | 0.0% | 9.7ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:509` |
| 0.0% | 9.7ms | 0.0% | 9.7ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:397` |
| 0.0% | 9.6ms | 0.0% | 9.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:175` |
| 0.0% | 9.6ms | 0.1% | 23.5ms | `hasCompleteNestingStackSurface` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` |
| 0.0% | 9.6ms | 0.7% | 134.5ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:298` |
| 0.0% | 9.5ms | 0.0% | 11.9ms | `matchAt` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:239` |
| 0.0% | 9.2ms | 0.0% | 9.2ms | `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu` | `[native code]` |
| 0.0% | 9.1ms | 0.0% | 9.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:10` |
| 0.0% | 9.0ms | 0.0% | 9.0ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 8.8ms | 0.1% | 22.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:770` |
| 0.0% | 8.8ms | 0.0% | 8.8ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 8.5ms | 0.0% | 8.5ms | `esSpecIsRegExp` | `[native code]` |
| 0.0% | 8.5ms | 0.2% | 47.0ms | `CLikeNestingStackStates` | `[native code]` |
| 0.0% | 8.5ms | 0.0% | 9.7ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:26` |
| 0.0% | 8.4ms | 0.0% | 13.2ms | `PLSQLReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:33` |
| 0.0% | 8.4ms | 0.0% | 8.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:14` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `/[\|\\{}()[\]^$+*?.]/gu` | `[native code]` |
| 0.0% | 8.3ms | 0.2% | 39.5ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:642` |
| 0.0% | 8.1ms | 0.0% | 8.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:18` |
| 0.0% | 8.0ms | 2.4% | 407.1ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:230` |
| 0.0% | 8.0ms | 0.0% | 8.0ms | `(module)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:212` |
| 0.0% | 7.9ms | 0.0% | 7.9ms | `fromCodePoint` | `[native code]` |
| 0.0% | 7.8ms | 0.0% | 9.0ms | `get_reader_for` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:80` |
| 0.0% | 7.5ms | 0.0% | 7.5ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:481` |
| 0.0% | 7.4ms | 0.0% | 7.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 7.4ms | 0.0% | 7.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:146` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:134` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 7.2ms | 0.2% | 35.7ms | `GoStates` | `[native code]` |
| 0.0% | 7.2ms | 0.0% | 7.2ms | `next` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:181` |
| 0.0% | 7.1ms | 0.0% | 7.1ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1048` |
| 0.0% | 7.0ms | 0.0% | 7.0ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:571` |
| 0.0% | 6.9ms | 0.1% | 31.3ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:401` |
| 0.0% | 6.8ms | 0.7% | 133.6ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:400` |
| 0.0% | 6.5ms | 0.0% | 6.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:138` |
| 0.0% | 6.2ms | 0.1% | 23.0ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:144` |
| 0.0% | 6.1ms | 8.5% | 1.43s | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1507` |
| 0.0% | 6.1ms | 0.0% | 6.1ms | `readDeclarationToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 6.1ms | 0.0% | 6.1ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:132` |
| 0.0% | 6.1ms | 0.4% | 68.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:113` |
| 0.0% | 6.0ms | 0.3% | 58.9ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:396` |
| 0.0% | 5.9ms | 0.0% | 5.9ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 5.9ms | 0.9% | 160.0ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:296` |
| 0.0% | 5.8ms | 0.0% | 5.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:98` |
| 0.0% | 5.8ms | 4.6% | 774.7ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:30` |
| 0.0% | 5.7ms | 0.0% | 5.7ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:36` |
| 0.0% | 5.7ms | 0.0% | 5.7ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:64` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `_expand_fstring_interpolations` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:150` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:68` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:40` |
| 0.0% | 5.5ms | 0.0% | 5.5ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:272` |
| 0.0% | 5.3ms | 0.0% | 5.3ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1016` |
| 0.0% | 5.3ms | 0.0% | 5.3ms | `/^#\s*(\w+)\s*(.*)/msu` | `[native code]` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:145` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `stateFunctionBody` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:35` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:107` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:293` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 4.8ms | 0.0% | 4.8ms | `get nestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 4.8ms | 0.0% | 5.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:40` |
| 0.0% | 4.8ms | 0.0% | 4.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 4.7ms | 0.1% | 25.0ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:596` |
| 0.0% | 4.7ms | 0.6% | 112.1ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:636` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:87` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:15` |
| 0.0% | 4.6ms | 0.0% | 8.4ms | `finishPoppedNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:908` |
| 0.0% | 4.5ms | 0.2% | 42.2ms | `filter` | `[native code]` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:248` |
| 0.0% | 4.5ms | 0.1% | 22.1ms | `startNewFunctionNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:855` |
| 0.0% | 4.4ms | 0.0% | 4.4ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:555` |
| 0.0% | 4.4ms | 0.1% | 17.7ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:404` |
| 0.0% | 4.3ms | 0.0% | 4.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:12` |
| 0.0% | 4.0ms | 0.0% | 4.0ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:92` |
| 0.0% | 3.9ms | 0.0% | 6.1ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:50` |
| 0.0% | 3.9ms | 0.0% | 3.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:9` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:10` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:36` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:37` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:11` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:559` |
| 0.0% | 3.8ms | 0.1% | 22.7ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:639` |
| 0.0% | 3.7ms | 0.2% | 36.7ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:772` |
| 0.0% | 3.7ms | 0.8% | 144.1ms | `parameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:988` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1494` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `finishImplementation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:472` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1079` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `stringIncludesInternal` | `[native code]` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:52` |
| 0.0% | 3.6ms | 0.0% | 14.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:37` |
| 0.0% | 3.5ms | 0.1% | 22.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:249` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:144` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:91` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:98` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:480` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `finishNamespaceName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:135` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:44` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:149` |
| 0.0% | 3.3ms | 0.6% | 108.3ms | `addToLongFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:972` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:10` |
| 0.0% | 3.3ms | 25.8% | 4.34s | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:561` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:64` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:270` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:41` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:43` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.0% | 3.2ms | 0.2% | 39.9ms | `SolidityStates` | `[native code]` |
| 0.0% | 3.2ms | 0.1% | 23.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:42` |
| 0.0% | 3.0ms | 0.0% | 3.0ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:303` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1049` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `/END\s*(?:PROGRAM\|MODULE\|SUBMODULE\|SUBROUTINE\|FUNCTION\|TYPE\|INTERFACE\|BLOCK\|IF\|DO\|FORALL\|WHERE\|SELECT\|ASSOCIATE)/iu` | `[native code]` |
| 0.0% | 2.6ms | 0.1% | 33.0ms | `RustStates` | `[native code]` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:86` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:594` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `_state_objc_param_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:84` |
| 0.0% | 2.6ms | 0.0% | 3.9ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:68` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts` |
| 0.0% | 2.5ms | 39.8% | 6.71s | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1071` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:118` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:248` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `hasCompleteNestingStackSurface` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:479` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `RubylikeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.0% | 2.5ms | 0.0% | 7.2ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:491` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts:15` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:38` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `replaceLabel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:28` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:54` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_state_end_of_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 2.4ms | 0.6% | 108.5ms | `JavaStates` | `[native code]` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:478` |
| 0.0% | 2.4ms | 57.9% | 9.74s | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:60` |
| 0.0% | 2.4ms | 0.7% | 122.1ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:114` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:33` |
| 0.0% | 2.4ms | 0.0% | 4.8ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:49` |
| 0.0% | 2.4ms | 0.4% | 74.1ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:299` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `endOfFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:993` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:80` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `isAlphabetic` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:89` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1070` |
| 0.0% | 2.4ms | 0.0% | 9.3ms | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:61` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `FileInformation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:338` |
| 0.0% | 2.4ms | 0.4% | 69.1ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1112` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_def_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:112` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:299` |
| 0.0% | 2.4ms | 0.2% | 33.7ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:113` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:287` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:221` |
| 0.0% | 2.3ms | 0.1% | 22.2ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:402` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:11` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `addToFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:27` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.0% | 2.3ms | 40.2% | 6.76s | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1080` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `getCommentFromToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:615` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `TypeScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 2.3ms | 0.1% | 32.3ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:481` |
| 0.0% | 2.3ms | 1.3% | 225.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:38` |
| 0.0% | 2.3ms | 0.0% | 3.5ms | `test` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:11` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:77` |
| 0.0% | 2.3ms | 40.2% | 6.78s | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:595` |
| 0.0% | 2.3ms | 0.1% | 30.7ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:41` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `FileInformation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:335` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:40` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `_state_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:419` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `Nesting` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 3.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:37` |
| 0.0% | 2.3ms | 1.7% | 293.9ms | `cloneState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:172` |
| 0.0% | 2.2ms | 0.0% | 3.4ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:216` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:19` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:464` |
| 0.0% | 2.2ms | 0.0% | 13.2ms | `FortranReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:54` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` |
| 0.0% | 2.2ms | 2.4% | 415.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:553` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(unknown)` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `stateFunctionBody` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:67` |
| 0.0% | 2.2ms | 0.7% | 124.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:41` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.2ms | 0.1% | 20.4ms | `StReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:70` |
| 0.0% | 2.1ms | 0.1% | 29.7ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:831` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:90` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:590` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.0% | 2.1ms | 0.0% | 3.2ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:94` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `/^[A-Za-z]+[A-Za-z0-9_]*/u` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 12.8ms | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:451` |
| 0.0% | 2.1ms | 0.5% | 89.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:35` |
| 0.0% | 2.1ms | 0.0% | 3.4ms | `_if_cond` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:276` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:62` |
| 0.0% | 2.1ms | 0.0% | 4.7ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:179` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:45` |
| 0.0% | 1.5ms | 0.1% | 19.4ms | `TypeScriptTypeAnnotationStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:548` |
| 0.0% | 1.4ms | 0.0% | 9.7ms | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:71` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.4ms | 0.0% | 5.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:235` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:46` |
| 0.0% | 1.3ms | 0.3% | 56.2ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:44` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `set_nesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:75` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:606` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `isServerConfig` | `bun:main` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:21` |
| 0.0% | 1.3ms | 0.1% | 18.1ms | `LuaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:18` |
| 0.0% | 1.3ms | 0.1% | 25.1ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:924` |
| 0.0% | 1.3ms | 0.2% | 37.6ms | `SwiftStates` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 2.5ms | `readDeclarationToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:300` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `[Symbol.match]` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `endOfFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:998` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `addCondition` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:964` |
| 0.0% | 1.3ms | 0.0% | 5.0ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:181` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:77` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:133` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `/[a-z][\p{L}\p{N}_]*/uy` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:260` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:124` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `JavaFunctionBodyStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` |
| 0.0% | 1.3ms | 0.0% | 2.7ms | `readFileSync` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `readUntilThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.3ms | 0.0% | 4.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:419` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `/^\p{L}$/u` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:80` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:416` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_after_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:205` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:27` |
| 0.0% | 1.3ms | 0.2% | 37.7ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:115` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `/^[\p{L}\p{N}_]+$/u` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:63` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_after_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:207` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:35` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:169` |
| 0.0% | 1.3ms | 0.0% | 9.2ms | `consumeErlangWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:230` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `statemachine_before_return` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:90` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:33` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:146` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.0% | 1.3ms | 0.0% | 2.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:170` |
| 0.0% | 1.3ms | 0.4% | 69.9ms | `CLikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:40` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:76` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:9` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `shift` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 6.5ms | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:122` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:45` |
| 0.0% | 1.3ms | 0.0% | 2.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:87` |
| 0.0% | 1.3ms | 0.1% | 24.3ms | `TTCNStates` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:118` |
| 0.0% | 1.3ms | 0.0% | 7.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:81` |
| 0.0% | 1.3ms | 0.0% | 6.0ms | `_read_namespace_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:174` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` |
| 0.0% | 1.3ms | 0.6% | 111.6ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:37` |
| 0.0% | 1.3ms | 0.0% | 8.6ms | `currentNestingLevel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:136` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:104` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:83` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `TSXReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get lastFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:40` |
| 0.0% | 1.2ms | 0.4% | 78.7ms | `_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:109` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:117` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:291` |
| 0.0% | 1.2ms | 0.2% | 35.0ms | `CSharpReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:24` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `KotlinReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `statemachine_before_return` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:395` |
| 0.0% | 1.2ms | 0.1% | 20.3ms | `KotlinReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:27` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:248` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.2ms | 0.0% | 3.9ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:52` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `RegExp` | `[native code]` |
| 0.0% | 1.2ms | 0.2% | 41.5ms | `_expecting_func_opening_bracket` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:498` |
| 0.0% | 1.2ms | 0.4% | 71.1ms | `nestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` |
| 0.0% | 1.2ms | 0.0% | 6.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:138` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `isFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:10` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_func_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `RubylikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.0% | 1.2ms | 0.9% | 161.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:44` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1506` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:93` |
| 0.0% | 1.2ms | 0.0% | 4.7ms | `_function_after_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:171` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_nested_call` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:448` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `consumeErlangAtom` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:73` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `LuaStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:40` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:20` |
| 0.0% | 1.2ms | 0.4% | 78.9ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:73` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `isRNameFragment` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts` |
| 0.0% | 1.2ms | 0.4% | 79.8ms | `_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:124` |
| 0.0% | 1.2ms | 0.0% | 12.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:262` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:282` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `getFunctionKeyword` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:58` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:65` |
| 0.0% | 1.2ms | 0.0% | 16.4ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:293` |
| 0.0% | 1.2ms | 0.7% | 119.5ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:54` |
| 0.0% | 1.2ms | 0.0% | 11.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:243` |
| 0.0% | 1.2ms | 0.1% | 30.1ms | `parameterCount` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.2ms | 0.0% | 9.3ms | `GoReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:19` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get unicode` | `[native code]` |
| 0.0% | 1.2ms | 0.1% | 18.6ms | `_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:114` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:48` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `flatIntoArray` | `[native code]` |
| 0.0% | 1.1ms | 0.1% | 21.4ms | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:426` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `get sticky` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_pop_function_from_stack` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `finishImplementation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:455` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.0% | 1.1ms | 0.3% | 54.4ms | `TypeScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:33` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:66` |
| 0.0% | 1.1ms | 0.1% | 26.5ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:643` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `getFunctionKeyword` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:25` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `getFunctionKeyword` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:135` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:48` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:115` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:36` |
| 0.0% | 1.1ms | 0.0% | 15.2ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:403` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:281` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `languages` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:74` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function_return_type_or_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:178` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:244` |
| 0.0% | 1.1ms | 0.2% | 35.7ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:925` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:427` |
| 0.0% | 1.1ms | 0.1% | 25.8ms | `CSharpReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:25` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `reverse` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `set _state` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` |
| 0.0% | 1.1ms | 0.0% | 2.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:80` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:22` |
| 0.0% | 1.1ms | 0.0% | 11.5ms | `RReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:33` |
| 0.0% | 1.1ms | 0.2% | 37.1ms | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:422` |
| 0.0% | 1.1ms | 40.8% | 6.87s | `get_reader_for` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:81` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_class_declaration` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:210` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:168` |
| 0.0% | 1.1ms | 0.1% | 31.4ms | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:180` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` |
| 0.0% | 1.1ms | 0.0% | 4.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:57` |
| 0.0% | 1.1ms | 0.3% | 65.2ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:119` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:27` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `GDScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:36` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:82` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `isTripleQuotedString` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:429` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `MyToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts` |
| 0.0% | 1.1ms | 0.3% | 57.3ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1495` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(module)` | `/tmp/vibe-lizard-harness-only.ts:8` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `hasParameterBracketDefinitions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.1ms | 0.0% | 10.8ms | `_function_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:231` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:284` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:149` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:37` |
| 0.0% | 1.1ms | 0.0% | 10.9ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:155` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:140` |
| 0.0% | 1.1ms | 0.1% | 23.7ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:86` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:342` |
| 0.0% | 1.1ms | 0.0% | 2.4ms | `match` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_extract_function_names` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:172` |
| 0.0% | 1.1ms | 3.0% | 519.2ms | `_expand_fstring_interpolations` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:139` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:73` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:108` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:98` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:75` |
| 0.0% | 1.1ms | 0.2% | 49.9ms | `RubylikeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:24` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:33` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `operation` | `/tmp/vibe-lizard-harness-only.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.0% | 1.1ms | 0.3% | 66.7ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:42` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:28` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `at` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 9.3ms | `_function_has_param` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:226` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:70` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` |
| 0.0% | 1.0ms | 0.0% | 10.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:133` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `statemachine_clone` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_before_begin` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:245` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1082` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `/(?:[2-9]\|[12][0-9]\|3[0-6])#[0-9A-Za-z]+/uy` | `[native code]` |
| 0.0% | 1.0ms | 0.3% | 63.6ms | `matchAll` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_consume_java_expression_tokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:97` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `generate_common_tokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:139` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.0% | 1.0ms | 0.0% | 3.5ms | `finishPoppedNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:907` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `get unicodeSets` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:104` |
| 0.0% | 1.0ms | 0.0% | 8.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:534` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:338` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:85` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `startNewFunctionNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:516` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `addBareNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:499` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:90` |
| 0.0% | 1.0ms | 2.6% | 452.4ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:67` |
| 0.0% | 1.0ms | 0.0% | 2.3ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:591` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:71` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `importModule` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `ErlangReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:253` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1449` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_def` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:65` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:92` |
| 0.0% | 1.0ms | 0.1% | 21.5ms | `ObjCStates` | `[native code]` |
| 0.0% | 1.0ms | 4.4% | 747.2ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:82` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `/^\p{L}+$/u` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_read_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:107` |
| 0.0% | 988us | 0.0% | 988us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:137` |
| 0.0% | 986us | 0.0% | 7.5ms | `find` | `[native code]` |
| 0.0% | 982us | 0.1% | 30.1ms | `flatMap` | `[native code]` |
| 0.0% | 981us | 0.0% | 981us | `createSafeIterator` | `internal:primordials:3` |
| 0.0% | 967us | 0.0% | 967us | `/#\s*(\w+)\s*(.*)/msu` | `[native code]` |
| 0.0% | 962us | 0.0% | 8.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:80` |
| 0.0% | 961us | 3.4% | 574.5ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:253` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 55.71s | 1.5% | 255.9ms | `next` | `[native code]` |
| 100.0% | 52.76s | 2.2% | 380.4ms | `generatorResume` | `[native code]` |
| 99.7% | 16.79s | 0.0% | 0us | `(module)` | `/tmp/vibe-lizard-harness-only.ts:10` |
| 99.7% | 16.79s | 0.1% | 31.7ms | `operation` | `/tmp/vibe-lizard-harness-only.ts:9` |
| 57.9% | 9.74s | 0.0% | 2.4ms | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:60` |
| 51.3% | 8.63s | 0.2% | 45.5ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1118` |
| 40.8% | 6.88s | 0.0% | 0us | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:57` |
| 40.8% | 6.87s | 0.0% | 1.1ms | `get_reader_for` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:81` |
| 40.8% | 6.86s | 1.5% | 263.4ms | `matchFilename` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:490` |
| 40.2% | 6.78s | 0.0% | 2.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:595` |
| 40.2% | 6.76s | 0.0% | 2.3ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1080` |
| 39.8% | 6.71s | 0.0% | 2.5ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1071` |
| 38.3% | 6.45s | 0.0% | 0us | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1053` |
| 37.6% | 6.34s | 0.0% | 12.0ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1017` |
| 25.8% | 4.34s | 0.0% | 3.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:561` |
| 25.7% | 4.33s | 2.0% | 344.9ms | `regExpExec` | `[native code]` |
| 12.9% | 2.18s | 0.1% | 20.5ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:214` |
| 10.5% | 1.78s | 3.2% | 545.5ms | `from` | `[native code]` |
| 10.1% | 1.70s | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:72` |
| 10.0% | 1.69s | 0.7% | 127.5ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:231` |
| 10.0% | 1.68s | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:66` |
| 9.6% | 1.62s | 9.6% | 1.62s | `/(?:\/\*.*?\*\/\/\/\|#(?:\\\n\|[^\n])*\|!(?:\\\n\|[^\n])*\|^\*(?:\\\n\|[^\n])*\|\.OR\.\|\.AND\.\|ELSE\s+IF\|MODULE\s+PROCEDURE\|END\s*PROGRAM\|END\s*MODULE\|END\s*SUBMODULE\|END\s*SUBROUTINE\|END\s*FUNCTION\|END\s*TYPE\|END\s*INTERFACE\|END\s*BLOCK\|END\s*IF\|END\s*DO\|END\s*FORALL\|END\s*WHERE\|END\s*SELECT\|END\s*ASSOCIATE\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` | `[native code]` |
| 9.2% | 1.55s | 0.0% | 15.2ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:602` |
| 8.5% | 1.43s | 0.0% | 6.1ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1507` |
| 5.2% | 884.1ms | 0.1% | 23.3ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1113` |
| 4.6% | 774.7ms | 0.0% | 5.8ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:30` |
| 4.4% | 750.8ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:86` |
| 4.4% | 747.2ms | 0.0% | 1.0ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:82` |
| 4.0% | 688.0ms | 4.0% | 688.0ms | `/(?:\/\*.*?\*\/\/\/(?:\\\n\|[^\n])*\|\(\*(?:\\\n\|[^\n])*\|OR\|AND\|XOR\|NOT\|ELSE\s+IF\|END_IF\|END_FOR\|END_WHILE\|END_CASE\|END_REPEAT\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` | `[native code]` |
| 4.0% | 685.3ms | 0.2% | 38.9ms | `isPythonWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:70` |
| 3.4% | 574.5ms | 0.0% | 961us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:253` |
| 3.1% | 525.4ms | 3.1% | 525.4ms | `/.*\.(c\|cpp\|cc\|cxx\|h\|hpp)$/iu` | `[native code]` |
| 3.0% | 519.2ms | 0.0% | 1.1ms | `_expand_fstring_interpolations` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:139` |
| 2.6% | 452.4ms | 0.0% | 1.0ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:67` |
| 2.5% | 430.9ms | 2.5% | 430.9ms | `/.*\.(js\|cjs\|mjs)$/iu` | `[native code]` |
| 2.4% | 416.2ms | 2.4% | 416.2ms | `/.*\.(cs)$/iu` | `[native code]` |
| 2.4% | 415.1ms | 0.0% | 2.2ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:553` |
| 2.4% | 407.1ms | 0.0% | 8.0ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:230` |
| 2.4% | 406.5ms | 2.4% | 406.5ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:"""(?:\.\|[^"]\|"(?!"")\|""(?!"))*""")\|(?:'''(?:\.\|[^']\|'(?!'')\|''(?!'))*''')\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 2.4% | 404.9ms | 2.4% | 404.9ms | `/.*\.(java)$/iu` | `[native code]` |
| 2.3% | 401.8ms | 2.3% | 401.8ms | `/.*\.(py)$/iu` | `[native code]` |
| 2.3% | 397.9ms | 0.3% | 58.3ms | `map` | `[native code]` |
| 2.1% | 370.2ms | 2.1% | 370.2ms | `/.*\.(m\|mm)$/iu` | `[native code]` |
| 2.1% | 367.2ms | 2.1% | 367.2ms | `/.*\.(php)$/iu` | `[native code]` |
| 2.1% | 366.1ms | 2.1% | 366.1ms | `/.*\.(rb)$/iu` | `[native code]` |
| 2.1% | 355.4ms | 2.1% | 355.4ms | `/.*\.(ttcn\|ttcnpp)$/iu` | `[native code]` |
| 2.1% | 355.1ms | 0.0% | 0us | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:55` |
| 1.9% | 335.9ms | 0.0% | 0us | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:307` |
| 1.9% | 332.8ms | 1.9% | 332.8ms | `/.*\.(swift)$/iu` | `[native code]` |
| 1.8% | 312.1ms | 1.8% | 312.1ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|^=begin\|^=end\|%[qQrwiI]?\{(?:\\.\|[^\}\\])*?\}\|%[qQrwiI]?\[(?:\\.\|[^\]\\])*?\]\|%[qQrwiI]?<(?:\\.\|[^>\\])*?>\|%[qQrwiI]?\((?:\\.\|[^>\\])*?\)\|\w+:\|\$\w+\|\.+\|:?@{0,2}\w+\??!?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 1.7% | 293.9ms | 0.0% | 2.3ms | `cloneState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:172` |
| 1.7% | 293.0ms | 0.1% | 20.9ms | `statemachine_clone` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:177` |
| 1.6% | 282.8ms | 1.6% | 282.8ms | `/.*\.(go)$/iu` | `[native code]` |
| 1.6% | 279.8ms | 1.6% | 279.8ms | `/.*\.(scala)$/iu` | `[native code]` |
| 1.6% | 275.2ms | 1.5% | 266.8ms | `escapeRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:680` |
| 1.6% | 271.5ms | 1.6% | 271.5ms | `/.*\.(gd)$/iu` | `[native code]` |
| 1.4% | 249.3ms | 0.0% | 0us | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1508` |
| 1.4% | 247.2ms | 1.4% | 247.2ms | `/.*\.(lua)$/iu` | `[native code]` |
| 1.3% | 233.4ms | 1.3% | 233.4ms | `/.*\.(f70\|f90\|f95\|f03\|f08\|f\|for\|ftn\|fpp)$/iu` | `[native code]` |
| 1.3% | 230.6ms | 1.3% | 230.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:21` |
| 1.3% | 227.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:81` |
| 1.3% | 225.8ms | 0.0% | 2.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:38` |
| 1.3% | 223.8ms | 0.2% | 38.4ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1060` |
| 1.3% | 222.9ms | 1.3% | 222.9ms | `/.*\.(rs)$/iu` | `[native code]` |
| 1.2% | 214.2ms | 0.0% | 12.2ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:503` |
| 1.2% | 204.3ms | 0.0% | 16.2ms | `GoLikeStates` | `[native code]` |
| 1.1% | 201.5ms | 1.1% | 201.5ms | `/.*\.(ts)$/iu` | `[native code]` |
| 1.1% | 201.2ms | 1.1% | 201.2ms | `Set` | `[native code]` |
| 1.1% | 196.0ms | 0.0% | 0us | `CLikeStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:221` |
| 1.1% | 187.7ms | 1.1% | 187.7ms | `stringSplitFast` | `[native code]` |
| 1.1% | 186.1ms | 1.1% | 186.1ms | `/.*\.(kt\|kts)$/iu` | `[native code]` |
| 1.0% | 176.1ms | 1.0% | 176.1ms | `join` | `[native code]` |
| 1.0% | 172.6ms | 1.0% | 172.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:13` |
| 0.9% | 161.3ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:44` |
| 0.9% | 160.0ms | 0.0% | 5.9ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:296` |
| 0.9% | 159.1ms | 0.0% | 0us | `next` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:182` |
| 0.9% | 158.9ms | 0.9% | 158.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:10` |
| 0.9% | 151.4ms | 0.9% | 151.4ms | `/.*\.(sol)$/iu` | `[native code]` |
| 0.8% | 145.5ms | 0.3% | 55.5ms | `every` | `[native code]` |
| 0.8% | 144.1ms | 0.0% | 3.7ms | `parameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:988` |
| 0.8% | 140.4ms | 0.0% | 10.4ms | `addParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:311` |
| 0.8% | 134.9ms | 0.8% | 134.9ms | `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.7% | 134.5ms | 0.0% | 9.6ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:298` |
| 0.7% | 133.6ms | 0.0% | 6.8ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:400` |
| 0.7% | 133.2ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:79` |
| 0.7% | 130.1ms | 0.7% | 130.1ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:223` |
| 0.7% | 127.8ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:73` |
| 0.7% | 125.9ms | 0.7% | 125.9ms | `/(?:\/\*.*?\*\/\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.7% | 124.3ms | 0.0% | 2.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:41` |
| 0.7% | 122.4ms | 0.7% | 122.4ms | `/.*\.(erl\|hrl\|es\|escript)$/iu` | `[native code]` |
| 0.7% | 122.1ms | 0.0% | 2.4ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:114` |
| 0.7% | 120.5ms | 0.0% | 0us | `TypeScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:160` |
| 0.7% | 119.5ms | 0.0% | 1.2ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:54` |
| 0.6% | 112.3ms | 0.6% | 112.3ms | `/.*\.(zig)$/iu` | `[native code]` |
| 0.6% | 112.1ms | 0.0% | 4.7ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:636` |
| 0.6% | 111.6ms | 0.0% | 1.3ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:37` |
| 0.6% | 109.8ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:57` |
| 0.6% | 108.5ms | 0.0% | 2.4ms | `JavaStates` | `[native code]` |
| 0.6% | 108.3ms | 0.0% | 3.3ms | `addToLongFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:972` |
| 0.6% | 108.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:29` |
| 0.6% | 105.8ms | 0.6% | 104.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:538` |
| 0.6% | 102.9ms | 0.6% | 102.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:98` |
| 0.5% | 96.0ms | 0.0% | 0us | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:300` |
| 0.5% | 94.3ms | 0.5% | 94.3ms | `freeze` | `[native code]` |
| 0.5% | 91.8ms | 0.1% | 24.4ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1117` |
| 0.5% | 91.3ms | 0.0% | 0us | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:135` |
| 0.5% | 89.6ms | 0.0% | 2.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:35` |
| 0.5% | 84.1ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:26` |
| 0.4% | 81.8ms | 0.4% | 81.8ms | ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.4% | 80.4ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:37` |
| 0.4% | 79.8ms | 0.0% | 1.2ms | `_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:124` |
| 0.4% | 78.9ms | 0.0% | 1.2ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:73` |
| 0.4% | 78.7ms | 0.0% | 1.2ms | `_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:109` |
| 0.4% | 77.8ms | 0.0% | 0us | `_state_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:296` |
| 0.4% | 77.5ms | 0.3% | 61.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:72` |
| 0.4% | 77.1ms | 0.0% | 13.6ms | `asNestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:731` |
| 0.4% | 76.7ms | 0.0% | 0us | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:477` |
| 0.4% | 76.6ms | 0.0% | 0us | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:360` |
| 0.4% | 76.2ms | 0.0% | 0us | `CLikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:42` |
| 0.4% | 74.1ms | 0.0% | 2.4ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:299` |
| 0.4% | 71.1ms | 0.0% | 1.2ms | `nestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` |
| 0.4% | 70.7ms | 0.4% | 70.7ms | `/.*\.(tsx\|jsx)$/iu` | `[native code]` |
| 0.4% | 69.9ms | 0.0% | 1.3ms | `CLikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:40` |
| 0.4% | 69.1ms | 0.0% | 2.4ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1112` |
| 0.4% | 68.7ms | 0.4% | 68.7ms | `/(?:\/\*.*?\*\/\|--[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.4% | 68.2ms | 0.0% | 6.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:113` |
| 0.4% | 67.7ms | 0.1% | 32.2ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1018` |
| 0.3% | 66.8ms | 0.3% | 66.8ms | `/.*\.(vue)$/iu` | `[native code]` |
| 0.3% | 66.7ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:42` |
| 0.3% | 65.2ms | 0.0% | 1.1ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:119` |
| 0.3% | 64.3ms | 0.3% | 64.3ms | `raw` | `[native code]` |
| 0.3% | 63.8ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:32` |
| 0.3% | 63.6ms | 0.0% | 1.0ms | `matchAll` | `[native code]` |
| 0.3% | 62.6ms | 0.3% | 62.6ms | `invokeCurrentState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:229` |
| 0.3% | 60.8ms | 0.3% | 60.8ms | `/.*\.(pl\|pm)$/iu` | `[native code]` |
| 0.3% | 60.5ms | 0.1% | 19.9ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1114` |
| 0.3% | 60.4ms | 0.0% | 0us | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:63` |
| 0.3% | 58.9ms | 0.0% | 6.0ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:396` |
| 0.3% | 58.3ms | 0.0% | 0us | `analyzeLizardSource` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:62` |
| 0.3% | 57.3ms | 0.0% | 1.1ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1495` |
| 0.3% | 56.5ms | 0.3% | 56.5ms | `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\?\?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.3% | 56.5ms | 0.0% | 0us | `restartNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:946` |
| 0.3% | 56.2ms | 0.0% | 1.3ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:44` |
| 0.3% | 56.2ms | 0.0% | 0us | `JavaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:81` |
| 0.3% | 55.6ms | 0.3% | 55.6ms | `/(?:\/\*.*?\*\/\|(?:\$\w+)\|(?:<{3}(?<quote>\w+).*?k<quote>)\|(?:\?\?=)\|(?:\?\?)\|(?:\?->)\|(?:\?:)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.3% | 54.4ms | 0.3% | 54.4ms | ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!!\|\?\?\|\?:\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.3% | 54.4ms | 0.0% | 1.1ms | `TypeScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:33` |
| 0.3% | 53.9ms | 0.0% | 0us | `pushNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:956` |
| 0.3% | 51.3ms | 0.3% | 51.3ms | `/(?:\/\*.*?\*\/\|\.\.\|->\|<@\|@>\|@lazy\|@fuzzy\|@index\|@deterministic\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 50.2ms | 0.2% | 46.8ms | `get flags` | `[native code]` |
| 0.2% | 49.9ms | 0.0% | 1.1ms | `RubylikeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:24` |
| 0.2% | 47.3ms | 0.2% | 47.3ms | ``/(?:\/\*.*?\*\/\|(?:<[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:<\/[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:#\w+)\|(?:\$\w+)\|(?:<\/\w+>)\|(?:=>)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 47.0ms | 0.0% | 8.5ms | `CLikeNestingStackStates` | `[native code]` |
| 0.2% | 46.9ms | 0.2% | 46.9ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 45.3ms | 0.0% | 0us | `_def_continue` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:94` |
| 0.2% | 44.2ms | 0.2% | 44.2ms | `/(?:\/\*.*?\*\/\|(?:'\w+\b)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 44.2ms | 0.0% | 0us | `TTCNReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:32` |
| 0.2% | 43.5ms | 0.0% | 0us | `KotlinStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:59` |
| 0.2% | 43.4ms | 0.2% | 43.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:11` |
| 0.2% | 42.4ms | 0.2% | 42.4ms | ``/(?:\/\*.*?\*\/\|(?:<\/?\w+.*?>)\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 42.4ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:30` |
| 0.2% | 42.2ms | 0.0% | 4.5ms | `filter` | `[native code]` |
| 0.2% | 41.5ms | 0.0% | 1.2ms | `_expecting_func_opening_bracket` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:498` |
| 0.2% | 41.3ms | 0.1% | 26.8ms | `preprocessing` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1012` |
| 0.2% | 41.2ms | 0.2% | 41.2ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|<-\|->\|%[a-zA-Z_*/>]+%\|\.\.\.\|:::\|::\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.2% | 40.4ms | 0.1% | 18.9ms | `anonymous` | `[native code]` |
| 0.2% | 39.9ms | 0.0% | 3.2ms | `SolidityStates` | `[native code]` |
| 0.2% | 39.5ms | 0.0% | 8.3ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:642` |
| 0.2% | 38.8ms | 0.2% | 38.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:11` |
| 0.2% | 38.4ms | 0.0% | 0us | `_state_class_declaration` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:204` |
| 0.2% | 38.4ms | 0.0% | 0us | `JavaClassBodyStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:86` |
| 0.2% | 37.7ms | 0.0% | 1.3ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:115` |
| 0.2% | 37.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:38` |
| 0.2% | 37.6ms | 0.0% | 0us | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:332` |
| 0.2% | 37.6ms | 0.0% | 1.3ms | `SwiftStates` | `[native code]` |
| 0.2% | 37.1ms | 0.0% | 1.1ms | `_expecting_condition_and_statement_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:422` |
| 0.2% | 36.7ms | 0.0% | 3.7ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:772` |
| 0.2% | 36.6ms | 0.2% | 36.6ms | ``/(?:\/\*.*?\*\/\|`[^`]*`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 36.2ms | 0.0% | 0us | `ObjCReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:19` |
| 0.2% | 35.7ms | 0.0% | 7.2ms | `GoStates` | `[native code]` |
| 0.2% | 35.7ms | 0.0% | 1.1ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:925` |
| 0.2% | 35.0ms | 0.0% | 1.2ms | `CSharpReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:24` |
| 0.2% | 34.6ms | 0.2% | 34.6ms | ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!\|\?\?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` | `[native code]` |
| 0.2% | 34.5ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:358` |
| 0.2% | 34.2ms | 0.0% | 0us | `_state_entering_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:446` |
| 0.2% | 33.7ms | 0.0% | 0us | `TypeScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:34` |
| 0.2% | 33.7ms | 0.0% | 2.4ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:113` |
| 0.1% | 33.5ms | 0.0% | 0us | `TTCNReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:33` |
| 0.1% | 33.0ms | 0.0% | 2.6ms | `RustStates` | `[native code]` |
| 0.1% | 32.9ms | 0.0% | 0us | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:308` |
| 0.1% | 32.3ms | 0.0% | 2.3ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:481` |
| 0.1% | 32.1ms | 0.0% | 0us | `JavaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:80` |
| 0.1% | 31.5ms | 0.0% | 0us | `PythonReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:112` |
| 0.1% | 31.4ms | 0.0% | 1.1ms | `flatIntoArrayWithCallback` | `[native code]` |
| 0.1% | 31.4ms | 0.1% | 31.4ms | `/(?:\/\*.*?\*\/\|#[^\n]*\|--\[\[.*?\]\]\|\[=*\[.*?\]=*\]\|--.*?$\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` | `[native code]` |
| 0.1% | 31.3ms | 0.0% | 6.9ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:401` |
| 0.1% | 31.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:70` |
| 0.1% | 31.0ms | 0.0% | 0us | `readDeclarationToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:309` |
| 0.1% | 30.7ms | 0.0% | 2.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:41` |
| 0.1% | 30.5ms | 0.1% | 30.5ms | `/.*\.(st)$/iu` | `[native code]` |
| 0.1% | 30.4ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:272` |
| 0.1% | 30.3ms | 0.1% | 30.3ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.1% | 30.1ms | 0.0% | 982us | `flatMap` | `[native code]` |
| 0.1% | 30.1ms | 0.0% | 0us | `parameter_count` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` |
| 0.1% | 30.1ms | 0.0% | 1.2ms | `parameterCount` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` |
| 0.1% | 29.8ms | 0.1% | 29.8ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1081` |
| 0.1% | 29.7ms | 0.0% | 2.1ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:831` |
| 0.1% | 29.4ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:38` |
| 0.1% | 28.6ms | 0.1% | 21.6ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:556` |
| 0.1% | 28.4ms | 0.0% | 0us | `GDScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:28` |
| 0.1% | 28.0ms | 0.0% | 0us | `popNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:896` |
| 0.1% | 27.1ms | 0.0% | 0us | `consumeErlangWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:231` |
| 0.1% | 26.7ms | 0.1% | 24.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:279` |
| 0.1% | 26.6ms | 0.0% | 0us | `get parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:278` |
| 0.1% | 26.5ms | 0.0% | 0us | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:123` |
| 0.1% | 26.5ms | 0.0% | 1.1ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:643` |
| 0.1% | 26.4ms | 0.1% | 26.4ms | `/.*\.(r\|R)$/iu` | `[native code]` |
| 0.1% | 26.2ms | 0.0% | 0us | `ScalaStates` | `[native code]` |
| 0.1% | 26.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:71` |
| 0.1% | 25.9ms | 0.0% | 0us | `PythonStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:376` |
| 0.1% | 25.8ms | 0.0% | 1.1ms | `CSharpReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:25` |
| 0.1% | 25.7ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:88` |
| 0.1% | 25.2ms | 0.0% | 0us | `JavaFunctionBodyStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:38` |
| 0.1% | 25.1ms | 0.0% | 1.3ms | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:924` |
| 0.1% | 25.0ms | 0.0% | 4.7ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:596` |
| 0.1% | 24.8ms | 0.0% | 10.2ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:220` |
| 0.1% | 24.5ms | 0.0% | 15.2ms | `normalizePythonRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:676` |
| 0.1% | 24.3ms | 0.0% | 1.3ms | `TTCNStates` | `[native code]` |
| 0.1% | 23.9ms | 0.1% | 23.9ms | `replaceLabel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:30` |
| 0.1% | 23.9ms | 0.0% | 0us | `ObjCReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:20` |
| 0.1% | 23.8ms | 0.0% | 3.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:42` |
| 0.1% | 23.7ms | 0.0% | 1.1ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:86` |
| 0.1% | 23.6ms | 0.1% | 23.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:150` |
| 0.1% | 23.5ms | 0.0% | 0us | `TSXReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:19` |
| 0.1% | 23.5ms | 0.0% | 9.6ms | `hasCompleteNestingStackSurface` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` |
| 0.1% | 23.3ms | 0.0% | 0us | `JavaScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/javascript.ts:17` |
| 0.1% | 23.0ms | 0.0% | 6.2ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:144` |
| 0.1% | 22.9ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:101` |
| 0.1% | 22.7ms | 0.0% | 3.8ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:639` |
| 0.1% | 22.5ms | 0.0% | 12.2ms | `replaceLabel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:29` |
| 0.1% | 22.4ms | 0.0% | 0us | `RubylikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:150` |
| 0.1% | 22.4ms | 0.1% | 22.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:66` |
| 0.1% | 22.4ms | 0.1% | 22.4ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:292` |
| 0.1% | 22.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:28` |
| 0.1% | 22.3ms | 0.0% | 0us | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:257` |
| 0.1% | 22.2ms | 0.0% | 2.3ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:402` |
| 0.1% | 22.1ms | 0.0% | 0us | `confirmNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:937` |
| 0.1% | 22.1ms | 0.0% | 4.5ms | `startNewFunctionNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:855` |
| 0.1% | 22.1ms | 0.1% | 20.7ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:300` |
| 0.1% | 22.1ms | 0.0% | 0us | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:310` |
| 0.1% | 22.0ms | 0.0% | 8.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:770` |
| 0.1% | 22.0ms | 0.0% | 3.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:249` |
| 0.1% | 21.5ms | 0.0% | 1.0ms | `ObjCStates` | `[native code]` |
| 0.1% | 21.4ms | 0.0% | 0us | `RubyReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:33` |
| 0.1% | 21.4ms | 0.0% | 1.1ms | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:426` |
| 0.1% | 21.0ms | 0.0% | 0us | `VueReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:18` |
| 0.1% | 20.8ms | 0.0% | 0us | `restartNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:947` |
| 0.1% | 20.6ms | 0.1% | 20.6ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.1% | 20.4ms | 0.0% | 2.2ms | `StReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:70` |
| 0.1% | 20.3ms | 0.0% | 1.2ms | `KotlinReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:27` |
| 0.1% | 20.1ms | 0.0% | 0us | `readDeclarationToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:312` |
| 0.1% | 20.1ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:453` |
| 0.1% | 19.6ms | 0.1% | 19.6ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:398` |
| 0.1% | 19.4ms | 0.0% | 0us | `_consume_type_annotation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:532` |
| 0.1% | 19.4ms | 0.0% | 1.5ms | `TypeScriptTypeAnnotationStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:548` |
| 0.1% | 19.0ms | 0.0% | 0us | `CLikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:44` |
| 0.1% | 19.0ms | 0.0% | 0us | `CppRValueRefStates` | `[native code]` |
| 0.1% | 18.8ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:100` |
| 0.1% | 18.6ms | 0.0% | 1.2ms | `_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:114` |
| 0.1% | 18.5ms | 0.1% | 18.5ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:590` |
| 0.1% | 18.4ms | 0.0% | 0us | `RustReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/rust.ts:28` |
| 0.1% | 18.3ms | 0.0% | 0us | `CSharpStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:43` |
| 0.1% | 18.1ms | 0.1% | 18.1ms | `[Symbol.matchAll]` | `[native code]` |
| 0.1% | 18.1ms | 0.0% | 1.3ms | `LuaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:18` |
| 0.1% | 18.0ms | 0.0% | 12.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:74` |
| 0.1% | 17.9ms | 0.0% | 0us | `CLikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:43` |
| 0.1% | 17.8ms | 0.0% | 0us | `PerlReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:45` |
| 0.1% | 17.7ms | 0.0% | 4.4ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:404` |
| 0.1% | 17.6ms | 0.1% | 17.6ms | `globalState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:112` |
| 0.1% | 17.4ms | 0.0% | 0us | `_expect_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:80` |
| 0.1% | 17.4ms | 0.0% | 0us | `_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:200` |
| 0.1% | 17.2ms | 0.0% | 0us | `LuaStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:39` |
| 0.1% | 17.2ms | 0.0% | 0us | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:125` |
| 0.1% | 16.9ms | 0.0% | 0us | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:49` |
| 0.0% | 16.7ms | 0.0% | 0us | `addBareNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:839` |
| 0.0% | 16.4ms | 0.0% | 1.2ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:293` |
| 0.0% | 16.4ms | 0.0% | 0us | `ZigStates` | `[native code]` |
| 0.0% | 16.1ms | 0.0% | 0us | `SolidityReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/solidity.ts:22` |
| 0.0% | 15.2ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.0% | 15.2ms | 0.0% | 1.1ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:403` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 14.7ms | 0.0% | 0us | `PerlStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:99` |
| 0.0% | 14.7ms | 0.0% | 0us | `PerlReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:46` |
| 0.0% | 14.6ms | 0.0% | 0us | `_expect_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:57` |
| 0.0% | 14.6ms | 0.0% | 0us | `PHPLanguageStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:32` |
| 0.0% | 14.6ms | 0.0% | 0us | `PHPReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:40` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:141` |
| 0.0% | 14.4ms | 0.0% | 0us | `RubylikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:151` |
| 0.0% | 14.4ms | 0.0% | 0us | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:774` |
| 0.0% | 14.3ms | 0.0% | 0us | `GDScriptReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:29` |
| 0.0% | 14.1ms | 0.0% | 3.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:37` |
| 0.0% | 13.9ms | 0.0% | 0us | `PythonReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:113` |
| 0.0% | 13.9ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:43` |
| 0.0% | 13.9ms | 0.0% | 13.9ms | `/^\p{White_Space}$/u` | `[native code]` |
| 0.0% | 13.4ms | 0.0% | 13.4ms | `/\(\?[aiLmsux]+\)/gu` | `[native code]` |
| 0.0% | 13.2ms | 0.0% | 8.4ms | `PLSQLReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:33` |
| 0.0% | 13.2ms | 0.0% | 0us | `GDScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:35` |
| 0.0% | 13.2ms | 0.0% | 2.2ms | `FortranReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:54` |
| 0.0% | 13.1ms | 0.0% | 13.1ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:23` |
| 0.0% | 13.1ms | 0.0% | 13.1ms | `WeakMap` | `[native code]` |
| 0.0% | 12.9ms | 0.0% | 0us | `_push_function_to_stack` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:399` |
| 0.0% | 12.9ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:451` |
| 0.0% | 12.8ms | 0.0% | 2.1ms | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:451` |
| 0.0% | 12.8ms | 0.0% | 12.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:168` |
| 0.0% | 12.7ms | 0.0% | 0us | `RustReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/rust.ts:29` |
| 0.0% | 12.5ms | 0.0% | 0us | `ErlangReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:68` |
| 0.0% | 12.4ms | 0.0% | 0us | `_expecting_func_opening_bracket` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:486` |
| 0.0% | 12.4ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:420` |
| 0.0% | 12.2ms | 0.0% | 12.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:11` |
| 0.0% | 12.2ms | 0.0% | 0us | `ZigReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:21` |
| 0.0% | 12.1ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:262` |
| 0.0% | 11.9ms | 0.0% | 9.5ms | `matchAt` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:239` |
| 0.0% | 11.8ms | 0.0% | 0us | `ScalaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:25` |
| 0.0% | 11.7ms | 0.0% | 0us | `FortranStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:125` |
| 0.0% | 11.7ms | 0.0% | 0us | `FortranReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:55` |
| 0.0% | 11.5ms | 0.0% | 1.1ms | `RReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:33` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:501` |
| 0.0% | 11.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:44` |
| 0.0% | 11.1ms | 0.0% | 1.2ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:243` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:332` |
| 0.0% | 11.0ms | 0.0% | 0us | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:264` |
| 0.0% | 10.9ms | 0.0% | 0us | `RReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:32` |
| 0.0% | 10.9ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:155` |
| 0.0% | 10.9ms | 0.0% | 10.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:769` |
| 0.0% | 10.8ms | 0.0% | 0us | `PHPReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:39` |
| 0.0% | 10.8ms | 0.0% | 1.1ms | `_function_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:231` |
| 0.0% | 10.8ms | 0.0% | 0us | `tryNewFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:929` |
| 0.0% | 10.8ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:133` |
| 0.0% | 10.7ms | 0.0% | 10.7ms | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 10.4ms | 0.0% | 10.4ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 10.4ms | 0.0% | 0us | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:477` |
| 0.0% | 10.4ms | 0.0% | 0us | `RStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:59` |
| 0.0% | 10.2ms | 0.0% | 0us | `GoReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:20` |
| 0.0% | 10.2ms | 0.0% | 0us | `_state_end_of_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:464` |
| 0.0% | 10.1ms | 0.0% | 10.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:334` |
| 0.0% | 10.0ms | 0.0% | 0us | `subState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:205` |
| 0.0% | 9.9ms | 0.0% | 0us | `KotlinReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:26` |
| 0.0% | 9.9ms | 0.0% | 0us | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:933` |
| 0.0% | 9.8ms | 0.0% | 0us | `ScalaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:24` |
| 0.0% | 9.7ms | 0.0% | 1.4ms | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:71` |
| 0.0% | 9.7ms | 0.0% | 9.7ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:509` |
| 0.0% | 9.7ms | 0.0% | 8.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:26` |
| 0.0% | 9.7ms | 0.0% | 9.7ms | `CodeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:397` |
| 0.0% | 9.6ms | 0.0% | 9.6ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:175` |
| 0.0% | 9.3ms | 0.0% | 1.2ms | `GoReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:19` |
| 0.0% | 9.3ms | 0.0% | 2.4ms | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:61` |
| 0.0% | 9.3ms | 0.0% | 0us | `set_nesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:77` |
| 0.0% | 9.3ms | 0.0% | 1.0ms | `_function_has_param` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:226` |
| 0.0% | 9.2ms | 0.0% | 1.3ms | `consumeErlangWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:230` |
| 0.0% | 9.2ms | 0.0% | 9.2ms | `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu` | `[native code]` |
| 0.0% | 9.1ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:256` |
| 0.0% | 9.1ms | 0.0% | 9.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:10` |
| 0.0% | 9.0ms | 0.0% | 9.0ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 9.0ms | 0.0% | 7.8ms | `get_reader_for` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:80` |
| 0.0% | 8.8ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:387` |
| 0.0% | 8.8ms | 0.0% | 8.8ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 8.7ms | 0.0% | 0us | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:62` |
| 0.0% | 8.6ms | 0.0% | 0us | `stateInsideBraces` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:48` |
| 0.0% | 8.6ms | 0.0% | 1.3ms | `currentNestingLevel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` |
| 0.0% | 8.6ms | 0.0% | 0us | `_state_after_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:434` |
| 0.0% | 8.5ms | 0.0% | 962us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:80` |
| 0.0% | 8.5ms | 0.0% | 8.5ms | `esSpecIsRegExp` | `[native code]` |
| 0.0% | 8.5ms | 0.0% | 1.0ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:534` |
| 0.0% | 8.4ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:49` |
| 0.0% | 8.4ms | 0.0% | 4.6ms | `finishPoppedNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:908` |
| 0.0% | 8.4ms | 0.0% | 8.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:14` |
| 0.0% | 8.3ms | 0.0% | 8.3ms | `/[\|\\{}()[\]^$+*?.]/gu` | `[native code]` |
| 0.0% | 8.2ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:388` |
| 0.0% | 8.1ms | 0.0% | 8.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:18` |
| 0.0% | 8.0ms | 0.0% | 8.0ms | `(module)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:212` |
| 0.0% | 7.9ms | 0.0% | 7.9ms | `fromCodePoint` | `[native code]` |
| 0.0% | 7.8ms | 0.0% | 0us | `ErlangStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:408` |
| 0.0% | 7.5ms | 0.0% | 986us | `find` | `[native code]` |
| 0.0% | 7.5ms | 0.0% | 0us | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:138` |
| 0.0% | 7.5ms | 0.0% | 7.5ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:481` |
| 0.0% | 7.4ms | 0.0% | 7.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 7.4ms | 0.0% | 7.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:146` |
| 0.0% | 7.4ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:81` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:134` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 7.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:179` |
| 0.0% | 7.3ms | 0.0% | 7.3ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 7.2ms | 0.0% | 7.2ms | `next` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:181` |
| 0.0% | 7.2ms | 0.0% | 2.5ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:491` |
| 0.0% | 7.1ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:187` |
| 0.0% | 7.1ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:244` |
| 0.0% | 7.1ms | 0.0% | 7.1ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1048` |
| 0.0% | 7.0ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:374` |
| 0.0% | 7.0ms | 0.0% | 7.0ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:571` |
| 0.0% | 6.9ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:41` |
| 0.0% | 6.9ms | 0.0% | 0us | `read_object` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:384` |
| 0.0% | 6.9ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:359` |
| 0.0% | 6.9ms | 0.0% | 0us | `_state_func_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:472` |
| 0.0% | 6.9ms | 0.0% | 0us | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:83` |
| 0.0% | 6.9ms | 0.0% | 0us | `LuaReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:19` |
| 0.0% | 6.8ms | 0.0% | 0us | `_state_class_declaration` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:203` |
| 0.0% | 6.8ms | 0.0% | 0us | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:403` |
| 0.0% | 6.6ms | 0.0% | 0us | `_state_after_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:438` |
| 0.0% | 6.5ms | 0.0% | 6.5ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:138` |
| 0.0% | 6.5ms | 0.0% | 0us | `ZigReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:22` |
| 0.0% | 6.5ms | 0.0% | 1.3ms | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:122` |
| 0.0% | 6.5ms | 0.0% | 0us | `PLSQLStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:94` |
| 0.0% | 6.5ms | 0.0% | 0us | `PLSQLReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:30` |
| 0.0% | 6.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:64` |
| 0.0% | 6.2ms | 0.0% | 0us | `generate_common_tokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts:35` |
| 0.0% | 6.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:554` |
| 0.0% | 6.1ms | 0.0% | 1.2ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:138` |
| 0.0% | 6.1ms | 0.0% | 0us | `StReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:71` |
| 0.0% | 6.1ms | 0.0% | 0us | `StStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:117` |
| 0.0% | 6.1ms | 0.0% | 6.1ms | `readDeclarationToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 6.1ms | 0.0% | 6.1ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:132` |
| 0.0% | 6.1ms | 0.0% | 3.9ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:50` |
| 0.0% | 6.0ms | 0.0% | 1.3ms | `_read_namespace_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:174` |
| 0.0% | 5.9ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:72` |
| 0.0% | 5.9ms | 0.0% | 0us | `PLSQLReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:29` |
| 0.0% | 5.9ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:242` |
| 0.0% | 5.9ms | 0.0% | 5.9ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 5.8ms | 0.0% | 5.8ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:98` |
| 0.0% | 5.8ms | 0.0% | 4.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:40` |
| 0.0% | 5.7ms | 0.0% | 5.7ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:36` |
| 0.0% | 5.7ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:73` |
| 0.0% | 5.7ms | 0.0% | 0us | `_start_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:202` |
| 0.0% | 5.7ms | 0.0% | 5.7ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:64` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `_expand_fstring_interpolations` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:150` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:68` |
| 0.0% | 5.6ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:63` |
| 0.0% | 5.6ms | 0.0% | 5.6ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:40` |
| 0.0% | 5.5ms | 0.0% | 5.5ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:272` |
| 0.0% | 5.5ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:545` |
| 0.0% | 5.5ms | 0.0% | 0us | `_def_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:109` |
| 0.0% | 5.3ms | 0.0% | 5.3ms | `commentCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1016` |
| 0.0% | 5.3ms | 0.0% | 5.3ms | `/^#\s*(\w+)\s*(.*)/msu` | `[native code]` |
| 0.0% | 5.2ms | 0.0% | 0us | `func_match_failed` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:498` |
| 0.0% | 5.1ms | 0.0% | 0us | `_read_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:109` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:145` |
| 0.0% | 5.1ms | 0.0% | 1.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:235` |
| 0.0% | 5.1ms | 0.0% | 5.1ms | `stateFunctionBody` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:35` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:107` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:293` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.0% | 5.0ms | 0.0% | 5.0ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 5.0ms | 0.0% | 1.3ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:181` |
| 0.0% | 4.9ms | 0.0% | 0us | `set_nesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:81` |
| 0.0% | 4.8ms | 0.0% | 4.8ms | `get nestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 4.8ms | 0.0% | 0us | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:152` |
| 0.0% | 4.8ms | 0.0% | 2.4ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:49` |
| 0.0% | 4.8ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:57` |
| 0.0% | 4.8ms | 0.0% | 0us | `_state_objc_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:76` |
| 0.0% | 4.8ms | 0.0% | 4.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 4.7ms | 0.0% | 2.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:179` |
| 0.0% | 4.7ms | 0.0% | 0us | `get nestingStackAdapter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 4.7ms | 0.0% | 0us | `FileInfoBuilder` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:773` |
| 0.0% | 4.7ms | 0.0% | 0us | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:274` |
| 0.0% | 4.7ms | 0.0% | 0us | `reset` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:86` |
| 0.0% | 4.7ms | 0.0% | 0us | `get ReadStream` | `node:fs:578` |
| 0.0% | 4.7ms | 0.0% | 0us | `readUntilThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:305` |
| 0.0% | 4.7ms | 0.0% | 1.2ms | `_function_after_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:171` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts` |
| 0.0% | 4.6ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:419` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:87` |
| 0.0% | 4.6ms | 0.0% | 4.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:15` |
| 0.0% | 4.5ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:546` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:248` |
| 0.0% | 4.5ms | 0.0% | 0us | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:475` |
| 0.0% | 4.4ms | 0.0% | 4.4ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:555` |
| 0.0% | 4.4ms | 0.0% | 0us | `statemachine_clone` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:413` |
| 0.0% | 4.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:65` |
| 0.0% | 4.3ms | 0.0% | 4.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:12` |
| 0.0% | 4.2ms | 0.0% | 0us | `_state_start_of_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:447` |
| 0.0% | 4.0ms | 0.0% | 4.0ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:92` |
| 0.0% | 3.9ms | 0.0% | 3.9ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:9` |
| 0.0% | 3.9ms | 0.0% | 1.2ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:52` |
| 0.0% | 3.9ms | 0.0% | 2.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:68` |
| 0.0% | 3.9ms | 0.0% | 0us | `_read_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:108` |
| 0.0% | 3.8ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:140` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:10` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:36` |
| 0.0% | 3.8ms | 0.0% | 0us | `_state_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:185` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:37` |
| 0.0% | 3.8ms | 0.0% | 0us | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:220` |
| 0.0% | 3.8ms | 0.0% | 0us | `SolidityReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/solidity.ts:21` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:11` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `_state_simple_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:559` |
| 0.0% | 3.7ms | 0.0% | 0us | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:400` |
| 0.0% | 3.7ms | 0.0% | 0us | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:221` |
| 0.0% | 3.7ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:174` |
| 0.0% | 3.7ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:181` |
| 0.0% | 3.7ms | 0.0% | 0us | `_extract_function_names` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:185` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `finishImplementation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `applyProcessor` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1494` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:472` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1079` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `stringIncludesInternal` | `[native code]` |
| 0.0% | 3.6ms | 0.0% | 3.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:52` |
| 0.0% | 3.6ms | 0.0% | 0us | `_function_args_continue` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:173` |
| 0.0% | 3.6ms | 0.0% | 2.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:37` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:144` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:91` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:98` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:480` |
| 0.0% | 3.5ms | 0.0% | 2.3ms | `test` | `[native code]` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `withNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 3.5ms | 0.0% | 3.5ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 3.5ms | 0.0% | 0us | `_def` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:70` |
| 0.0% | 3.5ms | 0.0% | 1.0ms | `finishPoppedNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:907` |
| 0.0% | 3.5ms | 0.0% | 0us | `_if_then` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:281` |
| 0.0% | 3.5ms | 0.0% | 0us | `_function_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:96` |
| 0.0% | 3.4ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/solidity.ts:26` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `finishNamespaceName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 3.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:74` |
| 0.0% | 3.4ms | 0.0% | 2.2ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:216` |
| 0.0% | 3.4ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 3.4ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 3.4ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 3.4ms | 0.0% | 0us | `_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:199` |
| 0.0% | 3.4ms | 0.0% | 0us | `ErlangReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:69` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:135` |
| 0.0% | 3.4ms | 0.0% | 2.1ms | `_if_cond` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:276` |
| 0.0% | 3.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:43` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:44` |
| 0.0% | 3.3ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:544` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `FunctionInfo` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:149` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:10` |
| 0.0% | 3.3ms | 0.0% | 0us | `_if` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:271` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:64` |
| 0.0% | 3.3ms | 0.0% | 3.3ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:270` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:41` |
| 0.0% | 3.2ms | 0.0% | 2.1ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:94` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:43` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.0% | 3.0ms | 0.0% | 3.0ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:303` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `lineCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1049` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` |
| 0.0% | 2.7ms | 0.0% | 1.3ms | `readFileSync` | `[native code]` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `/END\s*(?:PROGRAM\|MODULE\|SUBMODULE\|SUBROUTINE\|FUNCTION\|TYPE\|INTERFACE\|BLOCK\|IF\|DO\|FORALL\|WHERE\|SELECT\|ASSOCIATE)/iu` | `[native code]` |
| 0.0% | 2.6ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:504` |
| 0.0% | 2.6ms | 0.0% | 0us | `_read_namespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:169` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:86` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:594` |
| 0.0% | 2.6ms | 0.0% | 0us | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:591` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `_state_objc_param_type` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:84` |
| 0.0% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:64` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` |
| 0.0% | 2.6ms | 0.0% | 0us | `_function_args` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:159` |
| 0.0% | 2.6ms | 0.0% | 2.6ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:118` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:248` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `hasCompleteNestingStackSurface` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:479` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `RubylikeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts:15` |
| 0.0% | 2.5ms | 0.0% | 0us | `_read_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:105` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:38` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `replaceLabel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:28` |
| 0.0% | 2.5ms | 0.0% | 2.5ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:54` |
| 0.0% | 2.5ms | 0.0% | 1.3ms | `readDeclarationToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:300` |
| 0.0% | 2.5ms | 0.0% | 0us | `_state_start_of_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:453` |
| 0.0% | 2.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:552` |
| 0.0% | 2.4ms | 0.0% | 1.1ms | `match` | `[native code]` |
| 0.0% | 2.4ms | 0.0% | 0us | `isRNameFragment` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:231` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_state_end_of_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 2.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:547` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:478` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:33` |
| 0.0% | 2.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:126` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `endOfFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:993` |
| 0.0% | 2.4ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:38` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:80` |
| 0.0% | 2.4ms | 0.0% | 0us | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:68` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `isAlphabetic` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:89` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `tokenCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1070` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `FileInformation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:338` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_def_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:112` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:299` |
| 0.0% | 2.4ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:30` |
| 0.0% | 2.4ms | 0.0% | 0us | `consumeErlangAtom` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:380` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:287` |
| 0.0% | 2.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:170` |
| 0.0% | 2.3ms | 0.0% | 1.0ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:591` |
| 0.0% | 2.3ms | 0.0% | 0us | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:145` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `consume` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:221` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:11` |
| 0.0% | 2.3ms | 0.0% | 0us | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:73` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:27` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `addToFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `getCommentFromToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:615` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `TypeScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 2.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:41` |
| 0.0% | 2.3ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:540` |
| 0.0% | 2.3ms | 0.0% | 0us | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:159` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:11` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:77` |
| 0.0% | 2.3ms | 0.0% | 1.1ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:80` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `FileInformation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:335` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:40` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `_state_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:419` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `Nesting` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 0us | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:174` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:19` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:464` |
| 0.0% | 2.2ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` |
| 0.0% | 2.2ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:87` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(unknown)` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `stateFunctionBody` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:67` |
| 0.0% | 2.2ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:243` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 2.2ms | 0.0% | 0us | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:298` |
| 0.0% | 2.1ms | 0.0% | 0us | `get currentNestingLevel` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:90` |
| 0.0% | 2.1ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/rust.ts:41` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `isParameter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:590` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `/^[A-Za-z]+[A-Za-z0-9_]*/u` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:62` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:45` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `_state_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:29` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:46` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `set_nesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:75` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:606` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `isServerConfig` | `bun:main` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `bun:main:14` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:21` |
| 0.0% | 1.3ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:107` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `[Symbol.match]` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:550` |
| 0.0% | 1.3ms | 0.0% | 0us | `_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:206` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `endOfFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:998` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `addCondition` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:964` |
| 0.0% | 1.3ms | 0.0% | 0us | `func_match_failed` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:497` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:77` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:133` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `/[a-z][\p{L}\p{N}_]*/uy` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:260` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_expecting_statement_or_block` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:83` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:124` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `JavaFunctionBodyStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/tmp/vibe-lizard-harness-only.ts:7` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/tmp/vibe-lizard-harness-only.ts:7` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `readUntilThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `/^\p{L}$/u` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:174` |
| 0.0% | 1.3ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:80` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:80` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:416` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_after_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:205` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:27` |
| 0.0% | 1.3ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:551` |
| 0.0% | 1.3ms | 0.0% | 0us | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:160` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_soft_keyword_lookahead` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:63` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `/^[\p{L}\p{N}_]+$/u` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_after_parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:207` |
| 0.0% | 1.3ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:278` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:35` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:169` |
| 0.0% | 1.3ms | 0.0% | 0us | `process` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:605` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `statemachine_before_return` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:90` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:33` |
| 0.0% | 1.3ms | 0.0% | 0us | `_state_entering_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:445` |
| 0.0% | 1.3ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:60` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:146` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `SwiftReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:9` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:76` |
| 0.0% | 1.3ms | 0.0% | 0us | `_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:116` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `shift` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:45` |
| 0.0% | 1.3ms | 0.0% | 0us | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:53` |
| 0.0% | 1.3ms | 0.0% | 0us | `PLSQLReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:31` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:118` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:136` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:104` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:83` |
| 0.0% | 1.2ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:32` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `TSXReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get lastFunction` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:124` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:40` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `CodeStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:117` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.0% | 1.2ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.0% | 1.2ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `readInsideBracketsThen` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:291` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `KotlinReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:43` |
| 0.0% | 1.2ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:542` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `statemachine_before_return` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `returnFromState` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:195` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:34` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:395` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:248` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `RegExp` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:446` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `isFunctionName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_nested_call` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:310` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:10` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_objc_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:72` |
| 0.0% | 1.2ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:26` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_func_first_line` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `RubylikeReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `withoutWhitespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1506` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `buildConditions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:93` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_nested_call` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:448` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:153` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `consumeErlangAtom` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:173` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `LuaStateMachine` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:40` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:73` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:20` |
| 0.0% | 1.2ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:95` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `isRNameFragment` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts` |
| 0.0% | 1.2ms | 0.0% | 0us | `addNamespace` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:847` |
| 0.0% | 1.2ms | 0.0% | 0us | `finishNamespaceName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:189` |
| 0.0% | 1.2ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:79` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:282` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `getFunctionKeyword` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:58` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:65` |
| 0.0% | 1.2ms | 0.0% | 0us | `_state_function_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:210` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `_state_dec` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get unicode` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `get parameters` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:48` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `flatIntoArray` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `get parameter_count` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` |
| 0.0% | 1.1ms | 0.0% | 0us | `get parameterCount` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_pop_function_from_stack` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `get sticky` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `finishImplementation` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:455` |
| 0.0% | 1.1ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:73` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:66` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `getFunctionKeyword` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:48` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:48` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:25` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `getFunctionKeyword` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:135` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:115` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:36` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:281` |
| 0.0% | 1.1ms | 0.0% | 0us | `_function_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:97` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `languages` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:74` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_function_return_type_or_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:178` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:244` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:427` |
| 0.0% | 1.1ms | 0.0% | 0us | `_extract_function_names` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:192` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `reverse` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:45` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `set _state` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_expect_function_impl` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:22` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_class_declaration` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:210` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generatePygmentsCompatibleErlangTokenValues` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:168` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:180` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:27` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `GDScriptStates` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:36` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `addToLongName` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:82` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `MyToken` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `process_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:284` |
| 0.0% | 1.1ms | 0.0% | 0us | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:59` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `isTripleQuotedString` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:429` |
| 0.0% | 1.1ms | 0.0% | 0us | `parameter_bracket_open` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:230` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(module)` | `/tmp/vibe-lizard-harness-only.ts:8` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `hasParameterBracketDefinitions` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:284` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:149` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:37` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `try_new_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:140` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:342` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `exec` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_extract_function_names` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:172` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokensWithRegex` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:73` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `__call__` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:108` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `preprocess` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:98` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:75` |
| 0.0% | 1.1ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:55` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:33` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `operation` | `/tmp/vibe-lizard-harness-only.ts` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:28` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_function_name` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:70` |
| 0.0% | 1.0ms | 0.0% | 0us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:70` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `at` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `_function_args_continue` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:172` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `statemachine_clone` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_before_begin` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:245` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `conditionCounter` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1082` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `/(?:[2-9]\|[12][0-9]\|3[0-6])#[0-9A-Za-z]+/uy` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_consume_java_expression_tokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:97` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `generate_common_tokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:139` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `get unicodeSets` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:104` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:338` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:85` |
| 0.0% | 1.0ms | 0.0% | 0us | `generateTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:79` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `startNewFunctionNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:516` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:90` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `addBareNesting` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:499` |
| 0.0% | 1.0ms | 0.0% | 0us | `_function` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:150` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `rubyTokens` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:71` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `importModule` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `/tmp/vibe-lizard-harness-only.ts:5` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `ErlangReader` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_function_body` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:253` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `analyzeSourceCode` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1449` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `tokenizerFlags` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_def` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:65` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_dec_to_imp` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:92` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:streams/end-of-stream` | `internal:streams/end-of-stream:17` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `/^\p{L}+$/u` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `_read_params` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:107` |
| 0.0% | 999us | 0.0% | 0us | `get_comment_from_token` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:48` |
| 0.0% | 988us | 0.0% | 988us | `_state_global` | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:137` |
| 0.0% | 981us | 0.0% | 981us | `createSafeIterator` | `internal:primordials:3` |
| 0.0% | 981us | 0.0% | 0us | `internal:primordials` | `internal:primordials:50` |
| 0.0% | 981us | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.0% | 981us | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.0% | 981us | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.0% | 967us | 0.0% | 967us | `/#\s*(\w+)\s*(.*)/msu` | `[native code]` |

## Function Details

### `/(?:\/\*.*?\*\/\/\/\|#(?:\\\n\|[^\n])*\|!(?:\\\n\|[^\n])*\|^\*(?:\\\n\|[^\n])*\|\.OR\.\|\.AND\.\|ELSE\s+IF\|MODULE\s+PROCEDURE\|END\s*PROGRAM\|END\s*MODULE\|END\s*SUBMODULE\|END\s*SUBROUTINE\|END\s*FUNCTION\|END\s*TYPE\|END\s*INTERFACE\|END\s*BLOCK\|END\s*IF\|END\s*DO\|END\s*FORALL\|END\s*WHERE\|END\s*SELECT\|END\s*ASSOCIATE\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu`
`[native code]` | Self: 9.6% (1.62s) | Total: 9.6% (1.62s) | Samples: 1355

**Called by:**
- `regExpExec` (1354)
- `exec` (1)

### `/(?:\/\*.*?\*\/\/\/(?:\\\n\|[^\n])*\|\(\*(?:\\\n\|[^\n])*\|OR\|AND\|XOR\|NOT\|ELSE\s+IF\|END_IF\|END_FOR\|END_WHILE\|END_CASE\|END_REPEAT\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu`
`[native code]` | Self: 4.0% (688.0ms) | Total: 4.0% (688.0ms) | Samples: 580

**Called by:**
- `regExpExec` (580)

### `from`
`[native code]` | Self: 3.2% (545.5ms) | Total: 10.5% (1.78s) | Samples: 436

**Called by:**
- `generateTokensWithRegex` (639)
- `isPythonWhitespace` (457)
- `preprocess` (150)
- `addToLongName` (102)
- `addToLongName` (57)
- `tokenizerFlags` (42)
- `tokenizerFlags` (9)
- `(anonymous)` (2)

**Calls:**
- `next` (996)
- `arrayFromFastWithoutMapFn` (24)
- `generatorResume` (1)
- `generateTokens` (1)

### `/.*\.(c\|cpp\|cc\|cxx\|h\|hpp)$/iu`
`[native code]` | Self: 3.1% (525.4ms) | Total: 3.1% (525.4ms) | Samples: 440

**Called by:**
- `matchFilename` (440)

### `/.*\.(js\|cjs\|mjs)$/iu`
`[native code]` | Self: 2.5% (430.9ms) | Total: 2.5% (430.9ms) | Samples: 360

**Called by:**
- `matchFilename` (360)

### `/.*\.(cs)$/iu`
`[native code]` | Self: 2.4% (416.2ms) | Total: 2.4% (416.2ms) | Samples: 348

**Called by:**
- `matchFilename` (348)

### `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:"""(?:\.\|[^"]\|"(?!"")\|""(?!"))*""")\|(?:'''(?:\.\|[^']\|'(?!'')\|''(?!'))*''')\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 2.4% (406.5ms) | Total: 2.4% (406.5ms) | Samples: 341

**Called by:**
- `regExpExec` (341)

### `/.*\.(java)$/iu`
`[native code]` | Self: 2.4% (404.9ms) | Total: 2.4% (404.9ms) | Samples: 337

**Called by:**
- `matchFilename` (336)
- `test` (1)

### `/.*\.(py)$/iu`
`[native code]` | Self: 2.3% (401.8ms) | Total: 2.3% (401.8ms) | Samples: 338

**Called by:**
- `matchFilename` (338)

### `generatorResume`
`[native code]` | Self: 2.2% (380.4ms) | Total: 100.0% (52.76s) | Samples: 314

**Called by:**
- `next` (42572)
- `generateTokens` (161)
- `preprocess` (136)
- `preprocess` (91)
- `preprocess` (90)
- `conditionCounter` (79)
- `lineCounter` (75)
- `tokenCounter` (73)
- `generateTokens` (73)
- `_expand_fstring_interpolations` (69)
- `process` (64)
- `commentCounter` (54)
- `_soft_keyword_lookahead` (48)
- `preprocess` (40)
- `rubyTokens` (36)
- `preprocess` (32)
- `analyzeSourceCode` (27)
- `withoutWhitespace` (26)
- `__call__` (23)
- `preprocess` (22)
- `preprocess` (20)
- `generateTokens` (18)
- `generateTokens` (14)
- `_soft_keyword_lookahead` (14)
- `preprocess` (11)
- `_soft_keyword_lookahead` (11)
- `preprocess` (10)
- `(anonymous)` (9)
- `preprocess` (8)
- `(anonymous)` (7)
- `generateTokens` (6)
- `_soft_keyword_lookahead` (5)
- `(anonymous)` (3)
- `from` (1)
- `__call__` (1)
- `process_token` (1)

**Calls:**
- `process` (5641)
- `conditionCounter` (5632)
- `tokenCounter` (5585)
- `lineCounter` (5371)
- `commentCounter` (5278)
- `generateTokens` (3634)
- `preprocess` (1418)
- `generateTokens` (1406)
- `process` (1287)
- `withoutWhitespace` (1194)
- `generateTokensWithRegex` (647)
- `preprocess` (633)
- `generateTokens` (630)
- `preprocess` (481)
- `_expand_fstring_interpolations` (436)
- `preprocess` (377)
- `generateTokens` (347)
- `rubyTokens` (296)
- `_soft_keyword_lookahead` (283)
- `withoutWhitespace` (203)
- `(anonymous)` (191)
- `preprocess` (187)
- `lineCounter` (186)
- `generateTokens` (179)
- `preprocess` (134)
- `preprocess` (111)
- `preprocess` (106)
- `preprocess` (104)
- `generateTokens` (100)
- `preprocess` (92)
- `__call__` (91)
- `(anonymous)` (90)
- `generateTokens` (88)
- `_soft_keyword_lookahead` (81)
- `preprocess` (76)
- `generateTokens` (71)
- `preprocess` (68)
- `_soft_keyword_lookahead` (64)
- `generateTokens` (62)
- `commentCounter` (57)
- `preprocess` (49)
- `__call__` (47)
- `(anonymous)` (36)
- `__call__` (29)
- `generatePygmentsCompatibleErlangTokenValues` (28)
- `_soft_keyword_lookahead` (26)
- `preprocess` (26)
- `preprocess` (26)
- `conditionCounter` (25)
- `preprocess` (24)
- `generateTokens` (23)
- `preprocess` (20)
- `preprocess` (20)
- `process` (20)
- `_soft_keyword_lookahead` (18)
- `preprocess` (15)
- `preprocess` (14)
- `process_token` (14)
- `preprocess` (10)
- `generateTokens` (8)
- `generateTokens` (8)
- `commentCounter` (7)
- `lineCounter` (7)
- `preprocess` (7)
- `withoutWhitespace` (6)
- `generatePygmentsCompatibleErlangTokenValues` (6)
- `generatePygmentsCompatibleErlangTokenValues` (6)
- `preprocess` (5)
- `generateTokensWithRegex` (5)
- `generateTokens` (5)
- `_expand_fstring_interpolations` (5)
- `generateTokens` (5)
- `generateTokens` (5)
- `generateTokensWithRegex` (5)
- `tokenCounter` (4)
- `generatePygmentsCompatibleErlangTokenValues` (4)
- `generateTokens` (4)
- `preprocess` (4)
- `generateTokens` (4)
- `__call__` (4)
- `generateTokens` (4)
- `generateTokens` (4)
- `generatePygmentsCompatibleErlangTokenValues` (4)
- `preprocess` (4)
- `generatePygmentsCompatibleErlangTokenValues` (4)
- `preprocess` (4)
- `preprocess` (3)
- `preprocess` (3)
- `process` (3)
- `preprocess` (3)
- `preprocess` (3)
- `generateTokens` (3)
- `process_token` (3)
- `preprocess` (3)
- `generatePygmentsCompatibleErlangTokenValues` (2)
- `process_token` (2)
- `generateTokens` (2)
- `generateTokens` (2)
- `preprocess` (2)
- `generateTokens` (2)
- `(anonymous)` (2)
- `preprocess` (2)
- `__call__` (2)
- `lineCounter` (2)
- `(anonymous)` (2)
- `preprocess` (2)
- `_soft_keyword_lookahead` (2)
- `generateTokens` (2)
- `generateTokensWithRegex` (2)
- `tokenCounter` (2)
- `conditionCounter` (2)
- `preprocess` (2)
- `preprocess` (2)
- `generatePygmentsCompatibleErlangTokenValues` (2)
- `preprocess` (1)
- `rubyTokens` (1)
- `generateTokensWithRegex` (1)
- `process` (1)
- `process` (1)
- `preprocess` (1)
- `preprocess` (1)
- `rubyTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `preprocess` (1)
- `generatePygmentsCompatibleErlangTokenValues` (1)
- `preprocess` (1)
- `preprocess` (1)
- `conditionCounter` (1)
- `_soft_keyword_lookahead` (1)
- `__call__` (1)
- `generateTokens` (1)
- `__call__` (1)
- `rubyTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `(anonymous)` (1)
- `__call__` (1)
- `generateTokens` (1)
- `process_token` (1)
- `preprocess` (1)

### `/.*\.(m\|mm)$/iu`
`[native code]` | Self: 2.1% (370.2ms) | Total: 2.1% (370.2ms) | Samples: 309

**Called by:**
- `matchFilename` (309)

### `/.*\.(php)$/iu`
`[native code]` | Self: 2.1% (367.2ms) | Total: 2.1% (367.2ms) | Samples: 307

**Called by:**
- `matchFilename` (307)

### `/.*\.(rb)$/iu`
`[native code]` | Self: 2.1% (366.1ms) | Total: 2.1% (366.1ms) | Samples: 302

**Called by:**
- `matchFilename` (302)

### `/.*\.(ttcn\|ttcnpp)$/iu`
`[native code]` | Self: 2.1% (355.4ms) | Total: 2.1% (355.4ms) | Samples: 297

**Called by:**
- `matchFilename` (297)

### `regExpExec`
`[native code]` | Self: 2.0% (344.9ms) | Total: 25.7% (4.33s) | Samples: 288

**Called by:**
- `next` (3631)

**Calls:**
- `/(?:\/\*.*?\*\/\/\/\|#(?:\\\n\|[^\n])*\|!(?:\\\n\|[^\n])*\|^\*(?:\\\n\|[^\n])*\|\.OR\.\|\.AND\.\|ELSE\s+IF\|MODULE\s+PROCEDURE\|END\s*PROGRAM\|END\s*MODULE\|END\s*SUBMODULE\|END\s*SUBROUTINE\|END\s*FUNCTION\|END\s*TYPE\|END\s*INTERFACE\|END\s*BLOCK\|END\s*IF\|END\s*DO\|END\s*FORALL\|END\s*WHERE\|END\s*SELECT\|END\s*ASSOCIATE\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` (1354)
- `/(?:\/\*.*?\*\/\/\/(?:\\\n\|[^\n])*\|\(\*(?:\\\n\|[^\n])*\|OR\|AND\|XOR\|NOT\|ELSE\s+IF\|END_IF\|END_FOR\|END_WHILE\|END_CASE\|END_REPEAT\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` (580)
- `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:"""(?:\.\|[^"]\|"(?!"")\|""(?!"))*""")\|(?:'''(?:\.\|[^']\|'(?!'')\|''(?!'))*''')\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (341)
- `/(?:\/\*.*?\*\/\|#[^\n]*\|^=begin\|^=end\|%[qQrwiI]?\{(?:\\.\|[^\}\\])*?\}\|%[qQrwiI]?\[(?:\\.\|[^\]\\])*?\]\|%[qQrwiI]?<(?:\\.\|[^>\\])*?>\|%[qQrwiI]?\((?:\\.\|[^>\\])*?\)\|\w+:\|\$\w+\|\.+\|:?@{0,2}\w+\??!?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (261)
- `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (112)
- `/(?:\/\*.*?\*\/\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (106)
- ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (68)
- `/(?:\/\*.*?\*\/\|--[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (59)
- `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\?\?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (48)
- `/(?:\/\*.*?\*\/\|(?:\$\w+)\|(?:<{3}(?<quote>\w+).*?k<quote>)\|(?:\?\?=)\|(?:\?\?)\|(?:\?->)\|(?:\?:)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (47)
- ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!!\|\?\?\|\?:\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (45)
- `/(?:\/\*.*?\*\/\|\.\.\|->\|<@\|@>\|@lazy\|@fuzzy\|@index\|@deterministic\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (42)
- ``/(?:\/\*.*?\*\/\|(?:<[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:<\/[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:#\w+)\|(?:\$\w+)\|(?:<\/\w+>)\|(?:=>)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (40)
- `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (39)
- `/(?:\/\*.*?\*\/\|(?:'\w+\b)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (38)
- ``/(?:\/\*.*?\*\/\|(?:<\/?\w+.*?>)\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (36)
- `/(?:\/\*.*?\*\/\|#[^\n]*\|<-\|->\|%[a-zA-Z_*/>]+%\|\.\.\.\|:::\|::\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (35)
- ``/(?:\/\*.*?\*\/\|`[^`]*`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (30)
- ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!\|\?\?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`` (30)
- `/(?:\/\*.*?\*\/\|#[^\n]*\|--\[\[.*?\]\]\|\[=*\[.*?\]=*\]\|--.*?$\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu` (26)
- `/\(\?[aiLmsux]+\)/gu` (6)

### `/.*\.(swift)$/iu`
`[native code]` | Self: 1.9% (332.8ms) | Total: 1.9% (332.8ms) | Samples: 277

**Called by:**
- `matchFilename` (277)

### `/(?:\/\*.*?\*\/\|#[^\n]*\|^=begin\|^=end\|%[qQrwiI]?\{(?:\\.\|[^\}\\])*?\}\|%[qQrwiI]?\[(?:\\.\|[^\]\\])*?\]\|%[qQrwiI]?<(?:\\.\|[^>\\])*?>\|%[qQrwiI]?\((?:\\.\|[^>\\])*?\)\|\w+:\|\$\w+\|\.+\|:?@{0,2}\w+\??!?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 1.8% (312.1ms) | Total: 1.8% (312.1ms) | Samples: 261

**Called by:**
- `regExpExec` (261)

### `/.*\.(go)$/iu`
`[native code]` | Self: 1.6% (282.8ms) | Total: 1.6% (282.8ms) | Samples: 238

**Called by:**
- `matchFilename` (238)

### `/.*\.(scala)$/iu`
`[native code]` | Self: 1.6% (279.8ms) | Total: 1.6% (279.8ms) | Samples: 233

**Called by:**
- `matchFilename` (233)

### `/.*\.(gd)$/iu`
`[native code]` | Self: 1.6% (271.5ms) | Total: 1.6% (271.5ms) | Samples: 227

**Called by:**
- `matchFilename` (227)

### `escapeRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:680` | Self: 1.5% (266.8ms) | Total: 1.6% (275.2ms) | Samples: 224

**Called by:**
- `map` (231)

**Calls:**
- `/[\|\\{}()[\]^$+*?.]/gu` (7)

### `matchFilename`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:490` | Self: 1.5% (263.4ms) | Total: 40.8% (6.86s) | Samples: 221

**Called by:**
- `get_reader_for` (5738)

**Calls:**
- `/.*\.(c\|cpp\|cc\|cxx\|h\|hpp)$/iu` (440)
- `/.*\.(js\|cjs\|mjs)$/iu` (360)
- `/.*\.(cs)$/iu` (348)
- `/.*\.(py)$/iu` (338)
- `/.*\.(java)$/iu` (336)
- `/.*\.(m\|mm)$/iu` (309)
- `/.*\.(php)$/iu` (307)
- `/.*\.(rb)$/iu` (302)
- `/.*\.(ttcn\|ttcnpp)$/iu` (297)
- `/.*\.(swift)$/iu` (277)
- `/.*\.(go)$/iu` (238)
- `/.*\.(scala)$/iu` (233)
- `/.*\.(gd)$/iu` (227)
- `/.*\.(lua)$/iu` (206)
- `/.*\.(f70\|f90\|f95\|f03\|f08\|f\|for\|ftn\|fpp)$/iu` (192)
- `/.*\.(rs)$/iu` (186)
- `/.*\.(ts)$/iu` (171)
- `/.*\.(kt\|kts)$/iu` (156)
- `/.*\.(sol)$/iu` (125)
- `/.*\.(erl\|hrl\|es\|escript)$/iu` (104)
- `/.*\.(zig)$/iu` (95)
- `/.*\.(tsx\|jsx)$/iu` (60)
- `join` (57)
- `/.*\.(vue)$/iu` (56)
- `/.*\.(pl\|pm)$/iu` (50)
- `/.*\.(st)$/iu` (25)
- `/.*\.(r\|R)$/iu` (22)

### `next`
`[native code]` | Self: 1.5% (255.9ms) | Total: 100.0% (55.71s) | Samples: 206

**Called by:**
- `analyzeSourceCode` (7096)
- `process` (5575)
- `conditionCounter` (5551)
- `tokenCounter` (5510)
- `lineCounter` (5296)
- `commentCounter` (5215)
- `generateTokens` (3610)
- `preprocess` (1328)
- `generateTokens` (1243)
- `withoutWhitespace` (1163)
- `from` (996)
- `generateTokens` (553)
- `preprocess` (497)
- `preprocess` (389)
- `_expand_fstring_interpolations` (366)
- `preprocess` (356)
- `rubyTokens` (256)
- `_soft_keyword_lookahead` (235)
- `(anonymous)` (184)
- `preprocess` (92)
- `preprocess` (89)
- `preprocess` (84)
- `(anonymous)` (81)
- `generateTokens` (81)
- `preprocess` (72)
- `_soft_keyword_lookahead` (70)
- `__call__` (67)
- `generateTokens` (65)
- `preprocess` (64)
- `preprocess` (57)
- `_soft_keyword_lookahead` (50)
- `generateTokens` (45)
- `(anonymous)` (29)
- `__call__` (21)
- `_soft_keyword_lookahead` (13)
- `process_token` (8)
- `preprocess` (3)
- `generateTokens` (1)

**Calls:**
- `generatorResume` (42572)
- `regExpExec` (3631)
- `exec` (1)
- `arrayIteratorNextHelper` (1)

### `/.*\.(lua)$/iu`
`[native code]` | Self: 1.4% (247.2ms) | Total: 1.4% (247.2ms) | Samples: 206

**Called by:**
- `matchFilename` (206)

### `/.*\.(f70\|f90\|f95\|f03\|f08\|f\|for\|ftn\|fpp)$/iu`
`[native code]` | Self: 1.3% (233.4ms) | Total: 1.3% (233.4ms) | Samples: 192

**Called by:**
- `matchFilename` (192)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:21` | Self: 1.3% (230.6ms) | Total: 1.3% (230.6ms) | Samples: 189

**Called by:**
- `CLikeStates` (154)
- `CLikeNestingStackStates` (28)
- `CppRValueRefStates` (7)

### `/.*\.(rs)$/iu`
`[native code]` | Self: 1.3% (222.9ms) | Total: 1.3% (222.9ms) | Samples: 186

**Called by:**
- `matchFilename` (186)

### `/.*\.(ts)$/iu`
`[native code]` | Self: 1.1% (201.5ms) | Total: 1.1% (201.5ms) | Samples: 171

**Called by:**
- `matchFilename` (171)

### `Set`
`[native code]` | Self: 1.1% (201.2ms) | Total: 1.1% (201.2ms) | Samples: 166

**Called by:**
- `buildConditions` (64)
- `CodeReader` (27)
- `CodeReader` (19)
- `CodeReader` (17)
- `tokenizerFlags` (16)
- `CodeReader` (11)
- `CodeReader` (11)
- `PLSQLReader` (1)

### `stringSplitFast`
`[native code]` | Self: 1.1% (187.7ms) | Total: 1.1% (187.7ms) | Samples: 156

**Called by:**
- `lineCounter` (154)
- `flatIntoArrayWithCallback` (2)

### `/.*\.(kt\|kts)$/iu`
`[native code]` | Self: 1.1% (186.1ms) | Total: 1.1% (186.1ms) | Samples: 156

**Called by:**
- `matchFilename` (156)

### `join`
`[native code]` | Self: 1.0% (176.1ms) | Total: 1.0% (176.1ms) | Samples: 147

**Called by:**
- `generateTokens` (75)
- `matchFilename` (57)
- `tokenizerFlags` (13)
- `generateTokens` (1)
- `withNamespace` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:13` | Self: 1.0% (172.6ms) | Total: 1.0% (172.6ms) | Samples: 142

**Called by:**
- `CodeStateMachine` (97)
- `CodeReader` (45)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:10` | Self: 0.9% (158.9ms) | Total: 0.9% (158.9ms) | Samples: 126

**Called by:**
- `GoLikeStates` (126)

### `/.*\.(sol)$/iu`
`[native code]` | Self: 0.9% (151.4ms) | Total: 0.9% (151.4ms) | Samples: 125

**Called by:**
- `matchFilename` (125)

### `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.8% (134.9ms) | Total: 0.8% (134.9ms) | Samples: 112

**Called by:**
- `regExpExec` (112)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:223` | Self: 0.7% (130.1ms) | Total: 0.7% (130.1ms) | Samples: 108

**Called by:**
- `process` (83)
- `invokeCurrentState` (9)
- `consume` (6)
- `_state_class_declaration` (2)
- `__call__` (2)
- `_state_dec_to_imp` (1)
- `_state_function` (1)
- `_state_end_of_params` (1)
- `_state_function` (1)
- `next` (1)
- `_state_global` (1)

### `invokeCurrentState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:231` | Self: 0.7% (127.5ms) | Total: 10.0% (1.69s) | Samples: 109

**Called by:**
- `consume` (1316)
- `consume` (75)
- `consume` (14)

**Calls:**
- `_function_dec` (66)
- `_function_impl` (63)
- `_expect_function_impl` (53)
- `_def_continue` (38)
- `_state_dec` (38)
- `_expecting_func_opening_bracket` (35)
- `_state_global` (35)
- `_expecting_condition_and_statement_block` (31)
- `_state_dec_to_imp` (31)
- `_state_class_declaration` (31)
- `_state_global` (29)
- `_state_entering_imp` (28)
- `_dec` (26)
- `_state_imp` (22)
- `(anonymous)` (21)
- `_state_function` (20)
- `_state_global` (19)
- `_expecting_statement_or_block` (18)
- `_state_global` (18)
- `_expect_function_impl` (18)
- `_function_body` (16)
- `_function` (16)
- `_parameters` (15)
- `globalState` (15)
- `_expect_function_dec` (15)
- `_expect_function_body` (12)
- `_state_global` (12)
- `_state_global` (11)
- `_state_global` (10)
- `_expecting_func_opening_bracket` (10)
- `_state_imp` (10)
- `_function` (10)
- `_state_global` (10)
- `_state_global` (9)
- `_state_global` (9)
- `_state_global` (9)
- `_state_function` (9)
- `_state_global` (9)
- `_function_params` (9)
- `_state_end_of_params` (9)
- `_state_function` (8)
- `_state_global` (8)
- `_function_has_param` (8)
- `_state_global` (8)
- `_state_after_name` (7)
- `_state_global` (7)
- `_dec` (7)
- `_state_global` (7)
- `_state_global` (7)
- `_state_global` (7)
- `_state_global` (7)
- `_function` (7)
- `_function` (7)
- `_function` (6)
- `_state_func_first_line` (6)
- `_state_global` (6)
- `_state_global` (6)
- `_state_global` (6)
- `_state_global` (6)
- `_state_dec_to_imp` (6)
- `_state_class_declaration` (6)
- `_state_global` (6)
- `(anonymous)` (6)
- `_dec` (6)
- `_function` (5)
- `_state_global` (5)
- `_state_global` (5)
- `_state_body` (5)
- `_state_global` (5)
- `_state_global` (5)
- `_state_imp` (5)
- `_state_after_name` (5)
- `_def_parameters` (5)
- `_state_global` (5)
- `_state_dec_to_imp` (5)
- `_dec` (4)
- `_state_objc_dec` (4)
- `_read_params` (4)
- `_read_namespace_name` (4)
- `_function_after_name` (4)
- `_state_global` (4)
- `_state_global` (4)
- `_state_global` (3)
- `_state_start_of_params` (3)
- `_state_simple_type` (3)
- `_read_params` (3)
- `_state_global` (3)
- `_state_global` (3)
- `_parameters` (3)
- `_state_global` (3)
- `_if_cond` (3)
- `_dec` (3)
- `_function_args_continue` (3)
- `_dec` (3)
- `_function_params` (3)
- `_def` (3)
- `_state_body` (3)
- `_state_function_dec` (3)
- `_state_global` (3)
- `_state_global` (3)
- `_function_name` (3)
- `_if` (3)
- `_function_name` (3)
- `_if_then` (3)
- `_function_name` (3)
- `_state_global` (3)
- `_state_global` (3)
- `_state_global` (3)
- `_state_global` (2)
- `_state_end_of_params` (2)
- `_function_name` (2)
- `_dec` (2)
- `_def_parameters` (2)
- `_function_args` (2)
- `_state_start_of_params` (2)
- `_read_params` (2)
- `_function_dec` (2)
- `_state_global` (2)
- `_state_global` (2)
- `_state_dec_to_imp` (2)
- `_state_global` (2)
- `_state_function` (2)
- `_state_objc_param_type` (2)
- `_function_name` (2)
- `_state_first_line` (2)
- `_function` (2)
- `_function_name` (2)
- `_read_namespace` (2)
- `_state_dec_to_imp` (1)
- `_state_global` (1)
- `_function_params` (1)
- `_read_params` (1)
- `_function_args_continue` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_function` (1)
- `_state_function_body` (1)
- `_state_first_line` (1)
- `_state_global` (1)
- `_function_return_type_or_body` (1)
- `_state_func_first_line` (1)
- `_state_dec` (1)
- `_function_impl` (1)
- `_state_nested_call` (1)
- `_state_global` (1)
- `(anonymous)` (1)
- `_function` (1)
- `_state_objc_dec` (1)
- `_state_global` (1)
- `_function` (1)
- `_expect_function_impl` (1)
- `_function_name` (1)
- `_function_body` (1)
- `_state_body` (1)
- `_state_global` (1)
- `_state_imp` (1)
- `_state_body` (1)
- `_state_global` (1)
- `_state_function_body` (1)
- `_function_name` (1)
- `_state_dec_to_imp` (1)
- `_state_function_dec` (1)
- `_state_before_begin` (1)
- `_expect_function_impl` (1)
- `_function_name` (1)
- `_dec` (1)
- `_function_body` (1)
- `_state_function` (1)
- `_state_global` (1)
- `_state_entering_imp` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_nested_call` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_function_name` (1)
- `_state_class_declaration` (1)
- `_function_params` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_after_parameters` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_after_parameters` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)
- `_def` (1)
- `_expecting_statement_or_block` (1)
- `_state_global` (1)
- `_function_body` (1)
- `_state_global` (1)

### `/(?:\/\*.*?\*\/\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.7% (125.9ms) | Total: 0.7% (125.9ms) | Samples: 106

**Called by:**
- `regExpExec` (106)

### `/.*\.(erl\|hrl\|es\|escript)$/iu`
`[native code]` | Self: 0.7% (122.4ms) | Total: 0.7% (122.4ms) | Samples: 104

**Called by:**
- `matchFilename` (104)

### `/.*\.(zig)$/iu`
`[native code]` | Self: 0.6% (112.3ms) | Total: 0.6% (112.3ms) | Samples: 95

**Called by:**
- `matchFilename` (95)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:538` | Self: 0.6% (104.6ms) | Total: 0.6% (105.8ms) | Samples: 87

**Called by:**
- `generatorResume` (88)

**Calls:**
- `RegExp` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:98` | Self: 0.6% (102.9ms) | Total: 0.6% (102.9ms) | Samples: 85

**Called by:**
- `TypeScriptStates` (76)
- `TypeScriptTypeAnnotationStates` (9)

### `freeze`
`[native code]` | Self: 0.5% (94.3ms) | Total: 0.5% (94.3ms) | Samples: 79

**Called by:**
- `analyzeLizardSource` (48)
- `map` (19)
- `operation` (12)

### ``/(?:\/\*.*?\*\/\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 0.4% (81.8ms) | Total: 0.4% (81.8ms) | Samples: 68

**Called by:**
- `regExpExec` (68)

### `/.*\.(tsx\|jsx)$/iu`
`[native code]` | Self: 0.4% (70.7ms) | Total: 0.4% (70.7ms) | Samples: 60

**Called by:**
- `matchFilename` (60)

### `/(?:\/\*.*?\*\/\|--[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.4% (68.7ms) | Total: 0.4% (68.7ms) | Samples: 59

**Called by:**
- `regExpExec` (59)

### `/.*\.(vue)$/iu`
`[native code]` | Self: 0.3% (66.8ms) | Total: 0.3% (66.8ms) | Samples: 56

**Called by:**
- `matchFilename` (56)

### `raw`
`[native code]` | Self: 0.3% (64.3ms) | Total: 0.3% (64.3ms) | Samples: 53

**Called by:**
- `generateTokens` (6)
- `generate_common_tokens` (5)
- `generateTokens` (5)
- `generateTokens` (4)
- `generateTokens` (4)
- `generateTokens` (3)
- `generateTokens` (3)
- `generateTokens` (3)
- `generateTokens` (2)
- `generateTokens` (2)
- `generateTokens` (2)
- `(anonymous)` (2)
- `generateTokens` (2)
- `generateTokens` (2)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)

### `invokeCurrentState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:229` | Self: 0.3% (62.6ms) | Total: 0.3% (62.6ms) | Samples: 53

**Called by:**
- `consume` (52)
- `consume` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:72` | Self: 0.3% (61.3ms) | Total: 0.4% (77.5ms) | Samples: 51

**Called by:**
- `every` (65)

**Calls:**
- `/^\p{White_Space}$/u` (12)
- `from` (2)

### `/.*\.(pl\|pm)$/iu`
`[native code]` | Self: 0.3% (60.8ms) | Total: 0.3% (60.8ms) | Samples: 50

**Called by:**
- `matchFilename` (50)

### `map`
`[native code]` | Self: 0.3% (58.3ms) | Total: 2.3% (397.9ms) | Samples: 49

**Called by:**
- `generateTokens` (270)
- `analyzeLizardSource` (52)
- `PLSQLReader` (4)
- `generateTokens` (4)
- `withNamespace` (3)
- `generateTokens` (1)
- `(module)` (1)

**Calls:**
- `escapeRegex` (231)
- `(anonymous)` (27)
- `freeze` (19)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `/(?:\/\*.*?\*\/\|(?:u8\|u\|U\|L)?R"\((?:[^)]\|\)(?!"))*\)"\|(?:\d*\.\d+(?:[eE][-+]?\d+)?)\|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)\|(?:\?\?)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.3% (56.5ms) | Total: 0.3% (56.5ms) | Samples: 48

**Called by:**
- `regExpExec` (48)

### `/(?:\/\*.*?\*\/\|(?:\$\w+)\|(?:<{3}(?<quote>\w+).*?k<quote>)\|(?:\?\?=)\|(?:\?\?)\|(?:\?->)\|(?:\?:)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.3% (55.6ms) | Total: 0.3% (55.6ms) | Samples: 47

**Called by:**
- `regExpExec` (47)

### `every`
`[native code]` | Self: 0.3% (55.5ms) | Total: 0.8% (145.5ms) | Samples: 45

**Called by:**
- `isPythonWhitespace` (59)
- `asNestingStackAdapter` (30)
- `hasCompleteNestingStackSurface` (11)
- `replaceLabel` (9)
- `preprocess` (4)
- `preprocess` (2)
- `preprocess` (2)
- `withoutWhitespace` (1)
- `_soft_keyword_lookahead` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (65)
- `(anonymous)` (6)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!!\|\?\?\|\?:\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 0.3% (54.4ms) | Total: 0.3% (54.4ms) | Samples: 45

**Called by:**
- `regExpExec` (45)

### `/(?:\/\*.*?\*\/\|\.\.\|->\|<@\|@>\|@lazy\|@fuzzy\|@index\|@deterministic\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.3% (51.3ms) | Total: 0.3% (51.3ms) | Samples: 42

**Called by:**
- `regExpExec` (42)

### ``/(?:\/\*.*?\*\/\|(?:<[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:<\/[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*>)\|(?:#\w+)\|(?:\$\w+)\|(?:<\/\w+>)\|(?:=>)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 0.2% (47.3ms) | Total: 0.2% (47.3ms) | Samples: 40

**Called by:**
- `regExpExec` (40)

### `/(?:\/\*.*?\*\/\|#[^\n]*\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.2% (46.9ms) | Total: 0.2% (46.9ms) | Samples: 39

**Called by:**
- `regExpExec` (39)

### `get flags`
`[native code]` | Self: 0.2% (46.8ms) | Total: 0.2% (50.2ms) | Samples: 39

**Called by:**
- `matchAll` (42)

**Calls:**
- `get sticky` (1)
- `get unicodeSets` (1)
- `get unicode` (1)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1118` | Self: 0.2% (45.5ms) | Total: 51.3% (8.63s) | Samples: 38

**Called by:**
- `analyzeLizardSource` (7180)

**Calls:**
- `next` (7096)
- `generatorResume` (27)
- `__call__` (16)
- `__call__` (2)
- `__call__` (1)

### `/(?:\/\*.*?\*\/\|(?:'\w+\b)\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.2% (44.2ms) | Total: 0.2% (44.2ms) | Samples: 38

**Called by:**
- `regExpExec` (38)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:11` | Self: 0.2% (43.4ms) | Total: 0.2% (43.4ms) | Samples: 36

**Called by:**
- `JavaStates` (36)

### ``/(?:\/\*.*?\*\/\|(?:<\/?\w+.*?>)\|(?:#\w+)\|(?:\$\w+)\|(?:\w+\?)\|`.*?`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 0.2% (42.4ms) | Total: 0.2% (42.4ms) | Samples: 36

**Called by:**
- `regExpExec` (36)

### `/(?:\/\*.*?\*\/\|#[^\n]*\|<-\|->\|%[a-zA-Z_*/>]+%\|\.\.\.\|:::\|::\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.2% (41.2ms) | Total: 0.2% (41.2ms) | Samples: 35

**Called by:**
- `regExpExec` (35)

### `isPythonWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:70` | Self: 0.2% (38.9ms) | Total: 4.0% (685.3ms) | Samples: 33

**Called by:**
- `withoutWhitespace` (202)
- `preprocess` (102)
- `preprocess` (44)
- `(anonymous)` (30)
- `preprocess` (26)
- `_soft_keyword_lookahead` (25)
- `preprocess` (24)
- `consumeErlangWhitespace` (21)
- `preprocess` (20)
- `_function_body` (15)
- `process_token` (12)
- `preprocess` (12)
- `preprocess` (7)
- `_state_global` (4)
- `_parameters` (3)
- `_function_name` (1)
- `_state_function_dec` (1)

**Calls:**
- `from` (457)
- `every` (59)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:11` | Self: 0.2% (38.8ms) | Total: 0.2% (38.8ms) | Samples: 33

**Called by:**
- `RubylikeStateMachine` (33)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1060` | Self: 0.2% (38.4ms) | Total: 1.3% (223.8ms) | Samples: 32

**Called by:**
- `generatorResume` (186)

**Calls:**
- `stringSplitFast` (154)

### ``/(?:\/\*.*?\*\/\|`[^`]*`\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 0.2% (36.6ms) | Total: 0.2% (36.6ms) | Samples: 30

**Called by:**
- `regExpExec` (30)

### ``/(?:\/\*.*?\*\/\|`\w+`\|\w+\?\|\w+!\|\?\?\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu``
`[native code]` | Self: 0.2% (34.6ms) | Total: 0.2% (34.6ms) | Samples: 30

**Called by:**
- `regExpExec` (30)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1018` | Self: 0.1% (32.2ms) | Total: 0.4% (67.7ms) | Samples: 28

**Called by:**
- `generatorResume` (57)

**Calls:**
- `get_comment_from_token` (3)
- `get_comment_from_token` (3)
- `get_comment_from_token` (3)
- `get_comment_from_token` (2)
- `get_comment_from_token` (2)
- `get_comment_from_token` (2)
- `getCommentFromToken` (2)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)

### `operation`
`/tmp/vibe-lizard-harness-only.ts:9` | Self: 0.1% (31.7ms) | Total: 99.7% (16.79s) | Samples: 26

**Called by:**
- `(module)` (13978)

**Calls:**
- `analyzeLizardSource` (8091)
- `analyzeLizardSource` (5749)
- `analyzeLizardSource` (52)
- `analyzeLizardSource` (48)
- `freeze` (12)

### `/(?:\/\*.*?\*\/\|#[^\n]*\|--\[\[.*?\]\]\|\[=*\[.*?\]=*\]\|--.*?$\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gmsu`
`[native code]` | Self: 0.1% (31.4ms) | Total: 0.1% (31.4ms) | Samples: 26

**Called by:**
- `regExpExec` (26)

### `/.*\.(st)$/iu`
`[native code]` | Self: 0.1% (30.5ms) | Total: 0.1% (30.5ms) | Samples: 25

**Called by:**
- `matchFilename` (25)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.1% (30.3ms) | Total: 0.1% (30.3ms) | Samples: 24

**Called by:**
- `from` (24)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1081` | Self: 0.1% (29.8ms) | Total: 0.1% (29.8ms) | Samples: 25

**Called by:**
- `generatorResume` (25)

### `preprocessing`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1012` | Self: 0.1% (26.8ms) | Total: 0.2% (41.3ms) | Samples: 22

**Called by:**
- `applyProcessor` (32)
- `analyzeSourceCode` (1)

**Calls:**
- `preprocess` (3)
- `preprocess` (2)
- `preprocess` (2)
- `preprocess` (1)
- `preprocess` (1)
- `preprocess` (1)
- `withoutWhitespace` (1)

### `/.*\.(r\|R)$/iu`
`[native code]` | Self: 0.1% (26.4ms) | Total: 0.1% (26.4ms) | Samples: 22

**Called by:**
- `matchFilename` (22)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1117` | Self: 0.1% (24.4ms) | Total: 0.5% (91.8ms) | Samples: 21

**Called by:**
- `analyzeLizardSource` (75)

**Calls:**
- `applyProcessor` (46)
- `applyProcessor` (4)
- `applyProcessor` (3)
- `preprocessing` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:279` | Self: 0.1% (24.3ms) | Total: 0.1% (26.7ms) | Samples: 21

**Called by:**
- `flatIntoArrayWithCallback` (23)

**Calls:**
- `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u` (2)

### `replaceLabel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:30` | Self: 0.1% (23.9ms) | Total: 0.1% (23.9ms) | Samples: 20

**Called by:**
- `preprocess` (11)
- `preprocess` (9)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:150` | Self: 0.1% (23.6ms) | Total: 0.1% (23.6ms) | Samples: 19

**Called by:**
- `invokeCurrentState` (19)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1113` | Self: 0.1% (23.3ms) | Total: 5.2% (884.1ms) | Samples: 20

**Called by:**
- `analyzeLizardSource` (726)

**Calls:**
- `JavaReader` (47)
- `TTCNReader` (36)
- `CSharpReader` (29)
- `TTCNReader` (28)
- `JavaReader` (28)
- `ObjCReader` (28)
- `CSharpReader` (22)
- `GDScriptReader` (22)
- `ObjCReader` (20)
- `TSXReader` (20)
- `JavaScriptReader` (19)
- `RubyReader` (18)
- `StReader` (17)
- `VueReader` (17)
- `KotlinReader` (16)
- `RustReader` (16)
- `LuaReader` (15)
- `PerlReader` (15)
- `SolidityReader` (13)
- `PerlReader` (12)
- `GDScriptReader` (12)
- `PHPReader` (12)
- `FortranReader` (11)
- `CLikeReader` (11)
- `ErlangReader` (11)
- `PLSQLReader` (11)
- `ZigReader` (10)
- `ScalaReader` (10)
- `RustReader` (10)
- `FortranReader` (10)
- `PHPReader` (9)
- `RReader` (9)
- `TypeScriptReader` (9)
- `RReader` (9)
- `CLikeReader` (8)
- `GoReader` (8)
- `SwiftReader` (8)
- `PythonReader` (8)
- `CLikeReader` (8)
- `ScalaReader` (8)
- `KotlinReader` (8)
- `GoReader` (8)
- `SwiftReader` (7)
- `TypeScriptReader` (7)
- `PythonReader` (6)
- `LuaReader` (6)
- `PLSQLReader` (5)
- `ZigReader` (5)
- `PLSQLReader` (5)
- `StReader` (5)
- `SolidityReader` (3)
- `ErlangReader` (3)
- `CLikeReader` (2)
- `KotlinReader` (1)
- `ErlangReader` (1)
- `SwiftReader` (1)
- `PLSQLReader` (1)
- `SwiftReader` (1)
- `TSXReader` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:66` | Self: 0.1% (22.4ms) | Total: 0.1% (22.4ms) | Samples: 18

**Called by:**
- `PythonStates` (17)
- `PythonReader` (1)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:292` | Self: 0.1% (22.4ms) | Total: 0.1% (22.4ms) | Samples: 20

**Called by:**
- `_state_dec` (10)
- `_function_params` (4)
- `_function_dec` (4)
- `_state_imp` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:556` | Self: 0.1% (21.6ms) | Total: 0.1% (28.6ms) | Samples: 17

**Called by:**
- `generatorResume` (23)

**Calls:**
- `raw` (6)

### `statemachine_clone`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:177` | Self: 0.1% (20.9ms) | Total: 1.7% (293.0ms) | Samples: 17

**Called by:**
- `cloneState` (238)
- `_function_impl` (1)

**Calls:**
- `TypeScriptStates` (73)
- `SwiftStates` (22)
- `GoStates` (21)
- `SolidityStates` (19)
- `KotlinStates` (18)
- `RubylikeStateMachine` (18)
- `RustStates` (17)
- `ScalaStates` (12)
- `LuaStateMachine` (9)
- `ZigStates` (8)
- `RubylikeStateMachine` (2)
- `TypeScriptStates` (2)
- `LuaStateMachine` (1)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:300` | Self: 0.1% (20.7ms) | Total: 0.1% (22.1ms) | Samples: 17

**Called by:**
- `addParameter` (10)
- `addToLongFunctionName` (8)

**Calls:**
- `/^\p{L}$/u` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.1% (20.6ms) | Total: 0.1% (20.6ms) | Samples: 16

**Called by:**
- `PythonReader` (5)
- `GoReader` (2)
- `FortranReader` (2)
- `ScalaReader` (1)
- `SwiftReader` (1)
- `RustReader` (1)
- `CLikeReader` (1)
- `PerlReader` (1)
- `StReader` (1)
- `PHPReader` (1)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:214` | Self: 0.1% (20.5ms) | Total: 12.9% (2.18s) | Samples: 17

**Called by:**
- `process` (1096)
- `invokeCurrentState` (314)
- `next` (129)
- `consume` (78)
- `__call__` (43)
- `_state_dec_to_imp` (23)
- `_expecting_func_opening_bracket` (20)
- `_expect_function_impl` (15)
- `_state_entering_imp` (14)
- `_def_continue` (9)
- `_state_end_of_params` (8)
- `_expect_function_impl` (8)
- `_state_function` (7)
- `(anonymous)` (6)
- `_function` (5)
- `_state_function` (5)
- `_state_objc_dec` (4)
- `_state_global` (4)
- `_state_imp` (4)
- `_state_class_declaration` (4)
- `_state_function` (3)
- `func_match_failed` (3)
- `_function_after_name` (2)
- `_state_global` (2)
- `_expect_function_dec` (1)

**Calls:**
- `invokeCurrentState` (1316)
- `invokeCurrentState` (336)
- `consume` (78)
- `invokeCurrentState` (52)
- `consume` (6)
- `consume` (2)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1114` | Self: 0.1% (19.9ms) | Total: 0.3% (60.5ms) | Samples: 17

**Called by:**
- `analyzeLizardSource` (50)

**Calls:**
- `generateTokens` (4)
- `generateTokens` (3)
- `generateTokens` (3)
- `generateTokens` (3)
- `generateTokens` (2)
- `generateTokens` (2)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generate_common_tokens` (1)
- `generateTokensWithRegex` (1)
- `generateTokens` (1)
- `generateTokens` (1)
- `generateTokensWithRegex` (1)
- `generate_common_tokens` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:398` | Self: 0.1% (19.6ms) | Total: 0.1% (19.6ms) | Samples: 17

**Called by:**
- `CLikeReader` (5)
- `RubylikeReader` (2)
- `ZigReader` (2)
- `KotlinReader` (1)
- `PHPReader` (1)
- `RReader` (1)
- `RustReader` (1)
- `PerlReader` (1)
- `StReader` (1)
- `PythonReader` (1)
- `TypeScriptReader` (1)

### `anonymous`
`[native code]` | Self: 0.1% (18.9ms) | Total: 0.2% (40.4ms) | Samples: 6

**Called by:**
- `get ReadStream` (4)
- `node:stream` (3)
- `internal:stream` (3)
- `node:fs` (3)
- `internal:fs/streams` (3)
- `internal:streams/operators` (2)
- `internal:streams/pipeline` (1)
- `internal:validators` (1)
- `internal:streams/compose` (1)
- `internal:streams/duplex` (1)
- `internal:streams/end-of-stream` (1)
- `internal:shared` (1)
- `node:events` (1)

**Calls:**
- `node:stream` (3)
- `internal:stream` (3)
- `internal:fs/streams` (3)
- `internal:streams/operators` (2)
- `internal:streams/pipeline` (1)
- `internal:validators` (1)
- `internal:streams/compose` (1)
- `internal:streams/duplex` (1)
- `internal:primordials` (1)
- `internal:streams/end-of-stream` (1)
- `internal:shared` (1)
- `node:events` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:590` | Self: 0.1% (18.5ms) | Total: 0.1% (18.5ms) | Samples: 16

**Called by:**
- `analyzeSourceCode` (16)

### `[Symbol.matchAll]`
`[native code]` | Self: 0.1% (18.1ms) | Total: 0.1% (18.1ms) | Samples: 15

**Called by:**
- `tokenizerFlags` (12)
- `generateTokens` (3)

### `globalState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:112` | Self: 0.1% (17.6ms) | Total: 0.1% (17.6ms) | Samples: 15

**Called by:**
- `invokeCurrentState` (15)

### `GoLikeStates`
`[native code]` | Self: 0.0% (16.2ms) | Total: 1.2% (204.3ms) | Samples: 13

**Called by:**
- `KotlinStates` (30)
- `SolidityStates` (29)
- `RustStates` (25)
- `SwiftStates` (24)
- `GoStates` (23)
- `ScalaStates` (19)
- `ZigStates` (12)

**Calls:**
- `(anonymous)` (126)
- `CodeStateMachine` (21)
- `CodeStateMachine` (2)

### `normalizePythonRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:676` | Self: 0.0% (15.2ms) | Total: 0.1% (24.5ms) | Samples: 12

**Called by:**
- `tokenizerFlags` (20)

**Calls:**
- `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu` (8)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:602` | Self: 0.0% (15.2ms) | Total: 9.2% (1.55s) | Samples: 12

**Called by:**
- `generatorResume` (1287)

**Calls:**
- `consume` (1096)
- `consume` (83)
- `consume` (66)
- `consume` (15)
- `consume` (12)
- `consume` (2)
- `consume` (1)

### `FunctionInfo`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 13

**Called by:**
- `FileInfoBuilder` (7)
- `tryNewFunction` (3)
- `ErlangReader` (1)
- `GoReader` (1)
- `JavaReader` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:141` | Self: 0.0% (14.4ms) | Total: 0.0% (14.4ms) | Samples: 11

**Called by:**
- `FunctionInfo` (11)

### `/^\p{White_Space}$/u`
`[native code]` | Self: 0.0% (13.9ms) | Total: 0.0% (13.9ms) | Samples: 12

**Called by:**
- `(anonymous)` (12)

### `asNestingStackAdapter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:731` | Self: 0.0% (13.6ms) | Total: 0.4% (77.1ms) | Samples: 11

**Called by:**
- `nestingStackAdapter` (56)
- `get nestingStackAdapter` (4)
- `startNewFunctionNesting` (1)
- `withNamespace` (1)

**Calls:**
- `every` (30)
- `hasCompleteNestingStackSurface` (19)
- `hasCompleteNestingStackSurface` (2)

### `/\(\?[aiLmsux]+\)/gu`
`[native code]` | Self: 0.0% (13.4ms) | Total: 0.0% (13.4ms) | Samples: 11

**Called by:**
- `regExpExec` (6)
- `tokenizerFlags` (5)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:23` | Self: 0.0% (13.1ms) | Total: 0.0% (13.1ms) | Samples: 11

**Called by:**
- `get_comment_from_token` (3)
- `get_comment_from_token` (2)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)

### `WeakMap`
`[native code]` | Self: 0.0% (13.1ms) | Total: 0.0% (13.1ms) | Samples: 11

**Called by:**
- `(anonymous)` (11)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:168` | Self: 0.0% (12.8ms) | Total: 0.0% (12.8ms) | Samples: 11

**Called by:**
- `invokeCurrentState` (11)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:74` | Self: 0.0% (12.6ms) | Total: 0.1% (18.0ms) | Samples: 11

**Called by:**
- `generatorResume` (15)

**Calls:**
- `/^#\s*(\w+)\s*(.*)/msu` (4)

### `replaceLabel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:29` | Self: 0.0% (12.2ms) | Total: 0.1% (22.5ms) | Samples: 10

**Called by:**
- `preprocess` (12)
- `preprocess` (7)

**Calls:**
- `every` (9)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:11` | Self: 0.0% (12.2ms) | Total: 0.0% (12.2ms) | Samples: 10

**Called by:**
- `PHPLanguageStates` (10)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:503` | Self: 0.0% (12.2ms) | Total: 1.2% (214.2ms) | Samples: 10

**Called by:**
- `generatorResume` (179)

**Calls:**
- `tokenizerFlags` (94)
- `tokenizerFlags` (32)
- `tokenizerFlags` (23)
- `tokenizerFlags` (19)
- `tokenizerFlags` (1)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1017` | Self: 0.0% (12.0ms) | Total: 37.6% (6.34s) | Samples: 9

**Called by:**
- `generatorResume` (5278)

**Calls:**
- `next` (5215)
- `generatorResume` (54)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:501` | Self: 0.0% (11.3ms) | Total: 0.0% (11.3ms) | Samples: 9

**Called by:**
- `analyzeSourceCode` (4)
- `generateTokens` (3)
- `generateTokens` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:332` | Self: 0.0% (11.1ms) | Total: 0.0% (11.1ms) | Samples: 10

**Called by:**
- `invokeCurrentState` (10)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:769` | Self: 0.0% (10.9ms) | Total: 0.0% (10.9ms) | Samples: 8

**Called by:**
- `FileInfoBuilder` (8)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (10.7ms) | Total: 0.0% (10.7ms) | Samples: 9

**Called by:**
- `analyzeSourceCode` (9)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (10.4ms) | Total: 0.0% (10.4ms) | Samples: 9

**Called by:**
- `generatorResume` (8)
- `analyzeSourceCode` (1)

### `addParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:311` | Self: 0.0% (10.4ms) | Total: 0.8% (140.4ms) | Samples: 9

**Called by:**
- `parameter` (114)

**Calls:**
- `addToLongName` (54)
- `addToLongName` (40)
- `addToLongName` (10)
- `addToLongName` (1)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:220` | Self: 0.0% (10.2ms) | Total: 0.1% (24.8ms) | Samples: 9

**Called by:**
- `process` (12)
- `invokeCurrentState` (6)
- `consume` (2)
- `__call__` (1)

**Calls:**
- `(anonymous)` (7)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `_pop_function_from_stack` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:334` | Self: 0.0% (10.1ms) | Total: 0.0% (10.1ms) | Samples: 9

**Called by:**
- `invokeCurrentState` (9)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:509` | Self: 0.0% (9.7ms) | Total: 0.0% (9.7ms) | Samples: 8

**Called by:**
- `generatorResume` (8)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:397` | Self: 0.0% (9.7ms) | Total: 0.0% (9.7ms) | Samples: 8

**Called by:**
- `RubylikeReader` (2)
- `RustReader` (2)
- `PLSQLReader` (1)
- `CLikeReader` (1)
- `PerlReader` (1)
- `ZigReader` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:175` | Self: 0.0% (9.6ms) | Total: 0.0% (9.6ms) | Samples: 8

**Called by:**
- `invokeCurrentState` (7)
- `(anonymous)` (1)

### `hasCompleteNestingStackSurface`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` | Self: 0.0% (9.6ms) | Total: 0.1% (23.5ms) | Samples: 8

**Called by:**
- `asNestingStackAdapter` (19)

**Calls:**
- `every` (11)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:298` | Self: 0.0% (9.6ms) | Total: 0.7% (134.5ms) | Samples: 9

**Called by:**
- `addToLongFunctionName` (57)
- `addParameter` (54)

**Calls:**
- `from` (102)

### `matchAt`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:239` | Self: 0.0% (9.5ms) | Total: 0.0% (11.9ms) | Samples: 8

**Called by:**
- `generatePygmentsCompatibleErlangTokenValues` (4)
- `generatePygmentsCompatibleErlangTokenValues` (2)
- `generatePygmentsCompatibleErlangTokenValues` (2)
- `consumeErlangAtom` (2)

**Calls:**
- `/(?:[2-9]\|[12][0-9]\|3[0-6])#[0-9A-Za-z]+/uy` (1)
- `/[a-z][\p{L}\p{N}_]*/uy` (1)

### `/\\([^\\^$.*+?()[\]{}\|/bBdDsSwWpPxucfnrtv0-9])/gu`
`[native code]` | Self: 0.0% (9.2ms) | Total: 0.0% (9.2ms) | Samples: 8

**Called by:**
- `normalizePythonRegex` (8)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:10` | Self: 0.0% (9.1ms) | Total: 0.0% (9.1ms) | Samples: 7

**Called by:**
- `RStates` (7)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (9.0ms) | Total: 0.0% (9.0ms) | Samples: 7

**Called by:**
- `generatorResume` (7)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:770` | Self: 0.0% (8.8ms) | Total: 0.1% (22.0ms) | Samples: 8

**Called by:**
- `FileInfoBuilder` (19)

**Calls:**
- `WeakMap` (11)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (8.8ms) | Total: 0.0% (8.8ms) | Samples: 7

**Called by:**
- `generatorResume` (7)

### `esSpecIsRegExp`
`[native code]` | Self: 0.0% (8.5ms) | Total: 0.0% (8.5ms) | Samples: 7

**Called by:**
- `matchAll` (7)

### `CLikeNestingStackStates`
`[native code]` | Self: 0.0% (8.5ms) | Total: 0.2% (47.0ms) | Samples: 7

**Called by:**
- `CLikeReader` (15)
- `JavaReader` (9)
- `TTCNReader` (8)
- `CSharpReader` (5)
- `ObjCReader` (2)

**Calls:**
- `(anonymous)` (28)
- `CodeStateMachine` (4)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:26` | Self: 0.0% (8.5ms) | Total: 0.0% (9.7ms) | Samples: 7

**Called by:**
- `invokeCurrentState` (6)
- `_state_global` (1)
- `_state_global` (1)

**Calls:**
- `getFunctionKeyword` (1)

### `PLSQLReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:33` | Self: 0.0% (8.4ms) | Total: 0.0% (13.2ms) | Samples: 7

**Called by:**
- `analyzeSourceCode` (11)

**Calls:**
- `map` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:14` | Self: 0.0% (8.4ms) | Total: 0.0% (8.4ms) | Samples: 7

**Called by:**
- `PerlStates` (7)

### `/[\|\\{}()[\]^$+*?.]/gu`
`[native code]` | Self: 0.0% (8.3ms) | Total: 0.0% (8.3ms) | Samples: 7

**Called by:**
- `escapeRegex` (7)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:642` | Self: 0.0% (8.3ms) | Total: 0.2% (39.5ms) | Samples: 7

**Called by:**
- `generateTokens` (32)

**Calls:**
- `normalizePythonRegex` (20)
- `/\(\?[aiLmsux]+\)/gu` (5)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:18` | Self: 0.0% (8.1ms) | Total: 0.0% (8.1ms) | Samples: 7

**Called by:**
- `FortranStates` (7)

### `invokeCurrentState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:230` | Self: 0.0% (8.0ms) | Total: 2.4% (407.1ms) | Samples: 7

**Called by:**
- `consume` (336)
- `consume` (1)

**Calls:**
- `consume` (314)
- `consume` (9)
- `consume` (6)
- `consume` (1)

### `(module)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:212` | Self: 0.0% (8.0ms) | Total: 0.0% (8.0ms) | Samples: 1

### `fromCodePoint`
`[native code]` | Self: 0.0% (7.9ms) | Total: 0.0% (7.9ms) | Samples: 5

**Called by:**
- `consumeErlangWhitespace` (5)

### `get_reader_for`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:80` | Self: 0.0% (7.8ms) | Total: 0.0% (9.0ms) | Samples: 7

**Called by:**
- `analyzeLizardSource` (8)

**Calls:**
- `languages` (1)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:481` | Self: 0.0% (7.5ms) | Total: 0.0% (7.5ms) | Samples: 6

**Called by:**
- `CodeReader` (6)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (7.4ms) | Total: 0.0% (7.4ms) | Samples: 6

**Called by:**
- `every` (6)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:146` | Self: 0.0% (7.4ms) | Total: 0.0% (7.4ms) | Samples: 7

**Called by:**
- `invokeCurrentState` (7)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:134` | Self: 0.0% (7.3ms) | Total: 0.0% (7.3ms) | Samples: 6

**Called by:**
- `invokeCurrentState` (6)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (7.3ms) | Total: 0.0% (7.3ms) | Samples: 6

**Called by:**
- `generatorResume` (6)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` | Self: 0.0% (7.3ms) | Total: 0.0% (7.3ms) | Samples: 6

**Called by:**
- `generatorResume` (6)

### `GoStates`
`[native code]` | Self: 0.0% (7.2ms) | Total: 0.2% (35.7ms) | Samples: 6

**Called by:**
- `statemachine_clone` (21)
- `GoReader` (8)

**Calls:**
- `GoLikeStates` (23)

### `next`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:181` | Self: 0.0% (7.2ms) | Total: 0.0% (7.2ms) | Samples: 6

**Called by:**
- `readInsideBracketsThen` (2)
- `_function_params` (1)
- `consume` (1)
- `_state_nested_call` (1)
- `subState` (1)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1048` | Self: 0.0% (7.1ms) | Total: 0.0% (7.1ms) | Samples: 5

**Called by:**
- `applyProcessor` (5)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:571` | Self: 0.0% (7.0ms) | Total: 0.0% (7.0ms) | Samples: 6

**Called by:**
- `generatorResume` (5)
- `preprocess` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:401` | Self: 0.0% (6.9ms) | Total: 0.1% (31.3ms) | Samples: 6

**Called by:**
- `CLikeReader` (5)
- `TypeScriptReader` (5)
- `RReader` (2)
- `SwiftReader` (2)
- `StReader` (2)
- `PythonReader` (2)
- `KotlinReader` (2)
- `ErlangReader` (1)
- `RubylikeReader` (1)
- `ScalaReader` (1)
- `SolidityReader` (1)
- `ZigReader` (1)

**Calls:**
- `Set` (19)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:400` | Self: 0.0% (6.8ms) | Total: 0.7% (133.6ms) | Samples: 6

**Called by:**
- `CLikeReader` (25)
- `TypeScriptReader` (14)
- `PythonReader` (12)
- `PerlReader` (9)
- `StReader` (8)
- `RubylikeReader` (8)
- `RustReader` (7)
- `ErlangReader` (5)
- `PHPReader` (4)
- `GoReader` (3)
- `RReader` (3)
- `ScalaReader` (3)
- `SwiftReader` (2)
- `ZigReader` (2)
- `PLSQLReader` (2)
- `FortranReader` (2)
- `SolidityReader` (1)
- `KotlinReader` (1)

**Calls:**
- `buildConditions` (64)
- `Set` (27)
- `buildConditions` (6)
- `buildConditions` (3)
- `buildConditions` (2)
- `buildConditions` (2)
- `buildConditions` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:138` | Self: 0.0% (6.5ms) | Total: 0.0% (6.5ms) | Samples: 5

**Called by:**
- `find` (5)

### `FunctionInfo`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:144` | Self: 0.0% (6.2ms) | Total: 0.1% (23.0ms) | Samples: 5

**Called by:**
- `tryNewFunction` (13)
- `FileInfoBuilder` (5)

**Calls:**
- `(anonymous)` (11)
- `Nesting` (2)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1507` | Self: 0.0% (6.1ms) | Total: 8.5% (1.43s) | Samples: 5

**Called by:**
- `generatorResume` (1194)

**Calls:**
- `next` (1163)
- `generatorResume` (26)

### `readDeclarationToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (6.1ms) | Total: 0.0% (6.1ms) | Samples: 5

**Called by:**
- `readInsideBracketsThen` (5)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:132` | Self: 0.0% (6.1ms) | Total: 0.0% (6.1ms) | Samples: 5

**Called by:**
- `process_token` (5)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:113` | Self: 0.0% (6.1ms) | Total: 0.4% (68.2ms) | Samples: 5

**Called by:**
- `readInsideBracketsThen` (57)

**Calls:**
- `parameter` (52)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:396` | Self: 0.0% (6.0ms) | Total: 0.3% (58.9ms) | Samples: 5

**Called by:**
- `TypeScriptReader` (12)
- `CLikeReader` (11)
- `RubylikeReader` (5)
- `KotlinReader` (4)
- `PHPReader` (3)
- `ZigReader` (3)
- `ErlangReader` (2)
- `RustReader` (2)
- `PLSQLReader` (2)
- `PerlReader` (2)
- `RReader` (1)
- `FortranReader` (1)
- `StReader` (1)
- `ScalaReader` (1)

**Calls:**
- `(anonymous)` (45)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (5.9ms) | Total: 0.0% (5.9ms) | Samples: 5

**Called by:**
- `_function_dec` (3)
- `_state_global` (1)
- `_state_dec` (1)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:296` | Self: 0.0% (5.9ms) | Total: 0.9% (160.0ms) | Samples: 5

**Called by:**
- `_function_dec` (57)
- `_state_dec` (52)
- `_state_global` (8)
- `stateInsideBraces` (6)
- `_function_params` (4)
- `_state_imp` (4)
- `_if_cond` (1)

**Calls:**
- `(anonymous)` (57)
- `readDeclarationToken` (24)
- `readDeclarationToken` (18)
- `stateInsideBraces` (7)
- `readDeclarationToken` (5)
- `(anonymous)` (4)
- `stateFunctionBody` (4)
- `finishImplementation` (3)
- `readDeclarationToken` (2)
- `stateFunctionBody` (2)
- `finishImplementation` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:98` | Self: 0.0% (5.8ms) | Total: 0.0% (5.8ms) | Samples: 5

**Called by:**
- `invokeCurrentState` (5)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:30` | Self: 0.0% (5.8ms) | Total: 4.6% (774.7ms) | Samples: 5

**Called by:**
- `generatorResume` (647)

**Calls:**
- `from` (639)
- `(anonymous)` (1)
- `rubyTokens` (1)
- `(anonymous)` (1)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:36` | Self: 0.0% (5.7ms) | Total: 0.0% (5.7ms) | Samples: 5

**Called by:**
- `generatorResume` (5)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:64` | Self: 0.0% (5.7ms) | Total: 0.0% (5.7ms) | Samples: 5

**Called by:**
- `invokeCurrentState` (5)

### `_expand_fstring_interpolations`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:150` | Self: 0.0% (5.6ms) | Total: 0.0% (5.6ms) | Samples: 5

**Called by:**
- `generatorResume` (5)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:68` | Self: 0.0% (5.6ms) | Total: 0.0% (5.6ms) | Samples: 5

**Called by:**
- `generatorResume` (5)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:40` | Self: 0.0% (5.6ms) | Total: 0.0% (5.6ms) | Samples: 5

**Called by:**
- `__call__` (5)

### `_state_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:272` | Self: 0.0% (5.5ms) | Total: 0.0% (5.5ms) | Samples: 5

**Called by:**
- `invokeCurrentState` (5)

### `commentCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1016` | Self: 0.0% (5.3ms) | Total: 0.0% (5.3ms) | Samples: 5

**Called by:**
- `applyProcessor` (5)

### `/^#\s*(\w+)\s*(.*)/msu`
`[native code]` | Self: 0.0% (5.3ms) | Total: 0.0% (5.3ms) | Samples: 4

**Called by:**
- `preprocess` (4)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:145` | Self: 0.0% (5.1ms) | Total: 0.0% (5.1ms) | Samples: 4

**Called by:**
- `(anonymous)` (2)
- `invokeCurrentState` (2)

### `stateFunctionBody`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` | Self: 0.0% (5.1ms) | Total: 0.0% (5.1ms) | Samples: 4

**Called by:**
- `readInsideBracketsThen` (4)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:35` | Self: 0.0% (5.0ms) | Total: 0.0% (5.0ms) | Samples: 4

**Called by:**
- `invokeCurrentState` (3)
- `_state_global` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:107` | Self: 0.0% (5.0ms) | Total: 0.0% (5.0ms) | Samples: 4

**Called by:**
- `(anonymous)` (4)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` | Self: 0.0% (5.0ms) | Total: 0.0% (5.0ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:293` | Self: 0.0% (5.0ms) | Total: 0.0% (5.0ms) | Samples: 4

**Called by:**
- `_state_imp` (3)
- `_state_dec` (1)

### `applyProcessor`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (5.0ms) | Total: 0.0% (5.0ms) | Samples: 4

**Called by:**
- `analyzeSourceCode` (4)

### `get nestingStackAdapter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (4.8ms) | Total: 0.0% (4.8ms) | Samples: 4

**Called by:**
- `withNamespace` (3)
- `startNewFunctionNesting` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:40` | Self: 0.0% (4.8ms) | Total: 0.0% (5.8ms) | Samples: 4

**Called by:**
- `generatorResume` (5)

**Calls:**
- `/^\p{L}+$/u` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (4.8ms) | Total: 0.0% (4.8ms) | Samples: 4

**Called by:**
- `preprocessing` (2)
- `generatorResume` (2)

### `tokenCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (4.7ms) | Total: 0.0% (4.7ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:596` | Self: 0.0% (4.7ms) | Total: 0.1% (25.0ms) | Samples: 4

**Called by:**
- `generatorResume` (20)

**Calls:**
- `process_token` (13)
- `process_token` (1)
- `process_token` (1)
- `process_token` (1)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:636` | Self: 0.0% (4.7ms) | Total: 0.6% (112.1ms) | Samples: 4

**Called by:**
- `generateTokens` (94)

**Calls:**
- `from` (42)
- `matchAll` (33)
- `[Symbol.matchAll]` (12)
- `flatMap` (3)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts` | Self: 0.0% (4.7ms) | Total: 0.0% (4.7ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:87` | Self: 0.0% (4.6ms) | Total: 0.0% (4.6ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:15` | Self: 0.0% (4.6ms) | Total: 0.0% (4.6ms) | Samples: 4

**Called by:**
- `SwiftStates` (4)

### `finishPoppedNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:908` | Self: 0.0% (4.6ms) | Total: 0.0% (8.4ms) | Samples: 4

**Called by:**
- `popNesting` (7)

**Calls:**
- `nestingStackAdapter` (2)
- `get lastFunction` (1)

### `filter`
`[native code]` | Self: 0.0% (4.5ms) | Total: 0.2% (42.2ms) | Samples: 4

**Called by:**
- `preprocess` (35)

**Calls:**
- `(anonymous)` (31)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:248` | Self: 0.0% (4.5ms) | Total: 0.0% (4.5ms) | Samples: 3

**Called by:**
- `preprocessing` (3)

### `startNewFunctionNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:855` | Self: 0.0% (4.5ms) | Total: 0.1% (22.1ms) | Samples: 4

**Called by:**
- `confirmNewFunction` (18)

**Calls:**
- `nestingStackAdapter` (9)
- `get nestingStackAdapter` (2)
- `asNestingStackAdapter` (1)
- `startNewFunctionNesting` (1)
- `get nestingStackAdapter` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:555` | Self: 0.0% (4.4ms) | Total: 0.0% (4.4ms) | Samples: 4

**Called by:**
- `generatorResume` (4)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:404` | Self: 0.0% (4.4ms) | Total: 0.1% (17.7ms) | Samples: 4

**Called by:**
- `TypeScriptReader` (7)
- `CLikeReader` (4)
- `SolidityReader` (1)
- `FortranReader` (1)
- `RustReader` (1)
- `ZigReader` (1)

**Calls:**
- `Set` (11)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:12` | Self: 0.0% (4.3ms) | Total: 0.0% (4.3ms) | Samples: 4

**Called by:**
- `ErlangStates` (4)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:92` | Self: 0.0% (4.0ms) | Total: 0.0% (4.0ms) | Samples: 3

**Called by:**
- `commentCounter` (3)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:50` | Self: 0.0% (3.9ms) | Total: 0.0% (6.1ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `_state_dec_to_imp` (1)
- `_state_dec_to_imp` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:9` | Self: 0.0% (3.9ms) | Total: 0.0% (3.9ms) | Samples: 3

**Called by:**
- `ScalaStates` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:10` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `KotlinStates` (3)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:36` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:37` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:11` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `PLSQLStates` (3)

### `_state_simple_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:559` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:639` | Self: 0.0% (3.8ms) | Total: 0.1% (22.7ms) | Samples: 3

**Called by:**
- `generateTokens` (19)

**Calls:**
- `Set` (16)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:772` | Self: 0.0% (3.7ms) | Total: 0.2% (36.7ms) | Samples: 3

**Called by:**
- `analyzeSourceCode` (30)

**Calls:**
- `(anonymous)` (19)
- `(anonymous)` (8)

### `parameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:988` | Self: 0.0% (3.7ms) | Total: 0.8% (144.1ms) | Samples: 3

**Called by:**
- `(anonymous)` (52)
- `readDeclarationToken` (24)
- `_parameters` (15)
- `_dec` (7)
- `_def_parameters` (5)
- `(anonymous)` (3)
- `_function_args_continue` (3)
- `_dec` (3)
- `_read_params` (3)
- `_state_start_of_params` (2)

**Calls:**
- `addParameter` (114)

### `applyProcessor`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1494` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `analyzeSourceCode` (3)

### `finishImplementation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `readInsideBracketsThen` (3)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:472` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1079` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `applyProcessor` (3)

### `stringIncludesInternal`
`[native code]` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `matchAll` (3)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:52` | Self: 0.0% (3.6ms) | Total: 0.0% (3.6ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:37` | Self: 0.0% (3.6ms) | Total: 0.0% (14.1ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (12)

**Calls:**
- `_state_global` (5)
- `_state_global` (2)
- `_state_global` (1)
- `_state_global` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:249` | Self: 0.0% (3.5ms) | Total: 0.1% (22.0ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (7)
- `_state_global` (6)
- `_state_global` (5)

**Calls:**
- `try_new_function` (5)
- `try_new_function` (3)
- `try_new_function` (3)
- `try_new_function` (1)
- `try_new_function` (1)
- `try_new_function` (1)
- `try_new_function` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:144` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `_state_function` (1)
- `_state_entering_imp` (1)
- `_state_function` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `analyzeSourceCode` (3)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:91` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `commentCounter` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:98` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:480` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `CodeReader` (3)

### `withNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `tryNewFunction` (3)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (3.5ms) | Total: 0.0% (3.5ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `finishNamespaceName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 3

**Called by:**
- `readUntilThen` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:135` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:44` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `FunctionInfo`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:149` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 3

**Called by:**
- `tryNewFunction` (3)

### `addToLongFunctionName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:972` | Self: 0.0% (3.3ms) | Total: 0.6% (108.3ms) | Samples: 3

**Called by:**
- `_dec` (24)
- `readDeclarationToken` (18)
- `_state_after_name` (7)
- `_function` (7)
- `_state_dec_to_imp` (6)
- `_dec` (6)
- `_function` (5)
- `_read_params` (4)
- `_state_start_of_params` (3)
- `_function_params` (3)
- `_function_name` (3)
- `_read_params` (2)
- `_function_args_continue` (1)
- `_state_objc_dec` (1)

**Calls:**
- `addToLongName` (57)
- `addToLongName` (19)
- `addToLongName` (8)
- `addToLongName` (2)
- `addToLongName` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:10` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 3

**Called by:**
- `LuaStateMachine` (3)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:561` | Self: 0.0% (3.3ms) | Total: 25.8% (4.34s) | Samples: 3

**Called by:**
- `generatorResume` (3634)
- `from` (1)

**Calls:**
- `next` (3610)
- `matchAll` (19)
- `[Symbol.matchAll]` (3)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:64` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 3

**Called by:**
- `map` (3)

### `_state_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:270` | Self: 0.0% (3.3ms) | Total: 0.0% (3.3ms) | Samples: 3

**Called by:**
- `invokeCurrentState` (3)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:41` | Self: 0.0% (3.2ms) | Total: 0.0% (3.2ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:43` | Self: 0.0% (3.2ms) | Total: 0.0% (3.2ms) | Samples: 3

**Called by:**
- `generatorResume` (3)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` | Self: 0.0% (3.2ms) | Total: 0.0% (3.2ms) | Samples: 3

**Called by:**
- `generatorResume` (2)
- `preprocessing` (1)

### `SolidityStates`
`[native code]` | Self: 0.0% (3.2ms) | Total: 0.2% (39.9ms) | Samples: 3

**Called by:**
- `statemachine_clone` (19)
- `SolidityReader` (13)

**Calls:**
- `GoLikeStates` (29)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:42` | Self: 0.0% (3.2ms) | Total: 0.1% (23.8ms) | Samples: 3

**Called by:**
- `generatorResume` (20)

**Calls:**
- `replaceLabel` (9)
- `replaceLabel` (7)
- `replaceLabel` (1)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:303` | Self: 0.0% (3.0ms) | Total: 0.0% (3.0ms) | Samples: 3

**Called by:**
- `addToLongFunctionName` (2)
- `addParameter` (1)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1049` | Self: 0.0% (2.8ms) | Total: 0.0% (2.8ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `_function_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:753` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `every` (2)

### `/END\s*(?:PROGRAM\|MODULE\|SUBMODULE\|SUBROUTINE\|FUNCTION\|TYPE\|INTERFACE\|BLOCK\|IF\|DO\|FORALL\|WHERE\|SELECT\|ASSOCIATE)/iu`
`[native code]` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `_state_global` (2)

### `RustStates`
`[native code]` | Self: 0.0% (2.6ms) | Total: 0.1% (33.0ms) | Samples: 2

**Called by:**
- `statemachine_clone` (17)
- `RustReader` (10)

**Calls:**
- `GoLikeStates` (25)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:86` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `generateTokens` (2)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:594` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `__call__` (2)

### `_state_objc_param_type`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:84` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:68` | Self: 0.0% (2.6ms) | Total: 0.0% (3.9ms) | Samples: 2

**Called by:**
- `generatorResume` (3)

**Calls:**
- `generateTokens` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts` | Self: 0.0% (2.6ms) | Total: 0.0% (2.6ms) | Samples: 2

**Called by:**
- `consume` (2)

### `tokenCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1071` | Self: 0.0% (2.5ms) | Total: 39.8% (6.71s) | Samples: 2

**Called by:**
- `generatorResume` (5585)

**Calls:**
- `next` (5510)
- `generatorResume` (73)

### `CodeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:118` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `GoLikeStates` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `preprocessing` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:248` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `_state_global` (1)
- `_state_global` (1)

### `hasCompleteNestingStackSurface`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `asNestingStackAdapter` (2)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:479` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `CodeReader` (2)

### `RubylikeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `statemachine_clone` (2)

### `withNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:491` | Self: 0.0% (2.5ms) | Total: 0.0% (7.2ms) | Samples: 2

**Called by:**
- `withNamespace` (5)
- `tryNewFunction` (1)

**Calls:**
- `map` (3)
- `join` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts:15` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `get_comment_from_token` (1)
- `get_comment_from_token` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:38` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `replaceLabel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:28` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `preprocess` (1)
- `preprocess` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:54` | Self: 0.0% (2.5ms) | Total: 0.0% (2.5ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (2)

### `_state_end_of_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `JavaStates`
`[native code]` | Self: 0.0% (2.4ms) | Total: 0.6% (108.5ms) | Samples: 2

**Called by:**
- `JavaReader` (38)
- `JavaClassBodyStates` (31)
- `JavaFunctionBodyStates` (21)

**Calls:**
- `CLikeStates` (52)
- `(anonymous)` (36)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:478` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `CodeReader` (2)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:60` | Self: 0.0% (2.4ms) | Total: 57.9% (9.74s) | Samples: 2

**Called by:**
- `operation` (8091)

**Calls:**
- `analyzeSourceCode` (7180)
- `analyzeSourceCode` (726)
- `analyzeSourceCode` (75)
- `analyzeSourceCode` (57)
- `analyzeSourceCode` (50)
- `analyzeSourceCode` (1)

### `CodeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:114` | Self: 0.0% (2.4ms) | Total: 0.7% (122.1ms) | Samples: 2

**Called by:**
- `TypeScriptStates` (24)
- `GoLikeStates` (21)
- `RubylikeStateMachine` (8)
- `CLikeStates` (7)
- `CppRValueRefStates` (7)
- `PerlStates` (5)
- `TypeScriptTypeAnnotationStates` (5)
- `CLikeNestingStackStates` (4)
- `PythonStates` (4)
- `FortranStates` (3)
- `ErlangStates` (3)
- `StStates` (3)
- `PHPLanguageStates` (2)
- `PLSQLStates` (2)
- `RStates` (1)

**Calls:**
- `(anonymous)` (97)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:33` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `map` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:49` | Self: 0.0% (2.4ms) | Total: 0.0% (4.8ms) | Samples: 2

**Called by:**
- `generatorResume` (4)

**Calls:**
- `next` (1)
- `matchAll` (1)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:299` | Self: 0.0% (2.4ms) | Total: 0.4% (74.1ms) | Samples: 2

**Called by:**
- `addParameter` (40)
- `addToLongFunctionName` (19)

**Calls:**
- `from` (57)

### `endOfFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:993` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `finishPoppedNesting` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:80` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `isAlphabetic`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:89` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `_state_function` (2)

### `tokenCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1070` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `SwiftReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:61` | Self: 0.0% (2.4ms) | Total: 0.0% (9.3ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (8)

**Calls:**
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)

### `FileInformation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:338` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `FileInfoBuilder` (2)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1112` | Self: 0.0% (2.4ms) | Total: 0.4% (69.1ms) | Samples: 2

**Called by:**
- `analyzeLizardSource` (57)

**Calls:**
- `FileInfoBuilder` (30)
- `FileInfoBuilder` (12)
- `FileInfoBuilder` (9)
- `FileInfoBuilder` (4)

### `_def_parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:112` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:299` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:113` | Self: 0.0% (2.4ms) | Total: 0.2% (33.7ms) | Samples: 2

**Called by:**
- `generatorResume` (29)

**Calls:**
- `next` (21)
- `process_token` (5)
- `generatorResume` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:287` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:221` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `_function` (1)
- `process` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:402` | Self: 0.0% (2.3ms) | Total: 0.1% (22.2ms) | Samples: 2

**Called by:**
- `CLikeReader` (4)
- `TypeScriptReader` (4)
- `FortranReader` (2)
- `StReader` (2)
- `PythonReader` (2)
- `GoReader` (1)
- `RReader` (1)
- `RustReader` (1)
- `ErlangReader` (1)
- `PerlReader` (1)

**Calls:**
- `Set` (17)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:11` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `ObjCStates` (2)

### `addToFunctionName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `_function_name` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:27` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1080` | Self: 0.0% (2.3ms) | Total: 40.2% (6.76s) | Samples: 2

**Called by:**
- `generatorResume` (5632)

**Calls:**
- `next` (5551)
- `generatorResume` (79)

### `getCommentFromToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:615` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `commentCounter` (2)

### `TypeScriptStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `statemachine_clone` (2)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:481` | Self: 0.0% (2.3ms) | Total: 0.1% (32.3ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (26)

**Calls:**
- `addToLongFunctionName` (24)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:38` | Self: 0.0% (2.3ms) | Total: 1.3% (225.8ms) | Samples: 2

**Called by:**
- `generatorResume` (187)

**Calls:**
- `from` (150)
- `filter` (35)

### `test`
`[native code]` | Self: 0.0% (2.3ms) | Total: 0.0% (3.5ms) | Samples: 2

**Called by:**
- `get_reader_for` (2)
- `_state_global` (1)

**Calls:**
- `/.*\.(java)$/iu` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:11` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `CSharpStates` (2)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:77` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `commentCounter` (2)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:595` | Self: 0.0% (2.3ms) | Total: 40.2% (6.78s) | Samples: 2

**Called by:**
- `generatorResume` (5641)

**Calls:**
- `next` (5575)
- `generatorResume` (64)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:41` | Self: 0.0% (2.3ms) | Total: 0.1% (30.7ms) | Samples: 2

**Called by:**
- `generatorResume` (26)

**Calls:**
- `replaceLabel` (12)
- `replaceLabel` (11)
- `replaceLabel` (1)

### `/([\p{L}\p{N}_]+)(\s=.*)?(\s:.*)?$/u`
`[native code]` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `FileInformation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:335` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `FileInfoBuilder` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:40` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (1)
- `_state_global` (1)

### `_state_first_line`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:419` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `Nesting`
`[native code]` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `FunctionInfo` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:37` | Self: 0.0% (2.3ms) | Total: 0.0% (3.6ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `_state_global` (1)

### `cloneState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:172` | Self: 0.0% (2.3ms) | Total: 1.7% (293.9ms) | Samples: 2

**Called by:**
- `_function_impl` (61)
- `_state_global` (51)
- `_expecting_condition_and_statement_block` (30)
- `_state_global` (29)
- `_def_continue` (22)
- `_expecting_statement_or_block` (17)
- `_state_global` (12)
- `_expect_function_body` (12)
- `read_object` (6)

**Calls:**
- `statemachine_clone` (238)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:216` | Self: 0.0% (2.2ms) | Total: 0.0% (3.4ms) | Samples: 2

**Called by:**
- `process` (2)
- `invokeCurrentState` (1)

**Calls:**
- `next` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:19` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `StStates` (2)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:464` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `FortranReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:54` | Self: 0.0% (2.2ms) | Total: 0.0% (13.2ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (11)

**Calls:**
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:553` | Self: 0.0% (2.2ms) | Total: 2.4% (415.1ms) | Samples: 2

**Called by:**
- `generatorResume` (347)

**Calls:**
- `map` (270)
- `join` (75)

### `(unknown)`
`[native code]` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 1

### `stateFunctionBody`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:67` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `readInsideBracketsThen` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:41` | Self: 0.0% (2.2ms) | Total: 0.7% (124.3ms) | Samples: 2

**Called by:**
- `generatorResume` (106)

**Calls:**
- `next` (72)
- `generatorResume` (32)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `consume` (2)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `StReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:70` | Self: 0.0% (2.2ms) | Total: 0.1% (20.4ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (17)

**Calls:**
- `CodeReader` (8)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `withNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:831` | Self: 0.0% (2.1ms) | Total: 0.1% (29.7ms) | Samples: 2

**Called by:**
- `tryNewFunction` (24)

**Calls:**
- `nestingStackAdapter` (13)
- `withNamespace` (5)
- `get nestingStackAdapter` (3)
- `asNestingStackAdapter` (1)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:90` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (2)

### `isParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:590` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `_dec` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `analyzeSourceCode` (1)
- `generatorResume` (1)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:94` | Self: 0.0% (2.1ms) | Total: 0.0% (3.2ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `_function_name` (1)

### `/^[A-Za-z]+[A-Za-z0-9_]*/u`
`[native code]` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `_state_global` (2)

### `_state_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:451` | Self: 0.0% (2.1ms) | Total: 0.0% (12.8ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (10)
- `(anonymous)` (1)

**Calls:**
- `readInsideBracketsThen` (4)
- `readInsideBracketsThen` (3)
- `readInsideBracketsThen` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:35` | Self: 0.0% (2.1ms) | Total: 0.5% (89.6ms) | Samples: 2

**Called by:**
- `generatorResume` (76)

**Calls:**
- `next` (64)
- `generatorResume` (10)

### `_if_cond`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:276` | Self: 0.0% (2.1ms) | Total: 0.0% (3.4ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `readInsideBracketsThen` (1)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:62` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `invokeCurrentState` (1)
- `_function_name` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:179` | Self: 0.0% (2.1ms) | Total: 0.0% (4.7ms) | Samples: 2

**Called by:**
- `(anonymous)` (3)
- `invokeCurrentState` (1)

**Calls:**
- `/END\s*(?:PROGRAM\|MODULE\|SUBMODULE\|SUBROUTINE\|FUNCTION\|TYPE\|INTERFACE\|BLOCK\|IF\|DO\|FORALL\|WHERE\|SELECT\|ASSOCIATE)/iu` (2)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:45` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `generatorResume` (2)

### `TypeScriptTypeAnnotationStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:548` | Self: 0.0% (1.5ms) | Total: 0.1% (19.4ms) | Samples: 1

**Called by:**
- `_consume_type_annotation` (16)

**Calls:**
- `(anonymous)` (9)
- `CodeStateMachine` (5)
- `CodeStateMachine` (1)

### `_state_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:71` | Self: 0.0% (1.4ms) | Total: 0.0% (9.7ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (8)

**Calls:**
- `consume` (5)
- `next` (1)
- `consume` (1)

### `_state_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `process` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:235` | Self: 0.0% (1.4ms) | Total: 0.0% (5.1ms) | Samples: 1

**Called by:**
- `readInsideBracketsThen` (4)

**Calls:**
- `parameter` (3)

### `rubyTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:46` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generateTokensWithRegex` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:44` | Self: 0.0% (1.3ms) | Total: 0.3% (56.2ms) | Samples: 1

**Called by:**
- `generatorResume` (47)

**Calls:**
- `consume` (43)
- `consume` (2)
- `consume` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `set_nesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:75` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `preprocess` (1)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:606` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `isServerConfig`
`bun:main` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:21` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `get_comment_from_token` (1)

### `LuaReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:18` | Self: 0.0% (1.3ms) | Total: 0.1% (18.1ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (15)

**Calls:**
- `RubylikeReader` (7)
- `RubylikeReader` (6)
- `RubylikeReader` (1)

### `tryNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:924` | Self: 0.0% (1.3ms) | Total: 0.1% (25.1ms) | Samples: 1

**Called by:**
- `restartNewFunction` (15)
- `try_new_function` (4)
- `_state_function_dec` (1)

**Calls:**
- `FunctionInfo` (13)
- `FunctionInfo` (3)
- `FunctionInfo` (3)

### `SwiftStates`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.2% (37.6ms) | Samples: 1

**Called by:**
- `statemachine_clone` (22)
- `SwiftReader` (7)

**Calls:**
- `GoLikeStates` (24)
- `(anonymous)` (4)

### `readDeclarationToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:300` | Self: 0.0% (1.3ms) | Total: 0.0% (2.5ms) | Samples: 1

**Called by:**
- `readInsideBracketsThen` (2)

**Calls:**
- `parameter_bracket_open` (1)

### `[Symbol.match]`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `match` (1)

### `endOfFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:998` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `_function_body` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `commentCounter` (1)

### `addCondition`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:964` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `func_match_failed` (1)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:181` | Self: 0.0% (1.3ms) | Total: 0.0% (5.0ms) | Samples: 1

**Called by:**
- `generatorResume` (4)

**Calls:**
- `consumeErlangAtom` (2)
- `consumeErlangAtom` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:77` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:133` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `/[a-z][\p{L}\p{N}_]*/uy`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `matchAt` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:260` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `_expecting_statement_or_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:124` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `JavaFunctionBodyStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `_state_imp` (1)

### `readFileSync`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (2.7ms) | Samples: 1

**Called by:**
- `readFileSync` (1)
- `(anonymous)` (1)

**Calls:**
- `readFileSync` (1)

### `readUntilThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:419` | Self: 0.0% (1.3ms) | Total: 0.0% (4.6ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `/^[A-Za-z]+[A-Za-z0-9_]*/u` (2)
- `test` (1)

### `/^\p{L}$/u`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `addToLongName` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:80` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `_state_first_line`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:416` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_after_parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:205` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:27` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:115` | Self: 0.0% (1.3ms) | Total: 0.2% (37.7ms) | Samples: 1

**Called by:**
- `generatorResume` (28)

**Calls:**
- `consumeErlangWhitespace` (21)
- `consumeErlangWhitespace` (6)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `/^[\p{L}\p{N}_]+$/u`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `isParameter` (1)

### `SwiftReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:63` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_after_parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:207` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:35` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:169` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `consumeErlangWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:230` | Self: 0.0% (1.3ms) | Total: 0.0% (9.2ms) | Samples: 1

**Called by:**
- `generatePygmentsCompatibleErlangTokenValues` (6)

**Calls:**
- `fromCodePoint` (5)

### `statemachine_before_return`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:90` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `process` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:33` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:146` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `SwiftReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:170` | Self: 0.0% (1.3ms) | Total: 0.0% (2.3ms) | Samples: 1

**Called by:**
- `_state_global` (2)

**Calls:**
- `_consume_java_expression_tokens` (1)

### `CLikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:40` | Self: 0.0% (1.3ms) | Total: 0.4% (69.9ms) | Samples: 1

**Called by:**
- `ObjCReader` (13)
- `TTCNReader` (12)
- `CSharpReader` (11)
- `analyzeSourceCode` (11)
- `JavaReader` (11)

**Calls:**
- `CodeReader` (25)
- `CodeReader` (11)
- `CodeReader` (5)
- `CodeReader` (5)
- `CodeReader` (4)
- `CodeReader` (4)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `_expect_function_impl`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:76` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:9` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `ZigStates` (1)

### `shift`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `_function_body` (1)

### `_state_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:122` | Self: 0.0% (1.3ms) | Total: 0.0% (6.5ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `consume` (4)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:45` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:87` | Self: 0.0% (1.3ms) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `generatorResume` (2)

**Calls:**
- `/#\s*(\w+)\s*(.*)/msu` (1)

### `TTCNStates`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.1% (24.3ms) | Samples: 1

**Called by:**
- `TTCNReader` (20)

**Calls:**
- `CLikeStates` (19)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `generateTokensWithRegex` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:118` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:81` | Self: 0.0% (1.3ms) | Total: 0.0% (7.4ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `_state_global` (3)
- `_state_global` (1)
- `_state_global` (1)

### `_read_namespace_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:174` | Self: 0.0% (1.3ms) | Total: 0.0% (6.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (4)
- `_read_namespace` (1)

**Calls:**
- `readUntilThen` (4)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:37` | Self: 0.0% (1.3ms) | Total: 0.6% (111.6ms) | Samples: 1

**Called by:**
- `generatorResume` (91)

**Calls:**
- `next` (67)
- `generatorResume` (23)

### `currentNestingLevel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` | Self: 0.0% (1.3ms) | Total: 0.0% (8.6ms) | Samples: 1

**Called by:**
- `tryNewFunction` (7)

**Calls:**
- `nestingStackAdapter` (4)
- `get nestingStackAdapter` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:136` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:104` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:83` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `TSXReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `next` (1)

### `get lastFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `finishPoppedNesting` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:40` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generateTokensWithRegex` (1)

### `_function_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:109` | Self: 0.0% (1.2ms) | Total: 0.4% (78.7ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (66)

**Calls:**
- `readInsideBracketsThen` (57)
- `readInsideBracketsThen` (4)
- `readInsideBracketsThen` (3)
- `readInsideBracketsThen` (1)

### `CodeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:117` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `TypeScriptTypeAnnotationStates` (1)

### `_function_impl`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:291` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `stateInsideBraces` (1)

### `CSharpReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:24` | Self: 0.0% (1.2ms) | Total: 0.2% (35.0ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (29)

**Calls:**
- `CLikeReader` (15)
- `CLikeReader` (11)
- `CLikeReader` (2)

### `KotlinReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `statemachine_before_return`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `returnFromState` (1)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:395` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `KotlinReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:27` | Self: 0.0% (1.2ms) | Total: 0.1% (20.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (16)

**Calls:**
- `KotlinStates` (15)

### `_state_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:248` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:52` | Self: 0.0% (1.2ms) | Total: 0.0% (3.9ms) | Samples: 1

**Called by:**
- `_state_global` (3)

**Calls:**
- `try_new_function` (2)

### `RegExp`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generateTokens` (1)

### `_expecting_func_opening_bracket`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:498` | Self: 0.0% (1.2ms) | Total: 0.2% (41.5ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (35)

**Calls:**
- `consume` (20)
- `next` (14)

### `nestingStackAdapter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` | Self: 0.0% (1.2ms) | Total: 0.4% (71.1ms) | Samples: 1

**Called by:**
- `popNesting` (13)
- `withNamespace` (13)
- `addBareNesting` (13)
- `startNewFunctionNesting` (9)
- `currentNestingLevel` (4)
- `get currentNestingLevel` (2)
- `finishPoppedNesting` (2)
- `addNamespace` (1)

**Calls:**
- `asNestingStackAdapter` (56)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:138` | Self: 0.0% (1.2ms) | Total: 0.0% (6.1ms) | Samples: 1

**Called by:**
- `_state_global` (5)

**Calls:**
- `try_new_function` (4)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `isFunctionName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `_function` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `preprocessing` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:10` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `GDScriptStates` (1)

### `_state_func_first_line`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `RubylikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `LuaReader` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:44` | Self: 0.0% (1.2ms) | Total: 0.9% (161.3ms) | Samples: 1

**Called by:**
- `generatorResume` (134)

**Calls:**
- `next` (92)
- `generatorResume` (40)
- `preprocess` (1)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1506` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `preprocessing` (1)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `CodeReader` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:93` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_function_after_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:171` | Self: 0.0% (1.2ms) | Total: 0.0% (4.7ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `consume` (2)
- `next` (1)

### `_state_nested_call`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:448` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `consumeErlangAtom`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatePygmentsCompatibleErlangTokenValues` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:73` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `LuaStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:40` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `statemachine_clone` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:20` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `get_comment_from_token` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:73` | Self: 0.0% (1.2ms) | Total: 0.4% (78.9ms) | Samples: 1

**Called by:**
- `generatorResume` (62)

**Calls:**
- `next` (45)
- `generatorResume` (14)
- `generatePygmentsCompatibleErlangTokenValues` (2)

### `isRNameFragment`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `_extract_function_names` (1)

### `_function_impl`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:124` | Self: 0.0% (1.2ms) | Total: 0.4% (79.8ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (63)

**Calls:**
- `cloneState` (61)
- `statemachine_clone` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:262` | Self: 0.0% (1.2ms) | Total: 0.0% (12.1ms) | Samples: 1

**Called by:**
- `generatorResume` (10)

**Calls:**
- `set_nesting` (4)
- `set_nesting` (4)
- `set_nesting` (1)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:282` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `process` (1)

### `getFunctionKeyword`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:58` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:65` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `preprocessing` (1)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:293` | Self: 0.0% (1.2ms) | Total: 0.0% (16.4ms) | Samples: 1

**Called by:**
- `process` (13)

**Calls:**
- `isPythonWhitespace` (12)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:54` | Self: 0.0% (1.2ms) | Total: 0.7% (119.5ms) | Samples: 1

**Called by:**
- `generatorResume` (100)

**Calls:**
- `next` (81)
- `generatorResume` (18)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:243` | Self: 0.0% (1.2ms) | Total: 0.0% (11.1ms) | Samples: 1

**Called by:**
- `try_new_function` (4)
- `_state_global` (3)
- `try_new_function` (2)

**Calls:**
- `try_new_function` (8)

### `parameterCount`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` | Self: 0.0% (1.2ms) | Total: 0.1% (30.1ms) | Samples: 1

**Called by:**
- `parameter_count` (26)

**Calls:**
- `get parameters` (23)
- `flatIntoArrayWithCallback` (1)
- `get parameters` (1)

### `_state_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `GoReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:19` | Self: 0.0% (1.2ms) | Total: 0.0% (9.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (8)

**Calls:**
- `CodeReader` (3)
- `CodeReader` (2)
- `FunctionInfo` (1)
- `CodeReader` (1)

### `get unicode`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `get flags` (1)

### `_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:114` | Self: 0.0% (1.2ms) | Total: 0.1% (18.6ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (16)

**Calls:**
- `isPythonWhitespace` (15)

### `get parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `parameterCount` (1)

### `rubyTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:48` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `flatIntoArray`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `_expecting_statement_or_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:426` | Self: 0.0% (1.1ms) | Total: 0.1% (21.4ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (18)

**Calls:**
- `cloneState` (17)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `every` (1)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `get sticky`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `get flags` (1)

### `_pop_function_from_stack`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `consume` (1)

### `finishImplementation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:455` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `readInsideBracketsThen` (1)

### `_function_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `TypeScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:33` | Self: 0.0% (1.1ms) | Total: 0.3% (54.4ms) | Samples: 1

**Called by:**
- `TSXReader` (16)
- `JavaScriptReader` (11)
- `VueReader` (9)
- `analyzeSourceCode` (9)

**Calls:**
- `CodeReader` (14)
- `CodeReader` (12)
- `CodeReader` (7)
- `CodeReader` (5)
- `CodeReader` (4)
- `CodeReader` (1)
- `CodeReader` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:66` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `get_comment_from_token` (1)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:643` | Self: 0.0% (1.1ms) | Total: 0.1% (26.5ms) | Samples: 1

**Called by:**
- `generateTokens` (23)

**Calls:**
- `join` (13)
- `from` (9)

### `getFunctionKeyword`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:25` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `getFunctionKeyword`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:135` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:48` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:115` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:36` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `CodeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:403` | Self: 0.0% (1.1ms) | Total: 0.0% (15.2ms) | Samples: 1

**Called by:**
- `PythonReader` (2)
- `ScalaReader` (2)
- `RubylikeReader` (1)
- `TypeScriptReader` (1)
- `SwiftReader` (1)
- `RReader` (1)
- `FortranReader` (1)
- `RustReader` (1)
- `ErlangReader` (1)
- `CLikeReader` (1)

**Calls:**
- `Set` (11)

### `_state_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:281` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `languages`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:74` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `get_reader_for` (1)

### `_function_return_type_or_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:178` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:244` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `tryNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:925` | Self: 0.0% (1.1ms) | Total: 0.2% (35.7ms) | Samples: 1

**Called by:**
- `restartNewFunction` (23)
- `try_new_function` (4)
- `_state_function_dec` (1)
- `_function_name` (1)

**Calls:**
- `withNamespace` (24)
- `withNamespace` (3)
- `withNamespace` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:427` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `CSharpReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:25` | Self: 0.0% (1.1ms) | Total: 0.1% (25.8ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (22)

**Calls:**
- `CSharpStates` (16)
- `CLikeNestingStackStates` (5)

### `reverse`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_extract_function_names` (1)

### `set _state`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `_expect_function_impl`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:80` | Self: 0.0% (1.1ms) | Total: 0.0% (2.3ms) | Samples: 1

**Called by:**
- `commentCounter` (2)

**Calls:**
- `preprocess` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:22` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `preprocess` (1)

### `RReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:33` | Self: 0.0% (1.1ms) | Total: 0.0% (11.5ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (9)

**Calls:**
- `RStates` (8)

### `_expecting_condition_and_statement_block`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:422` | Self: 0.0% (1.1ms) | Total: 0.2% (37.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (31)

**Calls:**
- `cloneState` (30)

### `get_reader_for`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts:81` | Self: 0.0% (1.1ms) | Total: 40.8% (6.87s) | Samples: 1

**Called by:**
- `analyzeLizardSource` (5741)

**Calls:**
- `matchFilename` (5738)
- `test` (2)

### `_state_class_declaration`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:210` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:168` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.1% (31.4ms) | Samples: 1

**Called by:**
- `flatMap` (25)
- `get parameterCount` (1)
- `parameterCount` (1)

**Calls:**
- `(anonymous)` (23)
- `stringSplitFast` (2)
- `flatIntoArray` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:180` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `commentCounter` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:57` | Self: 0.0% (1.1ms) | Total: 0.0% (4.8ms) | Samples: 1

**Called by:**
- `generatorResume` (4)

**Calls:**
- `next` (3)

### `_expect_function_impl`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:119` | Self: 0.0% (1.1ms) | Total: 0.3% (65.2ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (53)

**Calls:**
- `next` (37)
- `consume` (15)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:27` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `GDScriptStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:36` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `GDScriptReader` (1)

### `addToLongName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `addToLongFunctionName` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:82` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `isTripleQuotedString`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:429` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `process_token` (1)

### `MyToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `rubyTokens` (1)

### `applyProcessor`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1495` | Self: 0.0% (1.1ms) | Total: 0.3% (57.3ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (46)

**Calls:**
- `preprocessing` (32)
- `commentCounter` (5)
- `lineCounter` (5)
- `conditionCounter` (3)

### `(module)`
`/tmp/vibe-lizard-harness-only.ts:8` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

### `hasParameterBracketDefinitions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `parameter_bracket_open` (1)

### `_function_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:231` | Self: 0.0% (1.1ms) | Total: 0.0% (10.8ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `readInsideBracketsThen` (4)
- `readInsideBracketsThen` (4)

### `_state_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:284` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:149` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:37` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:155` | Self: 0.0% (1.1ms) | Total: 0.0% (10.9ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `popNesting` (8)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:140` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `_expect_function_impl`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:86` | Self: 0.0% (1.1ms) | Total: 0.1% (23.7ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (18)

**Calls:**
- `next` (9)
- `consume` (8)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:342` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_dec_to_imp` (1)

### `match`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (2.4ms) | Samples: 1

**Called by:**
- `isRNameFragment` (2)

**Calls:**
- `[Symbol.match]` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `_extract_function_names`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:172` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `_expand_fstring_interpolations`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:139` | Self: 0.0% (1.1ms) | Total: 3.0% (519.2ms) | Samples: 1

**Called by:**
- `generatorResume` (436)

**Calls:**
- `next` (366)
- `generatorResume` (69)

### `generateTokensWithRegex`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts:73` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:108` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:98` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:75` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `RubylikeStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:24` | Self: 0.0% (1.1ms) | Total: 0.2% (49.9ms) | Samples: 1

**Called by:**
- `statemachine_clone` (18)
- `LuaStateMachine` (12)
- `RubylikeReader` (12)

**Calls:**
- `(anonymous)` (33)
- `CodeStateMachine` (8)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:33` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `operation`
`/tmp/vibe-lizard-harness-only.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `every` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:42` | Self: 0.0% (1.1ms) | Total: 0.3% (66.7ms) | Samples: 1

**Called by:**
- `generatorResume` (49)

**Calls:**
- `isPythonWhitespace` (44)
- `every` (4)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:28` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `at`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `_function_has_param`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:226` | Self: 0.0% (1.0ms) | Total: 0.0% (9.3ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (8)

**Calls:**
- `consume` (7)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:70` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:133` | Self: 0.0% (1.0ms) | Total: 0.0% (10.8ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `_state_global` (6)
- `_state_global` (2)

### `statemachine_clone`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_state_func_first_line` (1)

### `_state_before_begin`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:245` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `conditionCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1082` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `/(?:[2-9]\|[12][0-9]\|3[0-6])#[0-9A-Za-z]+/uy`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `matchAt` (1)

### `matchAll`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.3% (63.6ms) | Samples: 1

**Called by:**
- `tokenizerFlags` (33)
- `generateTokens` (19)
- `generateTokens` (1)

**Calls:**
- `get flags` (42)
- `esSpecIsRegExp` (7)
- `stringIncludesInternal` (3)

### `_consume_java_expression_tokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:97` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `generate_common_tokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:139` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_state_global` (1)

### `finishPoppedNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:907` | Self: 0.0% (1.0ms) | Total: 0.0% (3.5ms) | Samples: 1

**Called by:**
- `popNesting` (3)

**Calls:**
- `endOfFunction` (2)

### `get unicodeSets`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `get flags` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:104` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:534` | Self: 0.0% (1.0ms) | Total: 0.0% (8.5ms) | Samples: 1

**Called by:**
- `consume` (7)

**Calls:**
- `consume` (6)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:338` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `_state_dec_to_imp` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:85` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `startNewFunctionNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:516` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `startNewFunctionNesting` (1)

### `addBareNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:499` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `addBareNesting` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:90` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:67` | Self: 0.0% (1.0ms) | Total: 2.6% (452.4ms) | Samples: 1

**Called by:**
- `generatorResume` (377)

**Calls:**
- `next` (356)
- `generatorResume` (20)

### `isParameter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:591` | Self: 0.0% (1.0ms) | Total: 0.0% (2.3ms) | Samples: 1

**Called by:**
- `_dec` (2)

**Calls:**
- `/^[\p{L}\p{N}_]+$/u` (1)

### `rubyTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:71` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `generatorResume` (1)

### `importModule`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `ErlangReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `analyzeSourceCode` (1)

### `_state_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:253` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `analyzeSourceCode`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1449` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `analyzeLizardSource` (1)

### `tokenizerFlags`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `generateTokens` (1)

### `_def`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:65` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:81` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:92` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `ObjCStates`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.1% (21.5ms) | Samples: 1

**Called by:**
- `ObjCReader` (18)

**Calls:**
- `CLikeStates` (15)
- `(anonymous)` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:82` | Self: 0.0% (1.0ms) | Total: 4.4% (747.2ms) | Samples: 1

**Called by:**
- `generatorResume` (630)

**Calls:**
- `next` (553)
- `generatorResume` (73)
- `generateTokens` (3)

### `/^\p{L}+$/u`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `preprocess` (1)

### `_read_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:107` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:137` | Self: 0.0% (988us) | Total: 0.0% (988us) | Samples: 1

**Called by:**
- `invokeCurrentState` (1)

### `find`
`[native code]` | Self: 0.0% (986us) | Total: 0.0% (7.5ms) | Samples: 1

**Called by:**
- `generatePygmentsCompatibleErlangTokenValues` (6)

**Calls:**
- `(anonymous)` (5)

### `flatMap`
`[native code]` | Self: 0.0% (982us) | Total: 0.1% (30.1ms) | Samples: 1

**Called by:**
- `get parameters` (23)
- `tokenizerFlags` (3)

**Calls:**
- `flatIntoArrayWithCallback` (25)

### `createSafeIterator`
`internal:primordials:3` | Self: 0.0% (981us) | Total: 0.0% (981us) | Samples: 1

**Called by:**
- `internal:primordials` (1)

### `/#\s*(\w+)\s*(.*)/msu`
`[native code]` | Self: 0.0% (967us) | Total: 0.0% (967us) | Samples: 1

**Called by:**
- `preprocess` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:80` | Self: 0.0% (962us) | Total: 0.0% (8.5ms) | Samples: 1

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `_state_global` (5)
- `_state_global` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:253` | Self: 0.0% (961us) | Total: 3.4% (574.5ms) | Samples: 1

**Called by:**
- `generatorResume` (481)

**Calls:**
- `next` (389)
- `generatorResume` (91)

### `_read_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:105` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `addToLongFunctionName` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:542` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `_extract_function_names`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:192` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `_state_global` (1)

**Calls:**
- `reverse` (1)

### `_read_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:108` | Self: 0.0% (0us) | Total: 0.0% (3.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `parameter` (3)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:242` | Self: 0.0% (0us) | Total: 0.0% (5.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `addToLongFunctionName` (5)

### `_state_end_of_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:464` | Self: 0.0% (0us) | Total: 0.0% (10.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `consume` (8)
- `consume` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:71` | Self: 0.0% (0us) | Total: 0.1% (26.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (21)

**Calls:**
- `_state_dec` (21)

### `generate_common_tokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts:35` | Self: 0.0% (0us) | Total: 0.0% (6.2ms) | Samples: 0

**Called by:**
- `rubyTokens` (4)
- `analyzeSourceCode` (1)

**Calls:**
- `raw` (5)

### `_state_start_of_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:447` | Self: 0.0% (0us) | Total: 0.0% (4.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `addToLongFunctionName` (3)

### `PerlReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:46` | Self: 0.0% (0us) | Total: 0.0% (14.7ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (12)

**Calls:**
- `PerlStates` (12)

### `_state_entering_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:446` | Self: 0.0% (0us) | Total: 0.2% (34.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (28)

**Calls:**
- `consume` (14)
- `next` (13)
- `consume` (1)

### `reset`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:86` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `preprocess` (4)

**Calls:**
- `set_nesting` (4)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:400` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `parameter` (3)

### `ScalaStates`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (26.2ms) | Samples: 0

**Called by:**
- `statemachine_clone` (12)
- `ScalaReader` (10)

**Calls:**
- `GoLikeStates` (19)
- `(anonymous)` (3)

### `ObjCReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:19` | Self: 0.0% (0us) | Total: 0.2% (36.2ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (28)

**Calls:**
- `CLikeReader` (13)
- `CLikeReader` (12)
- `CLikeReader` (2)
- `CLikeReader` (1)

### `internal:primordials`
`internal:primordials:50` | Self: 0.0% (0us) | Total: 0.0% (981us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `createSafeIterator` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.0% (981us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `addBareNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:839` | Self: 0.0% (0us) | Total: 0.0% (16.7ms) | Samples: 0

**Called by:**
- `set_nesting` (4)
- `_if_then` (3)
- `_state_global` (3)
- `_function` (2)
- `_function` (1)
- `_state_global` (1)

**Calls:**
- `nestingStackAdapter` (13)
- `addBareNesting` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:187` | Self: 0.0% (0us) | Total: 0.0% (7.1ms) | Samples: 0

**Called by:**
- `_function` (6)

**Calls:**
- `_state_global` (3)
- `_state_global` (2)
- `_state_global` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:32` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `internal:streams/end-of-stream`
`internal:streams/end-of-stream:17` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:100` | Self: 0.0% (0us) | Total: 0.1% (18.8ms) | Samples: 0

**Called by:**
- `generatorResume` (14)

**Calls:**
- `isPythonWhitespace` (12)
- `every` (2)

### `_def_continue`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:94` | Self: 0.0% (0us) | Total: 0.2% (45.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (38)

**Calls:**
- `cloneState` (22)
- `consume` (9)
- `subState` (7)

### `readInsideBracketsThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:298` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `_function_dec` (1)
- `_state_dec` (1)

**Calls:**
- `next` (2)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `ErlangReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:69` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (3)

**Calls:**
- `ErlangStates` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:63` | Self: 0.0% (0us) | Total: 0.0% (5.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `isPythonWhitespace` (4)

### `get parameterCount`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:270` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `get parameter_count` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `popNesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:896` | Self: 0.0% (0us) | Total: 0.1% (28.0ms) | Samples: 0

**Called by:**
- `set_nesting` (8)
- `_state_global` (8)
- `_state_global` (3)
- `_state_global` (3)
- `_state_global` (1)

**Calls:**
- `nestingStackAdapter` (13)
- `finishPoppedNesting` (7)
- `finishPoppedNesting` (3)

### `_state_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:123` | Self: 0.0% (0us) | Total: 0.1% (26.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (22)

**Calls:**
- `JavaFunctionBodyStates` (21)
- `JavaFunctionBodyStates` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:66` | Self: 0.0% (0us) | Total: 10.0% (1.68s) | Samples: 0

**Called by:**
- `generatorResume` (1406)

**Calls:**
- `next` (1243)
- `generatorResume` (161)
- `generateTokens` (2)

### `GDScriptStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:35` | Self: 0.0% (0us) | Total: 0.0% (13.2ms) | Samples: 0

**Called by:**
- `GDScriptReader` (11)

**Calls:**
- `PythonStates` (10)
- `(anonymous)` (1)

### `tryNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:929` | Self: 0.0% (0us) | Total: 0.0% (10.8ms) | Samples: 0

**Called by:**
- `restartNewFunction` (8)
- `_state_function_dec` (1)

**Calls:**
- `currentNestingLevel` (7)
- `get currentNestingLevel` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:153` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `addBareNesting` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:30` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `getFunctionKeyword` (1)
- `getFunctionKeyword` (1)

### `RReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:32` | Self: 0.0% (0us) | Total: 0.0% (10.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (9)

**Calls:**
- `CodeReader` (3)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:206` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `endOfFunction` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:64` | Self: 0.0% (0us) | Total: 0.0% (6.4ms) | Samples: 0

**Called by:**
- `generatorResume` (5)

**Calls:**
- `map` (4)
- `join` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:359` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `read_object` (6)

### `_state_nested_call`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:310` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `next` (1)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:62` | Self: 0.0% (0us) | Total: 0.3% (58.3ms) | Samples: 0

**Called by:**
- `operation` (48)

**Calls:**
- `freeze` (48)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:124` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `isPythonWhitespace` (1)

### `get ReadStream`
`node:fs:578` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Calls:**
- `anonymous` (4)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:220` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `restartNewFunction` (3)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:26` | Self: 0.0% (0us) | Total: 0.5% (84.1ms) | Samples: 0

**Called by:**
- `generatorResume` (71)

**Calls:**
- `next` (65)
- `generatorResume` (6)

### `returnFromState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:195` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `_state_global` (1)

**Calls:**
- `statemachine_before_return` (1)

### `get currentNestingLevel`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:863` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `tryNewFunction` (2)

**Calls:**
- `nestingStackAdapter` (2)

### `StReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:71` | Self: 0.0% (0us) | Total: 0.0% (6.1ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (5)

**Calls:**
- `StStates` (5)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:101` | Self: 0.0% (0us) | Total: 0.1% (22.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (18)

**Calls:**
- `_state_global` (11)
- `_state_global` (5)
- `_state_global` (1)
- `_state_global` (1)

### `RustReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/rust.ts:28` | Self: 0.0% (0us) | Total: 0.1% (18.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (16)

**Calls:**
- `CodeReader` (7)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `GoReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts:20` | Self: 0.0% (0us) | Total: 0.0% (10.2ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (8)

**Calls:**
- `GoStates` (8)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:451` | Self: 0.0% (0us) | Total: 0.0% (12.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (10)

**Calls:**
- `_push_function_to_stack` (10)

### `func_match_failed`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:497` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `_state_after_name` (1)

**Calls:**
- `addCondition` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/solidity.ts:26` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `commentCounter` (3)

**Calls:**
- `get_comment_from_token` (3)

### `RStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:59` | Self: 0.0% (0us) | Total: 0.0% (10.4ms) | Samples: 0

**Called by:**
- `RReader` (8)

**Calls:**
- `(anonymous)` (7)
- `CodeStateMachine` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:79` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:29` | Self: 0.0% (0us) | Total: 0.6% (108.1ms) | Samples: 0

**Called by:**
- `generatorResume` (90)

**Calls:**
- `next` (81)
- `generatorResume` (9)

### `next`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:182` | Self: 0.0% (0us) | Total: 0.9% (159.1ms) | Samples: 0

**Called by:**
- `_expect_function_impl` (37)
- `_expecting_func_opening_bracket` (14)
- `_expect_function_dec` (14)
- `_state_entering_imp` (13)
- `_state_function` (11)
- `_function` (10)
- `_expect_function_impl` (9)
- `subState` (7)
- `_state_dec_to_imp` (7)
- `_state_function` (5)
- `_state_function` (1)
- `_function_after_name` (1)
- `func_match_failed` (1)

**Calls:**
- `consume` (129)
- `consume` (1)

### `statemachine_clone`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:413` | Self: 0.0% (0us) | Total: 0.0% (4.4ms) | Samples: 0

**Called by:**
- `_state_func_first_line` (4)

**Calls:**
- `ErlangStates` (4)

### `VueReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:18` | Self: 0.0% (0us) | Total: 0.1% (21.0ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (17)

**Calls:**
- `TypeScriptReader` (9)
- `TypeScriptReader` (8)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:45` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `set _state` (1)

### `ScalaReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:25` | Self: 0.0% (0us) | Total: 0.0% (11.8ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (10)

**Calls:**
- `ScalaStates` (10)

### `PHPLanguageStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:32` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `PHPReader` (12)

**Calls:**
- `(anonymous)` (10)
- `CodeStateMachine` (2)

### `_state_start_of_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:453` | Self: 0.0% (0us) | Total: 0.0% (2.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `parameter` (2)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.0% (981us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:420` | Self: 0.0% (0us) | Total: 0.0% (12.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (10)

**Calls:**
- `pushNewFunction` (10)

### `_function_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:96` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `addToLongFunctionName` (3)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:551` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:388` | Self: 0.0% (0us) | Total: 0.0% (8.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `addToLongFunctionName` (7)

### `SolidityReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/solidity.ts:21` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (3)

**Calls:**
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `lineCounter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1053` | Self: 0.0% (0us) | Total: 38.3% (6.45s) | Samples: 0

**Called by:**
- `generatorResume` (5371)

**Calls:**
- `next` (5296)
- `generatorResume` (75)

### `(module)`
`/tmp/vibe-lizard-harness-only.ts:7` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `map` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:30` | Self: 0.0% (0us) | Total: 0.2% (42.4ms) | Samples: 0

**Called by:**
- `generatorResume` (36)

**Calls:**
- `next` (29)
- `__call__` (4)
- `generatorResume` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:43` | Self: 0.0% (0us) | Total: 0.0% (13.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (8)
- `_state_global` (4)

**Calls:**
- `cloneState` (12)

### `(module)`
`/tmp/vibe-lizard-harness-only.ts:10` | Self: 0.0% (0us) | Total: 99.7% (16.79s) | Samples: 0

**Calls:**
- `operation` (13978)
- `operation` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:74` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (3)

**Calls:**
- `raw` (3)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:453` | Self: 0.0% (0us) | Total: 0.1% (20.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (16)

**Calls:**
- `next` (10)
- `consume` (5)
- `consume` (1)

### `exec`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `next` (1)

**Calls:**
- `/(?:\/\*.*?\*\/\/\/\|#(?:\\\n\|[^\n])*\|!(?:\\\n\|[^\n])*\|^\*(?:\\\n\|[^\n])*\|\.OR\.\|\.AND\.\|ELSE\s+IF\|MODULE\s+PROCEDURE\|END\s*PROGRAM\|END\s*MODULE\|END\s*SUBMODULE\|END\s*SUBROUTINE\|END\s*FUNCTION\|END\s*TYPE\|END\s*INTERFACE\|END\s*BLOCK\|END\s*IF\|END\s*DO\|END\s*FORALL\|END\s*WHERE\|END\s*SELECT\|END\s*ASSOCIATE\|(?:\d+')+\d+\|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+\|0b(?:[01]+')+[01]+\|[\p{L}\p{N}_]+\|"(?:\\.\|[^"\\])*"\|'(?:\\.\|[^'\\])*?'\|\/\/(?:\\\n\|[^\n])*\|#\|:=\|::\|\*\*\|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]\|(?:extends))+>\|<<=\|>>=\|\\|\\|\|&&\|===\|!==\|==\|!=\|<=\|>=\|->\|=>\|\+\+\|--\|\+=\|-=\|\+\|-\|\*\|\/\|\*=\|\/=\|\^=\|&=\|\\|=\|\.\.\.\|\\\n\|\n\|(?:(?!\n)(?:\p{White_Space}\|[-]))+\|.)/gimsu` (1)

### `KotlinReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:26` | Self: 0.0% (0us) | Total: 0.0% (9.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (8)

**Calls:**
- `CodeReader` (4)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)

### `GDScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:29` | Self: 0.0% (0us) | Total: 0.0% (14.3ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (12)

**Calls:**
- `GDScriptStates` (11)
- `GDScriptStates` (1)

### `parameter_count`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` | Self: 0.0% (0us) | Total: 0.1% (30.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (26)

**Calls:**
- `parameterCount` (26)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:446` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `isFunctionName` (1)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:138` | Self: 0.0% (0us) | Total: 0.0% (7.5ms) | Samples: 0

**Called by:**
- `generatorResume` (6)

**Calls:**
- `find` (6)

### `ZigReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:22` | Self: 0.0% (0us) | Total: 0.0% (6.5ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (5)

**Calls:**
- `ZigStates` (5)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:65` | Self: 0.0% (0us) | Total: 0.0% (4.4ms) | Samples: 0

**Called by:**
- `generatorResume` (4)

**Calls:**
- `raw` (4)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:173` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `popNesting` (1)

### `buildConditions`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:477` | Self: 0.0% (0us) | Total: 0.4% (76.7ms) | Samples: 0

**Called by:**
- `CodeReader` (64)

**Calls:**
- `Set` (64)

### `_if`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:271` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `consume` (3)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:300` | Self: 0.0% (0us) | Total: 0.5% (96.0ms) | Samples: 0

**Called by:**
- `generatorResume` (81)

**Calls:**
- `next` (70)
- `generatorResume` (11)

### `confirmNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:937` | Self: 0.0% (0us) | Total: 0.1% (22.1ms) | Samples: 0

**Called by:**
- `restartNewFunction` (17)
- `_state_entering_imp` (1)

**Calls:**
- `startNewFunctionNesting` (18)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:79` | Self: 0.0% (0us) | Total: 0.7% (133.2ms) | Samples: 0

**Called by:**
- `generatorResume` (111)

**Calls:**
- `next` (89)
- `generatorResume` (22)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:72` | Self: 0.0% (0us) | Total: 0.0% (5.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `_extract_function_names` (3)
- `_extract_function_names` (1)
- `_extract_function_names` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:55` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (1)

**Calls:**
- `raw` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:243` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `addBareNesting` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:70` | Self: 0.0% (0us) | Total: 0.1% (31.3ms) | Samples: 0

**Called by:**
- `map` (27)

**Calls:**
- `parameter_count` (26)
- `get parameter_count` (1)

### `RubyReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:33` | Self: 0.0% (0us) | Total: 0.1% (21.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (18)

**Calls:**
- `RubylikeReader` (12)
- `RubylikeReader` (6)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:181` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `popNesting` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:70` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `at` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:83` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:403` | Self: 0.0% (0us) | Total: 0.0% (6.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `addToLongFunctionName` (6)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:360` | Self: 0.0% (0us) | Total: 0.4% (76.6ms) | Samples: 0

**Called by:**
- `generatorResume` (64)

**Calls:**
- `next` (50)
- `generatorResume` (14)

### `_function_args_continue`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:173` | Self: 0.0% (0us) | Total: 0.0% (3.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `parameter` (3)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:274` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `generatorResume` (4)

**Calls:**
- `reset` (4)

### `_parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:199` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `isPythonWhitespace` (3)

### `_state_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:68` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `isAlphabetic` (2)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:278` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `stateInsideBraces`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:48` | Self: 0.0% (0us) | Total: 0.0% (8.6ms) | Samples: 0

**Called by:**
- `readInsideBracketsThen` (7)

**Calls:**
- `readInsideBracketsThen` (6)
- `readInsideBracketsThen` (1)

### `_push_function_to_stack`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:399` | Self: 0.0% (0us) | Total: 0.0% (12.9ms) | Samples: 0

**Called by:**
- `_function` (10)

**Calls:**
- `pushNewFunction` (10)

### `CLikeStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:221` | Self: 0.0% (0us) | Total: 1.1% (196.0ms) | Samples: 0

**Called by:**
- `CLikeReader` (61)
- `JavaStates` (52)
- `TTCNStates` (19)
- `ObjCStates` (15)
- `CSharpStates` (14)

**Calls:**
- `(anonymous)` (154)
- `CodeStateMachine` (7)

### `_state_function_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:210` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `isPythonWhitespace` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:88` | Self: 0.0% (0us) | Total: 0.1% (25.7ms) | Samples: 0

**Called by:**
- `generatorResume` (20)

**Calls:**
- `isPythonWhitespace` (20)

### `__call__`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:591` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (2)

**Calls:**
- `process` (2)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:126` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (1)

**Calls:**
- `raw` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:150` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `addBareNesting` (1)

### `_state_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:264` | Self: 0.0% (0us) | Total: 0.0% (11.0ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `next` (5)
- `consume` (3)
- `consume` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:387` | Self: 0.0% (0us) | Total: 0.0% (8.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `restartNewFunction` (5)
- `restartNewFunction` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:550` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `raw` (1)

### `readDeclarationToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:312` | Self: 0.0% (0us) | Total: 0.1% (20.1ms) | Samples: 0

**Called by:**
- `readInsideBracketsThen` (18)

**Calls:**
- `addToLongFunctionName` (18)

### `PLSQLStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:94` | Self: 0.0% (0us) | Total: 0.0% (6.5ms) | Samples: 0

**Called by:**
- `PLSQLReader` (5)

**Calls:**
- `(anonymous)` (3)
- `CodeStateMachine` (2)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:44` | Self: 0.0% (0us) | Total: 0.0% (11.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (9)

**Calls:**
- `readInsideBracketsThen` (8)
- `readInsideBracketsThen` (1)

### `CppRValueRefStates`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (19.0ms) | Samples: 0

**Called by:**
- `CLikeReader` (14)

**Calls:**
- `CodeStateMachine` (7)
- `(anonymous)` (7)

### `FortranReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:55` | Self: 0.0% (0us) | Total: 0.0% (11.7ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (10)

**Calls:**
- `FortranStates` (10)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:125` | Self: 0.0% (0us) | Total: 0.1% (17.2ms) | Samples: 0

**Called by:**
- `process` (15)

**Calls:**
- `invokeCurrentState` (14)
- `invokeCurrentState` (1)

### `try_new_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:933` | Self: 0.0% (0us) | Total: 0.0% (9.9ms) | Samples: 0

**Called by:**
- `try_new_function` (8)

**Calls:**
- `tryNewFunction` (4)
- `tryNewFunction` (4)

### `ZigStates`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (16.4ms) | Samples: 0

**Called by:**
- `statemachine_clone` (8)
- `ZigReader` (5)

**Calls:**
- `GoLikeStates` (12)
- `(anonymous)` (1)

### `get parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:278` | Self: 0.0% (0us) | Total: 0.1% (26.6ms) | Samples: 0

**Called by:**
- `parameterCount` (23)

**Calls:**
- `flatMap` (23)

### `restartNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:947` | Self: 0.0% (0us) | Total: 0.1% (20.8ms) | Samples: 0

**Called by:**
- `pushNewFunction` (11)
- `_start_function` (2)
- `_function` (2)
- `_state_dec_to_imp` (1)
- `_function_name` (1)

**Calls:**
- `confirmNewFunction` (17)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:552` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `raw` (2)

### `PLSQLReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:30` | Self: 0.0% (0us) | Total: 0.0% (6.5ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (5)

**Calls:**
- `PLSQLStates` (5)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:34` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `_state_global` (1)

**Calls:**
- `returnFromState` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:174` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `_read_namespace` (1)

**Calls:**
- `readUntilThen` (1)

### `JavaReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:80` | Self: 0.0% (0us) | Total: 0.1% (32.1ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (28)

**Calls:**
- `CLikeReader` (11)
- `CLikeReader` (10)
- `CLikeReader` (4)
- `CLikeReader` (2)
- `FunctionInfo` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:48` | Self: 0.0% (0us) | Total: 0.0% (999us) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `_parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:200` | Self: 0.0% (0us) | Total: 0.1% (17.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (15)

**Calls:**
- `parameter` (15)

### `_function_args`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:159` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `pushNewFunction` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:57` | Self: 0.0% (0us) | Total: 0.6% (109.8ms) | Samples: 0

**Called by:**
- `generatorResume` (92)

**Calls:**
- `next` (84)
- `generatorResume` (8)

### `_state_objc_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:72` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `addToLongFunctionName` (1)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:310` | Self: 0.0% (0us) | Total: 0.1% (22.1ms) | Samples: 0

**Called by:**
- `generatorResume` (18)

**Calls:**
- `next` (13)
- `generatorResume` (5)

### `_state_class_declaration`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:203` | Self: 0.0% (0us) | Total: 0.0% (6.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `consume` (4)
- `consume` (2)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:284` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `process` (1)

**Calls:**
- `isTripleQuotedString` (1)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:160` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `tryNewFunction` (1)

### `_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:244` | Self: 0.0% (0us) | Total: 0.0% (7.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `(anonymous)` (6)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:107` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `_if_then`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:281` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `addBareNesting` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:32` | Self: 0.0% (0us) | Total: 0.3% (63.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (35)
- `_state_global` (11)
- `_state_global` (3)
- `_state_global` (2)

**Calls:**
- `cloneState` (51)

### `readUntilThen`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:305` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `_read_namespace_name` (4)

**Calls:**
- `finishNamespaceName` (3)
- `finishNamespaceName` (1)

### `ObjCReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:20` | Self: 0.0% (0us) | Total: 0.1% (23.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (20)

**Calls:**
- `ObjCStates` (18)
- `CLikeNestingStackStates` (2)

### `PHPReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:39` | Self: 0.0% (0us) | Total: 0.0% (10.8ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (9)

**Calls:**
- `CodeReader` (4)
- `CodeReader` (3)
- `CodeReader` (1)
- `CodeReader` (1)

### `ScalaReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:24` | Self: 0.0% (0us) | Total: 0.0% (9.8ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (8)

**Calls:**
- `CodeReader` (3)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `CLikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:44` | Self: 0.0% (0us) | Total: 0.1% (19.0ms) | Samples: 0

**Called by:**
- `TTCNReader` (6)
- `JavaReader` (4)
- `ObjCReader` (2)
- `analyzeSourceCode` (2)

**Calls:**
- `CppRValueRefStates` (14)

### `JavaScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/javascript.ts:17` | Self: 0.0% (0us) | Total: 0.1% (23.3ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (19)

**Calls:**
- `TypeScriptReader` (11)
- `TypeScriptReader` (8)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:64` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `raw` (2)

### `consume`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:135` | Self: 0.0% (0us) | Total: 0.5% (91.3ms) | Samples: 0

**Called by:**
- `process` (66)
- `_function_has_param` (7)
- `_if` (3)

**Calls:**
- `invokeCurrentState` (75)
- `invokeCurrentState` (1)

### `_state_after_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:434` | Self: 0.0% (0us) | Total: 0.0% (8.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `addToLongFunctionName` (7)

### `ErlangStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:408` | Self: 0.0% (0us) | Total: 0.0% (7.8ms) | Samples: 0

**Called by:**
- `statemachine_clone` (4)
- `ErlangReader` (3)

**Calls:**
- `(anonymous)` (4)
- `CodeStateMachine` (3)

### `rubyTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:59` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `MyToken` (1)

### `_state_func_first_line`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:472` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `statemachine_clone` (4)
- `subState` (1)
- `statemachine_clone` (1)

### `FortranStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:125` | Self: 0.0% (0us) | Total: 0.0% (11.7ms) | Samples: 0

**Called by:**
- `FortranReader` (10)

**Calls:**
- `(anonymous)` (7)
- `CodeStateMachine` (3)

### `StStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:117` | Self: 0.0% (0us) | Total: 0.0% (6.1ms) | Samples: 0

**Called by:**
- `StReader` (5)

**Calls:**
- `CodeStateMachine` (3)
- `(anonymous)` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:38` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (2)

**Calls:**
- `raw` (2)

### `TTCNReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:33` | Self: 0.0% (0us) | Total: 0.1% (33.5ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (28)

**Calls:**
- `TTCNStates` (20)
- `CLikeNestingStackStates` (8)

### `(module)`
`bun:main:14` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `isServerConfig` (1)

### `TTCNReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:32` | Self: 0.0% (0us) | Total: 0.2% (44.2ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (36)

**Calls:**
- `CLikeReader` (16)
- `CLikeReader` (12)
- `CLikeReader` (6)
- `CLikeReader` (2)

### `CSharpStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts:43` | Self: 0.0% (0us) | Total: 0.1% (18.3ms) | Samples: 0

**Called by:**
- `CSharpReader` (16)

**Calls:**
- `CLikeStates` (14)
- `(anonymous)` (2)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:547` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `raw` (2)

### `_state_function_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:185` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `tryNewFunction` (1)
- `tryNewFunction` (1)
- `tryNewFunction` (1)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:73` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `addToFunctionName` (2)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:57` | Self: 0.0% (0us) | Total: 40.8% (6.88s) | Samples: 0

**Called by:**
- `operation` (5749)

**Calls:**
- `get_reader_for` (5741)
- `get_reader_for` (8)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:81` | Self: 0.0% (0us) | Total: 1.3% (227.1ms) | Samples: 0

**Called by:**
- `generatorResume` (191)

**Calls:**
- `next` (184)
- `generatorResume` (7)

### `_def_parameters`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:109` | Self: 0.0% (0us) | Total: 0.0% (5.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `parameter` (5)

### `PythonReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:113` | Self: 0.0% (0us) | Total: 0.0% (13.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (6)
- `GDScriptReader` (5)

**Calls:**
- `PythonStates` (11)

### `restartNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:946` | Self: 0.0% (0us) | Total: 0.3% (56.5ms) | Samples: 0

**Called by:**
- `pushNewFunction` (33)
- `_function` (5)
- `_function_name` (3)
- `_start_function` (3)
- `_state_global` (1)
- `_function_name` (1)

**Calls:**
- `tryNewFunction` (23)
- `tryNewFunction` (15)
- `tryNewFunction` (8)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:159` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `matchAt` (2)

### `func_match_failed`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:498` | Self: 0.0% (0us) | Total: 0.0% (5.2ms) | Samples: 0

**Called by:**
- `_state_after_name` (4)

**Calls:**
- `consume` (3)
- `next` (1)

### `addNamespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:847` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `finishNamespaceName` (1)

**Calls:**
- `nestingStackAdapter` (1)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:307` | Self: 0.0% (0us) | Total: 1.9% (335.9ms) | Samples: 0

**Called by:**
- `generatorResume` (283)

**Calls:**
- `next` (235)
- `generatorResume` (48)

### `_state_after_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:438` | Self: 0.0% (0us) | Total: 0.0% (6.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `func_match_failed` (4)
- `func_match_failed` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:28` | Self: 0.0% (0us) | Total: 0.1% (22.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (8)
- `_state_global` (5)
- `_state_global` (5)
- `_state_global` (1)

**Calls:**
- `pushNewFunction` (19)

### `_expecting_func_opening_bracket`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:486` | Self: 0.0% (0us) | Total: 0.0% (12.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (10)

**Calls:**
- `_consume_type_annotation` (10)

### `pushNewFunction`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:956` | Self: 0.0% (0us) | Total: 0.3% (53.9ms) | Samples: 0

**Called by:**
- `_state_global` (19)
- `_state_global` (10)
- `_push_function_to_stack` (10)
- `_def` (3)
- `_function_args` (2)

**Calls:**
- `restartNewFunction` (33)
- `restartNewFunction` (11)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:37` | Self: 0.0% (0us) | Total: 0.4% (80.4ms) | Samples: 0

**Called by:**
- `generatorResume` (68)

**Calls:**
- `next` (57)
- `generatorResume` (11)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:73` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (1)

**Calls:**
- `raw` (1)

### `SwiftReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:62` | Self: 0.0% (0us) | Total: 0.0% (8.7ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (7)

**Calls:**
- `SwiftStates` (7)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:79` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `_expect_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:57` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (12)

**Calls:**
- `cloneState` (12)

### `_soft_keyword_lookahead`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:308` | Self: 0.0% (0us) | Total: 0.1% (32.9ms) | Samples: 0

**Called by:**
- `generatorResume` (26)

**Calls:**
- `isPythonWhitespace` (25)
- `every` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:72` | Self: 0.0% (0us) | Total: 10.1% (1.70s) | Samples: 0

**Called by:**
- `generatorResume` (1418)

**Calls:**
- `next` (1328)
- `generatorResume` (90)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:83` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `addToLongFunctionName` (6)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:475` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `isParameter` (2)
- `isParameter` (2)

### `_state_entering_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:445` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `confirmNewFunction` (1)

### `_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:477` | Self: 0.0% (0us) | Total: 0.0% (10.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `parameter` (7)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:179` | Self: 0.0% (0us) | Total: 0.0% (7.3ms) | Samples: 0

**Called by:**
- `_state_global` (6)

**Calls:**
- `_state_global` (6)

### `process`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:605` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `statemachine_before_return` (1)

### `TSXReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:19` | Self: 0.0% (0us) | Total: 0.1% (23.5ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (20)

**Calls:**
- `TypeScriptReader` (16)
- `TypeScriptReader` (4)

### `PHPReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts:40` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (12)

**Calls:**
- `PHPLanguageStates` (12)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:140` | Self: 0.0% (0us) | Total: 0.0% (3.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `popNesting` (3)

### `RubylikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:150` | Self: 0.0% (0us) | Total: 0.1% (22.4ms) | Samples: 0

**Called by:**
- `RubyReader` (12)
- `LuaReader` (7)

**Calls:**
- `CodeReader` (8)
- `CodeReader` (5)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:80` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `map` (1)

### `_expect_function_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts:80` | Self: 0.0% (0us) | Total: 0.1% (17.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (15)

**Calls:**
- `next` (14)
- `consume` (1)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:221` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `addToLongFunctionName` (3)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:49` | Self: 0.0% (0us) | Total: 0.0% (8.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (7)

**Calls:**
- `_state_global` (4)
- `_state_global` (1)
- `_state_global` (1)
- `_state_global` (1)

### `_start_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:202` | Self: 0.0% (0us) | Total: 0.0% (5.7ms) | Samples: 0

**Called by:**
- `_state_global` (5)

**Calls:**
- `restartNewFunction` (3)
- `restartNewFunction` (2)

### `JavaClassBodyStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:86` | Self: 0.0% (0us) | Total: 0.2% (38.4ms) | Samples: 0

**Called by:**
- `_state_class_declaration` (31)

**Calls:**
- `JavaStates` (31)

### `PerlStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:99` | Self: 0.0% (0us) | Total: 0.0% (14.7ms) | Samples: 0

**Called by:**
- `PerlReader` (12)

**Calls:**
- `(anonymous)` (7)
- `CodeStateMachine` (5)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:95` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:43` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (3)

**Calls:**
- `raw` (3)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:540` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `raw` (2)

### `subState`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:205` | Self: 0.0% (0us) | Total: 0.0% (10.0ms) | Samples: 0

**Called by:**
- `_def_continue` (7)
- `_state_func_first_line` (1)

**Calls:**
- `next` (7)
- `next` (1)

### `(module)`
`/tmp/vibe-lizard-harness-only.ts:5` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Calls:**
- `importModule` (1)

### `_function_args_continue`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts:172` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `addToLongFunctionName` (1)

### `TypeScriptStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:160` | Self: 0.0% (0us) | Total: 0.7% (120.5ms) | Samples: 0

**Called by:**
- `statemachine_clone` (73)
- `TypeScriptReader` (27)

**Calls:**
- `(anonymous)` (76)
- `CodeStateMachine` (24)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:26` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `(anonymous)`
`/tmp/vibe-lizard-harness-only.ts:7` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `readFileSync` (1)

### `SolidityReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/solidity.ts:22` | Self: 0.0% (0us) | Total: 0.0% (16.1ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (13)

**Calls:**
- `SolidityStates` (13)

### `_read_namespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:169` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `(anonymous)` (1)
- `_read_namespace_name` (1)

### `_function_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:97` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `next` (1)

### `_function_body`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:116` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `shift` (1)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:53` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `restartNewFunction` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:554` | Self: 0.0% (0us) | Total: 0.0% (6.2ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `consume` (4)
- `consume` (1)

### `consumeErlangAtom`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:380` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `generatePygmentsCompatibleErlangTokenValues` (2)

**Calls:**
- `matchAt` (2)

### `_state_dec_to_imp`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:332` | Self: 0.0% (0us) | Total: 0.2% (37.6ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (31)

**Calls:**
- `consume` (23)
- `next` (7)
- `consume` (1)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:174` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `matchAt` (2)

### `readDeclarationToken`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:309` | Self: 0.0% (0us) | Total: 0.1% (31.0ms) | Samples: 0

**Called by:**
- `readInsideBracketsThen` (24)

**Calls:**
- `parameter` (24)

### `analyzeLizardSource`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts:63` | Self: 0.0% (0us) | Total: 0.3% (60.4ms) | Samples: 0

**Called by:**
- `operation` (52)

**Calls:**
- `map` (52)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts:29` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `PythonStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:376` | Self: 0.0% (0us) | Total: 0.1% (25.9ms) | Samples: 0

**Called by:**
- `PythonReader` (11)
- `GDScriptStates` (10)

**Calls:**
- `(anonymous)` (17)
- `CodeStateMachine` (4)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:41` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `_state_dec` (6)

### `get parameter_count`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:274` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `get parameterCount` (1)

### `set_nesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:81` | Self: 0.0% (0us) | Total: 0.0% (4.9ms) | Samples: 0

**Called by:**
- `preprocess` (4)

**Calls:**
- `addBareNesting` (4)

### `_function_name`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:145` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `restartNewFunction` (1)
- `restartNewFunction` (1)

### `CLikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:43` | Self: 0.0% (0us) | Total: 0.1% (17.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (8)
- `JavaReader` (2)
- `CSharpReader` (2)
- `TTCNReader` (2)
- `ObjCReader` (1)

**Calls:**
- `CLikeNestingStackStates` (15)

### `set_nesting`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:77` | Self: 0.0% (0us) | Total: 0.0% (9.3ms) | Samples: 0

**Called by:**
- `reset` (4)
- `preprocess` (4)

**Calls:**
- `popNesting` (8)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts:86` | Self: 0.0% (0us) | Total: 4.4% (750.8ms) | Samples: 0

**Called by:**
- `generatorResume` (633)

**Calls:**
- `next` (497)
- `generatorResume` (136)

### `CLikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:42` | Self: 0.0% (0us) | Total: 0.4% (76.2ms) | Samples: 0

**Called by:**
- `TTCNReader` (16)
- `CSharpReader` (15)
- `ObjCReader` (12)
- `JavaReader` (10)
- `analyzeSourceCode` (8)

**Calls:**
- `CLikeStates` (61)

### `TypeScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:34` | Self: 0.0% (0us) | Total: 0.2% (33.7ms) | Samples: 0

**Called by:**
- `JavaScriptReader` (8)
- `VueReader` (8)
- `analyzeSourceCode` (7)
- `TSXReader` (4)

**Calls:**
- `TypeScriptStates` (27)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:41` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (2)

**Calls:**
- `consume` (2)

### `_extract_function_names`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:185` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `_state_global` (3)

**Calls:**
- `isRNameFragment` (2)
- `isRNameFragment` (1)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/rust.ts:41` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `commentCounter` (2)

**Calls:**
- `get_comment_from_token` (2)

### `LuaStateMachine`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:39` | Self: 0.0% (0us) | Total: 0.1% (17.2ms) | Samples: 0

**Called by:**
- `statemachine_clone` (9)
- `LuaReader` (6)

**Calls:**
- `RubylikeStateMachine` (12)
- `(anonymous)` (3)

### `_state_function`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:257` | Self: 0.0% (0us) | Total: 0.1% (22.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (20)

**Calls:**
- `next` (11)
- `consume` (7)
- `consume` (1)
- `consume` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:73` | Self: 0.0% (0us) | Total: 0.0% (5.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (5)

**Calls:**
- `_start_function` (5)

### `rubyTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts:55` | Self: 0.0% (0us) | Total: 2.1% (355.1ms) | Samples: 0

**Called by:**
- `generatorResume` (296)

**Calls:**
- `next` (256)
- `generatorResume` (36)
- `generate_common_tokens` (4)

### `ZigReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts:21` | Self: 0.0% (0us) | Total: 0.0% (12.2ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (10)

**Calls:**
- `CodeReader` (3)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `finishNamespaceName`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:189` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `readUntilThen` (1)

**Calls:**
- `addNamespace` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:73` | Self: 0.0% (0us) | Total: 0.7% (127.8ms) | Samples: 0

**Called by:**
- `generatorResume` (104)

**Calls:**
- `isPythonWhitespace` (102)
- `every` (2)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:256` | Self: 0.0% (0us) | Total: 0.0% (9.1ms) | Samples: 0

**Called by:**
- `generatorResume` (7)

**Calls:**
- `isPythonWhitespace` (7)

### `consumeErlangWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:231` | Self: 0.0% (0us) | Total: 0.1% (27.1ms) | Samples: 0

**Called by:**
- `generatePygmentsCompatibleErlangTokenValues` (21)

**Calls:**
- `isPythonWhitespace` (21)

### `RustReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/rust.ts:29` | Self: 0.0% (0us) | Total: 0.0% (12.7ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (10)

**Calls:**
- `RustStates` (10)

### `isRNameFragment`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:231` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `_extract_function_names` (2)

**Calls:**
- `match` (2)

### `_state_class_declaration`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:204` | Self: 0.0% (0us) | Total: 0.2% (38.4ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (31)

**Calls:**
- `JavaClassBodyStates` (31)

### `get_comment_from_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:48` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `commentCounter` (1)

**Calls:**
- `get_comment_from_token` (1)

### `PerlReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts:45` | Self: 0.0% (0us) | Total: 0.1% (17.8ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (15)

**Calls:**
- `CodeReader` (9)
- `CodeReader` (2)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:43` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (1)

**Calls:**
- `raw` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:374` | Self: 0.0% (0us) | Total: 0.0% (7.0ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (6)

**Calls:**
- `_consume_type_annotation` (6)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:60` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `restartNewFunction` (1)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts:38` | Self: 0.0% (0us) | Total: 0.2% (37.6ms) | Samples: 0

**Called by:**
- `filter` (31)

**Calls:**
- `isPythonWhitespace` (30)
- `every` (1)

### `_def`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:70` | Self: 0.0% (0us) | Total: 0.0% (3.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `pushNewFunction` (3)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.0% (15.2ms) | Samples: 0

**Calls:**
- `anonymous` (3)

### `_read_params`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts:109` | Self: 0.0% (0us) | Total: 0.0% (5.1ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `addToLongFunctionName` (4)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `JavaFunctionBodyStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts:38` | Self: 0.0% (0us) | Total: 0.1% (25.2ms) | Samples: 0

**Called by:**
- `_state_imp` (21)

**Calls:**
- `JavaStates` (21)

### `PLSQLReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:31` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (1)

**Calls:**
- `Set` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:545` | Self: 0.0% (0us) | Total: 0.0% (5.5ms) | Samples: 0

**Called by:**
- `generatorResume` (5)

**Calls:**
- `raw` (5)

### `_state_objc_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts:76` | Self: 0.0% (0us) | Total: 0.0% (4.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (4)

**Calls:**
- `consume` (4)

### `_state_dec`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:296` | Self: 0.0% (0us) | Total: 0.4% (77.8ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (38)
- `(anonymous)` (21)
- `(anonymous)` (6)

**Calls:**
- `readInsideBracketsThen` (52)
- `readInsideBracketsThen` (10)
- `readInsideBracketsThen` (1)
- `readInsideBracketsThen` (1)
- `readInsideBracketsThen` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:544` | Self: 0.0% (0us) | Total: 0.0% (3.3ms) | Samples: 0

**Called by:**
- `generatorResume` (3)

**Calls:**
- `raw` (3)

### `KotlinStates`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts:59` | Self: 0.0% (0us) | Total: 0.2% (43.5ms) | Samples: 0

**Called by:**
- `statemachine_clone` (18)
- `KotlinReader` (15)

**Calls:**
- `GoLikeStates` (30)
- `(anonymous)` (3)

### `JavaReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts:81` | Self: 0.0% (0us) | Total: 0.3% (56.2ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (47)

**Calls:**
- `JavaStates` (38)
- `CLikeNestingStackStates` (9)

### `_consume_type_annotation`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:532` | Self: 0.0% (0us) | Total: 0.1% (19.4ms) | Samples: 0

**Called by:**
- `_expecting_func_opening_bracket` (10)
- `_state_global` (6)

**Calls:**
- `TypeScriptTypeAnnotationStates` (16)

### `ErlangReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:68` | Self: 0.0% (0us) | Total: 0.0% (12.5ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (11)

**Calls:**
- `CodeReader` (5)
- `CodeReader` (2)
- `CodeReader` (1)
- `FunctionInfo` (1)
- `CodeReader` (1)
- `CodeReader` (1)

### `get nestingStackAdapter`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1006` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `startNewFunctionNesting` (2)
- `currentNestingLevel` (2)

**Calls:**
- `asNestingStackAdapter` (4)

### `PLSQLReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts:29` | Self: 0.0% (0us) | Total: 0.0% (5.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (5)

**Calls:**
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (1)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:272` | Self: 0.0% (0us) | Total: 0.1% (30.4ms) | Samples: 0

**Called by:**
- `generatorResume` (26)

**Calls:**
- `isPythonWhitespace` (26)

### `preprocess`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts:38` | Self: 0.0% (0us) | Total: 0.1% (29.4ms) | Samples: 0

**Called by:**
- `generatorResume` (24)

**Calls:**
- `isPythonWhitespace` (24)

### `(anonymous)`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts:81` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (1)

**Calls:**
- `_state_imp` (1)

### `PythonReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts:112` | Self: 0.0% (0us) | Total: 0.1% (31.5ms) | Samples: 0

**Called by:**
- `GDScriptReader` (17)
- `analyzeSourceCode` (8)

**Calls:**
- `CodeReader` (12)
- `CodeReader` (5)
- `CodeReader` (2)
- `CodeReader` (2)
- `CodeReader` (2)
- `(anonymous)` (1)
- `CodeReader` (1)

### `parameter_bracket_open`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts:230` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `readDeclarationToken` (1)

**Calls:**
- `hasParameterBracketDefinitions` (1)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:358` | Self: 0.0% (0us) | Total: 0.2% (34.5ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (29)

**Calls:**
- `cloneState` (29)

### `withoutWhitespace`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:1508` | Self: 0.0% (0us) | Total: 1.4% (249.3ms) | Samples: 0

**Called by:**
- `generatorResume` (203)

**Calls:**
- `isPythonWhitespace` (202)
- `every` (1)

### `generatePygmentsCompatibleErlangTokenValues`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts:152` | Self: 0.0% (0us) | Total: 0.0% (4.8ms) | Samples: 0

**Called by:**
- `generatorResume` (4)

**Calls:**
- `matchAt` (4)

### `LuaReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts:19` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (6)

**Calls:**
- `LuaStateMachine` (6)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:774` | Self: 0.0% (0us) | Total: 0.0% (14.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (12)

**Calls:**
- `FunctionInfo` (7)
- `FunctionInfo` (5)

### `GDScriptReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts:28` | Self: 0.0% (0us) | Total: 0.1% (28.4ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (22)

**Calls:**
- `PythonReader` (17)
- `PythonReader` (5)

### `read_object`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts:384` | Self: 0.0% (0us) | Total: 0.0% (6.9ms) | Samples: 0

**Called by:**
- `_state_global` (6)

**Calls:**
- `cloneState` (6)

### `process_token`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts:49` | Self: 0.0% (0us) | Total: 0.1% (16.9ms) | Samples: 0

**Called by:**
- `generatorResume` (14)

**Calls:**
- `next` (8)
- `process_token` (5)
- `generatorResume` (1)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:504` | Self: 0.0% (0us) | Total: 0.0% (2.6ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `raw` (2)

### `FileInfoBuilder`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts:773` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `analyzeSourceCode` (4)

**Calls:**
- `FileInformation` (2)
- `FileInformation` (2)

### `RubylikeReader`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts:151` | Self: 0.0% (0us) | Total: 0.0% (14.4ms) | Samples: 0

**Called by:**
- `LuaReader` (6)
- `RubyReader` (6)

**Calls:**
- `RubylikeStateMachine` (12)

### `_state_global`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts:174` | Self: 0.0% (0us) | Total: 0.0% (3.7ms) | Samples: 0

**Called by:**
- `invokeCurrentState` (3)

**Calls:**
- `addBareNesting` (3)

### `generateTokens`
`/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts:546` | Self: 0.0% (0us) | Total: 0.0% (4.5ms) | Samples: 0

**Called by:**
- `generatorResume` (4)

**Calls:**
- `raw` (4)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.0% (981us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 78.3% | 13.17s | `[native code]` |
| 9.7% | 1.63s | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts` |
| 3.3% | 568.4ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts` |
| 2.0% | 348.7ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/clike.ts` |
| 1.1% | 200.5ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts` |
| 1.1% | 187.9ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/golike.ts` |
| 0.4% | 74.4ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/swift.ts` |
| 0.3% | 59.4ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/rubylike.ts` |
| 0.3% | 54.9ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/python.ts` |
| 0.3% | 53.4ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/erlang.ts` |
| 0.3% | 53.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/plsql.ts` |
| 0.3% | 53.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java.ts` |
| 0.2% | 50.0ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/fortran.ts` |
| 0.2% | 33.9ms | `/tmp/vibe-lizard-harness-only.ts` |
| 0.1% | 24.6ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/kotlin.ts` |
| 0.1% | 23.6ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts` |
| 0.1% | 21.7ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/perl.ts` |
| 0.1% | 19.8ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/st.ts` |
| 0.1% | 19.5ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/java-body-states.ts` |
| 0.1% | 17.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/r.ts` |
| 0.1% | 16.9ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php-states.ts` |
| 0.0% | 15.9ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/tsx.ts` |
| 0.0% | 14.8ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/go.ts` |
| 0.0% | 12.6ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/csharp.ts` |
| 0.0% | 11.2ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/objc.ts` |
| 0.0% | 11.0ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/vue.ts` |
| 0.0% | 10.2ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts` |
| 0.0% | 9.9ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/scala.ts` |
| 0.0% | 9.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/lua.ts` |
| 0.0% | 6.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/php.ts` |
| 0.0% | 6.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ttcn.ts` |
| 0.0% | 5.7ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts` |
| 0.0% | 4.7ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/ruby.ts` |
| 0.0% | 3.5ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/script-language.ts` |
| 0.0% | 3.5ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/gdscript.ts` |
| 0.0% | 1.3ms | `bun:main` |
| 0.0% | 1.3ms | `/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/zig.ts` |
| 0.0% | 981us | `internal:primordials` |

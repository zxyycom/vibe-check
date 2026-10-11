# 本地固定源码核对与实施位置证据

本资源保存本轮只读取得的源码，不依赖缓存继续存在。来源：本地 Git object；精确 commit 0488a260e74e73ceba3149d7c600faac6a3616e6；Python reader 源码适用 Lizard MIT，随包来源与法律 owner 见 licenses。未执行这些上游函数。

## 七模块身份核对

| Source | SHA-256 | 与前序调查相等 |
| --- | --- | --- |
| `lizard_languages/js_style_regex_expression.py` | `a16cea23ffec88a6599941630beb6b028a3b3e40f0f5a749928a67b998abff7c` | 是 |
| `lizard_languages/typescript.py` | `c073ffb9042b1debd9615dcb329c8dfa4b10e26f9bbeb46cfaa96705c9b39404` | 是 |
| `lizard_languages/tsx.py` | `f0b9437dfb47a872455073e7a14004d5297c20a13522902bfa8fa9059604807a` | 是 |
| `lizard_languages/python.py` | `920fa0672264d13744e14e88025e18e2b823c7727aaab1d1297732f64b0ab539` | 是 |
| `lizard_languages/kotlin.py` | `9b4628bbeb9b0588258af501ba3a4caf2f0bfcbc6e4d9608e3bb5272bffe51d5` | 是 |
| `lizard_languages/php_states.py` | `c66fc7335ffaf829c17e0828a29bc6faae241ea941be4d2e145e4abc53a2308b` | 是 |
| `lizard_languages/rust.py` | `17f9e9d5cf30bb63a6c49d6ec94528081e489df14536498ea2a840a648beb2c0` | 是 |

## 准确源码摘录

下面 Rust、Kotlin、regex 三个文件完整保存，无删改。TS/TSX/Python/PHP 及这三个模块的完整差异见同 owner 的 seven-module-delta.patch。该文件是 `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec` → `0488a260e74e73ceba3149d7c600faac6a3616e6` 的 `git diff --unified=0` 零上下文表示，保留全部实际新增/删除行及 path/blob 身份；它供取证阅读，不是可直接应用的 Product 补丁。

### lizard_languages/rust.py

```python
'''
Language parser for Rust lang
'''

from .code_reader import CodeReader
from .clike import CCppCommentsMixin
from .golike import GoLikeStates


class RustReader(CodeReader, CCppCommentsMixin):
    # pylint: disable=R0903

    ext = ['rs']
    language_names = ['rust']

    # Separated condition categories
    _control_flow_keywords = {'if', 'for', 'while', 'catch', 'where'}
    _logical_operators = {'&&', '||'}
    _case_keywords = set()  # Rust match arms are counted via `=>` in RustStates
    # Note: '?' in Rust is the error propagation operator, not ternary
    _ternary_operators = {'?'}

    def __init__(self, context):
        super().__init__(context)
        self.parallel_states = [RustStates(context)]

    @staticmethod
    def generate_tokens(source_code, addition='', token_class=None):
        addition = r"|(?:'\w+\b)"  # lifetimes, labels
        return CodeReader.generate_tokens(source_code, addition, token_class)


class RustStates(GoLikeStates):  # pylint: disable=R0903
    FUNC_KEYWORD = 'fn'

    def __init__(self, context, in_match_arms=False):
        super().__init__(context)
        self._in_match_arms = in_match_arms
        self._seen_match_arm = False
        self._match_subject_nesting = 0

    def _state_global(self, token):
        if token == '=>':
            if self._in_match_arms:
                if self._seen_match_arm:
                    self.context.add_condition()
                self._seen_match_arm = True
            return
        if token == 'match':
            self._match_subject_nesting = 0
            self._state = self._match_subject
            return
        super()._state_global(token)

    def _match_subject(self, token):
        if token in '([':
            self._match_subject_nesting += 1
            return
        if token in ')]':
            if self._match_subject_nesting:
                self._match_subject_nesting -= 1
            return
        if token != '{' or self._match_subject_nesting:
            return
        self.sub_state(
            RustStates(self.context, in_match_arms=True),
            self._end_match)

    def _end_match(self):
        self.next(self._state_global)
```

### lizard_languages/kotlin.py

```python
'''
Language parser for Apple Swift
'''

from .clike import CCppCommentsMixin
from .code_reader import CodeReader, CodeStateMachine
from .golike import GoLikeStates
from .swift import SwiftReplaceLabel


class KotlinReader(CodeReader, CCppCommentsMixin, SwiftReplaceLabel):
    # pylint: disable=R0903

    ext = ['kt', 'kts']
    language_names = ['kotlin']

    # Separated condition categories
    _control_flow_keywords = {'if', 'for', 'while', 'catch'}
    _logical_operators = {'&&', '||'}
    _case_keywords = set()  # Kotlin uses 'when' expressions, not case
    _ternary_operators = {'?:'}  # Elvis operator

    def __init__(self, context):
        super(KotlinReader, self).__init__(context)
        self.parallel_states = [KotlinStates(context)]

    @staticmethod
    def generate_tokens(source_code, addition='', token_class=None):
        return CodeReader.generate_tokens(
            source_code,
            r"|`\w+`" +
            r"|\w+\?" +
            r"|\w+\!!" +
            r"|\?\?" +
            r"|\?:" +
            addition
        )


class KotlinStates(GoLikeStates):  # pylint: disable=R0903

    FUNC_KEYWORD = 'fun'
    _EXPRESSION_BODY_ENDERS = {
        'fun', 'class', 'interface', 'val', 'var', 'get', 'set',
    }

    def __init__(self, context, in_when_cases=False):
        super().__init__(context)
        self._in_when_cases = in_when_cases
        self._expr_nesting = 0
        self._when_return_state = self._state_global

    def _state_global(self, token):
        if token in ('get', 'set'):
            self.context.push_new_function(token)
            self._state = self._expect_function_impl
        elif token == '->':
            if self._in_when_cases:
                self.context.add_condition()
            else:
                self.context.push_new_function("(anonymous)")
                self._state = super(KotlinStates, self)._expect_function_impl
        elif token in ('val', 'var', ','):
            self._state = self._expect_declaration_name
        elif token == 'interface':
            self._state = self._interface
        elif token == 'when':
            self._start_when(self._state_global)
        else:
            super(KotlinStates, self)._state_global(token)

    def _expect_declaration_name(self, token):
        self._state = self._state_global

    def _expect_function_impl(self, token):
        if token == '=':
            self._expr_nesting = 0
            self._state = self._expression_body
        elif token == '{':
            self.next(self._function_impl, token)

    def _start_when(self, return_state):
        self._when_return_state = return_state
        self._state = self._when_cases

    def _expression_body(self, token):
        if token == 'when':
            self._start_when(self._expression_body)
            return
        if token in '{([':
            self._expr_nesting += 1
            return
        if token in ')]}':
            if self._expr_nesting > 0:
                self._expr_nesting -= 1
                return
            if token == '}':
                self._end_expression_body(token)
            return
        if self._expr_nesting == 0 and self._is_expression_body_ender(token):
            self._end_expression_body(token)

    def _is_expression_body_ender(self, token):
        if token == 'class' and self.last_token == '::':
            return False
        return token in self._EXPRESSION_BODY_ENDERS

    def _end_expression_body(self, token):
        self.context.end_of_function()
        self.next(self._state_global, token)

    def statemachine_before_return(self):
        if self._state == self._expression_body:
            self.context.end_of_function()

    @CodeStateMachine.read_inside_brackets_then("{}")
    def _interface(self, end_token):
        if end_token == "}":
            self._state = self._state_global

    def _function_name(self, token):
        if token == "<":
            self.next(self._template, token)
        else:
            return super(KotlinStates, self)._function_name(token)

    @CodeStateMachine.read_inside_brackets_then("<>", "_function_name")
    def _template(self, tokens):
        pass

    def _when_cases(self, token):
        def callback():
            self.context.add_condition(inc=-1)
            self.next(self._when_return_state)
        if token != '{':
            return
        self.sub_state(KotlinStates(self.context, in_when_cases=True), callback)
```

### lizard_languages/js_style_regex_expression.py

```python
'''
generate token with javascript style regular expression.
'''

import re


def js_style_regex_expression(func):
    def generate_tokens_with_regex(source_code, addition='', token_class=None):
        # Recognize literals before strings or JSX can consume their contents.
        # Expression-opening punctuation distinguishes them from division.
        regex = (r"/(?![/*])(?:\\[^\r\n]|\[(?:\\[^\r\n]|[^\\\]\r\n])*\]"
                 r"|[^/\\[\r\n])+/[a-z]*")
        addition += r"|(?:\A|(?<=[=,({[?:!&|;]))\s*" + regex
        for token in func(source_code, addition, token_class):
            stripped = token.lstrip()
            if stripped.startswith('/') and not token.startswith('/'):
                # Keep whitespace/newlines observable to the metric counters.
                prefix = token[:len(token) - len(stripped)]
                yield from re.findall(r"\n|[^\S\n]+", prefix)
                yield stripped
            else:
                yield token
    return generate_tokens_with_regex
```

// Audit-only operation counts. Run in a disposable process under external hard timeout.
// Patches are restored in finally; no production source, fixtures, tests or metrics policy changed.
import { analyzeLizardSource } from '../../../../src/package-checks/function-metrics/analyzer/port-facade.ts';
import { FunctionInfo } from '../../../../src/package-checks/function-metrics/analyzer/analysis-model.ts';
import { NestingStack } from '../../../../src/package-checks/function-metrics/analyzer/analysis-context.ts';
import { CodeStateMachine } from '../../../../src/package-checks/function-metrics/analyzer/shared/code-reader.ts';
import { RubyReader } from '../../../../src/package-checks/function-metrics/analyzer/readers/ruby.ts';
const observations: unknown[] = [];
const oldAdd = FunctionInfo.prototype.addToLongName;
const oldConsume = CodeStateMachine.prototype.consume;
const oldNamespace = NestingStack.prototype.withNamespace;
const oldExec = RegExp.prototype.exec;
let longCalls = 0, longCharacters = 0, consumeCalls = 0, namespaceCalls = 0, namespaceSlots = 0;
let quotedMatches = 0, quotedMatchedCharacters = 0;
FunctionInfo.prototype.addToLongName = function (s: string) {
  longCalls++; longCharacters += this.longName.length;
  return oldAdd.call(this, s);
};
CodeStateMachine.prototype.consume = function (s: string) { consumeCalls++; return oldConsume.call(this, s); };
NestingStack.prototype.withNamespace = function (s: string) {
  namespaceCalls++; namespaceSlots += this.nesting_stack.length; return oldNamespace.call(this, s);
};
RegExp.prototype.exec = function (s: string) {
  const m = oldExec.call(this, s);
  if (this.global && this.source.includes('0x') && m?.[0].startsWith('"') && m[0].includes('#{')) {
    quotedMatches++; quotedMatchedCharacters += m[0].length;
  }
  return m;
};
function analyze(label: string, n: number, filename: string, sourceCode: string) {
  longCalls = longCharacters = consumeCalls = namespaceCalls = namespaceSlots = 0;
  const result = analyzeLizardSource({ filename, sourceCode });
  observations.push({ label, n, bytes: Buffer.byteLength(sourceCode), functionCount: result?.function_list.length,
    parameterCounts: result?.function_list.map(f=>f.parameter_count), longCalls, longCharacters, consumeCalls, namespaceCalls, namespaceSlots });
}
try {
  for (const n of [16, 32, 64, 128]) {
    analyze('long-python-signature', n, 'audit.py', `def f(${Array.from({length:n}, (_,i)=>'a'+i).join(',')}):\n pass\n`);
    analyze('nested-go-blocks', n, 'audit.go', `package main\nfunc f(){${'{'.repeat(n)}${'_ = 1;'.repeat(n)}${'}'.repeat(n)}}`);
    analyze('nested-ts-parentheses', n, 'audit.ts', `const x = ${'('.repeat(n)}1${')'.repeat(n)};`);
    analyze('nested-cpp-no-functions', n, 'audit.cpp', `${'namespace a {'.repeat(n)}${'extern int x;'.repeat(n)}${'}'.repeat(n)}`);
    quotedMatches = quotedMatchedCharacters = 0;
    const source = `x = "${'#{1}'.repeat(n)}"`;
    const tokens = [...RubyReader.generateTokens(source)];
    observations.push({label:'ruby-flat-interpolations',n,bytes:Buffer.byteLength(source),tokens:tokens.length,quotedMatches,quotedMatchedCharacters});
  }
  analyze('legal-cpp-array-parameter', 64, 'audit.cpp', `void f(int ${'a'.repeat(64)}[]) {}`);
  console.log(JSON.stringify({ runtime: process.versions, method:'instrumented production operations; no wall-time measurements', observations }, null, 2));
} finally {
 FunctionInfo.prototype.addToLongName = oldAdd; CodeStateMachine.prototype.consume = oldConsume;
 NestingStack.prototype.withNamespace = oldNamespace; RegExp.prototype.exec = oldExec;
}

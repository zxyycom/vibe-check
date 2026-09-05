import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode } from "../pipeline.ts";
import type { FunctionInfo } from "../analysis-model.ts";
import type { ReaderConstructor } from "../contracts.ts";
import { CLikeReader } from "../shared/clike.ts";
import { CSharpReader } from "./csharp.ts";
import { JavaReader } from "./java.ts";
import { ObjCReader } from "./objc.ts";
import { TTCNReader } from "./ttcn.ts";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/lizard-1.24.0");

test("C-like shared reader preserves every C and C++ suffix plus the edge oracle", () => {
  for (const suffix of ["c", "cpp", "cc", "cxx", "h", "hpp"]) {
    assert.deepEqual(readFixture("c-like", `normal.${suffix}`, CLikeReader), [
      sample("reader_sample")
    ]);
  }
  assert.deepEqual(readFixture("c-like", "edge.c", CLikeReader), [sample("reader_sample")]);
});

test("Java, C#, Objective-C, and TTCN preserve every reader suffix and edge oracle", () => {
  for (const fixture of ["normal.java", "edge.java"])
    assert.deepEqual(readFixture("java", fixture, JavaReader), [sample("Sample::readerSample")]);
  for (const fixture of ["normal.cs", "edge.cs"])
    assert.deepEqual(readFixture("csharp", fixture, CSharpReader), [
      sample("Sample::ReaderSample")
    ]);
  for (const fixture of ["normal.m", "normal.mm", "edge.m"])
    assert.deepEqual(readFixture("objc", fixture, ObjCReader), [sample("readerSample:", 0)]);
  for (const fixture of ["normal.ttcn", "normal.ttcnpp", "edge.ttcn"])
    assert.deepEqual(readFixture("ttcn", fixture, TTCNReader), [sample("readerSample")]);
});

test("C-like family retains class qualification, annotations, generic declarations, expression members, selectors, and TTCN control names", () => {
  assert.deepEqual(
    measurements(
      analyze(
        "Box.java",
        "@Deprecated\nclass Box<T> {\n  int compute(T value) { if (value != null) return 1; return 0; }\n  java.util.function.Function<Integer, Integer> f = value -> value + 1;\n}\n",
        JavaReader
      )
    ),
    [{ ccn: 2, endLine: 3, name: "Box::compute", nloc: 1, parameterCount: 1, startLine: 3 }]
  );
  assert.deepEqual(
    measurements(
      analyze("Box.cs", "class Box { int Compute(int value) => value ?? 0; }\n", CSharpReader)
    ),
    [{ ccn: 2, endLine: 1, name: "Box::Compute", nloc: 1, parameterCount: 1, startLine: 1 }]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "Selectors.m",
        "- (int)sum:(int)left right:(int)right { if (left > right) return left; return right; }\n",
        ObjCReader
      )
    ),
    [{ ccn: 2, endLine: 1, name: "sum: right:", nloc: 1, parameterCount: 0, startLine: 1 }]
  );
  assert.deepEqual(
    measurements(
      analyze(
        "Sample.ttcn",
        "testcase sample(in integer value) runs on Component { if (value > 0) { } }\n",
        TTCNReader
      )
    ),
    [{ ccn: 2, endLine: 1, name: "__testcase__sample", nloc: 1, parameterCount: 1, startLine: 1 }]
  );
});

test("Java retains annotations, records, local and anonymous classes, static blocks, expression tokens, and old-C parameters", () => {
  const cases: readonly ReaderCase[] = [
    {
      sourceCode:
        "class LizardTest {\n  @Transactional(rollbackFor = Exception.class)\n  public void test1() {\n    if (CollectionUtils.isNotEmpty(list)) {}\n    for (String str : list) {}\n  }\n}\n",
      expected: [{ ccn: 3, name: "LizardTest::test1", parameterCount: 0 }]
    },
    {
      sourceCode:
        "record Person(String name, int age) { Person { if (age < 0) throw new IllegalArgumentException(); } void printInfo() {} }",
      expected: [{ ccn: 1, name: "Person::printInfo", parameterCount: 0 }]
    },
    {
      sourceCode:
        "class Outer { void method() { class Local { void innerMethod() {} } new Local().innerMethod(); } }",
      expected: [
        { ccn: 1, name: "Local::innerMethod", parameterCount: 0 },
        { ccn: 1, name: "Outer::method", parameterCount: 0 }
      ]
    },
    {
      sourceCode:
        "class Demo { public void test() { new Thread(new Runnable() { @Override public void run() { if(true) {} } public void testA() { if(true) {} } }).start(); } }",
      expected: [
        { ccn: 2, name: "(anonymous)::run", parameterCount: 0 },
        { ccn: 2, name: "(anonymous)::testA", parameterCount: 0 },
        { ccn: 1, name: "Demo::test", parameterCount: 0 }
      ]
    },
    {
      sourceCode: "class Init { static { class Local { void ignored(){} } } void method(){} }",
      expected: [
        { ccn: 1, name: "Local::ignored", parameterCount: 0 },
        { ccn: 1, name: "Init::method", parameterCount: 0 }
      ]
    },
    {
      sourceCode: "void legacy(a) int a { } void after() {}",
      expected: [
        { ccn: 1, name: "legacy", parameterCount: 1 },
        { ccn: 1, name: "after", parameterCount: 0 }
      ]
    },
    {
      sourceCode:
        'class Processor { void process() { List<String> names = Arrays.asList("Alice"); names.forEach(System.out::println); Class<?> type = String.class; } }',
      expected: [{ ccn: 1, name: "Processor::process", parameterCount: 0 }]
    },
    {
      sourceCode:
        "class T { private ThreadLocal<Long> value = new ThreadLocal<Long>() { @Override protected Long initialValue() { return 0L; } }; void realMethod() {} }",
      expected: [
        { ccn: 1, name: "(anonymous)::initialValue", parameterCount: 0 },
        { ccn: 1, name: "T::realMethod", parameterCount: 0 }
      ]
    },
    {
      sourceCode:
        'class LizardTest { private String[] values = {}; static { if (true) {} } private String record; @Transactional public void test1() { if (ready) {} for (;;) {} } private String record(String name) { if (name.equals("a")) {} for (;;) {} return ""; } }',
      expected: [
        { ccn: 3, name: "LizardTest::test1", parameterCount: 0 },
        { ccn: 3, name: "LizardTest::record", parameterCount: 1 }
      ]
    },
    {
      sourceCode:
        "class A { static { if (x) {} while (x) {} for (;;) {} switch (x) {} synchronized (lock) {} try {} catch (Exception e) {} } void m() {} }",
      expected: [{ ccn: 1, name: "A::m", parameterCount: 0 }]
    }
  ];

  for (const { expected, sourceCode } of cases)
    assert.deepEqual(
      compactMeasurements(analyze("source.java", sourceCode, JavaReader), expected),
      expected
    );
});

test("C# retains full source state behavior for class members, primary constructors, expression bodies, and condition categories", () => {
  const cases: readonly ReaderCase[] = [
    {
      sourceCode: "public class WorkspaceHeader(ILocator locator) { public void Method() { } }",
      expected: [{ ccn: 1, name: "WorkspaceHeader::Method", parameterCount: 0 }]
    },
    {
      sourceCode:
        "public class WorkspaceHeader { private readonly ILocator _locator; public WorkspaceHeader(ILocator locator) { _locator = locator; } public void Method() { } }",
      expected: [
        { ccn: 1, name: "WorkspaceHeader::WorkspaceHeader", parameterCount: 1 },
        { ccn: 1, name: "WorkspaceHeader::Method", parameterCount: 0 }
      ]
    },
    {
      sourceCode:
        "public class SimpleCalculator { public int Add(int a, int b) => a + b; public int Subtract(int a, int b) { if (a > b || a == 0) return a; return b; } }",
      expected: [
        { ccn: 1, name: "SimpleCalculator::Add", parameterCount: 2 },
        { ccn: 3, name: "SimpleCalculator::Subtract", parameterCount: 2 }
      ]
    },
    {
      sourceCode:
        "class Box { int M(int x) { try { if (x ?? 0 > 1 && x > 2) return x; } catch (Exception e) {} switch (x) { case 1: break; } return 0; } }",
      expected: [{ ccn: 6, name: "Box::M", parameterCount: 1 }]
    }
  ];

  for (const { expected, sourceCode } of cases)
    assert.deepEqual(
      compactMeasurements(analyze("source.cs", sourceCode, CSharpReader), expected),
      expected
    );
});

test("Objective-C retains C-like declarations, selectors, typedef skipping, and implementation methods", () => {
  const cases: readonly ReaderCase[] = [
    {
      sourceCode: "int fun(int a, int b) {}",
      expected: [{ ccn: 1, name: "fun", parameterCount: 2 }]
    },
    {
      sourceCode:
        "- (id)initWithRequest:(NSURLRequest *)request delegate:(id <NSURLConnectionDelegate>)delegate startImmediately:(BOOL)startImmediately{}",
      expected: [
        {
          ccn: 1,
          longName:
            "initWithRequest:( NSURLRequest * ) delegate:( id < NSURLConnectionDelegate > ) startImmediately:( BOOL )",
          name: "initWithRequest: delegate: startImmediately:",
          parameterCount: 0
        }
      ]
    },
    {
      sourceCode:
        "typedef void(^alertActionHandler)(void); @implementation TestLizard - (BOOL)scanJSONObject:(id *)outObject error:(NSError **)outError {} + (return_type)classMethod { if (failure) {} } @end",
      expected: [
        {
          ccn: 1,
          longName: "scanJSONObject:( id * ) error:( NSError ** )",
          name: "scanJSONObject: error:",
          parameterCount: 0
        },
        { ccn: 2, name: "classMethod", parameterCount: 0 }
      ]
    },
    {
      sourceCode: `@implementation TestLizard
+ (UIImage *)sgb_imageWithSize:(CGSize)size drawBlock:(void (^)(CGContextRef context))drawBlock {
 if (!drawBlock) return nil;
 return nil;
}
- (void)runWithCallback:(int (*)(int))cb { return; }
@end`,
      expected: [
        {
          ccn: 2,
          endLine: 5,
          name: "sgb_imageWithSize: drawBlock:",
          parameterCount: 0,
          startLine: 2
        },
        { ccn: 1, name: "runWithCallback:", parameterCount: 0 }
      ]
    }
  ];

  for (const { expected, sourceCode } of cases)
    assert.deepEqual(
      compactMeasurements(analyze("source.mm", sourceCode, ObjCReader), expected),
      expected
    );
});

test("TTCN retains C-like preprocessing, declarations, qualified signatures, special names, and decision categories", () => {
  const cases: readonly ReaderCase[] = [
    {
      sourceCode:
        "module test { function fun(inout integer i) runs on MTC_CT { if (i > 0) {} } testcase tc(integer i) { } control { } }",
      expected: [
        {
          ccn: 2,
          longName: "fun( inout integer i) runs on MTC_CT",
          name: "fun",
          parameterCount: 1
        },
        {
          ccn: 1,
          longName: "__testcase__tc( integer i)",
          name: "__testcase__tc",
          parameterCount: 1
        },
        { ccn: 1, longName: "__control__", name: "__control__", parameterCount: 0 }
      ]
    },
    {
      sourceCode:
        "module test { function @deterministic fun(in @lazy integer p_i) return template integer { return ?; } }",
      expected: [
        {
          ccn: 1,
          longName: "@deterministic fun( in @lazy integer p_i) return template integer",
          name: "fun",
          parameterCount: 1
        }
      ]
    },
    {
      sourceCode: "function f(in map<integer, charstring> value) {}",
      expected: [
        {
          ccn: 1,
          longName: "f( in map < integer , charstring > value)",
          name: "f",
          parameterCount: 2
        }
      ]
    },
    {
      sourceCode:
        "module m { #define MTP_CHEC                    \\\n function foo () { }\n #ifdef MAGIC\n #endif\n function bar(){} }",
      expected: [{ ccn: 1, name: "bar", parameterCount: 0 }]
    }
  ];

  for (const { expected, sourceCode } of cases)
    assert.deepEqual(
      compactMeasurements(analyze("source.ttcn", sourceCode, TTCNReader), expected),
      expected
    );
});

function sample(name: string, parameterCount = 1): FunctionMeasurement {
  return { ccn: 2, endLine: 1, name, nloc: 1, parameterCount, startLine: 1 };
}

function readFixture<Reader extends ReaderConstructor>(
  directory: string,
  fixture: string,
  Reader: Reader
): readonly FunctionMeasurement[] {
  const path = resolve(fixtureRoot, directory, fixture);
  return measurements(analyze(path, readFileSync(path, "utf8"), Reader));
}

function analyze<Reader extends ReaderConstructor>(
  filename: string,
  sourceCode: string,
  Reader: Reader
): readonly FunctionInfo[] {
  return analyzeSourceCode(filename, sourceCode, Reader).functionList;
}

function measurements(functions: readonly FunctionInfo[]): readonly FunctionMeasurement[] {
  return functions.map((functionInfo) => ({
    ccn: functionInfo.cyclomaticComplexity,
    endLine: functionInfo.endLine,
    name: functionInfo.name,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameterCount,
    startLine: functionInfo.startLine
  }));
}

function compactMeasurements(
  functions: readonly FunctionInfo[],
  expected: readonly CompactMeasurement[]
): readonly CompactMeasurement[] {
  return functions.map((functionInfo, index) => ({
    ccn: functionInfo.cyclomaticComplexity,
    ...(expected[index]?.endLine === undefined ? {} : { endLine: functionInfo.endLine }),
    ...(expected[index]?.longName === undefined ? {} : { longName: functionInfo.longName }),
    name: functionInfo.name,
    parameterCount: functionInfo.parameterCount,
    ...(expected[index]?.startLine === undefined ? {} : { startLine: functionInfo.startLine })
  }));
}

type FunctionMeasurement = Readonly<{
  readonly ccn: number;
  readonly endLine: number;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}>;

type CompactMeasurement = Readonly<{
  readonly ccn: number;
  readonly endLine?: number;
  readonly longName?: string;
  readonly name: string;
  readonly parameterCount: number;
  readonly startLine?: number;
}>;

type ReaderCase = Readonly<{
  readonly expected: readonly CompactMeasurement[];
  readonly sourceCode: string;
}>;

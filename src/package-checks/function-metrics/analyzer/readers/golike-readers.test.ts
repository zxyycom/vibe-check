import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { analyzeSourceCode, type FileInformation, type ReaderConstructor } from "../core.ts";
import { GoReader } from "./go.ts";
import { KotlinReader } from "./kotlin.ts";
import { RustReader } from "./rust.ts";
import { ScalaReader } from "./scala.ts";
import { SolidityReader } from "./solidity.ts";
import { SwiftReader } from "./swift.ts";
import { ZigReader } from "./zig.ts";

test("Go-like readers preserve every oracle suffix and edge fixture", () => {
  for (const [family, extension, Reader, expected] of readers) {
    for (const kind of ["normal", "edge"]) {
      if (family === "kotlin" && kind === "normal") {
        for (const kotlinExtension of ["kt", "kts"]) {
          assert.deepEqual(
            measurements(analyzeFixture(family, `${kind}.${kotlinExtension}`, Reader)),
            expected
          );
        }
      } else {
        assert.deepEqual(
          measurements(analyzeFixture(family, `${kind}.${extension}`, Reader)),
          expected
        );
      }
    }
  }
});

test("Go-like readers preserve all Lizard 1.24 upstream language scenarios", () => {
  for (const { extension, expected, Reader, sourceCode } of upstreamCases) {
    assert.deepEqual(measurements(analyze(sourceCode, extension, Reader)), expected);
  }
  assert.deepEqual([...SwiftReader.generateTokens("`a`")], ["`a`"]);
  assert.deepEqual([...KotlinReader.generateTokens("`a`")], ["`a`"]);
});

const upstreamCases: readonly UpstreamCase[] = [
  {
    Reader: GoReader,
    extension: "go",
    sourceCode: "",
    expected: []
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      '\n        for name, ok := range names; ok {\n                print("Hello, \\(name)!")\n            }\n                ',
    expected: []
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode: "\n            func sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            func sayGoodbye(personName string, alreadyGreeted chan bool) { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode: "\n            func sayGoodbye() string { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode: "\n            func sayGoodbye(p int) (string, error) { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode: "\n            func (s Stru) sayGoodbye(){ }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            func sayGoodbye() { if ++diceRoll == 7 { diceRoll = 1 }}\n                ",
    expected: [{ ccn: 2, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            func sayGoodbye() interface{} {\n                if ++diceRoll == 7 { diceRoll = 1 }\n            }\n                ",
    expected: [{ ccn: 2, endLine: 4, name: "sayGoodbye", nloc: 3, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            func sayGoodbye() {\n                f1 := func() {}\n                f2 := func(n int) {}\n                f3 := func() int {\n                    return 0\n                }\n            }\n                ",
    expected: [
      { ccn: 1, endLine: 3, name: "", nloc: 1, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 4, name: "", nloc: 1, parameterCount: 1, startLine: 4 },
      { ccn: 1, endLine: 7, name: "", nloc: 3, parameterCount: 0, startLine: 5 },
      { ccn: 1, endLine: 8, name: "sayGoodbye", nloc: 5, parameterCount: 0, startLine: 2 }
    ]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n\t\t\ttype geometry interface{\n\t\t\t\t\t area()  float64\n\t\t\t\t\t perim()  float64\n\t\t\t }\n            func sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 6, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n\t\t\ttype geometry interface{\n\t\t\t\t\t area()  float64\n\t\t\t\t\t perim()  float64\n\t\t\t }\n            class c { }\n                ",
    expected: []
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            type Geometry struct {\n                isEqual func(float64, float64) error\n            }\n\n            func (g *Geometry) sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 6, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            type MyComparator struct{}\n\n            type Comparator interface {\n                Handle(func(int) string)\n            }\n\n            func (m MyComparator) Handle(f func(int) string) {}\n                ",
    expected: [{ ccn: 1, endLine: 8, name: "Handle", nloc: 1, parameterCount: 1, startLine: 8 }]
  },
  {
    Reader: GoReader,
    extension: "go",
    sourceCode:
      "\n            func getQuery(dbIndex uint32, tbIndex uint32) string {\n                query := fmt.Sprintf(`INSERT INTO online_docs_%d.online_docs_notify_%d\n                (a, b, c, d, e, f, g, h, i, j)\n                VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?, %d)`,\n                dbIndex, tbIndex, notifyStatusNew)\n                return query\n            }\n                ",
    expected: [{ ccn: 1, endLine: 8, name: "getQuery", nloc: 7, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      '\n        fn main() {\n            println!("Hello, world!");\n        }\n        ',
    expected: [{ ccn: 1, endLine: 4, name: "main", nloc: 3, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode: "\n        fn plus_one(x: i32) -> i32 {\n            x + 1;\n        }\n        ",
    expected: [{ ccn: 1, endLine: 4, name: "plus_one", nloc: 3, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode: "\n        fn main() {\n            match a() {}\n        }\n        ",
    expected: [{ ccn: 2, endLine: 4, name: "main", nloc: 3, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      "\n        fn largest<T>(list: &[T]) -> T {\n            let mut largest = list[0];\n\n            for &item in list.iter() {\n                if item > largest {\n                    largest = item;\n                }\n            }\n\n            largest\n        }\n\n        fn main() {\n            match a() {}\n        }\n        ",
    expected: [
      { ccn: 3, endLine: 12, name: "largest", nloc: 9, parameterCount: 1, startLine: 2 },
      { ccn: 2, endLine: 16, name: "main", nloc: 3, parameterCount: 0, startLine: 14 }
    ]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      "\n        fn some_function<T, U>(t: T, u: U) -> i32\n            where T: Display + Clone,\n                  U: Clone + Debug {\n                  }\n        ",
    expected: [
      { ccn: 2, endLine: 5, name: "some_function", nloc: 4, parameterCount: 2, startLine: 2 }
    ]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      "\n        fn main() {\n            let x = 4;\n\n            fn equal_to_x(z: i32) -> bool { z == x }\n\n            let y = 4;\n\n            assert!(equal_to_x(y));\n        }\n        ",
    expected: [
      { ccn: 1, endLine: 5, name: "equal_to_x", nloc: 1, parameterCount: 1, startLine: 5 },
      { ccn: 1, endLine: 10, name: "main", nloc: 6, parameterCount: 0, startLine: 2 }
    ]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      "\n        pub fn func<'a>(a: &'a i64)\n        {\n            _ = a\n        }\n        ",
    expected: [{ ccn: 1, endLine: 5, name: "func", nloc: 4, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      '\n        fn handle_case_variable(case: i32) -> i32 {\n            let case_value = case;\n            match case_value {\n                1 => println!("one"),\n                2 => println!("two"),\n                _ => println!("other"),\n            }\n            case\n        }\n        ',
    expected: [
      {
        ccn: 2,
        endLine: 10,
        name: "handle_case_variable",
        nloc: 9,
        parameterCount: 1,
        startLine: 2
      }
    ]
  },
  {
    Reader: RustReader,
    extension: "rs",
    sourceCode:
      '\n        fn categorize(value: i32) -> &\'static str {\n            match value {\n                1 | 2 | 3 => "small",\n                4 | 5 => "medium",\n                6..=10 => "large",\n                _ => "other",\n            }\n        }\n        ',
    expected: [{ ccn: 2, endLine: 9, name: "categorize", nloc: 8, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode: "",
    expected: []
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      "\n            for {\n                i <- 0 to 10\n                if i % 2 == 0\n                if i > 5\n            }\n                ",
    expected: []
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode: "\n            def foo() { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "foo", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode: "\n            def main(args: Array[String]) { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "main", nloc: 1, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode: "\n            def foo(array: Array[String], name: String) { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "foo", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      "\n            def foo(query: String): Bool = {\n                if(query.equalsIgnoreCase('foo')) {\n                    println(true)\n                } else {\n                    println(false)\n                }\n\n                for {\n                    i <- 0 to 10\n                    if i % 2 == 0\n                    if i > 5\n                }\n            }",
    expected: [{ ccn: 5, endLine: 14, name: "foo", nloc: 12, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      "\n            object HelloWorld {\n               /* This is my first java program.\n                * This will print 'Hello World' as the output\n                * This is an example of multi-line comments.\n                */\n               def main(args: Array[String]) {\n                  // Prints Hello World\n                  // This is also an example of single line comment.\n                  var a = 1\n                  var b = 1\n                  if(a == b) {\n                      println(\"Hello, world!\")\n                  }\n               }\n            }\n            ",
    expected: [{ ccn: 2, endLine: 15, name: "main", nloc: 7, parameterCount: 1, startLine: 7 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      '\n            class A {\n                def id = column[Long]("id", O.PrimaryKey, O.AutoInc)\n                def list(): Future[Seq[Person]] = db.run {\n                  people.result\n                }\n            }\n            ',
    expected: [{ ccn: 1, endLine: 7, name: "list", nloc: 4, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      "\n                def list(): Future[Seq[Person]] = a && b\n                def list1(): Future[Seq[Person]] = a && b\n            ",
    expected: [
      { ccn: 2, endLine: 3, name: "list", nloc: 2, parameterCount: 0, startLine: 2 },
      { ccn: 2, endLine: 3, name: "list1", nloc: 1, parameterCount: 0, startLine: 3 }
    ]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      "\n                def list(): Future[Seq[Person]] = a + {\n                a && b}\n                def list(): Future[Seq[Person]] = a + {\n                a && b}\n            ",
    expected: [
      { ccn: 2, endLine: 4, name: "list", nloc: 3, parameterCount: 0, startLine: 2 },
      { ccn: 2, endLine: 5, name: "list", nloc: 2, parameterCount: 0, startLine: 4 }
    ]
  },
  {
    Reader: ScalaReader,
    extension: "scala",
    sourceCode:
      "\n                def list1(): Future[Seq[Person]] = a + {\n                    def list2(): Future[Seq[Person]] = a + b\n                }\n            ",
    expected: [
      { ccn: 1, endLine: 4, name: "list2", nloc: 2, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 3, name: "list1", nloc: 2, parameterCount: 0, startLine: 2 }
    ]
  },
  {
    Reader: SolidityReader,
    extension: "sol",
    sourceCode:
      "\n            function foo(uint x) public pure returns (uint) {\n                if (x < 10) {\n                    return 0;\n                } else {\n                    return 2;\n                }\n            }\n            ",
    expected: [{ ccn: 2, endLine: 8, name: "foo", nloc: 7, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: SolidityReader,
    extension: "sol",
    sourceCode:
      "\n                function named()\n                    public\n                    pure\n                    returns (\n                        uint x,\n                        bool b,\n                        uint y\n                    )\n                {\n                    return (1, true, 2);\n                }\n            ",
    expected: [{ ccn: 1, endLine: 12, name: "named", nloc: 11, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode: "",
    expected: []
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode: "\n            pub fn sayGoodbye() void { }\n        ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            pub fn sayGoodbye(personName: string, alreadyGreeted: bool) void { }\n        ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode: "\n            fn sayGoodbye() []const u8 { }\n        ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode: "\n           fn sayGoodbye(p: int) struct {[]const u8, bool} { }\n        ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            const Vec3 = struct {\n                x: f32,\n                y: f32,\n                z: f32,\n\n                pub fn dot(self: Vec3, other: Vec3) f32 {\n                    return self.x * other.x + self.y * other.y + self.z * other.z;\n                }\n            };\n        ",
    expected: [{ ccn: 1, endLine: 9, name: "dot", nloc: 3, parameterCount: 2, startLine: 7 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            fn sayGoodbye() void { if ((diceRoll + 1) == 7) { diceRoll = 1 }}\n        ",
    expected: [{ ccn: 2, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            fn foo() fn() u32 {\n                const x: u32 = 123;\n\n                const T = struct {\n                    fn bar() u32 { return x; }\n                    fn baz(n: int) u32 { return x + 1; }\n                };\n\n                const T2 = struct {\n                    fn bar() u32 {\n                        return x;\n                    }\n                };\n\n                return T.bar;\n            }\n        ",
    expected: [
      { ccn: 1, endLine: 6, name: "bar", nloc: 1, parameterCount: 0, startLine: 6 },
      { ccn: 1, endLine: 7, name: "baz", nloc: 1, parameterCount: 1, startLine: 7 },
      { ccn: 1, endLine: 13, name: "bar", nloc: 3, parameterCount: 0, startLine: 11 },
      { ccn: 1, endLine: 17, name: "foo", nloc: 11, parameterCount: 0, startLine: 2 }
    ]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            const Point = struct {\n                x: f32,\n                y: f32,\n            };\n            fn sayGoodbye() { }\n        ",
    expected: [{ ccn: 1, endLine: 6, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            const Point = struct {\n                x: f32,\n                y: f32,\n            };\n            const Type = enum {\n                Ok,\n                NotOk,\n            };\n            const Payload = union {\n                Int: i64,\n                Float: f64,\n                Bool: bool,\n            };\n        ",
    expected: []
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      '\n            const std = @import("std");\n\n            pub fn main() !void {\n                std.debug.print("Hello, World!\n", .{});\n            }\n        ',
    expected: [{ ccn: 1, endLine: 7, name: "main", nloc: 4, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      '\n            const std = @import("std");\n\n            pub fn main() !void {\n                if (condition) {\n                    std.debug.print("Hello, World!\n", .{});\n                }\n            }\n        ',
    expected: [{ ccn: 2, endLine: 9, name: "main", nloc: 6, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      '\n            const std = @import("std");\n\n            pub fn main() !void {\n                if (condition1 or condition2) {\n                    std.debug.print("Hello, World!\n", .{});\n                }\n            }\n        ',
    expected: [{ ccn: 3, endLine: 9, name: "main", nloc: 6, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      '\n            const std = @import("std");\n\n            pub fn main() !void {\n                switch (day) {\n                    .Monday => std.debug.print("Today is Monday!\n", .{}),\n                    .Tuesday => std.debug.print("Today is Tuesday!\n", .{}),\n                    .Wednesday => std.debug.print("Today is Wednesday!\n", .{}),\n                    .Thursday => std.debug.print("Today is Thursday!\n", .{}),\n                    .Friday => std.debug.print("Today is Friday!\n", .{}),\n                    .Saturday => std.debug.print("Today is Saturday!\n", .{}),\n                    .Sunday => std.debug.print("Today is Sunday!\n", .{}),\n                }\n            }\n        ',
    expected: [{ ccn: 8, endLine: 21, name: "main", nloc: 18, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            pub fn main() !void {\n                a orelse b;\n            }\n        ",
    expected: [{ ccn: 2, endLine: 4, name: "main", nloc: 3, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            pub fn main(str: []u8) !void {\n                const number = try parseU64(str, 10);\n                _ = number;\n            }\n        ",
    expected: [{ ccn: 2, endLine: 5, name: "main", nloc: 4, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      "\n            pub fn main() !void {\n                const value: anyerror!u32 = error.Broken;\n                const unwrapped = value catch 1234;\n                unwrapped == 1234\n            }\n        ",
    expected: [{ ccn: 2, endLine: 6, name: "main", nloc: 5, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      '\n            const std = @import("std");\n\n            pub fn main() !void {\n                for (0..5) {\n                    std.debug.print("Hello, World!\n", .{});\n                }\n            }\n        ',
    expected: [{ ccn: 2, endLine: 9, name: "main", nloc: 6, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: ZigReader,
    extension: "zig",
    sourceCode:
      '\n            const std = @import("std");\n\n            pub fn main() !void {\n                var i: usize = 1;\n                while (i < 10) {\n                    std.debug.print("Hello, World!\n", .{});\n                    i *= 2;\n                }\n            }\n        ',
    expected: [{ ccn: 2, endLine: 11, name: "main", nloc: 8, parameterCount: 0, startLine: 4 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "",
    expected: []
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      '\n            for name in names {\n                print("Hello, \\(name)!")\n            }\n                ',
    expected: []
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            func sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            func sayGoodbye(personName: String, alreadyGreeted: Bool) { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            func sayGoodbye() -> String { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            func sayGoodbye() { if ++diceRoll == 7 { diceRoll = 1 }}\n                ",
    expected: [{ ccn: 2, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            protocol p {\n                func f1() -> Double\n                func f2() -> NSDate\n            }\n            func sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 6, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            protocol p {\n                func f1() -> Double\n                func f2() -> NSDate\n            }\n            class c { }\n                ",
    expected: []
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            protocol p {\n                func f1() -> Double\n                var area: Double { get }\n            }\n            class c { }\n                ",
    expected: []
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            protocol p {\n                func f1() -> Double\n                var area: Double { get }\n            }\n            class c { }\n                ",
    expected: []
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            init() {}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "init", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            deinit {}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "deinit", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            override subscript(index: Int) -> Int {}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "subscript", nloc: 1, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            extension Collection {\n                /// Returns the element at the specified index iff it is within bounds, otherwise nil.\n                subscript (safe index: Index) -> Iterator.Element? {\n                    return indices.contains(index) ? self[index] : nil\n                }\n            }\n                ",
    expected: [{ ccn: 2, endLine: 6, name: "subscript", nloc: 3, parameterCount: 1, startLine: 4 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            class Time\n            {\n                var minutes: Double\n                {\n                    get\n                    {\n                        return (seconds / 60)\n                    }\n                    set\n                    {\n                        self.seconds = (newValue * 60)\n                    }\n                }\n            }\n                ",
    expected: [
      { ccn: 1, endLine: 9, name: "get", nloc: 4, parameterCount: 0, startLine: 6 },
      { ccn: 1, endLine: 13, name: "set", nloc: 4, parameterCount: 0, startLine: 10 }
    ]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            var center: Point {\n                get {\n                    let centerX = origin.x + (size.width / 2)\n                    let centerY = origin.y + (size.height / 2)\n                    return Point(x: centerX, y: centerY)\n                }\n                set(newCenter) {\n                    origin.x = newCenter.x - (size.width / 2)\n                    origin.y = newCenter.y - (size.height / 2)\n                }\n            }\n                ",
    expected: [
      { ccn: 1, endLine: 7, name: "get", nloc: 5, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 11, name: "set", nloc: 4, parameterCount: 0, startLine: 8 }
    ]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            var cue = -1 {\n                willSet {\n                    if newValue != cue {\n                        tableView.reloadData()\n                    }\n                }\n                didSet {\n                    tableView.scrollToRow(at: IndexPath(row: cue, section: 0), at: .bottom, animated: true)\n                }\n            }\n                ",
    expected: [
      { ccn: 2, endLine: 7, name: "willSet", nloc: 5, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 10, name: "didSet", nloc: 3, parameterCount: 0, startLine: 8 }
    ]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      '\n            class StepCounter {\n                var totalSteps: Int = 0 {\n                    willSet(newTotalSteps) {\n                        print("About to set totalSteps to \\(newTotalSteps)")\n                    }\n                    didSet {\n                        if totalSteps > oldValue  {\n                            print("Added \\(totalSteps - oldValue) steps")\n                        }\n                    }\n                }\n            }\n                ',
    expected: [
      { ccn: 1, endLine: 6, name: "willSet", nloc: 3, parameterCount: 0, startLine: 4 },
      { ccn: 2, endLine: 11, name: "didSet", nloc: 5, parameterCount: 0, startLine: 7 }
    ]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            enum Func {\n                static var `init`: Bool?, willSet: Bool?\n                static let `deinit` = 0, didSet = 0\n                case `func`; case get, set\n                func `default`() {}\n            }\n                ",
    expected: [{ ccn: 1, endLine: 6, name: "`default`", nloc: 1, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            func f<T>() {}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "f", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n        func f<C1, C2: Container where (C1.t == C2.t)> (c1: C1, c: C2) -> Bool {}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "f", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: " func f() {optional1?} ",
    expected: [{ ccn: 1, endLine: 1, name: "f", nloc: 1, parameterCount: 0, startLine: 1 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      " func f() {\n                let keep = filteredList?.contains(ingredient) ?? true\n            }\n        ",
    expected: [{ ccn: 1, endLine: 3, name: "f", nloc: 3, parameterCount: 0, startLine: 1 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            func f0() { something(for: .something) }\n            func f1() { something(for :.something) }\n            func f2() { something(for : .something) }\n            func f3() { something(for: isValid ? true : false) }\n            func f4() { something(label1: .something, label2: .something, for: .something) }\n        ",
    expected: [
      { ccn: 1, endLine: 2, name: "f0", nloc: 1, parameterCount: 0, startLine: 2 },
      { ccn: 1, endLine: 3, name: "f1", nloc: 1, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 4, name: "f2", nloc: 1, parameterCount: 0, startLine: 4 },
      { ccn: 2, endLine: 5, name: "f3", nloc: 1, parameterCount: 0, startLine: 5 },
      { ccn: 1, endLine: 6, name: "f4", nloc: 1, parameterCount: 0, startLine: 6 }
    ]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode: "\n            func f() { guard isValid else { return } }\n        ",
    expected: [{ ccn: 2, endLine: 2, name: "f", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: SwiftReader,
    extension: "swift",
    sourceCode:
      "\n            func f() {\n                func stepForward(input: Int) -> Int { return input + 1 }\n            }\n        ",
    expected: [
      { ccn: 1, endLine: 3, name: "stepForward", nloc: 1, parameterCount: 1, startLine: 3 },
      { ccn: 1, endLine: 4, name: "f", nloc: 3, parameterCount: 0, startLine: 2 }
    ]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode: "",
    expected: []
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      '\n            for name in names {\n                println("Hello, \\(name)!")\n            }\n                ',
    expected: []
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode: "\n            fun sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            fun sayGoodbye(personName: String, alreadyGreeted: Bool) { }\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode: '\n            fun sayGoodbye(): String {return "bye"}\n                ',
    expected: [{ ccn: 1, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode: '\n            val sayGoodbye: () -> String = {"bye"}\n                ',
    expected: [
      { ccn: 1, endLine: 2, name: "(anonymous)", nloc: 1, parameterCount: 0, startLine: 2 }
    ]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            fun sayGoodbye() { if ++diceRoll == 7 { diceRoll = 1 }}\n                ",
    expected: [{ ccn: 2, endLine: 2, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            interface p {\n                fun f1(): String\n                fun f2()\n            }\n            fun sayGoodbye() { }\n                ",
    expected: [{ ccn: 1, endLine: 6, name: "sayGoodbye", nloc: 1, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            interface p {\n                fun f1(): String\n                fun f2()\n            }\n            class c { }\n                ",
    expected: []
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      '\n            interface p {\n                fun f1(): String\n                fun f2()\n                val p1: String\n                val p2: String\n                    get() = "p2"\n            }\n            class c { }\n                ',
    expected: []
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            class Time\n            {\n                var seconds: Double = 17.0\n                var minutes: Double\n                    get() = seconds / 60\n            }\n                ",
    expected: [{ ccn: 1, endLine: 7, name: "get", nloc: 2, parameterCount: 0, startLine: 6 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            class Time\n            {\n                var seconds: Double = 17.0\n                var minutes: Double\n                    get() = seconds / 60\n                    set(newValue) {\n                        this.seconds = (newValue * 60)\n                    }\n            }\n                ",
    expected: [
      { ccn: 1, endLine: 9, name: "set", nloc: 3, parameterCount: 0, startLine: 7 },
      { ccn: 1, endLine: 10, name: "get", nloc: 3, parameterCount: 0, startLine: 6 }
    ]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            var center: Point\n                get() = {\n                    val centerX = origin.x + (size.width / 2)\n                    val centerY = origin.y + (size.height / 2)\n                    return Point(x: centerX, y: centerY)\n                }\n                set(newCenter) {\n                    origin.x = newCenter.x - (size.width / 2)\n                    origin.y = newCenter.y - (size.height / 2)\n                }\n            }\n                ",
    expected: [
      { ccn: 1, endLine: 11, name: "set", nloc: 4, parameterCount: 0, startLine: 8 },
      { ccn: 1, endLine: 12, name: "get", nloc: 7, parameterCount: 0, startLine: 3 }
    ]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      '\n                fun cases(x: Int) {\n                    when (x) {\n                        0, 1 -> print("x == 0 or x == 1")\n                        else -> print("otherwise")\n                    }\n                }\n                ',
    expected: [{ ccn: 2, endLine: 7, name: "cases", nloc: 6, parameterCount: 1, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            enum class Func {\n                static var `class`: Bool? = false\n                static val `interface` = 0\n                fun `get`() {}\n            }\n                ",
    expected: [{ ccn: 1, endLine: 5, name: "`get`", nloc: 1, parameterCount: 0, startLine: 5 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode: "\n            fun <T> f() {}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "f", nloc: 1, parameterCount: 0, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n        fun <C1, C2> f (c1: C1, c: C2): Boolean where C2 : Container {return C2.isEmpty()}\n                ",
    expected: [{ ccn: 1, endLine: 2, name: "f", nloc: 1, parameterCount: 2, startLine: 2 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      " fun f() {\n                val keep = filteredList?.contains(ingredient) ?: true\n            }\n        ",
    expected: [{ ccn: 2, endLine: 3, name: "f", nloc: 3, parameterCount: 0, startLine: 1 }]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n            fun f0() { something(for: .something) }\n            fun f1() { something(for :.something) }\n            fun f2() { something(for : .something) }\n            fun f3() { something(for: if (isValid) true else false) }\n            fun f4() { something(label1: .something, label2: .something, for: .something) }\n        ",
    expected: [
      { ccn: 1, endLine: 2, name: "f0", nloc: 1, parameterCount: 0, startLine: 2 },
      { ccn: 1, endLine: 3, name: "f1", nloc: 1, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 4, name: "f2", nloc: 1, parameterCount: 0, startLine: 4 },
      { ccn: 2, endLine: 5, name: "f3", nloc: 1, parameterCount: 0, startLine: 5 },
      { ccn: 1, endLine: 6, name: "f4", nloc: 1, parameterCount: 0, startLine: 6 }
    ]
  },
  {
    Reader: KotlinReader,
    extension: "kt",
    sourceCode:
      "\n        fun bar() : Int {\n            fun a() : Int {\n                // Do a load of stuff\n                return 1\n            }\n            fun b() : Int {\n                // Do a load of stuff\n                return 1\n            }\n            return a() + b()\n        }\n        ",
    expected: [
      { ccn: 1, endLine: 6, name: "a", nloc: 3, parameterCount: 0, startLine: 3 },
      { ccn: 1, endLine: 10, name: "b", nloc: 3, parameterCount: 0, startLine: 7 },
      { ccn: 1, endLine: 12, name: "bar", nloc: 5, parameterCount: 0, startLine: 2 }
    ]
  }
];

const fixtureRoot = "src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0";
const readers: readonly [string, string, ReaderConstructor, readonly Measurement[]][] = [
  [
    "go",
    "go",
    GoReader,
    [{ ccn: 2, endLine: 2, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 2 }]
  ],
  [
    "rust",
    "rs",
    RustReader,
    [{ ccn: 2, endLine: 1, name: "reader_sample", nloc: 1, parameterCount: 1, startLine: 1 }]
  ],
  [
    "scala",
    "scala",
    ScalaReader,
    [{ ccn: 2, endLine: 4, name: "readerSample", nloc: 4, parameterCount: 1, startLine: 1 }]
  ],
  [
    "solidity",
    "sol",
    SolidityReader,
    [{ ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }]
  ],
  [
    "zig",
    "zig",
    ZigReader,
    [{ ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }]
  ],
  [
    "swift",
    "swift",
    SwiftReader,
    [{ ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }]
  ],
  [
    "kotlin",
    "kt",
    KotlinReader,
    [{ ccn: 2, endLine: 1, name: "readerSample", nloc: 1, parameterCount: 1, startLine: 1 }]
  ]
];

function analyzeFixture(family: string, name: string, Reader: ReaderConstructor): FileInformation {
  const path = resolve(fixtureRoot, family, name);
  return analyzeSourceCode(path, readFileSync(path, "utf8"), Reader);
}

function analyze(
  sourceCode: string,
  extension: string,
  Reader: ReaderConstructor
): FileInformation {
  return analyzeSourceCode(`source.${extension}`, sourceCode, Reader);
}

function measurements(file: FileInformation): readonly Measurement[] {
  return file.functionList.map((functionInfo) => ({
    ccn: functionInfo.cyclomaticComplexity,
    endLine: functionInfo.endLine,
    name: functionInfo.name,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameterCount,
    startLine: functionInfo.startLine
  }));
}

type UpstreamCase = Readonly<{
  readonly extension: string;
  readonly expected: readonly Measurement[];
  readonly Reader: ReaderConstructor;
  readonly sourceCode: string;
}>;

type Measurement = Readonly<{
  ccn: number;
  endLine: number;
  name: string;
  nloc: number;
  parameterCount: number;
  startLine: number;
}>;

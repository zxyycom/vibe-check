/**
 * Derived from terryyin/lizard 1.23.0 tests.
 * Sources: test/test_languages/testFortran.py and lizard_languages/fortran.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: direct source-observation reader parity coverage.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo } from "../core.ts";
import { FortranReader } from "./fortran.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.23.0/fortran"
);

test("Fortran reader preserves every registered suffix, edge fixture, and fixed/free form metrics", () => {
  for (const extension of ["f70", "f90", "f95", "f03", "f08", "f", "for", "ftn", "fpp"]) {
    assert.deepEqual(readFixture(`normal.${extension}`), [
      {
        ccn: 2,
        endLine: 8,
        name: "reader_sample",
        nloc: 8,
        parameterCount: 1,
        startLine: 1
      }
    ]);
  }
  assert.deepEqual(readFixture("edge.f70"), [
    {
      ccn: 2,
      endLine: 8,
      name: "reader_sample",
      nloc: 8,
      parameterCount: 1,
      startLine: 1
    }
  ]);

  assert.deepEqual(
    describe(
      analyzeSourceCode(
        "fixed.f",
        "C fixed-form comment\n      SUBROUTINE FIXED(VALUE)\n      INTEGER VALUE\n      IF (VALUE .GT. 0) THEN\n      VALUE = VALUE + 1\n      END IF\n      END\n",
        FortranReader
      )
    ),
    [{ ccn: 2, endLine: 7, name: "FIXED", nloc: 6, parameterCount: 1, startLine: 2 }]
  );
  assert.deepEqual(
    describe(
      analyzeSourceCode(
        "free.f90",
        "function free_form(value) result(answer)\n integer :: value, answer\n if (value .gt. 0) then\n  answer = 1\n else\n  answer = 0\n end if\nend function free_form\n",
        FortranReader
      )
    ),
    [{ ccn: 2, endLine: 8, name: "free_form", nloc: 8, parameterCount: 1, startLine: 1 }]
  );

  assert.deepEqual(
    [...FortranReader.generateTokens(".or..and..OR..AND. end end if end  type end\tdo else if")],
    [
      ".or.",
      ".and.",
      ".OR.",
      ".AND.",
      " ",
      "end",
      " ",
      "end if",
      " ",
      "end  type",
      " ",
      "end\tdo",
      " ",
      "else if"
    ]
  );
  for (const sourceCase of FORTRAN_SOURCE_CASES) {
    const { source: _source, ...expected } = sourceCase;
    assert.deepEqual(
      sourceObservation(analyzeSourceCode("a.f90", sourceCase.source, FortranReader)),
      expected
    );
  }
});

function readFixture(name: string): readonly FunctionMeasurement[] {
  return describe(
    analyzeSourceCode(
      resolve(fixtureDirectory, name),
      readFileSync(resolve(fixtureDirectory, name), "utf8"),
      FortranReader
    )
  );
}

function describe(file: ReturnType<typeof analyzeSourceCode>): readonly FunctionMeasurement[] {
  return file.functionList.map(toMeasurement);
}

function toMeasurement(functionInfo: FunctionInfo): FunctionMeasurement {
  return {
    ccn: functionInfo.cyclomaticComplexity,
    endLine: functionInfo.endLine,
    name: functionInfo.name,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameterCount,
    startLine: functionInfo.startLine
  };
}

type FunctionMeasurement = Readonly<{
  readonly ccn: number;
  readonly endLine: number;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}>;

type SourceObservation = Readonly<{
  readonly source: string;
  readonly file_nloc: number;
  readonly functions: readonly SourceFunctionObservation[];
}>;

type SourceFunctionObservation = Readonly<{
  readonly name: string;
  readonly long_name: string;
  readonly ccn: number;
  readonly nloc: number;
  readonly start_line: number;
  readonly end_line: number;
  readonly parameter_count: number;
  readonly parameters: readonly string[];
  readonly top_nesting_level: number;
  readonly max_nesting_depth: number;
}>;

function sourceObservation(
  file: ReturnType<typeof analyzeSourceCode>
): Omit<SourceObservation, "source"> {
  return {
    file_nloc: file.nloc,
    functions: file.functionList.map((functionInfo) => ({
      name: functionInfo.name,
      long_name: functionInfo.longName,
      ccn: functionInfo.cyclomaticComplexity,
      nloc: functionInfo.nloc,
      start_line: functionInfo.startLine,
      end_line: functionInfo.endLine,
      parameter_count: functionInfo.parameterCount,
      parameters: functionInfo.parameters,
      top_nesting_level: functionInfo.topNestingLevel,
      max_nesting_depth: functionInfo.maxNestingDepth
    }))
  };
}

const FORTRAN_SOURCE_CASES: readonly SourceObservation[] = [
  {
    source:
      "\n        subroutine test\n            If (a) Then\n                CALL sub(a)\n            elseIF (b) THEN\n                call SUB(b)\n            END IF\n        ENDsubroutine test\n        ",
    file_nloc: 7,
    functions: [
      {
        name: "test",
        long_name: "test( )",
        ccn: 2,
        nloc: 7,
        start_line: 2,
        end_line: 8,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        MODULE mymod\n            INTERFACE\n                module SUBROUTINE sub1(x)\n                    integer :: x\n                end SUBROUTINE\n\n                MODULE function func1(y)\n                    real :: y\n                end function\n            end INTERFACE\n        END MODULE\n\n        SUBMODULE (mymod) mysubmod\n            module procedure SUB1\n                x = 1\n            end procedure\n\n            module procedure FUNC1\n                func1 = y * 2\n            end procedure\n        end SUBMODULE\n        ",
    file_nloc: 18,
    functions: [
      {
        name: "mymod::sub1",
        long_name: "mymod::sub1( x )",
        ccn: 1,
        nloc: 3,
        start_line: 4,
        end_line: 6,
        parameter_count: 1,
        parameters: ["x"],
        top_nesting_level: 2,
        max_nesting_depth: 0
      },
      {
        name: "mymod::func1",
        long_name: "mymod::func1( y )",
        ccn: 1,
        nloc: 3,
        start_line: 8,
        end_line: 10,
        parameter_count: 1,
        parameters: ["y"],
        top_nesting_level: 2,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        subroutine test\n            if (a .AND. b) then\n                do b = 1, 10\n                    select case (b)\n                    case (1)\n                        do xxx\n                            do xxx\n                                call sub()\n                            end do\n                        enddo\n                    case (2)\n                        call sub()\n                    endselect\n                end do\n            else if (a .OR. b) then\n                sub()\n            endif\n        endsubroutine test\n        ",
    file_nloc: 18,
    functions: [
      {
        name: "test",
        long_name: "test( )",
        ccn: 10,
        nloc: 18,
        start_line: 2,
        end_line: 19,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "",
    file_nloc: 0,
    functions: []
  },
  {
    source:
      "\n        FUNCTION test(a, b)\n            REAL :: a\n            REAL :: b\n        END FUNCTION test\n        function test2\n        endfunction test2\n        ",
    file_nloc: 6,
    functions: [
      {
        name: "test",
        long_name: "test( a , b )",
        ccn: 1,
        nloc: 4,
        start_line: 2,
        end_line: 5,
        parameter_count: 2,
        parameters: ["a", "b"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "test2",
        long_name: "test2( )",
        ccn: 1,
        nloc: 2,
        start_line: 6,
        end_line: 7,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        subroutine test\n            if (a) call sub(a)\n            if (b) then\n                call sub(b)\n            end if\n        endsubroutine test\n        ",
    file_nloc: 6,
    functions: [
      {
        name: "test",
        long_name: "test( )",
        ccn: 3,
        nloc: 6,
        start_line: 2,
        end_line: 7,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        subroutine test\n            if (a) then\n                call sub(a)\n            else\n                call sub(-a)\n            end if\n            if (b) then\n                call sub(b)\n            else  if (c) then\n                call sub(c)\n            end if\n        endsubroutine test\n        ",
    file_nloc: 12,
    functions: [
      {
        name: "test",
        long_name: "test( )",
        ccn: 3,
        nloc: 12,
        start_line: 2,
        end_line: 13,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        subroutine test\n            DIMENSION U(100)\n            S = 0.0 \n            DO 1 J = 1, 100 \n                    S = S + U(J) \n                    IF ( S .GE. 1000000 ) GO TO 2 \n        1   CONTINUE \n            STOP \n        2   CONTINUE \n        endsubroutine test\n        ",
    file_nloc: 10,
    functions: [
      {
        name: "test",
        long_name: "test( )",
        ccn: 3,
        nloc: 10,
        start_line: 2,
        end_line: 11,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        #ifdef TEST\n            subroutine test\n        #elif TEST2\n            #ifndef TEST3\n                subroutine test3\n                end subroutine\n            #elif TEST4\n                subroutine test4\n                end subroutine\n            #endif\n            subroutine test2\n        #elif TEST5\n            subroutine test5\n        #else\n            subroutine test6\n        #endif\n            end subroutine\n        #if true\n            subroutine test7\n            end subroutine\n        #endif\n        ",
    file_nloc: 11,
    functions: [
      {
        name: "test",
        long_name: "test( )",
        ccn: 5,
        nloc: 9,
        start_line: 3,
        end_line: 18,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "test7",
        long_name: "test7( )",
        ccn: 1,
        nloc: 2,
        start_line: 20,
        end_line: 21,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        module test\n            interface operator (+)\n                module procedure concat\n            end interface\n            \n            subroutine test2\n            endsubroutine test2\n        end module test\n        ",
    file_nloc: 7,
    functions: [
      {
        name: "test::test2",
        long_name: "test::test2( )",
        ccn: 1,
        nloc: 2,
        start_line: 7,
        end_line: 8,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 1,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        module test\n            subroutine test2\n            endsubroutine test2\n        end module test\n        ",
    file_nloc: 4,
    functions: [
      {
        name: "test::test2",
        long_name: "test::test2( )",
        ccn: 1,
        nloc: 2,
        start_line: 3,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 1,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        module mymod\n            interface\n                module subroutine sub1(x)\n                    integer :: x\n                end subroutine\n\n                module function func1(y) result(z)\n                    real :: y, z\n                end function\n            end interface\n        end module\n        ",
    file_nloc: 10,
    functions: [
      {
        name: "mymod::sub1",
        long_name: "mymod::sub1( x )",
        ccn: 1,
        nloc: 3,
        start_line: 4,
        end_line: 6,
        parameter_count: 1,
        parameters: ["x"],
        top_nesting_level: 2,
        max_nesting_depth: 0
      },
      {
        name: "mymod::func1",
        long_name: "mymod::func1( y )",
        ccn: 1,
        nloc: 3,
        start_line: 8,
        end_line: 10,
        parameter_count: 1,
        parameters: ["y"],
        top_nesting_level: 2,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        module mymod\n            interface\n                ! These should be found due to decorators\n                module recursive subroutine sub1(x)\n                    integer :: x\n                end subroutine\n\n                module elemental function func1(y)\n                    real :: y\n                end function\n\n                ! This might be missed due to lack of decorator\n                module function func2(z)\n                    complex :: z\n                end function\n            end interface\n        end module\n        ",
    file_nloc: 13,
    functions: [
      {
        name: "mymod::recursive::sub1",
        long_name: "mymod::recursive::sub1( x )",
        ccn: 1,
        nloc: 3,
        start_line: 5,
        end_line: 7,
        parameter_count: 1,
        parameters: ["x"],
        top_nesting_level: 3,
        max_nesting_depth: 0
      },
      {
        name: "mymod::recursive::elemental::func1",
        long_name: "mymod::recursive::elemental::func1( y )",
        ccn: 1,
        nloc: 3,
        start_line: 9,
        end_line: 11,
        parameter_count: 1,
        parameters: ["y"],
        top_nesting_level: 4,
        max_nesting_depth: 0
      },
      {
        name: "mymod::recursive::elemental::func2",
        long_name: "mymod::recursive::elemental::func2( z )",
        ccn: 1,
        nloc: 3,
        start_line: 14,
        end_line: 16,
        parameter_count: 1,
        parameters: ["z"],
        top_nesting_level: 4,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        SUBROUTINE test(a, b)\n            REAL :: a\n            REAL :: b\n        END SUBROUTINE test\n        subroutine test2\n        endsubroutine test2\n        ",
    file_nloc: 6,
    functions: [
      {
        name: "test",
        long_name: "test( a , b )",
        ccn: 1,
        nloc: 4,
        start_line: 2,
        end_line: 5,
        parameter_count: 2,
        parameters: ["a", "b"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "test2",
        long_name: "test2( )",
        ccn: 1,
        nloc: 2,
        start_line: 6,
        end_line: 7,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "SUBROUTINE foo()\n  BLOCK\n    INTEGER :: x\n    x = 1\n  END BLOCK\nEND SUBROUTINE foo\n",
    file_nloc: 6,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 6,
        start_line: 1,
        end_line: 6,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "SUBROUTINE foo()\n  BLOCK (1)\n    INTEGER :: x\n    x = 1\n  END BLOCK\nEND SUBROUTINE foo\n",
    file_nloc: 6,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 5,
        start_line: 1,
        end_line: 5,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "SUBROUTINE foo()\n  INTEGER :: x\n  DATA x /0/\nEND SUBROUTINE foo\n",
    file_nloc: 4,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "C this is a fixed-form comment\n      SUBROUTINE foo()\n* another fixed-form comment\n      END SUBROUTINE foo\n",
    file_nloc: 3,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 2,
        start_line: 2,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "SUBROUTINE foo()\n  INTEGER :: if\n  if = 1\nEND SUBROUTINE foo\n",
    file_nloc: 4,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 3,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "SUBROUTINE foo(x)\n  INTEGER :: x\n  IF (x > 0) x = x + 1\nEND SUBROUTINE foo\n",
    file_nloc: 4,
    functions: [
      {
        name: "foo",
        long_name: "foo( x )",
        ccn: 2,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 1,
        parameters: ["x"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "PROGRAM hello\n  PRINT *, 'hi'\nEND PROGRAM hello\n",
    file_nloc: 3,
    functions: []
  },
  {
    source:
      "RECURSIVE FUNCTION fact(n) RESULT(r)\n  INTEGER :: n, r\n  IF (n <= 1) THEN\n    r = 1\n  ELSE\n    r = n * fact(n - 1)\n  END IF\nEND FUNCTION fact\n",
    file_nloc: 8,
    functions: [
      {
        name: "fact",
        long_name: "fact( n )",
        ccn: 2,
        nloc: 8,
        start_line: 1,
        end_line: 8,
        parameter_count: 1,
        parameters: ["n"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "SUBROUTINE foo()\n  SAVE x\n  INTEGER :: x\nEND SUBROUTINE foo\n",
    file_nloc: 4,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "SUBMODULE (parent) child\n  CONTAINS\n  SUBROUTINE foo()\n    PRINT *, 'hi'\n  END SUBROUTINE foo\nEND SUBMODULE child\n",
    file_nloc: 6,
    functions: [
      {
        name: "SUBMODULE::foo",
        long_name: "SUBMODULE::foo( )",
        ccn: 1,
        nloc: 3,
        start_line: 3,
        end_line: 5,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 1,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "MODULE m\n  TYPE :: point\n    REAL :: x, y\n  END TYPE point\nEND MODULE m\n",
    file_nloc: 5,
    functions: []
  },
  {
    source: "SUBROUTINE foo()\n  TYPE(point) :: p\n  p%x = 1.0\nEND SUBROUTINE foo\n",
    file_nloc: 4,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "MODULE m\n  TYPE, PUBLIC :: point\n    REAL :: x\n  END TYPE point\nEND MODULE m\n",
    file_nloc: 5,
    functions: []
  },
  {
    source: "INTEGER FUNCTION square(x)\n  INTEGER :: x\n  square = x * x\nEND FUNCTION square\n",
    file_nloc: 4,
    functions: [
      {
        name: "square",
        long_name: "square( x )",
        ccn: 1,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 1,
        parameters: ["x"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "SUBROUTINE foo()\n  REAL :: x\n  x = 1.0\nEND SUBROUTINE foo\n",
    file_nloc: 4,
    functions: [
      {
        name: "foo",
        long_name: "foo( )",
        ccn: 1,
        nloc: 4,
        start_line: 1,
        end_line: 4,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  }
];

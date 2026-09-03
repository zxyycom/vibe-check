/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/__init__.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to an analyzer-internal ordered reader registry. Product
 * admission and fallback policy remain outside this module.
 */

import type { ReaderConstructor } from "./core.ts";
import { CSharpReader } from "./readers/csharp.ts";
import { ErlangReader } from "./readers/erlang.ts";
import { FortranReader } from "./readers/fortran.ts";
import { GDScriptReader } from "./readers/gdscript.ts";
import { GoReader } from "./readers/go.ts";
import { JavaReader } from "./readers/java.ts";
import { JavaScriptReader } from "./readers/javascript.ts";
import { KotlinReader } from "./readers/kotlin.ts";
import { LuaReader } from "./readers/lua.ts";
import { ObjCReader } from "./readers/objc.ts";
import { PerlReader } from "./readers/perl.ts";
import { PHPReader } from "./readers/php.ts";
import { PLSQLReader } from "./readers/plsql.ts";
import { PythonReader } from "./readers/python.ts";
import { RReader } from "./readers/r.ts";
import { RubyReader } from "./readers/ruby.ts";
import { RustReader } from "./readers/rust.ts";
import { ScalaReader } from "./readers/scala.ts";
import { SolidityReader } from "./readers/solidity.ts";
import { StReader } from "./readers/st.ts";
import { SwiftReader } from "./readers/swift.ts";
import { TSXReader } from "./readers/tsx.ts";
import { TTCNReader } from "./readers/ttcn.ts";
import { TypeScriptReader } from "./readers/typescript.ts";
import { VueReader } from "./readers/vue.ts";
import { ZigReader } from "./readers/zig.ts";
import { CLikeReader } from "./shared/clike.ts";

/** A translated Lizard reader constructor with its source suffix matcher. */
export interface RegisteredReader extends ReaderConstructor {
  readonly ext: readonly string[];
  matchFilename(filename: string): boolean;
}

/** Source-order equivalent of lizard_languages.languages(). */
export function languages(): readonly RegisteredReader[] {
  return [
    CLikeReader,
    JavaReader,
    CSharpReader,
    JavaScriptReader,
    PythonReader,
    ObjCReader,
    TTCNReader,
    RubyReader,
    PHPReader,
    SwiftReader,
    ScalaReader,
    GDScriptReader,
    GoReader,
    LuaReader,
    RustReader,
    TypeScriptReader,
    FortranReader,
    KotlinReader,
    SolidityReader,
    ErlangReader,
    ZigReader,
    TSXReader,
    VueReader,
    PerlReader,
    StReader,
    RReader,
    PLSQLReader
  ];
}

/** Source-order suffix lookup. Unknown suffixes deliberately remain unsupported here. */
export function get_reader_for(filename: string): RegisteredReader | undefined {
  for (const reader of languages()) {
    if (reader.matchFilename(filename)) return reader;
  }
  return undefined;
}

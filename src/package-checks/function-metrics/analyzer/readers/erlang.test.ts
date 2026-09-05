/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/test_languages/testErlang.py, lizard_languages/erlang.py,
 * and Pygments 2.18.0 pygments/lexers/erlang.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT AND BSD-2-Clause
 * Modified: direct source-observation and lexical-rule parity coverage.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode } from "../pipeline.ts";
import type { FunctionInfo } from "../analysis-model.ts";
import { ErlangReader } from "./erlang.ts";

const fixtureDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.24.0/erlang"
);

test("Erlang reader preserves every suffix, comments, branches, guards, nested fun, and macro complexity", () => {
  for (const extension of ["erl", "hrl", "es", "escript"]) {
    assert.deepEqual(readFixture(`normal.${extension}`), [
      { ccn: 2, endLine: 1, name: "reader_sample", nloc: 1, parameterCount: 1, startLine: 1 }
    ]);
  }
  assert.deepEqual(readFixture("edge.erl"), [
    { ccn: 2, endLine: 1, name: "reader_sample", nloc: 1, parameterCount: 1, startLine: 1 }
  ]);

  const main = analyze(
    "tail_recursive_fib(N) -> tail_recursive_fib(N, 0, 1, []).\nlookup(_K, _Tree = ?EMPTY_NODE) -> {none, 'undefined'};\nlookup(K, _Tree = {node, {NodeK, V, Left, Right}}) -> if K == NodeK -> {ok, V}; K < NodeK -> lookup(K, Left); K > NodeK -> lookup(K, Right) end.\n"
  );
  assert.deepEqual(
    main.map((functionInfo) => functionInfo.name),
    ["tail_recursive_fib", "lookup", "lookup"]
  );
  assert.equal(analyze("\n\n").length, 0);

  const nested = analyze(
    "replace(Whole,Old,New) -> OldLen = length(Old), ReplaceInit = fun (Next, NewWhole) -> case lists:prefix(Old, [Next|NewWhole]) of true -> {_,Rest} = lists:split(OldLen-1, NewWhole), New ++ Rest; false -> [Next|NewWhole] end end, lists:foldr(ReplaceInit, [], Whole).\n"
  );
  assert.deepEqual(
    nested.map((functionInfo) => functionInfo.name),
    ["fun", "replace"]
  );

  const functionUsage = analyze(
    "insert([{K, V}|Rest], Tree) -> insert(Rest, insert(K, V, Tree)).\n"
  );
  assert.equal(functionUsage.length, 1);
  assert.equal(functionUsage[0]?.cyclomaticComplexity, 1);

  const comments = analyze(`
    %% @doc Insert a new Key into the Tree.
    %%      If the Key already exists, it will be replaced.
    %%
    %% @spec insert(integer(), term(), tree()) -> tree().
    insert(K, V, _Tree = ?EMPTY_NODE) ->
        {node, {K, V, init(), init()}};
    insert(K, V, _Tree = {node, {NodeK, NodeV, Left, Right}}) ->
        if K == NodeK -> % replace
            {node, {K, V, Left, Right}}
        ; K < NodeK ->
            {node, {NodeK, NodeV, insert(K, V, Left), Right}}
        ; K > NodeK ->
            {node, {NodeK, NodeV, Left, insert(K, V, Right)}}
        end.

    %% @private
    insert([], Tree) -> Tree;
    insert([{K, V}|Rest], Tree) ->
        insert(Rest, insert(K, V, Tree)).
  `);
  assert.equal(comments.length, 4);
  assert.equal(comments[0]?.name, "insert");
  assert.equal(comments[1]?.cyclomaticComplexity, 2);

  const manyFunctionUsages = analyze(`
    sim_trans() ->
        sim_trans([]).

    sim_trans(ExtraOptions) ->
        Options = [{dict_insert, {filter, mgr_actors}, fun mgr_actors/1}],
        {ok, Viewer} = et_viewer:start_link(Options ++ ExtraOptions),
        Collector = et_viewer:get_collector_pid(Viewer),
        et_collector:report_event(Collector, 60, my_shell, mnesia_tm, start_outer,
                                  "Start outer transaction"),
        et_collector:report_event(Collector, 40, mnesia_tm, my_shell, new_tid,
                                  "New transaction id is 4711"),
        et_collector:report_event(Collector, 20, my_shell, mnesia_locker, try_write_lock,
                                  "Acquire write lock for {my_tab, key}"),
        et_collector:report_event(Collector, 10, mnesia_locker, my_shell, granted,
                                  "You got the write lock for {my_tab, key}"),
        et_collector:report_event(Collector, 60, my_shell, do_commit,
                                  "Perform  transaction commit"),
        et_collector:report_event(Collector, 40, my_shell, mnesia_locker, release_tid,
                                  "Release all locks for transaction 4711"),
        et_collector:report_event(Collector, 60, my_shell, mnesia_tm, delete_transaction,
                                  "End of outer transaction"),
        et_collector:report_event(Collector, 20, my_shell, end_outer,
                                  "Transaction returned {atomic, ok}"),
        {collector, Collector}.
  `);
  assert.equal(manyFunctionUsages.length, 2);
  assert.equal(manyFunctionUsages[1]?.cyclomaticComplexity, 1);

  const guardedBranches = analyze(
    "%% comment\nmodule_as_actor(E) when is_record(E, event) -> case lists:key_search(mfa, 1, E#event.contents) of {value, {mfa, {M, F, _A}}} -> case lists:key_search(pam_result, 1, E#event.contents) of {value, {pam_result, {M2, _F2, _A2}}} -> {true, E#event{label = F, from = M2, to = M}}; _ -> {true, E#event{label = F, from = M, to = M}} end; _ -> false end.\n"
  );
  assert.equal(guardedBranches.length, 1);
  assert.equal(guardedBranches[0]?.cyclomaticComplexity, 3);

  const macro = analyze(
    "get_value(Key) -> Value = ?DEFAULT_VALUE, case ?LOOKUP_TABLE of undefined -> Value; Table -> fetch(Key, Table) end.\n"
  );
  assert.equal(macro.length, 1);
  assert.equal(macro[0]?.cyclomaticComplexity, 4);

  for (const sourceCase of ERLANG_SOURCE_CASES) {
    const { source: _source, ...expected } = sourceCase;
    assert.deepEqual(sourceObservationForCode(sourceCase.source), expected);
  }
  for (const sourceCase of ERLANG_ADVERSARIAL_SOURCE_CASES) {
    const { source: _source, ...expected } = sourceCase;
    assert.deepEqual(sourceObservationForCode(sourceCase.source), expected);
  }
  for (const sourceCase of ERLANG_PYGMENTS_218_RULE_CASES) {
    assert.deepEqual(
      [...ErlangReader.generateTokens(sourceCase.source)],
      sourceCase.token_values,
      sourceCase.name
    );
    assert.deepEqual(
      sourceObservationForCode(sourceCase.source),
      sourceCase.observation,
      sourceCase.name
    );
  }
  assert.deepEqual(
    [...ErlangReader.generateTokens(ERLANG_LEXER_PROBE)],
    ERLANG_LEXER_PROBE_TOKEN_VALUES
  );
});

function readFixture(name: string): readonly FunctionMeasurement[] {
  const path = resolve(fixtureDirectory, name);
  return analyze(readFileSync(path, "utf8")).map(toMeasurement);
}

function analyze(sourceCode: string): readonly FunctionInfo[] {
  return analyzeSourceCode("source.erl", sourceCode, ErlangReader).functionList;
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

type PygmentsRuleCase = Readonly<{
  readonly name: string;
  readonly source: string;
  readonly token_values: readonly string[];
  readonly observation: Omit<SourceObservation, "source">;
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

function sourceObservationForCode(sourceCode: string): Omit<SourceObservation, "source"> {
  const file = analyzeSourceCode("source.erl", sourceCode, ErlangReader);
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

const ERLANG_SOURCE_CASES: readonly SourceObservation[] = [
  {
    source:
      "\n        module_as_actor(E) when is_record(E, event) ->\n        case lists:key_search(mfa, 1, E#event.contents) of\n            {value, {mfa, {M, F, _A}}} ->\n                case lists:key_search(pam_result, 1, E#event.contents) of\n                    {value, {pam_result, {M2, _F2, _A2}}} ->\n                        {true, E#event{label = F, from = M2, to = M}};\n                    _ ->\n                        {true, E#event{label = F, from = M, to = M}}\n                end;\n            _ ->\n                false\n        end.\n        ",
    file_nloc: 1,
    functions: [
      {
        name: "is_record",
        long_name: "is_record( E , event )",
        ccn: 3,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 2,
        parameters: ["E", "event"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        %% @doc Insert a new Key into the Tree.\n        %%      If the Key already exists, it will be replaced.\n        %%\n        %% @spec insert(integer(), term(), tree()) -> tree().\n        insert(K, V, _Tree = ?EMPTY_NODE) ->\n            {node, {K, V, init(), init()}};\n        insert(K, V, _Tree = {node, {NodeK, NodeV, Left, Right}}) ->\n            if K == NodeK -> % replace\n                {node, {K, V, Left, Right}}\n            ; K  < NodeK ->\n                {node, {NodeK, NodeV, insert(K, V, Left), Right}}\n            ; K  > NodeK ->\n                {node, {NodeK, NodeV, Left, insert(K, V, Right)}}\n            end.\n\n        %% @private\n        insert([], Tree) -> Tree;\n        insert([{K, V}|Rest], Tree) ->\n            insert(Rest, insert(K, V, Tree)).\n        ",
    file_nloc: 1,
    functions: [
      {
        name: "insert",
        long_name: "insert( K , V , _ Tree = ? EMPTY_NODE )",
        ccn: 2,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 3,
        parameters: ["K", "V", "Tree"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "insert",
        long_name: "insert( K , V , _ Tree = { node , { NodeK , NodeV , Left , Right } } )",
        ccn: 2,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 6,
        parameters: ["K", "V", "Tree", "NodeK", "NodeV", "Left"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "insert",
        long_name: "insert( [ ] , Tree )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["Tree"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "insert",
        long_name: "insert( [ { K , V } | Rest ] , Tree )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 2,
        parameters: ["K", "Tree"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "\n\n                ",
    file_nloc: 0,
    functions: []
  },
  {
    source:
      "\n        insert([{K, V}|Rest], Tree) ->\n            insert(Rest, insert(K, V, Tree)).\n        ",
    file_nloc: 1,
    functions: [
      {
        name: "insert",
        long_name: "insert( [ { K , V } | Rest ] , Tree )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 2,
        parameters: ["K", "Tree"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        tail_recursive_fib(N) ->\n            tail_recursive_fib(N, 0, 1, []).\n        lookup(_K, _Tree = ?EMPTY_NODE) ->\n            {none, 'undefined'};\n        lookup(K, _Tree = {node, {NodeK, V, Left, Right}}) ->\n            if K == NodeK -> {ok, V}\n            ; K <  NodeK -> lookup(K, Left)\n            ; K >  NodeK -> lookup(K, Right)\n        end.\n        ",
    file_nloc: 1,
    functions: [
      {
        name: "tail_recursive_fib",
        long_name: "tail_recursive_fib( N )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["N"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "lookup",
        long_name: "lookup( _ K , _ Tree = ? EMPTY_NODE )",
        ccn: 2,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 2,
        parameters: ["K", "Tree"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "lookup",
        long_name: "lookup( K , _ Tree = { node , { NodeK , V , Left , Right } } )",
        ccn: 2,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 5,
        parameters: ["K", "Tree", "NodeK", "V", "Left"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      '\n        sim_trans() ->\n            sim_trans([]).\n\n        sim_trans(ExtraOptions) ->\n            Options = [{dict_insert, {filter, mgr_actors}, fun mgr_actors/1}],\n            {ok, Viewer} = et_viewer:start_link(Options ++ ExtraOptions),\n            Collector = et_viewer:get_collector_pid(Viewer),\n            et_collector:report_event(Collector, 60, my_shell, mnesia_tm, start_outer, \n                                      "Start outer transaction"),\n            et_collector:report_event(Collector, 40, mnesia_tm, my_shell, new_tid, \n                                      "New transaction id is 4711"),\n            et_collector:report_event(Collector, 20, my_shell, mnesia_locker, try_write_lock, \n                                      "Acquire write lock for {my_tab, key}"),\n            et_collector:report_event(Collector, 10, mnesia_locker, my_shell, granted,\n                                      "You got the write lock for {my_tab, key}"),\n            et_collector:report_event(Collector, 60, my_shell, do_commit,\n                                      "Perform  transaction commit"),\n            et_collector:report_event(Collector, 40, my_shell, mnesia_locker, release_tid,\n                                      "Release all locks for transaction 4711"),\n            et_collector:report_event(Collector, 60, my_shell, mnesia_tm, delete_transaction,\n                                      "End of outer transaction"),\n            et_collector:report_event(Collector, 20, my_shell, end_outer,\n                                      "Transaction returned {atomic, ok}"),\n            {collector, Collector}.\n        ',
    file_nloc: 1,
    functions: [
      {
        name: "sim_trans",
        long_name: "sim_trans( )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "sim_trans",
        long_name: "sim_trans( ExtraOptions )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["ExtraOptions"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        replace(Whole,Old,New) ->\n            OldLen = length(Old),\n            ReplaceInit = fun (Next, NewWhole) ->\n                      case lists:prefix(Old, [Next|NewWhole]) of\n                          true ->\n                              {_,Rest} = lists:split(OldLen-1, NewWhole),\n                              New ++ Rest;\n                          false -> [Next|NewWhole]\n                      end\n                  end,\n        lists:foldr(ReplaceInit, [], Whole).\n        ",
    file_nloc: 1,
    functions: [
      {
        name: "fun",
        long_name: "fun( Next , NewWhole )",
        ccn: 2,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 2,
        parameters: ["Next", "NewWhole"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "replace",
        long_name: "replace( Whole , Old , New )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 3,
        parameters: ["Whole", "Old", "New"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source:
      "\n        get_value(Key) ->\n            Value = ?DEFAULT_VALUE,\n            case ?LOOKUP_TABLE of\n                undefined -> Value;\n                Table -> fetch(Key, Table)\n            end.\n        ",
    file_nloc: 1,
    functions: [
      {
        name: "get_value",
        long_name: "get_value( Key )",
        ccn: 4,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["Key"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  }
];

const ERLANG_ADVERSARIAL_SOURCE_CASES: readonly SourceObservation[] = [
  {
    source:
      "-module(sample).\n-export([run/1]).\n-spec run(integer()) -> integer().\nrun(Value) when Value > 0 -> Value;\nrun(_) -> 0.\n",
    file_nloc: 1,
    functions: [
      {
        name: "run",
        long_name: "run( integer ( ) )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      },
      {
        name: "run",
        long_name: "run( _ )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["_"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "% one\n%% doc\nrun() -> % tail\n case ?M of ok -> ok; _ -> error end.\n",
    file_nloc: 1,
    functions: [
      {
        name: "run",
        long_name: "run( )",
        ccn: 3,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "'quoted_name'(Value) -> Value.\n",
    file_nloc: 1,
    functions: []
  },
  {
    source: "decode(<<Tag:8, Rest/binary>>) ->\n case Tag of 1 -> {ok, Rest}; _ -> error end.\n",
    file_nloc: 1,
    functions: [
      {
        name: "decode",
        long_name: "decode( < < Tag : 8 , Rest / binary > > )",
        ccn: 2,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["Tag"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "strings() -> \"case -> end\", 'if'.\n",
    file_nloc: 1,
    functions: [
      {
        name: "strings",
        long_name: "strings( )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "higher(Fun) -> fun module:call/1, Fun.\n",
    file_nloc: 1,
    functions: [
      {
        name: "higher",
        long_name: "higher( Fun )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["Fun"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "map() -> #{case => fun() -> ok end}.\n",
    file_nloc: 1,
    functions: [
      {
        name: "fun",
        long_name: "fun( )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "not_a_function = fun(X) -> X end.\n",
    file_nloc: 1,
    functions: [
      {
        name: "fun",
        long_name: "fun( X )",
        ccn: 1,
        nloc: 1,
        start_line: 1,
        end_line: 1,
        parameter_count: 1,
        parameters: ["X"],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  },
  {
    source: "#!/usr/bin/env escript\nrun() -> ok.\n",
    file_nloc: 2,
    functions: [
      {
        name: "run",
        long_name: "run( )",
        ccn: 1,
        nloc: 1,
        start_line: 2,
        end_line: 2,
        parameter_count: 0,
        parameters: [],
        top_nesting_level: 0,
        max_nesting_depth: 0
      }
    ]
  }
];

const ERLANG_PYGMENTS_218_RULE_CASES: readonly PygmentsRuleCase[] = [
  {
    name: "quoted_atom",
    source: "f() -> 'quoted\\'case'.\n",
    token_values: ["f", "(", ")", "-", ">", "'", "quoted", "\\", "'case'", "."],
    observation: {
      file_nloc: 1,
      functions: [
        {
          name: "f",
          long_name: "f( )",
          ccn: 1,
          nloc: 1,
          start_line: 1,
          end_line: 1,
          parameter_count: 0,
          parameters: [],
          top_nesting_level: 0,
          max_nesting_depth: 0
        }
      ]
    }
  },
  {
    name: "control_character",
    source: "f($\\^A) -> ok.\n",
    token_values: ["f", "(", "$\\^A", ")", "-", ">", "ok", "."],
    observation: {
      file_nloc: 1,
      functions: [
        {
          name: "f",
          long_name: "f( $\\^A )",
          ccn: 1,
          nloc: 1,
          start_line: 1,
          end_line: 1,
          parameter_count: 1,
          parameters: ["A"],
          top_nesting_level: 0,
          max_nesting_depth: 0
        }
      ]
    }
  },
  {
    name: "out_of_range_base",
    source: "f() -> 37#Z.\n",
    token_values: ["f", "(", ")", "-", ">", "37", "#", "Z", "."],
    observation: {
      file_nloc: 1,
      functions: [
        {
          name: "f",
          long_name: "f( )",
          ccn: 1,
          nloc: 1,
          start_line: 1,
          end_line: 1,
          parameter_count: 0,
          parameters: [],
          top_nesting_level: 0,
          max_nesting_depth: 0
        }
      ]
    }
  },
  {
    name: "record_and_escapes",
    source: "f() -> #record.field, #record{field = $\\^A}, $\\x4F, $\\x{4F}, $\\123.\n",
    token_values: [
      "f",
      "(",
      ")",
      "-",
      ">",
      "#record.field",
      ",",
      "#record",
      "{",
      "field",
      "=",
      "$\\^A",
      "}",
      ",",
      "$\\x4F",
      ",",
      "$\\x{4F}",
      ",",
      "$\\123",
      "."
    ],
    observation: {
      file_nloc: 1,
      functions: [
        {
          name: "f",
          long_name: "f( )",
          ccn: 1,
          nloc: 1,
          start_line: 1,
          end_line: 1,
          parameter_count: 0,
          parameters: [],
          top_nesting_level: 0,
          max_nesting_depth: 0
        }
      ]
    }
  },
  {
    name: "directive_and_macro_quote",
    source: "-define('quoted\\'case', $\\^A).\nf() -> ?'quoted\\'case'.\n",
    token_values: [
      "-",
      "define",
      "(",
      "'",
      "quoted",
      "\\",
      "'case'",
      ",",
      "$\\^A",
      ")",
      ".",
      "f",
      "(",
      ")",
      "-",
      ">",
      "?",
      "'",
      "quoted",
      "\\",
      "'case'",
      "."
    ],
    observation: {
      file_nloc: 1,
      functions: [
        {
          name: "f",
          long_name: "f( )",
          ccn: 2,
          nloc: 1,
          start_line: 1,
          end_line: 1,
          parameter_count: 0,
          parameters: [],
          top_nesting_level: 0,
          max_nesting_depth: 0
        }
      ]
    }
  },
  {
    name: "string_escapes",
    source: 'f() -> "\\^A \\x4F \\x{4F} \\123 \\q ~p".\n',
    token_values: [
      "f",
      "(",
      ")",
      "-",
      ">",
      '"',
      "\\^A",
      " ",
      "\\x4F",
      " ",
      "\\x{4F}",
      " ",
      "\\123",
      " ",
      "\\",
      "q ",
      "~p",
      '"',
      "."
    ],
    observation: {
      file_nloc: 1,
      functions: [
        {
          name: "f",
          long_name: "f( )",
          ccn: 1,
          nloc: 1,
          start_line: 1,
          end_line: 1,
          parameter_count: 0,
          parameters: [],
          top_nesting_level: 0,
          max_nesting_depth: 0
        }
      ]
    }
  },
  {
    name: "directive_error_values",
    source: "-16#f.\n",
    token_values: ["-", "1", "6", "#", "f", "."],
    observation: {
      file_nloc: 1,
      functions: []
    }
  },
  {
    name: "directive_errors_preserve_horizontal_whitespace_and_newline_reset",
    source: "- 16#f.\n-\n16#f.\n",
    token_values: ["-", " ", "1", "6", "#", "f", ".", "-", "16#f", "."],
    observation: {
      file_nloc: 1,
      functions: []
    }
  },
  {
    name: "invalid_hashbang",
    source: "#!\n",
    token_values: ["#", "!"],
    observation: {
      file_nloc: 1,
      functions: []
    }
  }
];

const ERLANG_LEXER_PROBE =
  "#!/usr/bin/env escript\n% one comment\n%% two comments\n-module(sample).\n-define(ANSWER, 16#fF).\nrun(<<Tag:8, Rest/binary>>) when Tag =:= $A ->\n    #{key => \"case -> end ~p\", record => #event.value, atom => 'quoted atom'};\nrun(_) -> ?ANSWER.\n";

const ERLANG_LEXER_PROBE_TOKEN_VALUES = [
  "#!/usr/bin/env escript\n",
  "% one comment",
  "%% two comments",
  "-",
  "module",
  "(",
  "sample",
  ")",
  ".",
  "-",
  "define",
  "(",
  "ANSWER",
  ",",
  "16#fF",
  ")",
  ".",
  "run",
  "(",
  "<",
  "<",
  "Tag",
  ":",
  "8",
  ",",
  "Rest",
  "/",
  "binary",
  ">",
  ">",
  ")",
  "when",
  "Tag",
  "=:=",
  "$A",
  "-",
  ">",
  "#{",
  "key",
  "=",
  ">",
  '"',
  "case -> end ",
  "~p",
  '"',
  ",",
  "record",
  "=",
  ">",
  "#event.value",
  ",",
  "atom",
  "=",
  ">",
  "'quoted atom'",
  "}",
  ";",
  "run",
  "(",
  "_",
  ")",
  "-",
  ">",
  "?",
  "ANSWER",
  "."
];

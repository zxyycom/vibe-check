"""Read-only observation of caller-selected Lizard release or commit source.

Input JSON is the output of the predecessor's reproduce.mjs, including samples.
Arguments: source root, saved input JSON, expected version, source label.
No fixture functions are executed; no package installation or source patching.
The comparison is descriptive, not an assertion that the defects must persist.
"""
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
request = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
sys.path.insert(0, str(root))
import lizard
from lizard_ext.version import version
from lizard_languages.typescript import TypeScriptReader
from lizard_languages.code_reader import CodeStateMachine
import pygments

assert pathlib.Path(lizard.__file__).resolve() == root / "lizard.py"
assert version == sys.argv[3]
extensions = lizard.get_extensions(["complextags", "nd"])
analyzer = lizard.FileAnalyzer(extensions)

def metrics(filename, code):
    result = analyzer.analyze_source_code(filename, code)
    return [{
        "complex_tags": getattr(function, "complex_tags", []),
        "cyclomatic_complexity": function.cyclomatic_complexity,
        "end_line": function.end_line,
        "filename": function.filename,
        "name": function.name,
        "nloc": function.nloc,
        "parameter_count": function.parameter_count,
        "max_nesting_depth": function.max_nesting_depth,
        "start_line": function.start_line,
    } for function in result.function_list]

analysis = [{
    "filename": filename,
    "questionTokens": [
        token for token in TypeScriptReader.generate_tokens(code) if "?" in token
    ],
    "functions": metrics(filename, code),
} for filename, code in request["samples"].items()]

events = []
machine = CodeStateMachine(None)
machine._state = lambda token: True
machine.saved_state = lambda token: False
def old_callback():
    events.append("old callback")
    machine.sub_state(lambda token: False, lambda: events.append("new callback"))
    events.append("installed: " + str(callable(machine.callback)))
machine.callback = old_callback
machine("probe")
events.append("after consume: " + str(callable(machine.callback)))

output = {
    "target": {
        "lizardVersion": version,
        "sourceLabel": sys.argv[4],
        "pythonVersion": sys.version,
        "pythonExecutable": sys.executable,
        "pygmentsVersion": pygments.__version__,
        "extensions": ["complextags", "nd"],
    },
    "sampleSha256": hashlib.sha256(json.dumps(
        request["samples"], ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")).hexdigest(),
    "analysis": analysis,
    "sameMetricsAndQuestionTokensAsSavedPort": analysis == request["analysis"],
    "callbackProbe": events,
}

print(json.dumps(output, indent=2, ensure_ascii=False))

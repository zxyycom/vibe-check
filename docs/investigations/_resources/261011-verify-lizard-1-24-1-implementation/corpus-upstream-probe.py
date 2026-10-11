"""Read-only observation of caller-selected Lizard release or commit source.

Input JSON contains independent cases reconstructed from upstream regressions.
Arguments: source root, survey input JSON, expected version, source label.
No fixture functions are executed; no package installation or source patching.
"""
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
request = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
sys.path.insert(0, str(root))
import lizard
from lizard_ext.version import version
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
    "filename": case["filename"],
    "functions": metrics(case["filename"], case["sourceCode"]),
} for case in request["cases"]]
capability = [{"reader": reader.__name__, "suffixes": list(reader.ext)}
              for reader in lizard.languages()]
output = {
    "target": {"lizardVersion": version, "sourceLabel": sys.argv[4],
               "pythonVersion": sys.version, "pygmentsVersion": pygments.__version__,
               "extensions": ["complextags", "nd"]},
    "analysis": analysis,
    "capability": capability,
}
print(json.dumps(output, indent=2, ensure_ascii=False))

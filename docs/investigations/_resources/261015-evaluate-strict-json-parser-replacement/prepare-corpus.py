"""Build an exclusive scratch pack from the report's fixed Git revision, not live docs."""
import base64
import hashlib
import json
import pathlib
import subprocess
import sys

REVISION = "fc584f2bd52ad60da9d80d05bbe8097da4c6c57e"
target = pathlib.Path(sys.argv[1])
paths = subprocess.check_output(
    ["git", "ls-tree", "-r", "--name-only", REVISION, "docs"]
).decode().splitlines()
documents = []
for path in sorted(p for p in paths if p.endswith(".json")):
    content = subprocess.check_output(["git", "show", f"{REVISION}:{path}"])
    documents.append({"path": path, "sha256": hashlib.sha256(content).hexdigest(),
                      "base64": base64.b64encode(content).decode()})
with target.open("x") as output:
    json.dump({"revision": REVISION, "documents": documents}, output)
print(json.dumps({"revision": REVISION, "documents": len(documents),
                  "packSha256": hashlib.sha256(target.read_bytes()).hexdigest()}))

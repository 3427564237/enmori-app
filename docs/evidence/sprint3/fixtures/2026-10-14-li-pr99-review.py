"""Read-only Git/source review of PR99; no SDK, model, device or product run."""
import hashlib
import json
import pathlib
import subprocess
import sys
from datetime import datetime, timezone

HEAD = "e84b23cd82eeda039f2bef9fa455909e9f39cc87"
PREFIX = "docs/evidence/sprint3/2026-10-14-jin-account-ra-combined-gate"


def git(*args):
    return subprocess.check_output(["git", *args])


def blob(ref, path):
    return git("show", f"{ref}:{path}")


def tree(ref):
    result = {}
    for row in git("ls-tree", "-rz", ref).split(b"\0"):
        if row:
            metadata, path = row.split(b"\t", 1)
            result[path.decode()] = metadata.decode()
    return result


manifest = json.loads(blob(HEAD, PREFIX + "-manifest.json"))
source = manifest["source"]
product = source["executable"]
inputs = source["acceptedInputHeads"]
checks = []
node_version = subprocess.check_output([sys.argv[2], "--version"]).decode().strip()
assert node_version == "v24.19.0"
assert git("rev-parse", HEAD + "^{tree}").decode().strip() == "12308b7cc5901dc2d622a34d11a465e310d0a0bf"
for commit, parents, expected in [
    (source["accountMerge"], source["accountMergeParents"], source["accountTree"]),
    (product, source["directParents"], source["tree"]),
]:
    assert git("show", "-s", "--format=%P", commit).decode().split() == parents
    merged = git("merge-tree", "--write-tree", *parents).decode().splitlines()[0]
    assert merged == expected
    assert git("rev-parse", commit + "^{tree}").decode().strip() == expected
checks.append("two independent merge-tree reconstructions match actual two-parent commits")
input_trees = [tree(ref) for ref in inputs]
product_tree = tree(product)
assert set(product_tree) == set().union(*(set(t) for t in input_trees))
assert all(any(t.get(path) == value for t in input_trees) for path, value in product_tree.items())
assert len(product_tree) == 949
for ref in inputs:
    subprocess.run(["git", "merge-base", "--is-ancestor", ref, product], check=True)
identity = hashlib.sha256(git("ls-tree", "-r", product).decode().strip().encode()).hexdigest()
assert identity == manifest["acceptedInputUnion"]["identitySha256"]
checks.append("949-file exact path/blob/mode union, all input ancestors, inventory SHA256")
new_paths = git("diff", "--name-only", product, HEAD).decode().splitlines()
fixture_rows = []
for fixture in manifest["newGateFixtures"]:
    path = fixture["publicationPath"]
    data = blob(HEAD, path)
    digest = hashlib.sha256(data).hexdigest()
    git_blob = git("rev-parse", f"{HEAD}:{path}").decode().strip()
    assert digest == fixture["gitNormalizedSha256"]
    assert git_blob == fixture["gitBlob"]
    if path.endswith(".mjs"):
        subprocess.run([sys.argv[2], "--input-type=module", "--check"], input=data, check=True)
    fixture_rows.append({"path": path, "gitBlob": git_blob, "sha256": digest, "bytes": len(data)})
assert set(new_paths) == {r["path"] for r in fixture_rows} | {PREFIX + ".md", PREFIX + "-manifest.json"}
checks.append("six publication-only additions; four fixture byte identities; three Node syntax checks")
protected = ["api/openapi.json", "backend/src/bootstrap/build-app.ts", "package.json", "pnpm-lock.yaml", "pubspec.yaml", "pubspec.lock", "firebase.json", "lib/main.dart"]
for path in protected:
    assert blob(product, path) == blob(inputs[0], path)
assert blob(product, "firestore.indexes.json") == blob(inputs[1], "firestore.indexes.json")
api = json.loads(blob(product, "api/openapi.json"))
operations = [op for item in api["paths"].values() for key, op in item.items() if key.lower() in {"get", "post", "put", "delete", "patch", "head", "options", "trace"}]
assert len(operations) == 27 and len(api["components"]["schemas"]) == 33
checks.append("eight protected source files equal #97, index equals #95, API27/schema33")
executions = manifest["verification"]["results"]
assert executions["flutterFirstFull"] == {"pass": 504, "fail": 1, "exit": 1}
assert executions["flutterSingleConcurrencyComparison"]["exit"] == 0
assert executions["flutterSingleConcurrencyComparison"]["causeConfirmed"] is False
assert len(manifest["android"]) == 7
assert all(row["source"] == product and row["tree"] == source["tree"] and row["exit"] == 0 for row in manifest["android"])
assert manifest["emulator"]["tests"] == 76
assert manifest["whitespace"]["fullDeltaExit"] == 2
checks.append("owner manifest preserves first Flutter failure, seven separate source-bound Android invocations and whitespace exception")
for label, paths in [
    ("newPublication", new_paths),
    ("productCode", [p for p in git("diff", "--name-only", inputs[0], product).decode().splitlines() if not p.startswith("docs/")]),
]:
    base, target = (product, HEAD) if label == "newPublication" else (inputs[0], product)
    subprocess.run(["git", "diff", "--check", base, target, "--", *paths], check=True)
checks.append("new publication and inherited executable delta whitespace clean; full historical delta not relabelled")
receipt = {
    "recordedUtc": datetime.now(timezone.utc).isoformat(),
    "reviewer": "LI independent source/evidence review",
    "syntaxNode": node_version,
    "head": HEAD, "tree": git("rev-parse", HEAD + "^{tree}").decode().strip(),
    "product": product, "productTree": source["tree"],
    "checks": checks, "fixtures": fixture_rows,
    "ownerCounts": {"backend": 649, "emulator": 76, "flutterFirst": "504/1/exit1", "flutterSerial": "505/0/exit0"},
    "notRunByLi": ["Backend/Flutter product suites", "actual SDK/Emulator", "Android or physical phone", "private artifact rehash"],
    "residual": "Original Flutter root cause remains unconfirmed; no blanket green gate or reliability closure.",
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps({"checks": len(checks), "fixtures": len(fixture_rows), "productFiles": len(product_tree), "status": "pass"}))

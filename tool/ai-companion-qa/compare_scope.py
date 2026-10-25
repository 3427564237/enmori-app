#!/usr/bin/env python3
"""Compare complete same-scope hash manifests, without reading product data.

Exit 0: hashes match the declared preservation expectation (not product acceptance).
Exit 1: observed differences. Exit 2: incomplete/invalid/incomparable evidence.
No network access, credentials, data capture, writes, or raw identities in output.
"""
import argparse
import datetime as dt
import json
import re
from pathlib import Path

DIGEST = re.compile(r"[0-9a-f]{64}")


def digest(value):
    return isinstance(value, str) and DIGEST.fullmatch(value) is not None


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"),
                      object_pairs_hook=no_duplicate_keys)


def manifest(value):
    if not isinstance(value, dict) or set(value) != {
        "version", "captureStatus", "scopeFingerprint", "capturedAt", "documents"
    }:
        raise ValueError("invalid manifest shape")
    if type(value["version"]) is not int or value["version"] != 1:
        raise ValueError("unsupported manifest version")
    if value["captureStatus"] != "complete":
        raise ValueError("capture incomplete or unknown")
    if not digest(value["scopeFingerprint"]):
        raise ValueError("invalid scope fingerprint")
    stamp = value["capturedAt"]
    if not isinstance(stamp, str) or not re.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", stamp
    ):
        raise ValueError("capturedAt must be a UTC timestamp")
    instant = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    rows = value["documents"]
    if not isinstance(rows, list) or not rows:
        raise ValueError("protected scope requires nonempty complete inventory")
    contents = {}
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"idHash", "contentHash"}:
            raise ValueError("invalid document hash record")
        if not digest(row["idHash"]) or not digest(row["contentHash"]):
            raise ValueError("invalid document digest")
        if row["idHash"] in contents:
            raise ValueError("duplicate document identity")
        contents[row["idHash"]] = row["contentHash"]
    return value["scopeFingerprint"], instant, contents


def compare(before, after, expected_additions=None):
    scope_a, time_a, old = manifest(before)
    scope_b, time_b, new = manifest(after)
    if scope_a != scope_b or time_b <= time_a:
        raise ValueError("scope differs or captures are not ordered")
    expected = {} if expected_additions is None else expected_additions
    if not isinstance(expected, dict) or any(
        not digest(k) or not digest(v) for k, v in expected.items()
    ):
        raise ValueError("expected additions must map identity hashes to content hashes")
    if set(expected) & set(old):
        raise ValueError("expected addition already exists in before snapshot")
    added = {key: new[key] for key in new.keys() - old.keys()}
    removed = old.keys() - new.keys()
    changed = {key for key in old.keys() & new.keys() if old[key] != new[key]}
    matches = not removed and not changed and added == expected
    return {
        "status": "MATCH" if matches else "DIFFERENT",
        "beforeCount": len(old), "afterCount": len(new),
        "unchangedCount": len(old.keys() & new.keys()) - len(changed),
        "changedCount": len(changed), "removedCount": len(removed),
        "addedCount": len(added), "expectedAdditionsMatch": added == expected,
        "scope": "provided complete same-scope hash manifests only",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before")
    parser.add_argument("after")
    parser.add_argument("--expected-additions")
    args = parser.parse_args()
    try:
        result = compare(load(args.before), load(args.after),
                         load(args.expected_additions) if args.expected_additions else None)
    except (ValueError, TypeError, OSError):
        # Do not echo filenames, JSON data or private identifiers on failure.
        print(json.dumps({"status": "INCOMPARABLE", "reason":
              "invalid, incomplete, unordered, or differently scoped manifests"}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "MATCH" else 1


if __name__ == "__main__":
    raise SystemExit(main())

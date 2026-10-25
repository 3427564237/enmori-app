import copy
import unittest
from compare_scope import compare, no_duplicate_keys


def snap(seconds, rows=None):
    return {"version": 1, "captureStatus": "complete", "scopeFingerprint": "a" * 64,
            "capturedAt": f"2026-10-25T06:00:{seconds:02d}Z",
            "documents": rows if rows is not None else [
                {"idHash": "b" * 64, "contentHash": "c" * 64}]}


class PreservationComparisonTests(unittest.TestCase):
    def test_identical_contents_at_later_capture_match(self):
        self.assertEqual(compare(snap(0), snap(1))["status"], "MATCH")

    def test_equal_counts_cannot_hide_replacement(self):
        after = snap(1, [{"idHash": "d" * 64, "contentHash": "c" * 64}])
        result = compare(snap(0), after)
        self.assertEqual((result["removedCount"], result["addedCount"]), (1, 1))
        self.assertEqual(result["status"], "DIFFERENT")

    def test_equal_counts_cannot_hide_modified_content(self):
        after = snap(1)
        after["documents"][0]["contentHash"] = "d" * 64
        self.assertEqual(compare(snap(0), after)["changedCount"], 1)

    def test_exact_expected_addition_matches_only_its_content(self):
        after = snap(1)
        after["documents"].append({"idHash": "d" * 64, "contentHash": "e" * 64})
        self.assertEqual(compare(snap(0), after)["status"], "DIFFERENT")
        self.assertEqual(compare(snap(0), after, {"d" * 64: "e" * 64})["status"], "MATCH")
        self.assertEqual(compare(snap(0), after, {"d" * 64: "f" * 64})["status"], "DIFFERENT")

    def test_unused_expected_addition_does_not_match(self):
        self.assertEqual(compare(snap(0), snap(1), {"d" * 64: "e" * 64})["status"], "DIFFERENT")

    def test_existing_document_cannot_be_declared_an_addition(self):
        with self.assertRaises(ValueError):
            compare(snap(0), snap(1), {"b" * 64: "c" * 64})

    def test_unknown_or_partial_capture_is_not_empty_success(self):
        for state in ["unknown", "partial", "failed"]:
            with self.subTest(state=state), self.assertRaises(ValueError):
                after = snap(1)
                after["captureStatus"] = state
                compare(snap(0), after)

    def test_scope_change_cannot_match(self):
        after = snap(1)
        after["scopeFingerprint"] = "f" * 64
        with self.assertRaises(ValueError):
            compare(snap(0), after)

    def test_same_or_reversed_capture_is_incomparable(self):
        for stamp in [0, 1]:
            with self.subTest(stamp=stamp), self.assertRaises(ValueError):
                compare(snap(1), snap(stamp))

    def test_duplicate_identity_is_not_silently_deduplicated(self):
        after = snap(1)
        after["documents"].append(copy.deepcopy(after["documents"][0]))
        with self.assertRaises(ValueError):
            compare(snap(0), after)

    def test_empty_missing_or_raw_identifier_is_incomparable(self):
        for rows in [[], None, [{"idHash": "private/account/path", "contentHash": "c" * 64}]]:
            after = snap(1)
            after["documents"] = rows
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                compare(snap(0), after)

    def test_duplicate_json_keys_are_rejected(self):
        with self.assertRaises(ValueError):
            no_duplicate_keys([("captureStatus", "unknown"), ("captureStatus", "complete")])


if __name__ == "__main__":
    unittest.main()

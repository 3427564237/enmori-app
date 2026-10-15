"""Count complete raw framing using LI's already installed model-matched tokenizer.

No model/tokenizer download, text log/file, token IDs, truncation or fallback.
argv contains only trusted local paths/digests/version; request content is stdin.
"""
import hashlib
import importlib.metadata
import pathlib
import sys


def main():
    if len(sys.argv) != 4 or sys.argv[3] != "0.23.3":
        raise ValueError("unavailable")
    path = pathlib.Path(sys.argv[1])
    if not path.is_absolute():
        raise ValueError("unavailable")
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != sys.argv[2]:
        raise ValueError("unavailable")
    if importlib.metadata.version("tokenizers") != sys.argv[3]:
        raise ValueError("unavailable")
    from tokenizers import Tokenizer
    tokenizer = Tokenizer.from_str(data.decode("utf-8", errors="strict"))
    if tokenizer.truncation is not None or tokenizer.padding is not None:
        raise ValueError("unavailable")
    raw = sys.stdin.buffer.read().decode("utf-8", errors="strict")
    encoded = tokenizer.encode(raw, add_special_tokens=False)
    count = len(encoded.ids)
    raw = ""
    del encoded, tokenizer, data
    if count < 1:
        raise ValueError("unavailable")
    sys.stdout.write(str(count) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # No exception text, path, prompt or token IDs on stderr.
        sys.exit(1)

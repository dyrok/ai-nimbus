#!/usr/bin/env bash
# PreToolUse guard blocking Write/Edit mutations targeting data/protected/.
# Fails closed on malformed stdin JSON, missing/invalid file_path, or path errors.
set -euo pipefail

exec python3 -c '
import json
import os
from pathlib import Path
import sys

DENY_PAYLOAD = {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            "[PADLOCK] Protected campus ledger guard: writes to \x27data/protected/\x27 are blocked. "
            "Draft proposed changes under \x27proposals/\x27 for registrar review instead."
        ),
    }
}


def deny() -> None:
    """Emit structured PreToolUse deny JSON on stdout and exit 0."""
    sys.stdout.write(json.dumps(DENY_PAYLOAD, indent=2) + "\n")
    sys.exit(0)


def has_protected_segment(path_str: str) -> bool:
    """Return True if path contains exact adjacent segments ("data", "protected")."""
    parts = Path(path_str).parts
    case_insensitive = sys.platform in ("darwin", "win32")
    for idx in range(len(parts) - 1):
        first = parts[idx].lower() if case_insensitive else parts[idx]
        second = parts[idx + 1].lower() if case_insensitive else parts[idx + 1]
        if first == "data" and second == "protected":
            return True
    return False


def is_under_root(target_path: str, root_path: str) -> bool:
    """Return True if target_path equals or is nested within root_path."""
    if not root_path:
        return False
    case_insensitive = sys.platform in ("darwin", "win32")
    target_cmp = target_path.lower() if case_insensitive else target_path
    root_cmp = root_path.lower() if case_insensitive else root_path
    try:
        return Path(target_cmp).is_relative_to(Path(root_cmp))
    except ValueError:
        return False


def main() -> None:
    try:
        raw_bytes = sys.stdin.buffer.read()
        payload = json.loads(raw_bytes.decode("utf-8"))
    except Exception:
        deny()

    if not isinstance(payload, dict):
        deny()

    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        deny()

    file_path = tool_input.get("file_path")
    if not isinstance(file_path, str) or not file_path.strip():
        deny()

    raw_cwd = payload.get("cwd")
    if raw_cwd is None or (isinstance(raw_cwd, str) and not raw_cwd.strip()):
        cwd = os.getcwd()
    elif isinstance(raw_cwd, str):
        cwd = raw_cwd
    else:
        deny()

    try:
        norm_cwd = cwd.replace("\\", "/")
        norm_file = file_path.replace("\\", "/")
        joined = os.path.join(norm_cwd, norm_file)
        canonical = os.path.realpath(joined)
        lexical = os.path.normpath(joined)
    except Exception:
        deny()

    candidates = [canonical, lexical]
    if any(has_protected_segment(candidate) for candidate in candidates):
        deny()

    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT", "").strip()
    if plugin_root:
        try:
            norm_root = plugin_root.replace("\\", "/")
            protected_real = os.path.realpath(os.path.join(norm_root, "data", "protected"))
            protected_lex = os.path.normpath(os.path.join(norm_root, "data", "protected"))
            if any(
                is_under_root(candidate, root)
                for candidate in candidates
                for root in (protected_real, protected_lex)
            ):
                deny()
        except Exception:
            deny()


if __name__ == "__main__":
    main()
'

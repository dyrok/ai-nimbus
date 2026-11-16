#!/usr/bin/env bash
# Adversarial test suite for plugins/campus-helpdesk/hooks/scripts/protect-data.sh.
# Verifies traversal blocking, symlink resolution, fail-closed parsing, and safe-path allowance.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PLUGIN_ROOT="${REPO_ROOT}/plugins/campus-helpdesk"
HOOK_SCRIPT="${PLUGIN_ROOT}/hooks/scripts/protect-data.sh"
EXPECTED_REASON="[PADLOCK] Protected campus ledger guard: writes to 'data/protected/' are blocked. Draft proposed changes under 'proposals/' for registrar review instead."

PASS_COUNT=0
FAIL_COUNT=0

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

pass() {
  printf 'PASS: %s\n' "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

build_payload() {
  local tool_name="$1"
  local file_path="$2"
  local cwd_val="$3"
  python3 -c '
import json, sys
print(json.dumps({
    "session_id": "sess_test_hook_01",
    "cwd": sys.argv[3],
    "hook_event_name": "PreToolUse",
    "tool_name": sys.argv[1],
    "tool_input": {"file_path": sys.argv[2]}
}))
' "${tool_name}" "${file_path}" "${cwd_val}"
}

assert_denied() {
  local label="$1"
  local payload="$2"
  local plugin_root_env="${3:-${PLUGIN_ROOT}}"

  local stdout_file="${TMP_DIR}/stdout.txt"
  local stderr_file="${TMP_DIR}/stderr.txt"
  local rc=0

  set +e
  printf '%s' "${payload}" | CLAUDE_PLUGIN_ROOT="${plugin_root_env}" bash "${HOOK_SCRIPT}" >"${stdout_file}" 2>"${stderr_file}"
  rc=$?
  set -e

  if [ "${rc}" -ne 0 ]; then
    fail "${label} (expected exit 0, got ${rc}; stderr=$(cat "${stderr_file}"))"
    return
  fi

  if [ -s "${stderr_file}" ]; then
    fail "${label} (unexpected stderr output: $(cat "${stderr_file}"))"
    return
  fi

  if ! python3 -c '
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
out = data.get("hookSpecificOutput") or {}
assert out.get("hookEventName") == "PreToolUse", f"bad hookEventName: {out!r}"
assert out.get("permissionDecision") == "deny", f"bad decision: {out!r}"
assert out.get("permissionDecisionReason") == sys.argv[2], f"bad reason: {out!r}"
' "${stdout_file}" "${EXPECTED_REASON}"; then
    fail "${label} (unexpected JSON output: $(cat "${stdout_file}"))"
    return
  fi

  pass "${label}"
}

assert_allowed() {
  local label="$1"
  local payload="$2"
  local plugin_root_env="${3:-${PLUGIN_ROOT}}"

  local stdout_file="${TMP_DIR}/stdout.txt"
  local stderr_file="${TMP_DIR}/stderr.txt"
  local rc=0

  set +e
  printf '%s' "${payload}" | CLAUDE_PLUGIN_ROOT="${plugin_root_env}" bash "${HOOK_SCRIPT}" >"${stdout_file}" 2>"${stderr_file}"
  rc=$?
  set -e

  if [ "${rc}" -ne 0 ]; then
    fail "${label} (expected exit 0, got ${rc}; stderr=$(cat "${stderr_file}"))"
    return
  fi

  if [ -s "${stdout_file}" ]; then
    fail "${label} (expected empty stdout, got: $(cat "${stdout_file}"))"
    return
  fi

  if [ -s "${stderr_file}" ]; then
    fail "${label} (unexpected stderr output: $(cat "${stderr_file}"))"
    return
  fi

  pass "${label}"
}

# Preconditions
if [ ! -x "${HOOK_SCRIPT}" ]; then
  echo "Hook script is missing or not executable: ${HOOK_SCRIPT}" >&2
  exit 1
fi
bash -n "${HOOK_SCRIPT}"

# Create symlink fixtures inside temporary workspace
ln -s "${PLUGIN_ROOT}/data/protected/fee_ledger_master.json" "${TMP_DIR}/symlink_fee.json"
ln -s "${PLUGIN_ROOT}/data/protected" "${TMP_DIR}/symlink_protected_dir"

# Custom CLAUDE_PLUGIN_ROOT pointing via symlink to vault without "data/protected" in realpath
mkdir -p "${TMP_DIR}/vault" "${TMP_DIR}/custom_plugin/data"
ln -s "${TMP_DIR}/vault" "${TMP_DIR}/custom_plugin/data/protected"

# --- Denied cases ---
assert_denied "Direct Write to data/protected/fee_ledger_master.json" \
  "$(build_payload "Write" "plugins/campus-helpdesk/data/protected/fee_ledger_master.json" "${REPO_ROOT}")"

assert_denied "Direct Edit to absolute protected path" \
  "$(build_payload "Edit" "${PLUGIN_ROOT}/data/protected/warden_escalation_roster.json" "${REPO_ROOT}")"

assert_denied "Edit via ../ traversal (data/../data/protected)" \
  "$(build_payload "Edit" "plugins/campus-helpdesk/data/../data/protected/academic_calendar_2026.csv" "${REPO_ROOT}")"

assert_denied "Write via sibling ../ traversal (skills/../data/protected)" \
  "$(build_payload "Write" "plugins/campus-helpdesk/skills/../data/protected/fee_ledger_master.json" "${REPO_ROOT}")"

assert_denied "Duplicate-slash obfuscation (data//protected)" \
  "$(build_payload "Edit" "plugins/campus-helpdesk/data//protected/warden_escalation_roster.json" "${REPO_ROOT}")"

assert_denied "Backslash obfuscation (data\\protected)" \
  "$(build_payload "Write" 'plugins\campus-helpdesk\data\protected\fee_ledger_master.json' "${REPO_ROOT}")"

assert_denied "Symlink file pointing inside data/protected/" \
  "$(build_payload "Edit" "${TMP_DIR}/symlink_fee.json" "${REPO_ROOT}")"

assert_denied "Symlink directory pointing to data/protected/" \
  "$(build_payload "Write" "${TMP_DIR}/symlink_protected_dir/new_entry.json" "${REPO_ROOT}")"

assert_denied "Non-existent target inside data/protected/new_file.json" \
  "$(build_payload "Write" "plugins/campus-helpdesk/data/protected/new_file.json" "${REPO_ROOT}")"

assert_denied "Protected directory path itself (trailing slash)" \
  "$(build_payload "Write" "plugins/campus-helpdesk/data/protected/" "${REPO_ROOT}")"

assert_denied "Protected path resolved via CLAUDE_PLUGIN_ROOT/data/protected symlink target" \
  "$(build_payload "Write" "${TMP_DIR}/vault/secret.json" "${REPO_ROOT}")" \
  "${TMP_DIR}/custom_plugin"

assert_denied "Protected path when CLAUDE_PLUGIN_ROOT is empty" \
  "$(build_payload "Write" "data/protected/new_file.json" "${PLUGIN_ROOT}")" \
  ""

if [ "$(uname -s)" = "Darwin" ]; then
  assert_denied "Case-variant protected path on case-insensitive macOS APFS (DATA/PROTECTED)" \
    "$(build_payload "Write" "plugins/campus-helpdesk/DATA/PROTECTED/fee_ledger_master.json" "${REPO_ROOT}")"
fi

assert_denied "Malformed JSON on stdin (fail-closed)" \
  "{not valid json"

assert_denied "Empty stdin (fail-closed)" \
  ""

assert_denied "Missing tool_input.file_path (fail-closed)" \
  '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"content":"x"}}'

assert_denied "Non-string tool_input.file_path (fail-closed)" \
  '{"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":42}}'

assert_denied "Empty string tool_input.file_path (fail-closed)" \
  '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"   "}}'

# --- Allowed safe cases ---
assert_allowed "Safe workspace proposal path (proposals/fix.md)" \
  "$(build_payload "Write" "proposals/fix.md" "${REPO_ROOT}")"

assert_allowed "Unrelated similarly named root folder (data_protected_backup/note.md)" \
  "$(build_payload "Write" "data_protected_backup/note.md" "${REPO_ROOT}")"

assert_allowed "Unrelated similarly named child folder (data/protected_backup/note.md)" \
  "$(build_payload "Edit" "plugins/campus-helpdesk/data/protected_backup/note.md" "${REPO_ROOT}")"

assert_allowed "Normal plugin data file outside protected/ (data/hostel_rules.md)" \
  "$(build_payload "Edit" "plugins/campus-helpdesk/data/hostel_rules.md" "${REPO_ROOT}")"

printf '\nHook test summary: %d passed, %d failed\n' "${PASS_COUNT}" "${FAIL_COUNT}"
if [ "${FAIL_COUNT}" -ne 0 ]; then
  exit 1
fi

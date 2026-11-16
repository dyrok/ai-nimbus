"""Unit and CLI tests for the timetable-helper skill and query_timetable.py."""

from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_DIR = REPO_ROOT / "plugins" / "campus-helpdesk" / "skills" / "timetable-helper"
SCRIPT_PATH = SKILL_DIR / "scripts" / "query_timetable.py"
CSV_PATH = SKILL_DIR / "assets" / "timetable.csv"
SKILL_MD_PATH = SKILL_DIR / "SKILL.md"
COMMAND_MD_PATH = REPO_ROOT / "plugins" / "campus-helpdesk" / "commands" / "timetable.md"

EXPECTED_HEADER = [
    "batch",
    "day",
    "start_time",
    "end_time",
    "course_code",
    "course_title",
    "session_type",
    "room",
    "instructor",
    "credits",
    "term",
]
EXPECTED_BATCHES = ["AI-DS-A", "CSE-A", "CSE-B", "ECE-A"]
DAY_ORDER = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


def run_cli(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    """Execute query_timetable.py from an isolated working directory."""
    if cwd is None:
        with tempfile.TemporaryDirectory() as tmpdir:
            return subprocess.run(
                [sys.executable, str(SCRIPT_PATH), *args],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                check=False,
            )
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH), *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )


class SkillPackagingTests(unittest.TestCase):
    """Static checks for timetable-helper skill and slash command specs."""

    def test_skill_md_frontmatter_and_line_budget(self) -> None:
        self.assertTrue(SKILL_MD_PATH.is_file(), "SKILL.md must exist")
        lines = SKILL_MD_PATH.read_text(encoding="utf-8").splitlines()
        self.assertLess(len(lines), 500, "SKILL.md must stay strictly under 500 lines")
        self.assertLess(len(lines), 160, "SKILL.md should remain lean (< 160 lines)")

        text = "\n".join(lines)
        match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
        self.assertIsNotNone(match, "SKILL.md must begin with YAML frontmatter")
        frontmatter_lines = [line for line in match.group(1).splitlines() if line.strip()]
        keys = [line.split(":", 1)[0].strip() for line in frontmatter_lines]
        self.assertEqual(keys, ["name", "description"])

        name_val = frontmatter_lines[0].split(":", 1)[1].strip()
        desc_val = frontmatter_lines[1].split(":", 1)[1].strip()
        self.assertEqual(name_val, "timetable-helper")
        self.assertGreater(len(desc_val), 20)
        self.assertLessEqual(len(desc_val), 1024)

    def test_no_yaml_config_and_tier3_files_exist(self) -> None:
        self.assertEqual(
            list(SKILL_DIR.rglob("*.y*ml")),
            [],
            "Separate YAML config files are prohibited by Agent Skills specification",
        )
        self.assertTrue((SKILL_DIR / "references" / "csv-dictionary.md").is_file())
        self.assertTrue((SKILL_DIR / "references" / "edge-cases.md").is_file())
        self.assertTrue(SCRIPT_PATH.is_file())
        self.assertTrue(os.access(SCRIPT_PATH, os.X_OK), "query_timetable.py must be executable")
        self.assertTrue(COMMAND_MD_PATH.is_file())
        cmd_text = COMMAND_MD_PATH.read_text(encoding="utf-8")
        self.assertIn("$ARGUMENTS", cmd_text)
        self.assertIn("${CLAUDE_PLUGIN_ROOT}", cmd_text)


class CanonicalCsvFixtureTests(unittest.TestCase):
    """Verify encoding, line endings, schema, and row counts of timetable.csv."""

    def test_csv_encoding_lf_and_row_counts(self) -> None:
        raw = CSV_PATH.read_bytes()
        self.assertFalse(raw.startswith(b"\xef\xbb\xbf"), "CSV must not contain UTF-8 BOM")
        self.assertNotIn(b"\r", raw, "CSV must use Unix LF line endings only")

        text = raw.decode("utf-8")
        lines = text.splitlines()
        self.assertEqual(len(lines), 28, "CSV must have 1 header + 27 mock rows")

        reader = csv.DictReader(lines)
        self.assertEqual(reader.fieldnames, EXPECTED_HEADER)
        rows = list(reader)
        self.assertEqual(len(rows), 27)

        counts: dict[str, int] = {}
        for row in rows:
            self.assertNotIn(None, row)
            for col in EXPECTED_HEADER:
                self.assertTrue(row[col].strip(), f"Empty value in column {col}")
            self.assertIn(row["day"], DAY_ORDER)
            self.assertIn(row["session_type"], {"LECTURE", "LAB", "TUTORIAL"})
            self.assertRegex(row["start_time"], r"^(?:[01]\d|2[0-3]):[0-5]\d$")
            self.assertRegex(row["end_time"], r"^(?:[01]\d|2[0-3]):[0-5]\d$")
            counts[row["batch"]] = counts.get(row["batch"], 0) + 1

        self.assertEqual(
            counts,
            {"CSE-A": 10, "CSE-B": 7, "ECE-A": 5, "AI-DS-A": 5},
        )


class QueryTimetableCliTests(unittest.TestCase):
    """Verify all CLI flags, normalization, sorting, edge cases, and error exits."""

    def test_batch_and_day_normalization_json(self) -> None:
        proc = run_cli("--batch", "cse a", "--day", "mon", "--format", "json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stderr, "")
        payload = json.loads(proc.stdout)
        self.assertEqual(payload["timezone"], "Asia/Kolkata (IST)")
        self.assertEqual(payload["query"]["batch"], "CSE-A")
        self.assertEqual(payload["query"]["day"], "Monday")
        self.assertEqual(payload["matched"], 3)
        self.assertEqual(payload["valid_batches"], EXPECTED_BATCHES)
        self.assertEqual(
            [r["course_code"] for r in payload["rows"]],
            ["CS-301", "CS-305", "CS-301L"],
        )
        self.assertEqual(
            [r["start_time"] for r in payload["rows"]],
            ["09:00", "10:00", "14:00"],
        )

    def test_underscore_and_multi_hyphen_batch_normalization(self) -> None:
        proc_b = run_cli("--batch", "cse_b", "--day", "tues", "--format", "json")
        self.assertEqual(proc_b.returncode, 0, proc_b.stderr)
        data_b = json.loads(proc_b.stdout)
        self.assertEqual(data_b["query"]["batch"], "CSE-B")
        self.assertEqual(data_b["query"]["day"], "Tuesday")
        self.assertEqual(data_b["matched"], 2)
        self.assertEqual(data_b["rows"][1]["room"], "LAB-3A")

        proc_ai = run_cli("--batch", "ai ds a", "--day", "thurs", "--format", "json")
        self.assertEqual(proc_ai.returncode, 0, proc_ai.stderr)
        data_ai = json.loads(proc_ai.stdout)
        self.assertEqual(data_ai["query"]["batch"], "AI-DS-A")
        self.assertEqual(data_ai["query"]["day"], "Thursday")
        self.assertEqual(data_ai["matched"], 1)
        self.assertEqual(data_ai["rows"][0]["course_code"], "AI-302L")
        self.assertEqual(data_ai["rows"][0]["room"], "AI-GPU-1")

    def test_all_weekday_aliases_supported(self) -> None:
        cases = [
            ("mon", "Monday"),
            ("TUE", "Tuesday"),
            ("Wed", "Wednesday"),
            ("thur", "Thursday"),
            ("FRI", "Friday"),
            ("sat", "Saturday"),
            ("Sunday", "Sunday"),
        ]
        for raw_day, expected_day in cases:
            proc = run_cli("--batch", "ECE-A", "--day", raw_day, "--format", "json")
            self.assertEqual(proc.returncode, 0, f"Failed for {raw_day}: {proc.stderr}")
            payload = json.loads(proc.stdout)
            self.assertEqual(payload["query"]["day"], expected_day)

    def test_weekly_schedule_sorted_chronologically(self) -> None:
        proc = run_cli("--batch", "ECE-A", "--format", "json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        payload = json.loads(proc.stdout)
        self.assertEqual(payload["matched"], 5)
        self.assertEqual(
            [r["day"] for r in payload["rows"]],
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        )

    def test_out_of_order_csv_rows_are_sorted_deterministically(self) -> None:
        shuffled_rows = [
            "CSE-A,Friday,10:00,10:50,CS-309,Database Internals,LECTURE,LH-204,Prof. M. Menon,3,Fall-2026",
            "CSE-A,Monday,14:00,16:50,CS-301L,Distributed Systems Lab,LAB,LAB-3B,Dr. A. Kulkarni,2,Fall-2026",
            "CSE-A,Monday,09:00,09:50,CS-305,Compiler Design,LECTURE,LH-102,Prof. R. Nair,4,Fall-2026",
            "CSE-A,Monday,09:00,09:50,CS-301,Distributed Systems,LECTURE,LH-204,Dr. A. Kulkarni,4,Fall-2026",
        ]
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_csv = Path(tmpdir) / "shuffled.csv"
            tmp_csv.write_text(",".join(EXPECTED_HEADER) + "\n" + "\n".join(shuffled_rows) + "\n", encoding="utf-8")
            proc = run_cli("--csv", str(tmp_csv), "--batch", "CSE-A", "--format", "json", cwd=Path(tmpdir))
            self.assertEqual(proc.returncode, 0, proc.stderr)
            payload = json.loads(proc.stdout)
            self.assertEqual(
                [(r["day"], r["start_time"], r["course_code"]) for r in payload["rows"]],
                [
                    ("Monday", "09:00", "CS-301"),
                    ("Monday", "09:00", "CS-305"),
                    ("Monday", "14:00", "CS-301L"),
                    ("Friday", "10:00", "CS-309"),
                ],
            )

    def test_course_and_room_filters(self) -> None:
        proc_course = run_cli("--course", "cs-301", "--format", "json")
        self.assertEqual(proc_course.returncode, 0, proc_course.stderr)
        data_course = json.loads(proc_course.stdout)
        self.assertEqual(data_course["matched"], 4)
        self.assertTrue(all(r["course_code"] == "CS-301" for r in data_course["rows"]))
        self.assertEqual(
            [(r["day"], r["batch"]) for r in data_course["rows"]],
            [
                ("Monday", "CSE-A"),
                ("Tuesday", "CSE-B"),
                ("Wednesday", "CSE-A"),
                ("Thursday", "CSE-B"),
            ],
        )

        proc_room = run_cli("--room", "lh 204", "--format", "json")
        self.assertEqual(proc_room.returncode, 0, proc_room.stderr)
        data_room = json.loads(proc_room.stdout)
        self.assertEqual(data_room["matched"], 6)
        self.assertTrue(all(r["room"] == "LH-204" for r in data_room["rows"]))
        self.assertEqual(
            [(r["day"], r["start_time"], r["batch"]) for r in data_room["rows"]],
            [
                ("Monday", "09:00", "CSE-A"),
                ("Tuesday", "10:00", "CSE-B"),
                ("Tuesday", "11:00", "CSE-A"),
                ("Wednesday", "10:00", "CSE-A"),
                ("Thursday", "11:00", "CSE-B"),
                ("Friday", "10:00", "CSE-A"),
            ],
        )

    def test_list_batches_json_and_markdown_and_direct_exec(self) -> None:
        proc_json = run_cli("--list-batches", "--format", "json")
        self.assertEqual(proc_json.returncode, 0, proc_json.stderr)
        payload = json.loads(proc_json.stdout)
        self.assertEqual(payload["valid_batches"], EXPECTED_BATCHES)
        self.assertEqual(payload["count"], 4)

        proc_md = run_cli("--list-batches", "--format", "markdown")
        self.assertEqual(proc_md.returncode, 0, proc_md.stderr)
        for batch in EXPECTED_BATCHES:
            self.assertIn(batch, proc_md.stdout)

        with tempfile.TemporaryDirectory() as tmpdir:
            direct = subprocess.run(
                [str(SCRIPT_PATH), "--list-batches"],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(direct.returncode, 0, direct.stderr)
            self.assertEqual(json.loads(direct.stdout)["valid_batches"], EXPECTED_BATCHES)

    def test_weekend_empty_matches(self) -> None:
        for weekend in ("Saturday", "sun"):
            proc = run_cli("--batch", "CSE-A", "--day", weekend, "--format", "json")
            self.assertEqual(proc.returncode, 0, proc.stderr)
            payload = json.loads(proc.stdout)
            self.assertEqual(payload["matched"], 0)
            self.assertEqual(payload["rows"], [])
            self.assertEqual(payload["valid_batches"], EXPECTED_BATCHES)

    def test_unknown_batch_mech_z_and_nonexistent_course_cs999(self) -> None:
        proc_batch = run_cli("--batch", "MECH-Z", "--day", "Monday", "--format", "json")
        self.assertEqual(proc_batch.returncode, 0, proc_batch.stderr)
        data_batch = json.loads(proc_batch.stdout)
        self.assertEqual(data_batch["matched"], 0)
        self.assertEqual(data_batch["rows"], [])
        self.assertEqual(data_batch["valid_batches"], EXPECTED_BATCHES)
        self.assertIn("not found", data_batch["note"].lower())

        proc_course = run_cli("--course", "CS999", "--format", "json")
        self.assertEqual(proc_course.returncode, 0, proc_course.stderr)
        data_course = json.loads(proc_course.stdout)
        self.assertEqual(data_course["matched"], 0)
        self.assertEqual(data_course["rows"], [])
        self.assertEqual(data_course["valid_batches"], EXPECTED_BATCHES)

    def test_markdown_outputs(self) -> None:
        proc = run_cli("--batch", "CSE-A", "--day", "Monday", "--format", "markdown")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("### Monday — CSE-A", proc.stdout)
        self.assertIn("| Time | Code | Course | Room | Instructor | Type |", proc.stdout)
        self.assertIn("| 09:00–09:50 | CS-301 | Distributed Systems | LH-204 | Dr. A. Kulkarni | Lecture |", proc.stdout)
        self.assertIn("Asia/Kolkata (IST)", proc.stdout)
        self.assertIn("_Source:", proc.stdout)

        proc_sat = run_cli("--batch", "CSE-A", "--day", "Saturday", "--format", "markdown")
        self.assertEqual(proc_sat.returncode, 0)
        self.assertIn("No regular classes scheduled", proc_sat.stdout)
        self.assertNotIn("| Time |", proc_sat.stdout)

        proc_mech = run_cli("--batch", "MECH-Z", "--format", "markdown")
        self.assertEqual(proc_mech.returncode, 0)
        self.assertIn("MECH-Z", proc_mech.stdout)
        self.assertIn("Valid batches:", proc_mech.stdout)

        proc_multi = run_cli("--day", "Monday", "--format", "markdown")
        self.assertEqual(proc_multi.returncode, 0)
        self.assertIn("#### Batch: CSE-A", proc_multi.stdout)
        self.assertIn("#### Batch: AI-DS-A", proc_multi.stdout)

    def test_invalid_day_and_bad_cli_flags_exit_2_json_stderr(self) -> None:
        for bad_day in ("Funday", ""):
            proc = run_cli("--batch", "CSE-A", "--day", bad_day)
            self.assertEqual(proc.returncode, 2)
            self.assertEqual(proc.stdout, "")
            err = json.loads(proc.stderr)
            self.assertEqual(err["error"], "INVALID_DAY")

        proc_flag = run_cli("--unknown-option", "value")
        self.assertEqual(proc_flag.returncode, 2)
        self.assertEqual(proc_flag.stdout, "")
        err_flag = json.loads(proc_flag.stderr)
        self.assertEqual(err_flag["error"], "INVALID_ARGUMENTS")

    def test_missing_and_malformed_csv_exit_2_json_stderr(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            missing = tmp / "missing.csv"
            proc_missing = run_cli("--csv", str(missing), cwd=tmp)
            self.assertEqual(proc_missing.returncode, 2)
            self.assertEqual(proc_missing.stdout, "")
            self.assertEqual(json.loads(proc_missing.stderr)["error"], "MISSING_CSV")

            empty = tmp / "empty.csv"
            empty.write_text("", encoding="utf-8")
            proc_empty = run_cli("--csv", str(empty), cwd=tmp)
            self.assertEqual(proc_empty.returncode, 2)
            self.assertEqual(proc_empty.stdout, "")
            self.assertEqual(json.loads(proc_empty.stderr)["error"], "EMPTY_CSV")

            bad_header = tmp / "bad_header.csv"
            bad_header.write_text("batch,day,course_code\nCSE-A,Monday,CS-301\n", encoding="utf-8")
            proc_hdr = run_cli("--csv", str(bad_header), cwd=tmp)
            self.assertEqual(proc_hdr.returncode, 2)
            self.assertEqual(proc_hdr.stdout, "")
            self.assertEqual(json.loads(proc_hdr.stderr)["error"], "MALFORMED_CSV_HEADER")

            bad_row = tmp / "bad_row.csv"
            bad_row.write_text(
                ",".join(EXPECTED_HEADER)
                + "\nCSE-A,Funday,09:00,09:50,CS-301,Distributed Systems,LECTURE,LH-204,Dr. A. Kulkarni,4,Fall-2026\n",
                encoding="utf-8",
            )
            proc_row = run_cli("--csv", str(bad_row), cwd=tmp)
            self.assertEqual(proc_row.returncode, 2)
            self.assertEqual(proc_row.stdout, "")
            self.assertEqual(json.loads(proc_row.stderr)["error"], "MALFORMED_CSV_ROW")

            short_row = tmp / "short_row.csv"
            short_row.write_text(
                ",".join(EXPECTED_HEADER) + "\nCSE-A,Monday,09:00\n",
                encoding="utf-8",
            )
            proc_short = run_cli("--csv", str(short_row), cwd=tmp)
            self.assertEqual(proc_short.returncode, 2)
            self.assertEqual(proc_short.stdout, "")
            self.assertEqual(json.loads(proc_short.stderr)["error"], "MALFORMED_CSV_ROW")


if __name__ == "__main__":
    unittest.main()

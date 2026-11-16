#!/usr/bin/env python3
"""Deterministic CLI query engine for the campus timetable CSV dataset.

Pure Python 3 standard library implementation supporting batch, day, course,
and room filtering, chronological IST sorting, JSON/Markdown output, and
structured error reporting on stderr with exit code 2.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Any

REQUIRED_COLUMNS: tuple[str, ...] = (
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
)

DAY_ORDER: dict[str, int] = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}

DAY_ALIASES: dict[str, str] = {
    "mon": "Monday",
    "monday": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "wed": "Wednesday",
    "weds": "Wednesday",
    "wednesday": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
    "sun": "Sunday",
    "sunday": "Sunday",
}

TIME_RE = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
DEFAULT_CSV_PATH = Path(__file__).resolve().parent.parent / "assets" / "timetable.csv"
TIMEZONE_LABEL = "Asia/Kolkata (IST)"


class QueryError(Exception):
    """Structured CLI error emitted as JSON on stderr with exit code 2."""

    def __init__(self, code: str, message: str, extra: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.extra = extra or {}


class _JsonArgumentParser(argparse.ArgumentParser):
    """ArgumentParser subclass emitting structured JSON errors on stderr."""

    def error(self, message: str) -> None:  # noqa: D401
        payload = {"error": "INVALID_ARGUMENTS", "message": message}
        sys.stderr.write(json.dumps(payload) + "\n")
        self.exit(2)


def normalize_day(raw_day: str) -> str:
    """Canonicalize a weekday name or abbreviation; raise QueryError if invalid."""
    token = raw_day.strip().lower()
    canonical = DAY_ALIASES.get(token)
    if canonical is None:
        raise QueryError(
            code="INVALID_DAY",
            message=f"Unrecognized day {raw_day!r}. Expected Monday-Sunday or standard abbreviation.",
            extra={"valid_days": list(DAY_ORDER.keys())},
        )
    return canonical


def normalize_identifier(raw_value: str) -> str:
    """Normalize batch, course, or room tokens (uppercase, spaces/underscores -> '-')."""
    collapsed = re.sub(r"[\s_]+", "-", raw_value.strip().upper())
    collapsed = re.sub(r"-{2,}", "-", collapsed)
    return collapsed.strip("-")


def load_timetable_rows(csv_path: Path) -> list[dict[str, str]]:
    """Load and validate all timetable rows from csv_path."""
    if not csv_path.exists() or not csv_path.is_file():
        raise QueryError(
            code="MISSING_CSV",
            message=f"Timetable CSV file not found: {csv_path}",
        )

    try:
        raw_text = csv_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        raise QueryError(
            code="UNREADABLE_CSV",
            message=f"Failed to read timetable CSV {csv_path}: {exc}",
        ) from exc

    if not raw_text.strip():
        raise QueryError(
            code="EMPTY_CSV",
            message=f"Timetable CSV is empty: {csv_path}",
        )

    lines = raw_text.splitlines()
    reader = csv.DictReader(lines)
    if reader.fieldnames is None:
        raise QueryError(
            code="MALFORMED_CSV",
            message="Timetable CSV is missing a header row.",
        )

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in reader.fieldnames]
    if missing_cols:
        raise QueryError(
            code="MALFORMED_CSV_HEADER",
            message=f"Timetable CSV is missing required columns: {', '.join(missing_cols)}",
            extra={"missing_columns": missing_cols, "expected_columns": list(REQUIRED_COLUMNS)},
        )

    rows: list[dict[str, str]] = []
    for line_num, raw_row in enumerate(reader, start=2):
        if None in raw_row:
            raise QueryError(
                code="MALFORMED_CSV_ROW",
                message=f"CSV row {line_num} contains unexpected extra columns.",
            )
        clean_row: dict[str, str] = {}
        for col in REQUIRED_COLUMNS:
            val = raw_row.get(col)
            if val is None or not val.strip():
                raise QueryError(
                    code="MALFORMED_CSV_ROW",
                    message=f"CSV row {line_num} is missing value for column '{col}'.",
                )
            clean_row[col] = val.strip()

        if clean_row["day"] not in DAY_ORDER:
            raise QueryError(
                code="MALFORMED_CSV_ROW",
                message=f"CSV row {line_num} has invalid day {clean_row['day']!r}.",
            )
        if not TIME_RE.match(clean_row["start_time"]) or not TIME_RE.match(clean_row["end_time"]):
            raise QueryError(
                code="MALFORMED_CSV_ROW",
                message=f"CSV row {line_num} has invalid HH:MM time format.",
            )
        rows.append(clean_row)

    return rows


def filter_and_sort_rows(
    rows: list[dict[str, str]],
    *,
    batch: str | None = None,
    day: str | None = None,
    course: str | None = None,
    room: str | None = None,
) -> list[dict[str, str]]:
    """Filter loaded rows by normalized criteria and sort chronologically."""
    matched: list[dict[str, str]] = []
    for row in rows:
        if batch is not None and normalize_identifier(row["batch"]) != batch:
            continue
        if day is not None and row["day"] != day:
            continue
        if course is not None and normalize_identifier(row["course_code"]) != course:
            continue
        if room is not None and normalize_identifier(row["room"]) != room:
            continue
        matched.append(row)

    matched.sort(
        key=lambda r: (
            DAY_ORDER[r["day"]],
            r["start_time"],
            r["course_code"],
            r["batch"],
        )
    )
    return matched


def format_markdown_table(
    rows: list[dict[str, str]],
    *,
    query: dict[str, str | None],
    valid_batches: list[str],
    source_label: str,
) -> str:
    """Render matched rows as chronological 6-column Markdown tables."""
    if not rows:
        lines: list[str] = []
        day = query.get("day")
        batch = query.get("batch")
        if batch and batch not in valid_batches:
            lines.append(f"Batch `{batch}` was not found in `{source_label}`.")
        elif day in ("Saturday", "Sunday"):
            target = f" for `{batch}`" if batch else ""
            lines.append(f"_No regular classes scheduled{target} on {day} ({TIMEZONE_LABEL})._")
        else:
            lines.append(f"No matching classes found in `{source_label}`.")
        lines.append("")
        lines.append(f"Valid batches: {', '.join(valid_batches)}")
        lines.append(
            f"_Source: `{source_label}` · Timezone: {TIMEZONE_LABEL} · Matched: 0_"
        )
        return "\n".join(lines)

    lines = []
    grouped_by_day: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped_by_day.setdefault(row["day"], []).append(row)

    for day_name, day_rows in grouped_by_day.items():
        batches_in_day = sorted({r["batch"] for r in day_rows})
        if query.get("batch"):
            lines.append(f"### {day_name} — {query['batch']}")
        elif len(batches_in_day) == 1:
            lines.append(f"### {day_name} — {batches_in_day[0]}")
        else:
            lines.append(f"### {day_name}")
        lines.append("")

        if len(batches_in_day) > 1 and not query.get("batch"):
            for batch_name in batches_in_day:
                batch_rows = [r for r in day_rows if r["batch"] == batch_name]
                lines.append(f"#### Batch: {batch_name}")
                lines.append("")
                lines.extend(_render_six_col_table(batch_rows))
                lines.append("")
        else:
            lines.extend(_render_six_col_table(day_rows))
            lines.append("")

    terms = sorted({r["term"] for r in rows})
    term_str = ", ".join(terms)
    lines.append(
        f"_Source: `{source_label}` · Term: {term_str} · Timezone: {TIMEZONE_LABEL} · Matched: {len(rows)}_"
    )
    return "\n".join(lines)


def _render_six_col_table(rows: list[dict[str, str]]) -> list[str]:
    """Render a 6-column Markdown timetable table."""
    table = [
        "| Time | Code | Course | Room | Instructor | Type |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for row in rows:
        time_range = f"{row['start_time']}–{row['end_time']}"
        session_label = row["session_type"].capitalize()
        table.append(
            f"| {time_range} | {row['course_code']} | {row['course_title']} "
            f"| {row['room']} | {row['instructor']} | {session_label} |"
        )
    return table


def format_batches_markdown(valid_batches: list[str], source_label: str) -> str:
    """Render valid batches as a clean Markdown list."""
    lines = ["### Valid Campus Batches", ""]
    for batch_name in valid_batches:
        lines.append(f"- `{batch_name}`")
    lines.append("")
    lines.append(f"_Source: `{source_label}` · Timezone: {TIMEZONE_LABEL}_")
    return "\n".join(lines)


def build_parser() -> _JsonArgumentParser:
    """Construct CLI argument parser."""
    parser = _JsonArgumentParser(
        description="Query verified campus timetable entries from timetable.csv."
    )
    parser.add_argument("--batch", help="Student batch code (e.g., CSE-A, cse a, AI-DS-A)")
    parser.add_argument("--day", help="Weekday name or abbreviation (e.g., Monday, mon, sat)")
    parser.add_argument("--course", help="Course code (e.g., CS-301)")
    parser.add_argument("--room", help="Room or lab identifier (e.g., LH-204, LAB-3B)")
    parser.add_argument("--csv", type=Path, help="Override path to timetable CSV fixture")
    parser.add_argument(
        "--format",
        choices=("json", "markdown"),
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--list-batches",
        action="store_true",
        help="List all valid batch identifiers present in the CSV",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Run CLI timetable query and return exit status code."""
    parser = build_parser()
    args = parser.parse_args(argv)

    csv_path = args.csv.resolve() if args.csv else DEFAULT_CSV_PATH
    source_label = str(args.csv) if args.csv else "assets/timetable.csv"

    try:
        all_rows = load_timetable_rows(csv_path)
        valid_batches = sorted({r["batch"] for r in all_rows})

        if args.list_batches:
            if args.format == "markdown":
                sys.stdout.write(format_batches_markdown(valid_batches, source_label) + "\n")
            else:
                payload = {
                    "valid_batches": valid_batches,
                    "count": len(valid_batches),
                    "source": source_label,
                }
                sys.stdout.write(json.dumps(payload, indent=2) + "\n")
            return 0

        norm_batch = normalize_identifier(args.batch) if args.batch is not None else None
        norm_day = normalize_day(args.day) if args.day is not None else None
        norm_course = normalize_identifier(args.course) if args.course is not None else None
        norm_room = normalize_identifier(args.room) if args.room is not None else None

        query_dict = {
            "batch": norm_batch,
            "day": norm_day,
            "course": norm_course,
            "room": norm_room,
        }

        matched_rows = filter_and_sort_rows(
            all_rows,
            batch=norm_batch,
            day=norm_day,
            course=norm_course,
            room=norm_room,
        )

        if args.format == "markdown":
            sys.stdout.write(
                format_markdown_table(
                    matched_rows,
                    query=query_dict,
                    valid_batches=valid_batches,
                    source_label=source_label,
                )
                + "\n"
            )
            return 0

        result: dict[str, Any] = {
            "timezone": TIMEZONE_LABEL,
            "query": query_dict,
            "matched": len(matched_rows),
            "rows": matched_rows,
            "valid_batches": valid_batches,
            "source": source_label,
        }
        if not matched_rows:
            if norm_batch and norm_batch not in valid_batches:
                result["note"] = (
                    f"Batch '{norm_batch}' was not found. Choose from valid_batches."
                )
            elif norm_day in ("Saturday", "Sunday"):
                result["note"] = f"No regular classes scheduled on {norm_day}."
            else:
                result["note"] = "No matching classes found in timetable dataset."

        sys.stdout.write(json.dumps(result, indent=2) + "\n")
        return 0

    except QueryError as err:
        err_payload: dict[str, Any] = {
            "error": err.code,
            "message": err.message,
            **err.extra,
        }
        sys.stderr.write(json.dumps(err_payload) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

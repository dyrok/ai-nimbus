import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type BatchCode = "CSE-A" | "CSE-B" | "ECE-A" | "AI-DS-A";

export type TeachingDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";

export type DayOfWeek = TeachingDay | "Saturday" | "Sunday";

export type SessionType = "LECTURE" | "LAB" | "TUTORIAL";

export interface TimetableEntry {
  batch: BatchCode;
  day: TeachingDay;
  start_time: string;
  end_time: string;
  course_code: string;
  course_title: string;
  session_type: SessionType;
  room: string;
  instructor: string;
  credits: number;
  term: "Fall-2026";
}

export type FeeStatus =
  | "PAID"
  | "PARTIAL"
  | "OVERDUE"
  | "WAIVED"
  | "PENDING_VERIFICATION";

export interface FeeRecord {
  student_id: string;
  student_name: string;
  batch: BatchCode;
  term: "Fall-2026";
  status: FeeStatus;
  currency: "INR";
  total_inr: number;
  tuition_inr: number;
  hostel_inr: number;
  late_fee_inr: number;
  paid_inr: number;
  balance_inr: number;
  due_date: string;
  last_payment_ref: string;
}

export const CAMPUS_TIMEZONE = "Asia/Kolkata (IST)" as const;

export const VALID_BATCHES: readonly BatchCode[] = [
  "AI-DS-A",
  "CSE-A",
  "CSE-B",
  "ECE-A",
] as const;

export const VALID_DAYS: readonly DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DAY_ALIASES: Record<string, DayOfWeek> = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  weds: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

/**
 * Canonical 27 synthetic timetable rows aligned 1:1 with
 * plugins/campus-helpdesk/skills/timetable-helper/assets/timetable.csv.
 */
export const TIMETABLE_ENTRIES: readonly TimetableEntry[] = [
  // CSE-A (10 rows)
  {
    batch: "CSE-A",
    day: "Monday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "CS-301",
    course_title: "Distributed Systems",
    session_type: "LECTURE",
    room: "LH-204",
    instructor: "Dr. A. Kulkarni",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Monday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "CS-305",
    course_title: "Compiler Design",
    session_type: "LECTURE",
    room: "LH-102",
    instructor: "Prof. R. Nair",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Monday",
    start_time: "14:00",
    end_time: "16:50",
    course_code: "CS-301L",
    course_title: "Distributed Systems Lab",
    session_type: "LAB",
    room: "LAB-3B",
    instructor: "Dr. A. Kulkarni",
    credits: 2,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Tuesday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "CS-303",
    course_title: "Computer Networks",
    session_type: "LECTURE",
    room: "LH-201",
    instructor: "Dr. S. Iyer",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Tuesday",
    start_time: "11:00",
    end_time: "11:50",
    course_code: "CS-309",
    course_title: "Database Internals",
    session_type: "LECTURE",
    room: "LH-204",
    instructor: "Prof. M. Menon",
    credits: 3,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Wednesday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "CS-301",
    course_title: "Distributed Systems",
    session_type: "LECTURE",
    room: "LH-204",
    instructor: "Dr. A. Kulkarni",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Wednesday",
    start_time: "14:00",
    end_time: "15:50",
    course_code: "CS-305T",
    course_title: "Compiler Design Tutorial",
    session_type: "TUTORIAL",
    room: "TR-12",
    instructor: "Prof. R. Nair",
    credits: 1,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Thursday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "CS-303",
    course_title: "Computer Networks",
    session_type: "LECTURE",
    room: "LH-201",
    instructor: "Dr. S. Iyer",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Thursday",
    start_time: "14:00",
    end_time: "16:50",
    course_code: "CS-303L",
    course_title: "Computer Networks Lab",
    session_type: "LAB",
    room: "NET-LAB-1",
    instructor: "Dr. S. Iyer",
    credits: 2,
    term: "Fall-2026",
  },
  {
    batch: "CSE-A",
    day: "Friday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "CS-309",
    course_title: "Database Internals",
    session_type: "LECTURE",
    room: "LH-204",
    instructor: "Prof. M. Menon",
    credits: 3,
    term: "Fall-2026",
  },

  // CSE-B (7 rows)
  {
    batch: "CSE-B",
    day: "Monday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "CS-303",
    course_title: "Computer Networks",
    session_type: "LECTURE",
    room: "LH-202",
    instructor: "Dr. S. Iyer",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-B",
    day: "Monday",
    start_time: "11:00",
    end_time: "11:50",
    course_code: "CS-309",
    course_title: "Database Internals",
    session_type: "LECTURE",
    room: "LH-205",
    instructor: "Prof. M. Menon",
    credits: 3,
    term: "Fall-2026",
  },
  {
    batch: "CSE-B",
    day: "Tuesday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "CS-301",
    course_title: "Distributed Systems",
    session_type: "LECTURE",
    room: "LH-204",
    instructor: "Dr. A. Kulkarni",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-B",
    day: "Tuesday",
    start_time: "14:00",
    end_time: "16:50",
    course_code: "CS-301L",
    course_title: "Distributed Systems Lab",
    session_type: "LAB",
    room: "LAB-3A",
    instructor: "Dr. A. Kulkarni",
    credits: 2,
    term: "Fall-2026",
  },
  {
    batch: "CSE-B",
    day: "Wednesday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "CS-305",
    course_title: "Compiler Design",
    session_type: "LECTURE",
    room: "LH-102",
    instructor: "Prof. R. Nair",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-B",
    day: "Thursday",
    start_time: "11:00",
    end_time: "11:50",
    course_code: "CS-301",
    course_title: "Distributed Systems",
    session_type: "LECTURE",
    room: "LH-204",
    instructor: "Dr. A. Kulkarni",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "CSE-B",
    day: "Friday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "CS-305",
    course_title: "Compiler Design",
    session_type: "LECTURE",
    room: "LH-102",
    instructor: "Prof. R. Nair",
    credits: 4,
    term: "Fall-2026",
  },

  // ECE-A (5 rows)
  {
    batch: "ECE-A",
    day: "Monday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "EC-301",
    course_title: "Digital Signal Processing",
    session_type: "LECTURE",
    room: "EC-101",
    instructor: "Dr. P. Deshpande",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "ECE-A",
    day: "Tuesday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "EC-304",
    course_title: "VLSI System Design",
    session_type: "LECTURE",
    room: "EC-103",
    instructor: "Prof. K. Rao",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "ECE-A",
    day: "Wednesday",
    start_time: "14:00",
    end_time: "16:50",
    course_code: "EC-301L",
    course_title: "DSP Hardware Lab",
    session_type: "LAB",
    room: "DSP-LAB-2",
    instructor: "Dr. P. Deshpande",
    credits: 2,
    term: "Fall-2026",
  },
  {
    batch: "ECE-A",
    day: "Thursday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "EC-306",
    course_title: "Embedded Microcontrollers",
    session_type: "LECTURE",
    room: "EC-101",
    instructor: "Prof. V. Joshi",
    credits: 3,
    term: "Fall-2026",
  },
  {
    batch: "ECE-A",
    day: "Friday",
    start_time: "11:00",
    end_time: "11:50",
    course_code: "EC-304",
    course_title: "VLSI System Design",
    session_type: "LECTURE",
    room: "EC-103",
    instructor: "Prof. K. Rao",
    credits: 4,
    term: "Fall-2026",
  },

  // AI-DS-A (5 rows)
  {
    batch: "AI-DS-A",
    day: "Monday",
    start_time: "09:00",
    end_time: "09:50",
    course_code: "AI-302",
    course_title: "Statistical Machine Learning",
    session_type: "LECTURE",
    room: "AI-201",
    instructor: "Dr. N. Bose",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "AI-DS-A",
    day: "Tuesday",
    start_time: "11:00",
    end_time: "11:50",
    course_code: "AI-304",
    course_title: "Information Retrieval",
    session_type: "LECTURE",
    room: "AI-202",
    instructor: "Prof. T. Bansal",
    credits: 3,
    term: "Fall-2026",
  },
  {
    batch: "AI-DS-A",
    day: "Wednesday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "AI-302",
    course_title: "Statistical Machine Learning",
    session_type: "LECTURE",
    room: "AI-201",
    instructor: "Dr. N. Bose",
    credits: 4,
    term: "Fall-2026",
  },
  {
    batch: "AI-DS-A",
    day: "Thursday",
    start_time: "14:00",
    end_time: "16:50",
    course_code: "AI-302L",
    course_title: "Applied ML Studio",
    session_type: "LAB",
    room: "AI-GPU-1",
    instructor: "Dr. N. Bose",
    credits: 2,
    term: "Fall-2026",
  },
  {
    batch: "AI-DS-A",
    day: "Friday",
    start_time: "10:00",
    end_time: "10:50",
    course_code: "AI-306",
    course_title: "Data Engineering Pipelines",
    session_type: "LECTURE",
    room: "AI-201",
    instructor: "Prof. T. Bansal",
    credits: 3,
    term: "Fall-2026",
  },
] as const;

/**
 * Strictly synthetic Fall-2026 fee ledger fixtures (STU-2026-001..STU-2026-005).
 */
export const FEE_LEDGER: ReadonlyMap<string, FeeRecord> = new Map<
  string,
  FeeRecord
>([
  [
    "STU-2026-001",
    {
      student_id: "STU-2026-001",
      student_name: "Aarav Sharma",
      batch: "CSE-A",
      term: "Fall-2026",
      status: "PAID",
      currency: "INR",
      total_inr: 125000,
      tuition_inr: 90000,
      hostel_inr: 35000,
      late_fee_inr: 0,
      paid_inr: 125000,
      balance_inr: 0,
      due_date: "2026-08-15",
      last_payment_ref: "MOCK-PAY-2026-1001",
    },
  ],
  [
    "STU-2026-002",
    {
      student_id: "STU-2026-002",
      student_name: "Diya Nair",
      batch: "CSE-B",
      term: "Fall-2026",
      status: "PARTIAL",
      currency: "INR",
      total_inr: 125000,
      tuition_inr: 90000,
      hostel_inr: 35000,
      late_fee_inr: 0,
      paid_inr: 75000,
      balance_inr: 50000,
      due_date: "2026-11-30",
      last_payment_ref: "MOCK-PAY-2026-1042",
    },
  ],
  [
    "STU-2026-003",
    {
      student_id: "STU-2026-003",
      student_name: "Rohan Kulkarni",
      batch: "ECE-A",
      term: "Fall-2026",
      status: "OVERDUE",
      currency: "INR",
      total_inr: 118000,
      tuition_inr: 85000,
      hostel_inr: 30000,
      late_fee_inr: 3000,
      paid_inr: 60000,
      balance_inr: 58000,
      due_date: "2026-10-15",
      last_payment_ref: "MOCK-PAY-2026-0918",
    },
  ],
  [
    "STU-2026-004",
    {
      student_id: "STU-2026-004",
      student_name: "Meera Krishnan",
      batch: "AI-DS-A",
      term: "Fall-2026",
      status: "WAIVED",
      currency: "INR",
      total_inr: 130000,
      tuition_inr: 95000,
      hostel_inr: 35000,
      late_fee_inr: 0,
      paid_inr: 130000,
      balance_inr: 0,
      due_date: "2026-08-15",
      last_payment_ref: "MOCK-WAIVER-2026-004",
    },
  ],
  [
    "STU-2026-005",
    {
      student_id: "STU-2026-005",
      student_name: "Kabir Verma",
      batch: "CSE-A",
      term: "Fall-2026",
      status: "PENDING_VERIFICATION",
      currency: "INR",
      total_inr: 125000,
      tuition_inr: 90000,
      hostel_inr: 35000,
      late_fee_inr: 0,
      paid_inr: 125000,
      balance_inr: 0,
      due_date: "2026-11-20",
      last_payment_ref: "MOCK-NEFT-2026-2055",
    },
  ],
]);

export function normalizeBatch(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function isValidBatch(batch: string): batch is BatchCode {
  return (VALID_BATCHES as readonly string[]).includes(batch);
}

export function normalizeDay(raw: string): DayOfWeek | null {
  const token = raw.trim().toLowerCase();
  return DAY_ALIASES[token] ?? null;
}

export type TimetableLookupResult =
  | {
      ok: true;
      batch: BatchCode;
      day: DayOfWeek;
      timezone: typeof CAMPUS_TIMEZONE;
      count: number;
      classes: Array<Omit<TimetableEntry, "batch" | "day">>;
      note?: string;
    }
  | {
      ok: false;
      error: "UNKNOWN_BATCH";
      message: string;
      valid_batches: readonly BatchCode[];
    }
  | {
      ok: false;
      error: "INVALID_DAY";
      message: string;
      valid_days: readonly DayOfWeek[];
    };

export function lookupTimetable(
  rawBatch: string,
  rawDay: string
): TimetableLookupResult {
  const batch = normalizeBatch(rawBatch);
  if (!isValidBatch(batch)) {
    return {
      ok: false,
      error: "UNKNOWN_BATCH",
      message: `Batch '${batch}' was not found in the campus timetable.`,
      valid_batches: VALID_BATCHES,
    };
  }

  const day = normalizeDay(rawDay);
  if (day === null) {
    return {
      ok: false,
      error: "INVALID_DAY",
      message: `Day '${rawDay.trim()}' is not a valid weekday or weekend name.`,
      valid_days: VALID_DAYS,
    };
  }

  if (day === "Saturday" || day === "Sunday") {
    return {
      ok: true,
      batch,
      day,
      timezone: CAMPUS_TIMEZONE,
      count: 0,
      classes: [],
      note: `No regular classes scheduled on ${day}.`,
    };
  }

  const matched = TIMETABLE_ENTRIES.filter(
    (entry) => entry.batch === batch && entry.day === day
  )
    .slice()
    .sort((a, b) => {
      const timeCmp = a.start_time.localeCompare(b.start_time);
      return timeCmp !== 0 ? timeCmp : a.course_code.localeCompare(b.course_code);
    })
    .map(({ batch: _b, day: _d, ...rest }) => rest);

  return {
    ok: true,
    batch,
    day,
    timezone: CAMPUS_TIMEZONE,
    count: matched.length,
    classes: matched,
  };
}

export function lookupFeeStatus(rawStudentId: string): FeeRecord | null {
  const canonicalId = rawStudentId.trim().toUpperCase();
  return FEE_LEDGER.get(canonicalId) ?? null;
}

export function resolveHostelRulesPath(): string {
  const envDir = process.env.CAMPUS_DATA_DIR?.trim();
  if (envDir && envDir.length > 0) {
    return path.resolve(envDir, "hostel_rules.md");
  }
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "../data/hostel_rules.md");
}

export async function loadHostelRulesMarkdown(): Promise<string> {
  const rulesPath = resolveHostelRulesPath();
  return await readFile(rulesPath, "utf8");
}

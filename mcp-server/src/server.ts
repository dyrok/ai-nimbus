import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  McpError,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  loadHostelRulesMarkdown,
  lookupFeeStatus,
  lookupTimetable,
} from "./data.js";
import { logger } from "./logger.js";

declare const __PACKAGE_VERSION__: string | undefined;

export const HOSTEL_RULES_URI = "campus://hostel-rules";

export const GetTimetableInputSchema = z
  .object({
    batch: z
      .string()
      .trim()
      .min(1, "batch is required (e.g., CSE-A, CSE-B, ECE-A, AI-DS-A)")
      .describe(
        "Student batch identifier, e.g. CSE-A, CSE-B, ECE-A, AI-DS-A"
      ),
    day: z
      .string()
      .trim()
      .min(1, "day is required (Monday through Sunday or abbreviation)")
      .describe("Day of the week, e.g. Monday, Tue, Friday"),
  })
  .strict();

export const GetFeeStatusInputSchema = z
  .object({
    student_id: z
      .string()
      .trim()
      .regex(
        /^STU-\d{4}-\d{3}$/i,
        "student_id must match format STU-YYYY-NNN (e.g., STU-2026-001)"
      )
      .describe(
        "Canonical student ID formatted as STU-YYYY-NNN, e.g. STU-2026-001"
      ),
  })
  .strict();

type GetTimetableInput = z.infer<typeof GetTimetableInputSchema>;
type GetFeeStatusInput = z.infer<typeof GetFeeStatusInputSchema>;

function resolveServerVersion(): string {
  if (
    typeof __PACKAGE_VERSION__ !== "undefined" &&
    __PACKAGE_VERSION__.length > 0
  ) {
    return __PACKAGE_VERSION__;
  }
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const pkgRaw = readFileSync(
      path.resolve(moduleDir, "../package.json"),
      "utf8"
    );
    const pkg = JSON.parse(pkgRaw) as { version?: unknown };
    if (typeof pkg.version === "string" && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    // Fallback when running outside source/dist layout.
  }
  return "0.2.0";
}

function jsonContent(payload: unknown, isError: boolean): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload),
      },
    ],
    isError,
  };
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join(".") : "input";
      return `${field}: ${issue.message}`;
    })
    .join("; ");
}

async function handleGetTimetable(
  input: GetTimetableInput
): Promise<CallToolResult> {
  const result = lookupTimetable(input.batch, input.day);
  if (!result.ok) {
    logger.warn("tool.get_timetable.domain_error", {
      error: result.error,
      batch: input.batch,
      day: input.day,
    });
    return jsonContent(
      result.error === "UNKNOWN_BATCH"
        ? {
            error: result.error,
            message: result.message,
            valid_batches: result.valid_batches,
          }
        : {
            error: result.error,
            message: result.message,
            valid_days: result.valid_days,
          },
      true
    );
  }

  const { ok: _ok, ...payload } = result;
  logger.info("tool.get_timetable.ok", {
    batch: payload.batch,
    day: payload.day,
    count: payload.count,
  });
  return jsonContent(payload, false);
}

async function handleGetFeeStatus(
  input: GetFeeStatusInput
): Promise<CallToolResult> {
  const canonicalId = input.student_id.trim().toUpperCase();
  const record = lookupFeeStatus(canonicalId);
  if (record === null) {
    logger.warn("tool.get_fee_status.not_found", { student_id: canonicalId });
    return jsonContent(
      {
        error: "STUDENT_NOT_FOUND",
        student_id: canonicalId,
        message: `No fee record exists for ${canonicalId}.`,
      },
      true
    );
  }

  logger.info("tool.get_fee_status.ok", {
    student_id: record.student_id,
    status: record.status,
  });
  return jsonContent(record, false);
}

interface RegisteredValidatorEntry {
  schema: z.ZodType;
  execute: (args: unknown) => Promise<CallToolResult>;
}

const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createCampusServer(): McpServer {
  const version = resolveServerVersion();
  const server = new McpServer({
    name: "campus-helpdesk",
    version,
  });

  const validators = new Map<string, RegisteredValidatorEntry>([
    [
      "get_timetable",
      {
        schema: GetTimetableInputSchema,
        execute: (args) => handleGetTimetable(args as GetTimetableInput),
      },
    ],
    [
      "get_fee_status",
      {
        schema: GetFeeStatusInputSchema,
        execute: (args) => handleGetFeeStatus(args as GetFeeStatusInput),
      },
    ],
  ]);

  server.registerTool(
    "get_timetable",
    {
      title: "Get Campus Timetable",
      description:
        "Look up verified Fall-2026 class schedules in Asia/Kolkata (IST) for a student batch (CSE-A, CSE-B, ECE-A, AI-DS-A) and day of the week from read-only synthetic campus fixtures.",
      inputSchema: GetTimetableInputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => await handleGetTimetable(args)
  );

  server.registerTool(
    "get_fee_status",
    {
      title: "Get Student Fee Status",
      description:
        "Look up read-only Fall-2026 synthetic tuition and hostel fee clearance details for a single student ID formatted as STU-YYYY-NNN.",
      inputSchema: GetFeeStatusInputSchema,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => await handleGetFeeStatus(args)
  );

  /**
   * Enforce strict JSON-RPC -32602 (InvalidParams) on schema/type/regex errors
   * before invoking tool handlers. McpServer's default CallToolRequestSchema
   * catches InvalidParams and converts it to isError: true; overriding the
   * dispatcher preserves protocol-level -32602 for schema violations while
   * keeping isError: true for valid-schema domain refusals.
   */
  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const entry = validators.get(toolName);
    if (!entry) {
      throw new McpError(ErrorCode.InvalidParams, `Tool ${toolName} not found`);
    }

    const rawArgs =
      request.params.arguments === undefined ? {} : request.params.arguments;
    const parsed = entry.schema.safeParse(rawArgs);
    if (!parsed.success) {
      const detail = formatZodIssues(parsed.error);
      logger.warn("tool.validation_failed", {
        tool: toolName,
        detail,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments for tool ${toolName}: ${detail}`
      );
    }

    return await entry.execute(parsed.data);
  });

  server.registerResource(
    "hostel-rules",
    HOSTEL_RULES_URI,
    {
      title: "Nimbus Campus Hostel Rules & Curfew Policy",
      description:
        "Official campus hostel curfew timings, visitor policies, electrical appliance limits, mess hours, quiet hours, and warden escalation guidelines",
      mimeType: "text/markdown",
    },
    async (uri) => {
      try {
        const markdown = await loadHostelRulesMarkdown();
        logger.info("resource.read.ok", {
          uri: uri.href,
          bytes: Buffer.byteLength(markdown, "utf8"),
        });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: markdown,
            },
          ],
        };
      } catch (error) {
        logger.error("resource.read.failed", {
          uri: uri.href,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new McpError(
          ErrorCode.InternalError,
          "Unable to read hostel_rules.md"
        );
      }
    }
  );

  // Pin static capabilities (no dynamic tool/resource mutation notifications).
  server.server.registerCapabilities({
    tools: { listChanged: false },
    resources: { subscribe: false, listChanged: false },
  });

  return server;
}

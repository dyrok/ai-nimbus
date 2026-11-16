/**
 * Strict stderr-only structured logger.
 *
 * StdioServerTransport owns process.stdout exclusively for JSON-RPC 2.0
 * protocol frames; writing to stdout from application code corrupts framing.
 */

export type LogLevel = "info" | "warn" | "err";

function formatLine(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const ts = new Date().toISOString();
  const suffix = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [nimbus:${level}] ${message}${suffix}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLine("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLine("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLine("err", message, meta));
  },
};

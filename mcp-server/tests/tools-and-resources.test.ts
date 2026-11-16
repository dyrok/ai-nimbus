import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { TIMETABLE_ENTRIES } from "../src/data.js";
import { createCampusServer, HOSTEL_RULES_URI } from "../src/server.js";

async function withConnectedClient(
  fn: (client: Client) => Promise<void>
): Promise<void> {
  const server = createCampusServer();
  const client = new Client(
    { name: "campus-helpdesk-test-client", version: "1.0.0" },
    { capabilities: {} }
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  try {
    await fn(client);
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}

function parseTextPayload(result: {
  content: Array<{ type: string; text?: string }>;
}): Record<string, unknown> {
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, "text");
  assert.equal(typeof result.content[0].text, "string");
  return JSON.parse(result.content[0].text!) as Record<string, unknown>;
}

test("server initializes with static capabilities and registers both tools", async () => {
  await withConnectedClient(async (client) => {
    const serverVersion = client.getServerVersion();
    assert.equal(serverVersion?.name, "campus-helpdesk");
    assert.ok(serverVersion?.version && serverVersion.version.length > 0);

    const caps = client.getServerCapabilities();
    assert.deepEqual(caps?.tools, { listChanged: false });
    assert.deepEqual(caps?.resources, { subscribe: false, listChanged: false });

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ["get_fee_status", "get_timetable"]);

    const timetableTool = tools.find((t) => t.name === "get_timetable");
    assert.ok(timetableTool);
    assert.equal(timetableTool.inputSchema.type, "object");
    assert.deepEqual(timetableTool.inputSchema.required, ["batch", "day"]);
    assert.equal(timetableTool.inputSchema.additionalProperties, false);

    const feeTool = tools.find((t) => t.name === "get_fee_status");
    assert.ok(feeTool);
    assert.equal(feeTool.inputSchema.type, "object");
    assert.deepEqual(feeTool.inputSchema.required, ["student_id"]);
    assert.equal(feeTool.inputSchema.additionalProperties, false);
  });
});

test("canonical timetable dataset contains all 27 synthetic rows across 4 batches", () => {
  assert.equal(TIMETABLE_ENTRIES.length, 27);
  const counts = new Map<string, number>();
  for (const row of TIMETABLE_ENTRIES) {
    counts.set(row.batch, (counts.get(row.batch) ?? 0) + 1);
  }
  assert.equal(counts.get("CSE-A"), 10);
  assert.equal(counts.get("CSE-B"), 7);
  assert.equal(counts.get("ECE-A"), 5);
  assert.equal(counts.get("AI-DS-A"), 5);
});

test("get_timetable returns chronologically sorted classes and normalizes batch/day inputs", async () => {
  await withConnectedClient(async (client) => {
    const res = await client.callTool({
      name: "get_timetable",
      arguments: { batch: "  cse a ", day: "mon" },
    });
    assert.equal(res.isError, false);
    const payload = parseTextPayload(
      res as { content: Array<{ type: string; text?: string }> }
    );
    assert.equal(payload.batch, "CSE-A");
    assert.equal(payload.day, "Monday");
    assert.equal(payload.timezone, "Asia/Kolkata (IST)");
    assert.equal(payload.count, 3);
    const classes = payload.classes as Array<Record<string, unknown>>;
    assert.deepEqual(
      classes.map((c) => c.course_code),
      ["CS-301", "CS-305", "CS-301L"]
    );
    assert.deepEqual(
      classes.map((c) => c.start_time),
      ["09:00", "10:00", "14:00"]
    );

    const aidsRes = await client.callTool({
      name: "get_timetable",
      arguments: { batch: "ai_ds_a", day: "Thursday" },
    });
    assert.equal(aidsRes.isError, false);
    const aidsPayload = parseTextPayload(
      aidsRes as { content: Array<{ type: string; text?: string }> }
    );
    assert.equal(aidsPayload.batch, "AI-DS-A");
    assert.equal(aidsPayload.count, 1);
    const aidsClasses = aidsPayload.classes as Array<Record<string, unknown>>;
    assert.equal(aidsClasses[0].course_code, "AI-302L");
    assert.equal(aidsClasses[0].room, "AI-GPU-1");
  });
});

test("get_timetable returns clean empty state on weekends", async () => {
  await withConnectedClient(async (client) => {
    for (const [batch, day] of [
      ["CSE-A", "Saturday"],
      ["ECE-A", "sun"],
    ]) {
      const res = await client.callTool({
        name: "get_timetable",
        arguments: { batch, day },
      });
      assert.equal(res.isError, false);
      const payload = parseTextPayload(
        res as { content: Array<{ type: string; text?: string }> }
      );
      assert.equal(payload.count, 0);
      assert.deepEqual(payload.classes, []);
      assert.match(String(payload.note), /No regular classes scheduled/);
    }
  });
});

test("get_timetable returns isError: true on unknown batch or invalid day token", async () => {
  await withConnectedClient(async (client) => {
    const badBatch = await client.callTool({
      name: "get_timetable",
      arguments: { batch: "MECH-Z", day: "Monday" },
    });
    assert.equal(badBatch.isError, true);
    const batchPayload = parseTextPayload(
      badBatch as { content: Array<{ type: string; text?: string }> }
    );
    assert.equal(batchPayload.error, "UNKNOWN_BATCH");
    assert.deepEqual(batchPayload.valid_batches, [
      "AI-DS-A",
      "CSE-A",
      "CSE-B",
      "ECE-A",
    ]);

    const badDay = await client.callTool({
      name: "get_timetable",
      arguments: { batch: "CSE-B", day: "Funday" },
    });
    assert.equal(badDay.isError, true);
    const dayPayload = parseTextPayload(
      badDay as { content: Array<{ type: string; text?: string }> }
    );
    assert.equal(dayPayload.error, "INVALID_DAY");
    assert.equal((dayPayload.valid_days as unknown[]).length, 7);
  });
});

test("get_fee_status returns synthetic ledger statuses and handles unknown valid ID with isError: true", async () => {
  await withConnectedClient(async (client) => {
    const expectedStatuses = [
      ["stu-2026-001", "PAID", 0],
      ["STU-2026-002", "PARTIAL", 50000],
      ["STU-2026-003", "OVERDUE", 58000],
      ["STU-2026-004", "WAIVED", 0],
      ["STU-2026-005", "PENDING_VERIFICATION", 0],
    ] as const;

    for (const [studentId, status, balance] of expectedStatuses) {
      const res = await client.callTool({
        name: "get_fee_status",
        arguments: { student_id: studentId },
      });
      assert.equal(res.isError, false);
      const payload = parseTextPayload(
        res as { content: Array<{ type: string; text?: string }> }
      );
      assert.equal(payload.student_id, studentId.toUpperCase());
      assert.equal(payload.status, status);
      assert.equal(payload.balance_inr, balance);
      assert.equal(
        Number(payload.tuition_inr) +
          Number(payload.hostel_inr) +
          Number(payload.late_fee_inr),
        Number(payload.total_inr)
      );
      assert.equal(
        Number(payload.total_inr) - Number(payload.paid_inr),
        Number(payload.balance_inr)
      );
    }

    const unknown = await client.callTool({
      name: "get_fee_status",
      arguments: { student_id: "STU-2026-999" },
    });
    assert.equal(unknown.isError, true);
    const errPayload = parseTextPayload(
      unknown as { content: Array<{ type: string; text?: string }> }
    );
    assert.equal(errPayload.error, "STUDENT_NOT_FOUND");
    assert.equal(errPayload.student_id, "STU-2026-999");
  });
});

test("schema and regex violations reject with JSON-RPC -32602 (InvalidParams)", async () => {
  await withConnectedClient(async (client) => {
    const invalidCalls: Array<{
      name: string;
      arguments: Record<string, unknown>;
    }> = [
      { name: "get_fee_status", arguments: { student_id: "bad-id" } },
      { name: "get_fee_status", arguments: { student_id: "12345" } },
      { name: "get_fee_status", arguments: {} },
      { name: "get_timetable", arguments: { batch: "CSE-A" } },
      { name: "get_timetable", arguments: { batch: "   ", day: "Monday" } },
      {
        name: "get_timetable",
        arguments: { batch: "CSE-A", day: "Monday", extra: true },
      },
      { name: "unknown_tool", arguments: {} },
    ];

    for (const call of invalidCalls) {
      await assert.rejects(
        () => client.callTool(call),
        (err: unknown) =>
          err instanceof McpError && err.code === ErrorCode.InvalidParams
      );
    }
  });
});

test("campus://hostel-rules resource reads markdown and throws -32603 when file is missing", async () => {
  await withConnectedClient(async (client) => {
    const { resources } = await client.listResources();
    assert.equal(resources.length, 1);
    assert.equal(resources[0].uri, HOSTEL_RULES_URI);
    assert.equal(resources[0].name, "hostel-rules");
    assert.equal(resources[0].mimeType, "text/markdown");

    const readRes = await client.readResource({ uri: HOSTEL_RULES_URI });
    assert.equal(readRes.contents.length, 1);
    assert.equal(readRes.contents[0].uri, HOSTEL_RULES_URI);
    assert.equal(readRes.contents[0].mimeType, "text/markdown");
    const text = readRes.contents[0].text as string;
    assert.match(text, /1\. Gate Curfew/);
    assert.match(text, /800W/);
    assert.match(text, /6\. Disciplinary Escalation/);

    const emptyDir = await mkdtemp(path.join(os.tmpdir(), "nimbus-missing-"));
    const previousDataDir = process.env.CAMPUS_DATA_DIR;
    process.env.CAMPUS_DATA_DIR = emptyDir;

    try {
      await assert.rejects(
        () => client.readResource({ uri: HOSTEL_RULES_URI }),
        (err: unknown) =>
          err instanceof McpError && err.code === ErrorCode.InternalError
      );
    } finally {
      if (previousDataDir === undefined) {
        delete process.env.CAMPUS_DATA_DIR;
      } else {
        process.env.CAMPUS_DATA_DIR = previousDataDir;
      }
      await rm(emptyDir, { recursive: true, force: true });
    }

    await assert.rejects(
      () => client.readResource({ uri: "campus://nonexistent" }),
      (err: unknown) =>
        err instanceof McpError && err.code === ErrorCode.InvalidParams
    );
  });
});

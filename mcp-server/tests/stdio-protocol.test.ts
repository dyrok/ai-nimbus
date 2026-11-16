import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mcpServerRoot = path.resolve(testDir, "..");
const repoRoot = path.resolve(mcpServerRoot, "..");
const distEntry = path.join(mcpServerRoot, "dist", "index.js");
const pluginBundleEntry = path.join(
  repoRoot,
  "plugins",
  "campus-helpdesk",
  "servers",
  "campus-helpdesk-mcp.mjs"
);
const pluginDataDir = path.join(repoRoot, "plugins", "campus-helpdesk", "data");

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

async function runStdioWireScenario(
  scriptPath: string,
  options: { cwd: string; env?: Record<string, string | undefined> }
): Promise<{
  responses: Map<number, JsonRpcResponse>;
  rawStdoutLines: string[];
  stderrOutput: string;
}> {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const rawStdoutLines: string[] = [];
  const responses = new Map<number, JsonRpcResponse>();
  let stdoutBuffer = "";
  let stderrOutput = "";

  const waiters = new Map<number, (msg: JsonRpcResponse) => void>();

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, "");
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        rawStdoutLines.push(line);
        const parsed = JSON.parse(line) as JsonRpcResponse;
        assert.equal(parsed.jsonrpc, "2.0");
        if (typeof parsed.id === "number") {
          responses.set(parsed.id, parsed);
          const resolve = waiters.get(parsed.id);
          if (resolve) {
            waiters.delete(parsed.id);
            resolve(parsed);
          }
        }
      }
      newlineIndex = stdoutBuffer.indexOf("\n");
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrOutput += chunk;
  });

  const sendFrame = (frame: Record<string, unknown>): void => {
    child.stdin.write(`${JSON.stringify(frame)}\n`);
  };

  const sendRequest = (
    id: number,
    method: string,
    params: Record<string, unknown>
  ): Promise<JsonRpcResponse> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        reject(new Error(`Timed out waiting for JSON-RPC id=${id} (${method})`));
      }, 5000);
      waiters.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      sendFrame({ jsonrpc: "2.0", id, method, params });
    });
  };

  try {
    // Allow startup tick to settle and confirm zero unsolicited stdout bytes
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(stdoutBuffer.length, 0);
    assert.equal(rawStdoutLines.length, 0);

    const initRes = await sendRequest(1, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "stdio-wire-test", version: "1.0.0" },
    });
    assert.ok(initRes.result);
    assert.equal(
      (initRes.result.serverInfo as Record<string, unknown>).name,
      "campus-helpdesk"
    );

    // Client notification (no id, expects no response frame)
    sendFrame({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    const listToolsRes = await sendRequest(2, "tools/list", {});
    assert.ok(listToolsRes.result);
    const tools = listToolsRes.result.tools as Array<{ name: string }>;
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["get_fee_status", "get_timetable"]
    );

    const timetableRes = await sendRequest(3, "tools/call", {
      name: "get_timetable",
      arguments: { batch: "CSE-B", day: "Tuesday" },
    });
    assert.ok(timetableRes.result);
    assert.equal(timetableRes.result.isError, false);

    const domainErrRes = await sendRequest(4, "tools/call", {
      name: "get_fee_status",
      arguments: { student_id: "STU-2026-999" },
    });
    assert.ok(domainErrRes.result);
    assert.equal(domainErrRes.result.isError, true);

    const schemaErrRes = await sendRequest(5, "tools/call", {
      name: "get_fee_status",
      arguments: { student_id: "bad-id" },
    });
    assert.ok(schemaErrRes.error);
    assert.equal(schemaErrRes.error.code, -32602);

    const readResourceRes = await sendRequest(6, "resources/read", {
      uri: "campus://hostel-rules",
    });
    assert.ok(readResourceRes.result);
    const contents = readResourceRes.result.contents as Array<{
      uri: string;
      mimeType: string;
      text: string;
    }>;
    assert.equal(contents.length, 1);
    assert.equal(contents[0].mimeType, "text/markdown");
    assert.match(contents[0].text, /Nimbus University Student Residences/);
  } finally {
    child.stdin.end();
    await new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 2000);
      child.once("exit", () => {
        clearTimeout(killTimer);
        resolve();
      });
    });
  }

  assert.equal(stdoutBuffer.trim(), "");
  return { responses, rawStdoutLines, stderrOutput };
}

test("dist/index.js emits strictly valid JSON-RPC on stdout and structured logs on stderr", async () => {
  const { rawStdoutLines, stderrOutput } = await runStdioWireScenario(
    distEntry,
    { cwd: mcpServerRoot }
  );

  assert.equal(rawStdoutLines.length, 6);
  for (const line of rawStdoutLines) {
    assert.doesNotThrow(() => JSON.parse(line));
  }
  assert.match(stderrOutput, /\[nimbus:info\] server\.ready/);
  assert.match(stderrOutput, /\[nimbus:warn\] tool\.validation_failed/);
});

test("bundled campus-helpdesk-mcp.mjs runs cleanly outside mcp-server without node_modules", async () => {
  // Run from os.tmpdir() with CAMPUS_DATA_DIR set (simulating cached .mcp.json)
  const withEnv = await runStdioWireScenario(pluginBundleEntry, {
    cwd: os.tmpdir(),
    env: { CAMPUS_DATA_DIR: pluginDataDir },
  });
  assert.equal(withEnv.rawStdoutLines.length, 6);
  assert.match(withEnv.stderrOutput, /\[nimbus:info\] server\.ready/);

  // Also verify relative ../data/hostel_rules.md fallback with CAMPUS_DATA_DIR unset
  const withoutEnv = await runStdioWireScenario(pluginBundleEntry, {
    cwd: os.tmpdir(),
    env: { CAMPUS_DATA_DIR: "" },
  });
  assert.equal(withoutEnv.rawStdoutLines.length, 6);
});

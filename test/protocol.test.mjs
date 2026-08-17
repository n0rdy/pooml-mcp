// Protocol smoke test: no pooml instance needed - initialize and tools/list
// are served entirely by the shim. The full contract (tools/call against a
// real pooml) is exercised manually / in the pooml repo's release flow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function rpc(child, messages, waitMs = 800) {
  return new Promise((resolve, reject) => {
    const responses = [];
    let buf = "";
    child.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line.trim()) responses.push(JSON.parse(line));
      }
    });
    child.on("error", reject);
    for (const m of messages) child.stdin.write(JSON.stringify(m) + "\n");
    setTimeout(() => resolve(responses), waitMs);
  });
}

test("refuses to start without config", async () => {
  const child = spawn("node", ["dist/index.js"], { env: { PATH: process.env.PATH } });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const code = await new Promise((r) => child.on("exit", r));
  assert.equal(code, 1);
  assert.match(stderr, /POOML_URL/);
});

test("initialize + tools/list without a pooml instance", async () => {
  const child = spawn("node", ["dist/index.js"], {
    env: {
      PATH: process.env.PATH,
      POOML_URL: "http://localhost:1", // never contacted for these calls
      POOML_QUERY_API_AUTH_SECRET: "x".repeat(32),
    },
  });
  try {
    const responses = await rpc(child, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ci", version: "0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ]);
    const init = responses.find((r) => r.id === 1);
    assert.equal(init?.result?.serverInfo?.name, "pooml");
    const tools = responses.find((r) => r.id === 2)?.result?.tools ?? [];
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["list_metrics", "query_logs", "query_metrics"],
    );
    for (const t of tools) {
      assert.equal(t.annotations?.readOnlyHint, true, `${t.name} missing readOnlyHint`);
      assert.ok(t.description.length > 50, `${t.name} description too thin`);
    }
  } finally {
    child.kill();
  }
});

import test from "node:test";
import assert from "node:assert/strict";

const { InMemoryCoordinator, CoordinationError } = await import("../tools/picksy-mcp/src/coordinator.ts");
const { redactForMonitor } = await import("../tools/picksy-mcp/src/redaction.ts");
const { MCP_TOOLS } = await import("../tools/picksy-mcp/src/mcp-tools.ts");
const { handleMcpRequest } = await import("../tools/picksy-mcp/src/stdio.ts");

const key = (name) => ({ idempotencyKey: name });

test("coordinates task ownership, evidence, and ordered events", () => {
  const coordinator = new InMemoryCoordinator();
  coordinator.register_agent("codex", "Codex", key("register-codex"));
  coordinator.register_agent("gemini", "Gemini", key("register-gemini"));
  const task = coordinator.create_task("codex", "Review schema", "Review the isolated coordination schema", key("task"));
  coordinator.claim_task("codex", task.id, key("claim"));
  assert.throws(() => coordinator.claim_task("gemini", task.id, key("claim-gemini")), (error) => error instanceof CoordinationError && error.code === "CONFLICT");
  const completed = coordinator.complete_task("codex", task.id, ["local test evidence"], key("complete"));
  assert.equal(completed.status, "completed");
  const state = coordinator.get_project_state();
  assert.deepEqual(state.events.map((event) => event.sequence), [1, 2, 3, 4, 5]);
});

test("prevents overlapping locks and unsafe paths", () => {
  const coordinator = new InMemoryCoordinator();
  const first = coordinator.acquire_file_locks("codex", ["src/app"], 60_000, key("lock-one"));
  assert.throws(() => coordinator.acquire_file_locks("gemini", ["src/app/page.tsx"], 60_000, key("lock-two")), (error) => error.code === "CONFLICT");
  assert.throws(() => coordinator.acquire_file_locks("gemini", ["../secrets"], 60_000, key("lock-three")), (error) => error.code === "INVALID_INPUT");
  coordinator.release_file_locks("codex", [first[0].id], key("unlock"));
  assert.equal(coordinator.get_file_locks().length, 0);
});

test("enforces distinct assigned reviewers and immutable verdicts", () => {
  const coordinator = new InMemoryCoordinator();
  coordinator.register_agent("codex", "Codex", key("r1"));
  coordinator.register_agent("gemini", "Gemini", key("r2"));
  const task = coordinator.create_task("codex", "Review", "Review", key("t"));
  coordinator.claim_task("codex", task.id, key("c"));
  assert.throws(() => coordinator.request_review("codex", task.id, "codex", key("bad-review")), (error) => error.code === "FORBIDDEN");
  const review = coordinator.request_review("codex", task.id, "gemini", key("review"));
  const result = coordinator.submit_review("gemini", review.id, "approved", "Reviewed local evidence", key("verdict"));
  assert.equal(result.status, "approved");
  assert.throws(() => coordinator.submit_review("gemini", review.id, "rejected", "overwrite", key("overwrite")), (error) => error.code === "CONFLICT");
});

test("redacts monitor output without exposing sensitive values", () => {
  const output = redactForMonitor({ token: "secret-value", message: "Bearer abc", safe: "visible", nested: { cookie: "x" } });
  assert.equal(output.token, "[REDACTED]");
  assert.equal(output.message, "[REDACTED]");
  assert.equal(output.safe, "visible");
  assert.equal(output.nested.cookie, "[REDACTED]");
});

test("freezes the complete bounded MCP tool manifest", () => {
  assert.equal(MCP_TOOLS.length, 15);
  assert.equal(new Set(MCP_TOOLS.map((tool) => tool.name)).size, 15);
  for (const tool of MCP_TOOLS) {
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
});

test("supports clean stdio discovery and redacted read-only state", () => {
  const coordinator = new InMemoryCoordinator();
  const initialized = handleMcpRequest(coordinator, { jsonrpc: "2.0", id: 1, method: "initialize" });
  assert.equal(initialized.result.serverInfo.name, "picksy-agent-coordinator");
  const listed = handleMcpRequest(coordinator, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(listed.result.tools.length, 15);
  const mutation = handleMcpRequest(coordinator, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "post_message", arguments: {} } });
  assert.equal(mutation.error.code, -32601);
});

import { MCP_TOOL_NAMES } from "./coordinator.ts";

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
};

const stringField = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
const mutation = (properties: Record<string, unknown>, required: string[]): JsonSchema => ({
  type: "object",
  properties: { ...properties, idempotencyKey: stringField(120) },
  required: [...required, "idempotencyKey"],
  additionalProperties: false,
});

export const MCP_TOOLS = [
  { name: "register_agent", description: "Register or refresh one supported coordination agent.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, label: stringField(80) }, ["agent", "label"]) },
  { name: "heartbeat", description: "Refresh an existing agent lease.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] } }, ["agent"]) },
  { name: "get_project_state", description: "Read the current coordination state.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "post_message", description: "Post an explicit coordination message.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, body: stringField(2000), taskId: { type: ["string", "null"] } }, ["agent", "body", "taskId"]) },
  { name: "read_messages", description: "Read bounded coordination messages after an event cursor.", inputSchema: { type: "object", properties: { afterSequence: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false } },
  { name: "create_task", description: "Create a coordination task.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, title: stringField(160), description: stringField(2000) }, ["agent", "title", "description"]) },
  { name: "claim_task", description: "Atomically claim a task.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, taskId: stringField(120) }, ["agent", "taskId"]) },
  { name: "report_blocker", description: "Report a blocker for an owned task.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, taskId: stringField(120), blocker: stringField(2000) }, ["agent", "taskId", "blocker"]) },
  { name: "complete_task", description: "Complete an owned task with inspectable evidence.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, taskId: stringField(120), evidence: { type: "array", minItems: 1, maxItems: 20, items: stringField(500) } }, ["agent", "taskId", "evidence"]) },
  { name: "acquire_file_locks", description: "Atomically acquire bounded workspace-relative file locks.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, paths: { type: "array", minItems: 1, maxItems: 20, items: stringField(300) }, ttlMs: { type: "integer", minimum: 1000, maximum: 3600000 } }, ["agent", "paths", "ttlMs"]) },
  { name: "release_file_locks", description: "Release locks owned by the caller.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, lockIds: { type: "array", minItems: 1, maxItems: 20, items: stringField(120) } }, ["agent", "lockIds"]) },
  { name: "get_file_locks", description: "Read active file locks.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "request_review", description: "Request review from a distinct assigned reviewer.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, taskId: stringField(120), reviewer: { enum: ["codex", "gemini", "guardian", "human"] } }, ["agent", "taskId", "reviewer"]) },
  { name: "submit_review", description: "Submit an immutable assigned review verdict.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, reviewId: stringField(120), status: { enum: ["approved", "rejected", "changes_requested"] }, verdict: stringField(2000) }, ["agent", "reviewId", "status", "verdict"]) },
  { name: "report_changes", description: "Report bounded file changes with evidence.", inputSchema: mutation({ agent: { enum: ["codex", "gemini", "guardian", "human"] }, summary: stringField(2000), files: { type: "array", maxItems: 50, items: stringField(300) }, evidence: { type: "array", minItems: 1, maxItems: 20, items: stringField(500) } }, ["agent", "summary", "files", "evidence"]) },
] as const;

if (MCP_TOOLS.length !== MCP_TOOL_NAMES.length) {
  throw new Error("MCP tool manifest is incomplete");
}

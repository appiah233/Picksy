import { createInterface } from "node:readline";
import { InMemoryCoordinator } from "./coordinator.ts";
import { MCP_TOOLS } from "./mcp-tools.ts";
import { createMonitorSnapshot } from "./monitor.ts";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

const result = (id: string | number | undefined, value: unknown) => ({ jsonrpc: "2.0", id, result: value });
const error = (id: string | number | undefined, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

export function handleMcpRequest(coordinator: InMemoryCoordinator, request: JsonRpcRequest): Record<string, unknown> {
  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") return error(request.id, -32600, "Invalid Request");
  if (request.method === "initialize") {
    return result(request.id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "picksy-agent-coordinator", version: "0.1.0" } });
  }
  if (request.method === "notifications/initialized") return result(request.id, {});
  if (request.method === "tools/list") return result(request.id, { tools: MCP_TOOLS });
  if (request.method === "tools/call") {
    const params = request.params ?? {};
    const name = params.name;
    if (name === "get_project_state") return result(request.id, { content: [{ type: "text", text: JSON.stringify(createMonitorSnapshot(coordinator.get_project_state())) }] });
    if (name === "get_file_locks") return result(request.id, { content: [{ type: "text", text: JSON.stringify(coordinator.get_file_locks()) }] });
    if (name === "read_messages") {
      const args = (params.arguments ?? {}) as { afterSequence?: number; limit?: number };
      return result(request.id, { content: [{ type: "text", text: JSON.stringify(coordinator.read_messages(args.afterSequence ?? 0, args.limit ?? 100)) }] });
    }
    return error(request.id, -32601, "Tool is not wired to a durable coordinator");
  }
  return error(request.id, -32601, "Method not found");
}

export function runStdio(coordinator = new InMemoryCoordinator()): void {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", (line) => {
    try {
      const request = JSON.parse(line) as JsonRpcRequest;
      process.stdout.write(`${JSON.stringify(handleMcpRequest(coordinator, request))}\n`);
    } catch {
      process.stdout.write(`${JSON.stringify(error(undefined, -32700, "Parse error"))}\n`);
    }
  });
}

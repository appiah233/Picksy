export type AgentId = "codex" | "gemini" | "guardian" | "human";
export type TaskStatus = "open" | "claimed" | "blocked" | "completed";
export type ReviewStatus = "requested" | "approved" | "rejected" | "changes_requested";

export interface Agent {
  id: AgentId;
  label: string;
  lastSeenAt: string;
  activeTaskId: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  owner: AgentId | null;
  fence: number;
  blocker: string | null;
  evidence: string[];
}

export interface CoordinationMessage {
  id: string;
  from: AgentId;
  body: string;
  createdAt: string;
  taskId: string | null;
}

export interface FileLock {
  id: string;
  path: string;
  owner: AgentId;
  fence: number;
  expiresAt: string;
}

export interface Review {
  id: string;
  taskId: string;
  requester: AgentId;
  reviewer: AgentId;
  status: ReviewStatus;
  verdict: string | null;
}

export interface ChangeReport {
  id: string;
  agent: AgentId;
  summary: string;
  files: string[];
  evidence: string[];
  createdAt: string;
}

export interface CoordinationEvent {
  sequence: number;
  type: string;
  actor: AgentId;
  resourceId: string;
  createdAt: string;
}

export interface ProjectState {
  agents: Agent[];
  tasks: Task[];
  messages: CoordinationMessage[];
  locks: FileLock[];
  reviews: Review[];
  changes: ChangeReport[];
  events: CoordinationEvent[];
}

export class CoordinationError extends Error {
  public readonly code:
    | "INVALID_INPUT"
    | "NOT_FOUND"
    | "CONFLICT"
    | "FORBIDDEN"
    | "IDEMPOTENCY_CONFLICT";

  constructor(
    code:
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "CONFLICT"
      | "FORBIDDEN"
      | "IDEMPOTENCY_CONFLICT",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "CoordinationError";
  }
}

export interface MutationOptions {
  idempotencyKey: string;
}

const now = () => new Date().toISOString();

function requireText(value: string, field: string, max = 2000): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new CoordinationError("INVALID_INPUT", `${field} is invalid`);
  }
  return value.trim();
}

function normalizePath(input: string): string {
  const value = requireText(input, "path", 300).replaceAll("\\", "/");
  if (value.startsWith("/") || value.includes("\0")) {
    throw new CoordinationError("INVALID_INPUT", "path must be workspace-relative");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new CoordinationError("INVALID_INPUT", "path contains an unsafe segment");
  }
  return segments.join("/");
}

function pathsConflict(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export class InMemoryCoordinator {
  private readonly agents = new Map<AgentId, Agent>();
  private readonly tasks = new Map<string, Task>();
  private readonly messages: CoordinationMessage[] = [];
  private readonly locks = new Map<string, FileLock>();
  private readonly reviews = new Map<string, Review>();
  private readonly changes: ChangeReport[] = [];
  private readonly events: CoordinationEvent[] = [];
  private readonly idempotency = new Map<string, string>();
  private sequence = 0;

  private mutation<T>(options: MutationOptions, operation: () => T): T {
    requireText(options.idempotencyKey, "idempotencyKey", 120);
    const existing = this.idempotency.get(options.idempotencyKey);
    if (existing) return JSON.parse(existing) as T;
    const result = operation();
    this.idempotency.set(options.idempotencyKey, JSON.stringify(result));
    return result;
  }

  private event(type: string, actor: AgentId, resourceId: string): void {
    this.events.push({ sequence: ++this.sequence, type, actor, resourceId, createdAt: now() });
  }

  register_agent(agent: AgentId, label: string, options: MutationOptions): Agent {
    return this.mutation(options, () => {
      const existing = this.agents.get(agent);
      if (existing) {
        if (existing.label !== label) throw new CoordinationError("CONFLICT", "agent metadata conflicts");
        existing.lastSeenAt = now();
        return { ...existing };
      }
      const record: Agent = { id: agent, label: requireText(label, "label", 80), lastSeenAt: now(), activeTaskId: null };
      this.agents.set(agent, record);
      this.event("agent.registered", agent, agent);
      return { ...record };
    });
  }

  heartbeat(agent: AgentId, options: MutationOptions): Agent {
    return this.mutation(options, () => {
      const record = this.agents.get(agent);
      if (!record) throw new CoordinationError("NOT_FOUND", "agent is not registered");
      record.lastSeenAt = now();
      this.event("agent.heartbeat", agent, agent);
      return { ...record };
    });
  }

  get_project_state(): ProjectState {
    return {
      agents: [...this.agents.values()].map((item) => ({ ...item })),
      tasks: [...this.tasks.values()].map((item) => ({ ...item, evidence: [...item.evidence] })),
      messages: this.messages.map((item) => ({ ...item })),
      locks: [...this.locks.values()].map((item) => ({ ...item })),
      reviews: [...this.reviews.values()].map((item) => ({ ...item })),
      changes: this.changes.map((item) => ({ ...item, files: [...item.files], evidence: [...item.evidence] })),
      events: this.events.map((item) => ({ ...item })),
    };
  }

  post_message(agent: AgentId, body: string, taskId: string | null, options: MutationOptions): CoordinationMessage {
    return this.mutation(options, () => {
      if (taskId && !this.tasks.has(taskId)) throw new CoordinationError("NOT_FOUND", "task not found");
      const message = { id: `message-${this.messages.length + 1}`, from: agent, body: requireText(body, "body"), createdAt: now(), taskId };
      this.messages.push(message);
      this.event("message.posted", agent, message.id);
      return { ...message };
    });
  }

  read_messages(afterSequence = 0, limit = 100): CoordinationMessage[] {
    if (!Number.isInteger(afterSequence) || afterSequence < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new CoordinationError("INVALID_INPUT", "invalid message cursor or limit");
    }
    const eventIds = new Set(this.events.filter((event) => event.sequence > afterSequence && event.type === "message.posted").map((event) => event.resourceId));
    return this.messages.filter((message) => eventIds.has(message.id)).slice(0, limit).map((message) => ({ ...message }));
  }

  create_task(agent: AgentId, title: string, description: string, options: MutationOptions): Task {
    return this.mutation(options, () => {
      const task: Task = { id: `task-${this.tasks.size + 1}`, title: requireText(title, "title", 160), description: requireText(description, "description"), status: "open", owner: null, fence: 0, blocker: null, evidence: [] };
      this.tasks.set(task.id, task);
      this.event("task.created", agent, task.id);
      return { ...task, evidence: [] };
    });
  }

  claim_task(agent: AgentId, taskId: string, options: MutationOptions): Task {
    return this.mutation(options, () => {
      const task = this.tasks.get(taskId);
      if (!task) throw new CoordinationError("NOT_FOUND", "task not found");
      if (task.owner && task.owner !== agent && task.status !== "completed") throw new CoordinationError("CONFLICT", "task is already owned");
      task.owner = agent;
      task.status = "claimed";
      task.fence += 1;
      const current = this.agents.get(agent);
      if (current) current.activeTaskId = task.id;
      this.event("task.claimed", agent, task.id);
      return { ...task, evidence: [...task.evidence] };
    });
  }

  report_blocker(agent: AgentId, taskId: string, blocker: string, options: MutationOptions): Task {
    return this.mutation(options, () => {
      const task = this.tasks.get(taskId);
      if (!task) throw new CoordinationError("NOT_FOUND", "task not found");
      if (task.owner !== agent) throw new CoordinationError("FORBIDDEN", "only the owner may report a blocker");
      task.blocker = requireText(blocker, "blocker");
      task.status = "blocked";
      this.event("task.blocked", agent, task.id);
      return { ...task, evidence: [...task.evidence] };
    });
  }

  complete_task(agent: AgentId, taskId: string, evidence: string[], options: MutationOptions): Task {
    return this.mutation(options, () => {
      const task = this.tasks.get(taskId);
      if (!task) throw new CoordinationError("NOT_FOUND", "task not found");
      if (task.owner !== agent) throw new CoordinationError("FORBIDDEN", "only the owner may complete a task");
      if (!Array.isArray(evidence) || evidence.length === 0) throw new CoordinationError("INVALID_INPUT", "completion evidence is required");
      task.evidence = evidence.map((item) => requireText(item, "evidence", 500));
      task.status = "completed";
      task.blocker = null;
      this.event("task.completed", agent, task.id);
      return { ...task, evidence: [...task.evidence] };
    });
  }

  acquire_file_locks(agent: AgentId, paths: string[], ttlMs: number, options: MutationOptions): FileLock[] {
    return this.mutation(options, () => {
      if (!Array.isArray(paths) || paths.length === 0 || paths.length > 20 || !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 3_600_000) throw new CoordinationError("INVALID_INPUT", "invalid lock request");
      const normalized = paths.map(normalizePath);
      const currentTime = Date.now();
      for (const lock of this.locks.values()) {
        if (Date.parse(lock.expiresAt) <= currentTime) this.locks.delete(lock.id);
        else if (normalized.some((path) => pathsConflict(path, lock.path)) && lock.owner !== agent) throw new CoordinationError("CONFLICT", `path is locked: ${lock.path}`);
      }
      const result = normalized.map((path) => {
        const lock = { id: `lock-${this.locks.size + 1}`, path, owner: agent, fence: 1, expiresAt: new Date(currentTime + ttlMs).toISOString() };
        this.locks.set(lock.id, lock);
        this.event("lock.acquired", agent, lock.id);
        return { ...lock };
      });
      return result;
    });
  }

  release_file_locks(agent: AgentId, lockIds: string[], options: MutationOptions): void {
    this.mutation(options, () => {
      for (const lockId of lockIds) {
        const lock = this.locks.get(lockId);
        if (!lock) continue;
        if (lock.owner !== agent) throw new CoordinationError("FORBIDDEN", "only the lock owner may release it");
        this.locks.delete(lockId);
        this.event("lock.released", agent, lockId);
      }
    });
  }

  get_file_locks(): FileLock[] {
    return [...this.locks.values()].filter((lock) => Date.parse(lock.expiresAt) > Date.now()).map((lock) => ({ ...lock }));
  }

  request_review(agent: AgentId, taskId: string, reviewer: AgentId, options: MutationOptions): Review {
    return this.mutation(options, () => {
      const task = this.tasks.get(taskId);
      if (!task) throw new CoordinationError("NOT_FOUND", "task not found");
      if (task.owner !== agent || reviewer === agent) throw new CoordinationError("FORBIDDEN", "reviewer must be distinct from requester");
      const review: Review = { id: `review-${this.reviews.size + 1}`, taskId, requester: agent, reviewer, status: "requested", verdict: null };
      this.reviews.set(review.id, review);
      this.event("review.requested", agent, review.id);
      return { ...review };
    });
  }

  submit_review(agent: AgentId, reviewId: string, status: Exclude<ReviewStatus, "requested">, verdict: string, options: MutationOptions): Review {
    return this.mutation(options, () => {
      const review = this.reviews.get(reviewId);
      if (!review) throw new CoordinationError("NOT_FOUND", "review not found");
      if (review.reviewer !== agent) throw new CoordinationError("FORBIDDEN", "only the assigned reviewer may submit");
      if (review.status !== "requested") throw new CoordinationError("CONFLICT", "review verdict is immutable");
      review.status = status;
      review.verdict = requireText(verdict, "verdict", 2000);
      this.event("review.submitted", agent, review.id);
      return { ...review };
    });
  }

  report_changes(agent: AgentId, summary: string, files: string[], evidence: string[], options: MutationOptions): ChangeReport {
    return this.mutation(options, () => {
      if (!Array.isArray(files) || files.length > 50 || !Array.isArray(evidence) || evidence.length === 0) throw new CoordinationError("INVALID_INPUT", "change evidence is required");
      const report = { id: `change-${this.changes.length + 1}`, agent, summary: requireText(summary, "summary"), files: files.map(normalizePath), evidence: evidence.map((item) => requireText(item, "evidence", 500)), createdAt: now() };
      this.changes.push(report);
      this.event("changes.reported", agent, report.id);
      return { ...report, files: [...report.files], evidence: [...report.evidence] };
    });
  }
}

export const MCP_TOOL_NAMES = [
  "register_agent", "heartbeat", "get_project_state", "post_message", "read_messages",
  "create_task", "claim_task", "report_blocker", "complete_task", "acquire_file_locks",
  "release_file_locks", "get_file_locks", "request_review", "submit_review", "report_changes",
] as const;

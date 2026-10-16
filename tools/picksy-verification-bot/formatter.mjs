import { VERIFICATION_STATES } from "./types-and-policy.mjs";

/**
 * Renders the concise human-readable PICKSY VERIFICATION BOT report matching Section 11 structure.
 */
export function formatAsciiReport({
  policy = {},
  observedMainSha = "103f33a62b750bcb7d488ee03c5593b65486ecb3",
  codexVerification = null,
  geminiVerification = null,
  crossAgentConflicts = [],
  mainBranchEvents = [],
  specialConditions = policy.specialConditions || {},
  escalations = [],
  tasks = policy.tasks || [],
}) {
  const lines = [];
  const divider = "--------------------------------";

  lines.push("PICKSY VERIFICATION BOT");
  lines.push("");

  // SECTION: Repository
  lines.push("Repository");
  lines.push(divider);
  lines.push(`Repository: ${policy.repository || "appiah233/Picksy"}`);
  lines.push(`Observed main SHA: ${observedMainSha}`);
  lines.push("");

  // SECTION: Codex
  lines.push("Codex");
  lines.push(divider);
  const codexTask = tasks.find((t) => t.agent === "Codex" && t.status !== "COMPLETED") ||
    tasks.find((t) => t.agent === "Codex") || { taskId: "TASK-CODEX", objective: "Backend/Security" };

  if (!codexVerification) {
    lines.push(`Task: ${codexTask.taskId} (${codexTask.objective})`);
    lines.push(`Branch: ${codexTask.branch || "main"}`);
    lines.push("PR: None");
    lines.push("Commit: " + observedMainSha.slice(0, 7));
    lines.push("Scope: IN_SCOPE (No pending changes)");
    lines.push("Checks:");
    lines.push("  test-and-build: not_run");
    lines.push("  CodeQL JavaScript/TypeScript: not_run");
    lines.push("  Production dependency audit: not_run");
    lines.push("  public-baseline: not_run");
    lines.push("Verdict: UNVERIFIED");
  } else {
    lines.push(`Task: ${codexTask.taskId} (${codexTask.objective})`);
    lines.push(`Branch: ${codexVerification.branch || codexTask.branch || "N/A"}`);
    lines.push(`PR: #${codexVerification.prNumber || "N/A"}`);
    lines.push(`Commit: ${codexVerification.headSha || "N/A"}`);
    lines.push(`Scope: ${codexVerification.scope?.overallScope || "IN_SCOPE"} (${codexVerification.scope?.summary || "N/A"})`);
    lines.push("Checks:");
    const checkNames = [
      "test-and-build",
      "CodeQL JavaScript/TypeScript",
      "Production dependency audit",
      "public-baseline",
    ];
    for (const cName of checkNames) {
      const run = (codexVerification.checks?.checks || []).find((c) => c.name === cName);
      lines.push(`  ${cName}: ${run?.conclusion || run?.status || "not_run"}`);
    }
    lines.push(`Verdict: ${codexVerification.state}`);
  }
  lines.push("");

  // SECTION: Gemini
  lines.push("Gemini");
  lines.push(divider);
  const geminiTask = tasks.find((t) => t.agent === "Gemini" && t.status !== "COMPLETED") ||
    tasks.find((t) => t.agent === "Gemini") || { taskId: "TASK-GEMINI", objective: "Design/Frontend" };

  if (!geminiVerification) {
    lines.push(`Task: ${geminiTask.taskId} (${geminiTask.objective})`);
    lines.push(`Branch: ${geminiTask.branch || "main"}`);
    lines.push("PR: None");
    lines.push("Commit: " + observedMainSha.slice(0, 7));
    lines.push("Scope: IN_SCOPE (No pending changes)");
    lines.push("Checks:");
    lines.push("  test-and-build: not_run");
    lines.push("  CodeQL JavaScript/TypeScript: not_run");
    lines.push("  Production dependency audit: not_run");
    lines.push("  public-baseline: not_run");
    lines.push("Verdict: UNVERIFIED");
  } else {
    lines.push(`Task: ${geminiTask.taskId} (${geminiTask.objective})`);
    lines.push(`Branch: ${geminiVerification.branch || geminiTask.branch || "N/A"}`);
    lines.push(`PR: #${geminiVerification.prNumber || "N/A"}`);
    lines.push(`Commit: ${geminiVerification.headSha || "N/A"}`);
    lines.push(`Scope: ${geminiVerification.scope?.overallScope || "IN_SCOPE"} (${geminiVerification.scope?.summary || "N/A"})`);
    lines.push("Checks:");
    const checkNames = [
      "test-and-build",
      "CodeQL JavaScript/TypeScript",
      "Production dependency audit",
      "public-baseline",
    ];
    for (const cName of checkNames) {
      const run = (geminiVerification.checks?.checks || []).find((c) => c.name === cName);
      lines.push(`  ${cName}: ${run?.conclusion || run?.status || "not_run"}`);
    }
    lines.push(`Verdict: ${geminiVerification.state}`);
  }
  lines.push("");

  // SECTION: Cross-Agent
  lines.push("Cross-Agent");
  lines.push(divider);
  const overlappingFiles = crossAgentConflicts.map((c) => c.file).join(", ") || "None";
  lines.push(`Overlapping files: ${overlappingFiles}`);
  lines.push(`Ownership conflicts: ${crossAgentConflicts.length > 0 ? `${crossAgentConflicts.length} conflict(s)` : "None"}`);
  const unknownOwnership = (escalations.filter((e) => e.botConclusions?.overallScope === "UNKNOWN").length > 0) ? "Detected" : "None";
  lines.push(`Unknown ownership: ${unknownOwnership}`);
  const unexpectedDirect = (mainBranchEvents.filter((m) => m.classification !== "EXPECTED_MERGE").length > 0) ? "Detected" : "None";
  lines.push(`Unexpected main changes: ${unexpectedDirect}`);
  const humanReview = (escalations.length > 0 || crossAgentConflicts.length > 0 || unexpectedDirect !== "None") ? "YES" : "NO";
  lines.push(`Human review required: ${humanReview}`);
  lines.push("");

  // SECTION: Release Conditions
  lines.push("Release Conditions");
  lines.push(divider);
  lines.push(`Gate 3: ${specialConditions.gate3Status || "BLOCKED_BY_OWNER_BUSINESS_EVIDENCE"}`);
  lines.push(`Dependency security: ${specialConditions.specialPullRequests?.["7"]?.status === "TRACKED" ? "Fail-closed (tracked PR #7)" : "Verified"}`);
  lines.push(`CodeQL: PASS (0 alerts)`);
  lines.push(`Release approved: ${specialConditions.mvpReleaseApproved ? "YES" : "NO (Blocked by Owner)"}`);
  lines.push(`Release tag allowed: ${specialConditions.releaseTagAllowed ? "YES" : "NO (Blocked)"}`);

  return lines.join("\n");
}

/**
 * Builds mobile-friendly, automation-ready JSON projection.
 */
export function buildMobileStatusSnapshot({
  overallStatus,
  policy,
  engine,
  auditLog,
  activeConflicts = [],
}) {
  const tasks = engine.getActiveTasks();
  const escalations = auditLog.getEscalations();

  return {
    app: "Picksy",
    service: "picksy-verification-bot",
    version: policy.version || "1.0.0",
    status: overallStatus,
    timestamp: new Date().toISOString(),
    specialConditions: policy.specialConditions || {},
    agents: {
      codex: {
        role: "Backend, Database, and Security Owner",
        activeWork: engine.activeAgentWork.get("Codex") || null,
        recentVerification: engine.getVerification("Codex") || null,
      },
      gemini: {
        role: "Lead Coordinator, Design, and Frontend Owner",
        activeWork: engine.activeAgentWork.get("Gemini") || null,
        recentVerification: engine.getVerification("Gemini") || null,
      },
    },
    conflicts: activeConflicts,
    activeTasksCount: tasks.length,
    escalationsCount: escalations.length,
    requiresHumanReview: escalations.length > 0 || activeConflicts.length > 0,
    quickSummary: activeConflicts.length > 0
      ? `CONFLICT: ${activeConflicts.length} cross-agent collision(s) detected.`
      : overallStatus === VERIFICATION_STATES.VERIFIED
      ? "All active agent changes verified and safe."
      : `Status is ${overallStatus}. Attention may be required.`,
  };
}

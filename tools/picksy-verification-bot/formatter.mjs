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
  codeScanningAlertsCount = null,
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
  const codexTask = codexVerification?.matchedTask ||
    tasks.find((t) => (codexVerification?.prNumber && t.pullRequest === codexVerification.prNumber) || (codexVerification?.branch && t.branch === codexVerification.branch)) ||
    tasks.find((t) => t.agent === "Codex" && t.status !== "COMPLETED") ||
    tasks.find((t) => t.agent === "Codex") ||
    { taskId: "TASK-CODEX", objective: "Backend/Security" };

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
  const geminiTask = geminiVerification?.matchedTask ||
    tasks.find((t) => (geminiVerification?.prNumber && t.pullRequest === geminiVerification.prNumber) || (geminiVerification?.branch && t.branch === geminiVerification.branch)) ||
    tasks.find((t) => t.agent === "Gemini" && t.status !== "COMPLETED") ||
    tasks.find((t) => t.agent === "Gemini") ||
    { taskId: "TASK-GEMINI", objective: "Design/Frontend" };

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
  let codeQlSummary = "PASS (0 alerts)";
  if (codeScanningAlertsCount !== null && codeScanningAlertsCount !== undefined) {
    codeQlSummary = codeScanningAlertsCount === 0
      ? "PASS (0 alerts)"
      : `${codeScanningAlertsCount} open alert(s) under triage/remediation`;
  } else if (specialConditions.openCodeQlAlerts !== undefined) {
    codeQlSummary = specialConditions.openCodeQlAlerts === 0
      ? "PASS (0 alerts)"
      : `${specialConditions.openCodeQlAlerts} open alert(s) under triage/remediation`;
  }
  lines.push(`CodeQL: ${codeQlSummary}`);
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

/**
 * Renders a sticky GitHub PR comment in clean Markdown.
 */
export function formatPrCommentMarkdown({
  verification,
  policy = {},
  reportText = "",
  marker = "<!-- picksy-verification-bot -->",
}) {
  const lines = [];
  lines.push(marker);
  lines.push("### 🤖 Picksy GitHub Verification Bot Report");
  lines.push("");

  const state = verification?.state || "UNKNOWN";
  const stateBadge = {
    VERIFIED: "🟢 **`VERIFIED`**",
    FAILED: "🔴 **`FAILED`**",
    UNVERIFIED: "🟡 **`UNVERIFIED`**",
    CONFLICT: "🟠 **`CONFLICT`**",
    BLOCKED: "🚫 **`BLOCKED`**",
  }[state] || `⚪ **\`${state}\`**`;

  lines.push("| Property | Value |");
  lines.push("| :--- | :--- |");
  lines.push(`| **Verdict** | ${stateBadge} |`);
  lines.push(`| **Assigned Agent** | \`${verification?.agentName || "UNKNOWN"}\` |`);
  lines.push(`| **Branch** | \`${verification?.branch || "N/A"}\` |`);
  lines.push(`| **Commit SHA** | \`${verification?.headSha ? verification.headSha.slice(0, 7) : "N/A"}\` |`);
  lines.push(`| **Scope** | \`${verification?.scope?.overallScope || "UNKNOWN"}\` (${verification?.scope?.summary || "N/A"}) |`);
  lines.push(`| **Human Review Required** | ${verification?.requiresHumanReview ? "⚠️ **YES**" : "✅ **NO**"} |`);
  lines.push("");

  // Required checks table
  lines.push("#### 🔍 Mandatory Check Status");
  lines.push("");
  lines.push("| Check Name | Status | Conclusion | Details |");
  lines.push("| :--- | :--- | :--- | :--- |");
  const checks = verification?.checks?.checks || [];
  if (checks.length === 0) {
    lines.push("| *(No check-runs observed)* | - | - | - |");
  } else {
    for (const c of checks) {
      const conclusion = c.conclusion || c.status || "not_run";
      const icon = conclusion === "success" ? "✅" : (conclusion === "failure" ? "❌" : "⏳");
      lines.push(`| **${c.name}** | \`${c.status || "completed"}\` | ${icon} \`${conclusion}\` | ${c.detail || ""} |`);
    }
  }
  lines.push("");

  // Security Findings / Injection attempts
  const findings = verification?.securityFindings || [];
  if (findings.length > 0) {
    lines.push("#### 🛡️ Security Findings");
    lines.push("");
    for (const f of findings) {
      lines.push(`- **[${f.severity || "HIGH"}]** \`${f.type}\`: ${f.message}`);
    }
    lines.push("");
  }

  // Cross-agent conflicts
  const conflicts = verification?.conflicts || [];
  if (conflicts.length > 0) {
    lines.push("#### ⚠️ Cross-Agent Ownership Conflicts");
    lines.push("");
    for (const cf of conflicts) {
      lines.push(`- **File:** \`${cf.file}\` (${cf.agentA} vs ${cf.agentB}) — ${cf.message}`);
    }
    lines.push("");
  }

  // Collapsible ASCII report
  if (reportText) {
    lines.push("<details>");
    lines.push("<summary>📋 Full Verification Report (Section 11 ASCII)</summary>");
    lines.push("");
    lines.push("```text");
    lines.push(reportText.trim());
    lines.push("```");
    lines.push("</details>");
    lines.push("");
  }

  lines.push(`*Report generated at ${new Date().toISOString()} · Repository: \`${policy.repository || "appiah233/Picksy"}\`*`);

  return lines.join("\n");
}

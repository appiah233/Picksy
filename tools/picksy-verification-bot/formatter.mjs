import { VERIFICATION_STATES } from "./types-and-policy.mjs";

/**
 * Renders the concise human-readable PICKSY VERIFICATION BOT report.
 */
export function formatAsciiReport({
  overallStatus = VERIFICATION_STATES.VERIFIED,
  policy = {},
  codexVerification = null,
  geminiVerification = null,
  crossAgentConflicts = [],
  mainBranchEvents = [],
  specialConditions = {},
  escalations = [],
}) {
  const lines = [];
  const divider = "=".repeat(76);
  const subDivider = "-".repeat(76);

  lines.push(divider);
  lines.push("                  PICKSY GITHUB VERIFICATION BOT REPORT");
  lines.push(divider);
  lines.push(`Generated At:     ${new Date().toISOString()}`);
  lines.push(`Repository:       ${policy.repository || "appiah233/Picksy"}`);
  lines.push(`Overall Verdict:  [${overallStatus}]`);
  lines.push(`Gate 3 Status:    ${specialConditions.gate3Status || "BLOCKED_BY_OWNER_BUSINESS_EVIDENCE"}`);
  lines.push(`MVP Approved:     ${specialConditions.mvpReleaseApproved ? "YES" : "NO (Blocked)"}`);
  lines.push("");

  // SECTION 1: CODEX STATUS
  lines.push(subDivider);
  lines.push(" 1. CODEX (Backend, Database, and Security Owner)");
  lines.push(subDivider);
  if (!codexVerification) {
    lines.push("  Status: No active pull request or commit recorded for verification.");
  } else {
    lines.push(`  Reference:      PR #${codexVerification.prNumber || "N/A"} (${codexVerification.headSha?.slice(0, 7) || "N/A"})`);
    lines.push(`  Verdict:        [${codexVerification.state}]`);
    lines.push(`  Scope Summary:  ${codexVerification.scope?.summary || "N/A"}`);
    lines.push(`  Checks Status:  ${codexVerification.checks?.allPassed ? "All 4/4 Required Checks PASSED" : codexVerification.checks?.overallState}`);
    if (codexVerification.claims && codexVerification.claims.length > 0) {
      lines.push("  Agent Claims:");
      for (const c of codexVerification.claims) {
        lines.push(`    - "${c.claim}": [${c.verdict}] (${c.reason})`);
      }
    }
    if (codexVerification.securityFindings && codexVerification.securityFindings.length > 0) {
      lines.push("  Security Findings:");
      for (const f of codexVerification.securityFindings) {
        lines.push(`    - [${f.type}] ${f.message}`);
      }
    }
  }
  lines.push("");

  // SECTION 2: GEMINI STATUS
  lines.push(subDivider);
  lines.push(" 2. GEMINI (Lead Coordinator, Design, and Frontend Owner)");
  lines.push(subDivider);
  if (!geminiVerification) {
    lines.push("  Status: No active pull request or commit recorded for verification.");
  } else {
    lines.push(`  Reference:      PR #${geminiVerification.prNumber || "N/A"} (${geminiVerification.headSha?.slice(0, 7) || "N/A"})`);
    lines.push(`  Verdict:        [${geminiVerification.state}]`);
    lines.push(`  Scope Summary:  ${geminiVerification.scope?.summary || "N/A"}`);
    lines.push(`  Checks Status:  ${geminiVerification.checks?.allPassed ? "All 4/4 Required Checks PASSED" : geminiVerification.checks?.overallState}`);
    if (geminiVerification.claims && geminiVerification.claims.length > 0) {
      lines.push("  Agent Claims:");
      for (const c of geminiVerification.claims) {
        lines.push(`    - "${c.claim}": [${c.verdict}] (${c.reason})`);
      }
    }
    if (geminiVerification.securityFindings && geminiVerification.securityFindings.length > 0) {
      lines.push("  Security Findings:");
      for (const f of geminiVerification.securityFindings) {
        lines.push(`    - [${f.type}] ${f.message}`);
      }
    }
  }
  lines.push("");

  // SECTION 3: CROSS-AGENT STATUS & CONFLICTS
  lines.push(subDivider);
  lines.push(" 3. CROSS-AGENT STATUS & CONFLICT MONITOR");
  lines.push(subDivider);
  if (crossAgentConflicts.length === 0) {
    lines.push("  Zero file or line ownership conflicts detected between Codex and Gemini.");
  } else {
    lines.push(`  ACTIVE CONFLICTS DETECTED (${crossAgentConflicts.length}):`);
    for (const c of crossAgentConflicts) {
      lines.push(`  * File: ${c.file}`);
      lines.push(`    Agents: ${c.agentA} (${c.referenceA}) vs ${c.agentB} (${c.referenceB})`);
      lines.push(`    Overlap: ${Array.isArray(c.overlappingLines) ? `Lines ${c.overlappingLines[0]}-${c.overlappingLines[1]}` : c.overlappingLines}`);
      lines.push(`    Action: ${c.message}`);
    }
  }
  lines.push("");

  // SECTION 4: MAIN BRANCH INTEGRITY
  lines.push(subDivider);
  lines.push(" 4. MAIN BRANCH MONITORING");
  lines.push(subDivider);
  if (mainBranchEvents.length === 0) {
    lines.push("  Protected branch 'main' has observed no unauthorized direct pushes or force-pushes.");
  } else {
    for (const evt of mainBranchEvents) {
      lines.push(`  * Branch: ${evt.branch} | Classification: [${evt.classification}] | Pusher: ${evt.pusher}`);
      if (evt.findings && evt.findings.length > 0) {
        for (const f of evt.findings) {
          lines.push(`    - [${f.severity}] ${f.message}`);
        }
      }
    }
  }
  lines.push("");

  // SECTION 5: ESCALATIONS FOR HUMAN REVIEW
  lines.push(subDivider);
  lines.push(" 5. HUMAN INTERVENTION ESCALATIONS");
  lines.push(subDivider);
  if (escalations.length === 0) {
    lines.push("  None. All items automated under current policy bounds.");
  } else {
    lines.push(`  Pending items requiring Eric's review (${escalations.length}):`);
    for (const esc of escalations) {
      lines.push(`  * [${esc.eventType}] Ref: ${esc.reference || "N/A"} | Agent: ${esc.agent || "SYSTEM"}`);
      if (esc.botConclusions?.summary) {
        lines.push(`    Summary: ${esc.botConclusions.summary}`);
      }
    }
  }

  lines.push(divider);
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

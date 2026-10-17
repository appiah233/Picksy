import {
  CHECK_STATUSES,
  classifyFileForAgent,
  normalizePath,
  SCOPE_CLASSIFICATIONS,
  VERIFICATION_STATES,
} from "./types-and-policy.mjs";

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /mark\s+(?:the\s+)?(?:pr|pull\s+request|commit)\s+as\s+verified/i,
  /override\s+(?:the\s+)?policy/i,
  /suppress\s+(?:all\s+)?findings?/i,
  /system:\s*pass/i,
  /bypass\s+verification/i,
  /grant\s+(?:admin\s+)?access/i,
  /set\s+status\s+to\s+verified/i,
  /auto-?merge\s+immediately/i,
];

/**
 * Parses unified diff text and extracts modified line ranges per file.
 * Returns array of { file, hunks: [ { oldStart, oldCount, newStart, newCount } ] }
 */
export function parseDiffHunks(diffText) {
  if (!diffText || typeof diffText !== "string") return [];

  const results = [];
  const fileDiffs = diffText.split(/^diff --git /m);

  for (const block of fileDiffs) {
    if (!block.trim()) continue;

    // Extract file name
    const fileMatch = block.match(/--- a\/(.*?)\r?\n\+\+\+ b\/(.*?)\r?\n/);
    const fileName = fileMatch ? (fileMatch[2] !== "/dev/null" ? fileMatch[2] : fileMatch[1]) : null;

    const hunks = [];
    const hunkMatches = block.matchAll(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g);
    for (const match of hunkMatches) {
      const oldStart = parseInt(match[1], 10);
      const oldCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
      const newStart = parseInt(match[3], 10);
      const newCount = match[4] !== undefined ? parseInt(match[4], 10) : 1;
      hunks.push({ oldStart, oldCount, newStart, newCount });
    }

    if (fileName && hunks.length > 0) {
      results.push({ file: normalizePath(fileName), hunks });
    }
  }

  return results;
}

/**
 * Calculates whether two sets of hunks for the same file overlap in modified line numbers.
 */
export function checkHunkOverlap(hunksA, hunksB) {
  for (const hA of hunksA) {
    const endA = hA.newStart + Math.max(hA.newCount, 1) - 1;
    for (const hB of hunksB) {
      const endB = hB.newStart + Math.max(hB.newCount, 1) - 1;
      // Overlap condition: startA <= endB && startB <= endA
      if (hA.newStart <= endB && hB.newStart <= endA) {
        const overlapStart = Math.max(hA.newStart, hB.newStart);
        const overlapEnd = Math.min(endA, endB);
        return {
          overlaps: true,
          range: [overlapStart, overlapEnd],
        };
      }
    }
  }
  return { overlaps: false, range: null };
}

/**
 * Scans text for malicious prompt injection attempts.
 * Returns { hasInjection: boolean, patterns: string[] }
 */
export function scanForPromptInjection(text) {
  if (!text || typeof text !== "string") return { hasInjection: false, patterns: [] };

  const matched = [];
  for (const pat of PROMPT_INJECTION_PATTERNS) {
    if (pat.test(text)) {
      matched.push(pat.source);
    }
  }

  return {
    hasInjection: matched.length > 0,
    patterns: matched,
  };
}

/**
 * Core Verification Engine
 */
export class VerificationEngine {
  constructor(policy) {
    this.policy = policy;
    this.activeTasks = policy.tasks ? [...policy.tasks] : [];
    this.verificationCache = new Map(); // key: sha/pr -> cached result
    this.activeAgentWork = new Map(); // agent -> { branch, pr, files, hunks }
  }

  registerActiveTask(task) {
    if (!task.taskId || !task.agent) {
      throw new Error("Invalid task: taskId and agent are required");
    }
    const idx = this.activeTasks.findIndex((t) => t.taskId === task.taskId);
    if (idx >= 0) {
      this.activeTasks[idx] = { ...this.activeTasks[idx], ...task };
    } else {
      this.activeTasks.push(task);
    }
  }

  getActiveTasks() {
    return [...this.activeTasks];
  }

  /**
   * Strictly resolves agent identity from explicit registered task metadata.
   * Never infers from heuristic substrings, commit text, or AI output.
   */
  resolveAgentIdentity({ branch = "", prNumber = null, taskId = null } = {}) {
    const normBranch = branch.replace(/^refs\/heads\//, "");
    const prNum = prNumber !== null && prNumber !== undefined ? Number(prNumber) : null;

    for (const task of this.activeTasks) {
      if (taskId && task.taskId === taskId) {
        return { agentName: task.agent, matchedTask: task, task, isRegistered: true };
      }
      if (prNum !== null && task.pullRequest === prNum) {
        return { agentName: task.agent, matchedTask: task, task, isRegistered: true };
      }
      if (normBranch && task.branch === normBranch) {
        return { agentName: task.agent, matchedTask: task, task, isRegistered: true };
      }
    }

    return { agentName: "UNKNOWN", matchedTask: null, task: null, isRegistered: false };
  }

  /**
   * Scans untrusted input and records injection findings.
   */
  _checkUntrustedInputs(inputs = []) {
    const findings = [];
    for (const { name, content } of inputs) {
      const scan = scanForPromptInjection(content);
      if (scan.hasInjection) {
        findings.push({
          type: "INJECTION_ATTEMPT_IGNORED",
          severity: "HIGH",
          location: name,
          message: `Detected and ignored prompt injection attempt in ${name}: [${scan.patterns.join(", ")}]`,
          action: "Content treated strictly as passive data. No policy or scope altered.",
        });
      }
    }
    return findings;
  }

  /**
   * Evaluates change and scope for a set of files modified by an agent.
   */
  evaluateScope(files = [], agentName = "UNKNOWN") {
    // If no files are present to evaluate
    if (files.length === 0) {
      return {
        overallScope: SCOPE_CLASSIFICATIONS.UNKNOWN,
        classifications: [],
        requiresHumanReview: true,
        summary: "No observable modified files present for scope evaluation",
      };
    }

    const classifications = [];
    let hasOutOfScope = false;
    let hasConflict = false;
    let hasUnknown = false;
    let requiresHumanReview = false;

    // If agent is unknown or not registered
    if (!agentName || agentName === "UNKNOWN" || !this.policy.agents?.[agentName]) {
      return {
        overallScope: SCOPE_CLASSIFICATIONS.UNKNOWN,
        classifications: files.map((f) => ({
          file: normalizePath(f),
          classification: SCOPE_CLASSIFICATIONS.UNKNOWN,
          reason: `Agent '${agentName}' is not registered with explicit task metadata in policy`,
          requiresHumanReview: true,
        })),
        requiresHumanReview: true,
        summary: `Unregistered agent '${agentName}' submitted changes; explicit task metadata required`,
      };
    }

    for (const f of files) {
      const res = classifyFileForAgent(f, agentName, this.policy, this.activeTasks);
      classifications.push(res);

      if (res.classification === SCOPE_CLASSIFICATIONS.OUT_OF_SCOPE) {
        hasOutOfScope = true;
        requiresHumanReview = true;
      } else if (res.classification === SCOPE_CLASSIFICATIONS.OWNERSHIP_CONFLICT) {
        hasConflict = true;
        requiresHumanReview = true;
      } else if (res.classification === SCOPE_CLASSIFICATIONS.UNKNOWN) {
        hasUnknown = true;
        requiresHumanReview = true;
      }
    }

    let overallScope = SCOPE_CLASSIFICATIONS.IN_SCOPE;
    if (hasConflict) overallScope = SCOPE_CLASSIFICATIONS.OWNERSHIP_CONFLICT;
    else if (hasOutOfScope) overallScope = SCOPE_CLASSIFICATIONS.OUT_OF_SCOPE;
    else if (hasUnknown) overallScope = SCOPE_CLASSIFICATIONS.UNKNOWN;

    return {
      overallScope,
      classifications,
      requiresHumanReview,
      summary: `${classifications.filter((c) => c.classification === SCOPE_CLASSIFICATIONS.IN_SCOPE).length}/${files.length} files in scope`,
    };
  }

  /**
   * Detects cross-agent conflicts (Codex vs Gemini modifying the same files or overlapping lines).
   */
  detectCrossAgentConflicts(currentAgent, currentFiles, currentDiff = "", prNumberOrCommit = "") {
    const conflicts = [];
    const normCurrentFiles = currentFiles.map(normalizePath);
    const currentHunks = parseDiffHunks(currentDiff);

    for (const [otherAgent, otherWork] of this.activeAgentWork.entries()) {
      if (otherAgent.toLowerCase() === currentAgent.toLowerCase()) continue;
      // A PR reassigned from UNKNOWN to its registered agent is the same work,
      // not two agents editing overlapping branches.
      if (otherWork.reference === prNumberOrCommit) continue;

      const otherFiles = (otherWork.files || []).map(normalizePath);
      const overlappingFiles = normCurrentFiles.filter((f) => otherFiles.includes(f));

      for (const file of overlappingFiles) {
        const hA = currentHunks.find((h) => h.file === file)?.hunks || [];
        const hB = (otherWork.hunks || []).find((h) => h.file === file)?.hunks || [];

        let lineOverlapInfo = null;
        if (hA.length > 0 && hB.length > 0) {
          lineOverlapInfo = checkHunkOverlap(hA, hB);
        }

        conflicts.push({
          conflictStatus: VERIFICATION_STATES.CONFLICT,
          file,
          agentA: currentAgent,
          agentB: otherAgent,
          referenceA: prNumberOrCommit,
          referenceB: otherWork.reference || otherWork.pr || otherWork.branch,
          overlappingLines: lineOverlapInfo?.overlaps ? lineOverlapInfo.range : "Same file modified (full diff lines undetermined)",
          hasDirectLineOverlap: Boolean(lineOverlapInfo?.overlaps),
          message: `Cross-agent conflict detected on '${file}' between ${currentAgent} and ${otherAgent}`,
          requiresHumanReview: true,
        });
      }
    }

    // Replace any stale identity for this same PR before registering it.
    for (const [otherAgent, otherWork] of this.activeAgentWork.entries()) {
      if (otherAgent !== currentAgent && otherWork.reference === prNumberOrCommit) {
        this.activeAgentWork.delete(otherAgent);
      }
    }
    // Register current work in activeAgentWork
    this.activeAgentWork.set(currentAgent, {
      reference: prNumberOrCommit,
      files: normCurrentFiles,
      hunks: currentHunks,
      updatedAt: new Date().toISOString(),
    });

    return conflicts;
  }

  /**
   * Evaluates GitHub CI/CD check-runs against policy requirements.
   * NEVER runs tests itself. If check did not run, marks NOT_RUN and UNVERIFIED.
   */
  evaluateChecks(checkRuns = []) {
    const requiredChecks = this.policy.requiredChecks || [];
    const checkMap = new Map();

    for (const cr of checkRuns) {
      checkMap.set(cr.name, cr);
    }

    const evaluated = [];
    let allPassed = true;
    let anyFailed = false;
    let anyMissing = false;

    for (const reqName of requiredChecks) {
      const run = checkMap.get(reqName);
      if (!run) {
        evaluated.push({
          name: reqName,
          status: CHECK_STATUSES.NOT_RUN,
          conclusion: null,
          mandatory: true,
          detail: "Check did not execute or is missing from GitHub checks",
        });
        anyMissing = true;
        allPassed = false;
      } else {
        const conclusion = run.conclusion || run.status;
        const passed = conclusion === "success";
        if (!passed) {
          allPassed = false;
          anyFailed = true;
        }
        evaluated.push({
          name: reqName,
          status: run.status || "completed",
          conclusion,
          mandatory: true,
          passed,
          detail: run.output?.title || run.output?.summary || `Check concluded with '${conclusion}'`,
        });
      }
    }

    let overallState = VERIFICATION_STATES.VERIFIED;
    if (anyFailed) {
      overallState = VERIFICATION_STATES.FAILED;
    } else if (anyMissing) {
      overallState = VERIFICATION_STATES.UNVERIFIED;
    }

    return {
      overallState,
      allPassed,
      anyFailed,
      anyMissing,
      checks: evaluated,
    };
  }

  /**
   * Evaluates agent claims against empirical observations and policy.
   */
  verifyClaims(claims = [], checkEvaluation, scopeEvaluation, specialConditions = this.policy.specialConditions) {
    const verdicts = [];

    for (const rawClaim of claims) {
      const claimText = typeof rawClaim === "string" ? rawClaim : rawClaim.claim || "";
      const claimLower = claimText.toLowerCase();

      // Claim: "Tests passed" / "CI passed"
      if (claimLower.includes("test") && (claimLower.includes("pass") || claimLower.includes("succeed"))) {
        const tbCheck = checkEvaluation.checks.find((c) => c.name === "test-and-build");
        if (!tbCheck || tbCheck.status === CHECK_STATUSES.NOT_RUN) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.UNVERIFIED,
            reason: "Claim cannot be verified: 'test-and-build' check did not execute on GitHub",
          });
        } else if (tbCheck.passed) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.VERIFIED,
            reason: "'test-and-build' check passed with conclusion 'success'",
          });
        } else {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.FAILED,
            isFalseClaim: true,
            reason: `False claim: 'test-and-build' check failed with conclusion '${tbCheck.conclusion}'`,
          });
        }
        continue;
      }

      // Claim: "Build succeeded"
      if (claimLower.includes("build") && (claimLower.includes("succeed") || claimLower.includes("pass"))) {
        const tbCheck = checkEvaluation.checks.find((c) => c.name === "test-and-build");
        if (!tbCheck || tbCheck.status === CHECK_STATUSES.NOT_RUN) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.UNVERIFIED,
            reason: "Claim unverified: build check did not execute on GitHub",
          });
        } else if (tbCheck.passed) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.VERIFIED,
            reason: "Build completed successfully under 'test-and-build'",
          });
        } else {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.FAILED,
            isFalseClaim: true,
            reason: `False claim: build failed under 'test-and-build' (${tbCheck.conclusion})`,
          });
        }
        continue;
      }

      // Claim: "SAST passed" / "Security finding resolved"
      if (claimLower.includes("sast") || claimLower.includes("security")) {
        const codeQl = checkEvaluation.checks.find((c) => c.name === "CodeQL JavaScript/TypeScript");
        const audit = checkEvaluation.checks.find((c) => c.name === "Production dependency audit");

        if ((!codeQl || codeQl.status === CHECK_STATUSES.NOT_RUN) && (!audit || audit.status === CHECK_STATUSES.NOT_RUN)) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.UNVERIFIED,
            reason: "Security checks have not executed on GitHub",
          });
        } else if (codeQl?.passed && audit?.passed) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.VERIFIED,
            reason: "CodeQL and Production dependency audit checks passed",
          });
        } else {
          const failReasons = [];
          if (codeQl && !codeQl.passed) failReasons.push(`CodeQL: ${codeQl.conclusion}`);
          if (audit && !audit.passed) failReasons.push(`Dependency audit: ${audit.conclusion}`);
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.FAILED,
            isFalseClaim: true,
            reason: `False claim: Security checks failed: [${failReasons.join(", ")}]`,
          });
        }
        continue;
      }

      // Claim: "MVP ready" / "MVP release"
      if (claimLower.includes("mvp") && (claimLower.includes("ready") || claimLower.includes("release"))) {
        if (!specialConditions?.mvpReleaseApproved) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.BLOCKED,
            reason: "MVP release is explicitly unapproved in Picksy policy (mvpReleaseApproved: false)",
          });
        } else {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.VERIFIED,
            reason: "MVP release is approved in policy",
          });
        }
        continue;
      }

      // Claim: "Gate 3"
      if (claimLower.includes("gate 3") || claimLower.includes("gate3")) {
        if (specialConditions?.gate3Status !== "AUTHORIZED") {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.BLOCKED,
            reason: `Gate 3 is not authorized: status is '${specialConditions?.gate3Status}'`,
          });
        } else {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.VERIFIED,
            reason: "Gate 3 is authorized",
          });
        }
        continue;
      }

      // Claim: "Task complete"
      if (claimLower.includes("task complete") || claimLower.includes("task finished")) {
        const isScopeOk = scopeEvaluation?.overallScope === SCOPE_CLASSIFICATIONS.IN_SCOPE;
        const areChecksOk = checkEvaluation?.allPassed;

        if (isScopeOk && areChecksOk) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.VERIFIED,
            reason: "All modified files are in scope and all mandatory GitHub checks passed",
          });
        } else if (!areChecksOk && checkEvaluation?.anyMissing) {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.UNVERIFIED,
            reason: "Task completion unverified: mandatory GitHub checks have not executed",
          });
        } else {
          verdicts.push({
            claim: claimText,
            verdict: VERIFICATION_STATES.FAILED,
            reason: "Task completion failed: scope violations or check failures present",
          });
        }
        continue;
      }

      // Generic claim
      verdicts.push({
        claim: claimText,
        verdict: VERIFICATION_STATES.UNVERIFIED,
        reason: "Unrecognized claim pattern requires human review",
      });
    }

    return verdicts;
  }

  /**
   * Evaluates a pull request or commit comprehensively.
   */
  verifyPullRequest({
    prNumber,
    headSha,
    agentName,
    branch = "",
    taskId = null,
    files = [],
    diff = "",
    checkRuns = [],
    title = "",
    description = "",
    claims = [],
    apiError = null,
  }) {
    // 1. Resolve agent identity strictly from registered task metadata if not explicitly provided
    let resolvedAgent = agentName;
    const idRes = this.resolveAgentIdentity({ branch, prNumber, taskId });
    const matchedTask = idRes.matchedTask;
    if (!resolvedAgent || resolvedAgent === "UNKNOWN") {
      resolvedAgent = idRes.agentName;
    }

    // 2. Check untrusted text for prompt injections
    const injectionFindings = this._checkUntrustedInputs([
      { name: `PR #${prNumber} Title`, content: title },
      { name: `PR #${prNumber} Description`, content: description },
      { name: `PR #${prNumber} Diff`, content: diff },
    ]);

    if (apiError) {
      injectionFindings.push({
        type: "GITHUB_API_ERROR",
        severity: "HIGH",
        location: "GitHub REST Client",
        message: String(apiError),
        action: "Fails closed into UNVERIFIED; human review required.",
      });
    }

    if (files.length === 0) {
      injectionFindings.push({
        type: "EMPTY_FILE_LIST",
        severity: "HIGH",
        location: `PR #${prNumber}`,
        message: "PR has no observable modified files (or fetch failed). Cannot verify empty change.",
        action: "Fails closed into UNVERIFIED; human review required.",
      });
    }

    // 3. Evaluate Scope
    const scopeEval = this.evaluateScope(files, resolvedAgent);

    // 4. Detect Cross-Agent Conflicts
    const conflicts = this.detectCrossAgentConflicts(resolvedAgent, files, diff, `PR #${prNumber}`);

    // 5. Evaluate Checks
    const checkEval = this.evaluateChecks(checkRuns);

    // 6. Verify Claims
    const claimVerdicts = this.verifyClaims(claims, checkEval, scopeEval);

    // 7. Synthesize Final Verification State
    let finalState = VERIFICATION_STATES.VERIFIED;
    let requiresHumanReview = false;

    if (apiError || files.length === 0) {
      finalState = VERIFICATION_STATES.UNVERIFIED;
      requiresHumanReview = true;
    } else if (conflicts.length > 0) {
      finalState = VERIFICATION_STATES.CONFLICT;
      requiresHumanReview = true;
    } else if (scopeEval.overallScope === SCOPE_CLASSIFICATIONS.OUT_OF_SCOPE || checkEval.anyFailed) {
      finalState = VERIFICATION_STATES.FAILED;
      requiresHumanReview = true;
    } else if (scopeEval.overallScope === SCOPE_CLASSIFICATIONS.UNKNOWN) {
      finalState = VERIFICATION_STATES.UNVERIFIED;
      requiresHumanReview = true;
    } else if (checkEval.anyMissing) {
      finalState = VERIFICATION_STATES.UNVERIFIED;
    }

    if (injectionFindings.length > 0) {
      requiresHumanReview = true;
    }

    // Special condition checks (PR 7 / 8)
    const specialPRs = this.policy.specialConditions?.specialPullRequests || {};
    const specialEntry = specialPRs[String(prNumber)];
    const specialNotes = specialEntry ? `Tracked special security PR: ${specialEntry.purpose}` : null;

    const result = {
      prNumber,
      headSha,
      branch,
      agentName: resolvedAgent,
      matchedTask,
      state: finalState,
      requiresHumanReview,
      scope: scopeEval,
      checks: checkEval,
      conflicts,
      claims: claimVerdicts,
      securityFindings: injectionFindings,
      specialNotes,
      reason: apiError ? String(apiError) : (injectionFindings.length > 0 ? injectionFindings[0].message : null),
      verifiedAt: new Date().toISOString(),
    };

    // Cache by SHA so new commit supersedes prior state
    this.verificationCache.set(`pr-${prNumber}`, result);
    this.verificationCache.set(headSha, result);
    if (resolvedAgent && resolvedAgent !== "UNKNOWN") {
      this.verificationCache.set(resolvedAgent, result);
    }

    return result;
  }

  /**
   * Evaluates main-branch push event.
   */
  evaluateMainBranchPush({ branch, forced, commits = [], pusher }) {
    if (branch !== "main") {
      return { isProtected: false, branch };
    }

    const isForced = Boolean(forced);
    const findings = [];
    let requiresHumanReview = false;
    let classification = "EXPECTED_MERGE";

    if (isForced) {
      classification = "FORCE_PUSH_DETECTED";
      requiresHumanReview = true;
      findings.push({
        severity: "CRITICAL",
        message: `Force-push detected on protected branch 'main' by '${pusher}'`,
      });
    }

    // Inspect commit messages to determine if this is a PR merge
    const hasMergeCommit = commits.some(
      (c) => c.message && (c.message.startsWith("Merge pull request #") || c.message.startsWith("Merge branch"))
    );

    if (!hasMergeCommit && commits.length > 0 && !isForced) {
      classification = "UNEXPECTED_DIRECT_CHANGE";
      requiresHumanReview = true;
      findings.push({
        severity: "HIGH",
        message: `Direct commit to protected branch 'main' without merge commit detected: '${commits[0]?.id}' by '${pusher}'`,
      });
    }

    return {
      isProtected: true,
      branch: "main",
      classification,
      requiresHumanReview,
      findings,
      pusher,
      commitsCount: commits.length,
      evaluatedAt: new Date().toISOString(),
    };
  }

  getVerification(key) {
    return this.verificationCache.get(key) || null;
  }
}

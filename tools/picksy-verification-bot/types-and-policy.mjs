import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const VERIFICATION_STATES = Object.freeze({
  VERIFIED: "VERIFIED",
  PARTIALLY_VERIFIED: "PARTIALLY_VERIFIED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  CONFLICT: "CONFLICT",
  UNVERIFIED: "UNVERIFIED",
});

export const SCOPE_CLASSIFICATIONS = Object.freeze({
  IN_SCOPE: "IN_SCOPE",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
  OWNERSHIP_CONFLICT: "OWNERSHIP_CONFLICT",
  UNKNOWN: "UNKNOWN",
});

export const CHECK_STATUSES = Object.freeze({
  SUCCESS: "success",
  FAILURE: "failure",
  NEUTRAL: "neutral",
  CANCELLED: "cancelled",
  TIMED_OUT: "timed_out",
  ACTION_REQUIRED: "action_required",
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  NOT_RUN: "not_run",
});

/**
 * Normalizes a file path to POSIX style (forward slashes, no leading/trailing slashes).
 */
export function normalizePath(filePath) {
  if (!filePath || typeof filePath !== "string") return "";
  return filePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

/**
 * Matches a file path against a glob/pattern.
 * Supports:
 * - Exact path match ("package.json")
 * - Directory prefix ("tools/**", "src/lib/**")
 * - Wildcard extension ("*.mjs")
 */
export function matchPathPattern(filePath, pattern) {
  const normFile = normalizePath(filePath);
  const normPattern = normalizePath(pattern);

  if (normFile === normPattern) return true;

  if (normPattern.endsWith("/**")) {
    const prefix = normPattern.slice(0, -3);
    return normFile === prefix || normFile.startsWith(`${prefix}/`);
  }

  if (normPattern.includes("*")) {
    const escaped = normPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const regexPattern = "^" + escaped
      .replace(/\*\*/g, "__DBL_STAR__")
      .replace(/\*/g, "[^/]*")
      .replace(/__DBL_STAR__/g, ".*") + "$";
    return new RegExp(regexPattern).test(normFile);
  }

  return normFile.startsWith(`${normPattern}/`);
}

/**
 * Loads and parses the trusted policy.json.
 */
export function loadPolicy(customPath) {
  const filePath = customPath || path.resolve(__dirname, "policy.json");
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed.project || !parsed.requiredChecks || !Array.isArray(parsed.requiredChecks)) {
    throw new Error("Invalid policy schema: missing requiredChecks or project");
  }

  return parsed;
}

/**
 * Validates whether a file is in-scope, out-of-scope, or in ownership conflict for a given agent.
 */
export function classifyFileForAgent(file, agentName, policy, activeTasks = []) {
  const normFile = normalizePath(file);
  const agentConfig = policy.agents?.[agentName];

  // If agent is not registered in policy
  if (!agentConfig) {
    return {
      file: normFile,
      classification: SCOPE_CLASSIFICATIONS.UNKNOWN,
      reason: `Agent '${agentName}' is not registered in policy`,
      requiresHumanReview: true,
    };
  }

  // Check prohibited areas for this agent
  if (Array.isArray(agentConfig.prohibitedAreas)) {
    for (const prohibited of agentConfig.prohibitedAreas) {
      if (matchPathPattern(normFile, prohibited)) {
        return {
          file: normFile,
          classification: SCOPE_CLASSIFICATIONS.OUT_OF_SCOPE,
          reason: `File '${normFile}' is in prohibited area '${prohibited}' for agent '${agentName}'`,
          requiresHumanReview: true,
        };
      }
    }
  }

  // Check if this file belongs to an active task assigned to ANOTHER agent
  const otherAgentTasks = activeTasks.filter(
    (t) => t.agent && t.agent.toLowerCase() !== agentName.toLowerCase() && t.status !== "COMPLETED"
  );

  for (const task of otherAgentTasks) {
    const isExpected = (task.expectedFiles || []).some((pat) => matchPathPattern(normFile, pat));
    if (isExpected) {
      return {
        file: normFile,
        classification: SCOPE_CLASSIFICATIONS.OWNERSHIP_CONFLICT,
        reason: `File '${normFile}' is claimed by active task '${task.taskId}' owned by '${task.agent}'`,
        conflictingAgent: task.agent,
        conflictingTask: task.taskId,
        requiresHumanReview: true,
      };
    }
  }

  // Check if file is expected in this agent's current task
  const agentTasks = activeTasks.filter(
    (t) => t.agent && t.agent.toLowerCase() === agentName.toLowerCase()
  );

  const matchedInCurrentTask = agentTasks.some((task) =>
    (task.expectedFiles || []).some((pat) => matchPathPattern(normFile, pat))
  );

  if (matchedInCurrentTask) {
    return {
      file: normFile,
      classification: SCOPE_CLASSIFICATIONS.IN_SCOPE,
      reason: `File '${normFile}' matches expected pattern in active task for '${agentName}'`,
      requiresHumanReview: false,
    };
  }

  // Check if file is within general allowed areas for this agent
  const matchedGeneral = (agentConfig.allowedAreas || []).some((pat) =>
    matchPathPattern(normFile, pat)
  );

  if (matchedGeneral) {
    return {
      file: normFile,
      classification: SCOPE_CLASSIFICATIONS.IN_SCOPE,
      reason: `File '${normFile}' is within allowed areas for agent '${agentName}'`,
      requiresHumanReview: false,
    };
  }

  // Otherwise, file is out of scope / unknown
  return {
    file: normFile,
    classification: SCOPE_CLASSIFICATIONS.UNKNOWN,
    reason: `File '${normFile}' is not declared in allowed areas or active tasks for '${agentName}'`,
    requiresHumanReview: true,
  };
}

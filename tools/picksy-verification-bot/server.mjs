import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { URL } from "node:url";
import { AuditLog } from "./audit-log.mjs";
import { formatAsciiReport, buildMobileStatusSnapshot } from "./formatter.mjs";
import { GitHubClient } from "./github-client.mjs";
import { loadPolicy, VERIFICATION_STATES } from "./types-and-policy.mjs";
import { VerificationEngine } from "./verification-engine.mjs";
import { classifyWebhookEvent, DeliveryTracker, verifyGitHubSignature } from "./webhook.mjs";

const MAX_BODY_BYTES = 2_000_000; // 2 MB body cap

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > MAX_BODY_BYTES) {
      const err = new Error("Request body exceeded maximum limit");
      err.statusCode = 413;
      return reject(err);
    }
    const chunks = [];
    let size = 0;
    let exceeded = false;
    req.on("data", (chunk) => {
      if (exceeded) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        exceeded = true;
        const err = new Error("Request body exceeded maximum limit");
        err.statusCode = 413;
        reject(err);
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      if (!exceeded) resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

export function createVerificationBotServer({
  policy = loadPolicy(),
  webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "test-verification-secret",
  githubClient = new GitHubClient(),
  port = 3001,
} = {}) {
  const engine = new VerificationEngine(policy);
  const auditLog = new AuditLog();
  const deliveryTracker = new DeliveryTracker();
  let currentConflicts = [];
  let currentMainBranchEvents = [];

  const server = createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    try {
      // 1. Health check
      if (pathname === "/healthz" && method === "GET") {
        return sendJson(res, 200, {
          status: "ok",
          service: "picksy-verification-bot",
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Webhook receiver
      if (pathname === "/webhooks/github" && method === "POST") {
        let rawBody;
        try {
          rawBody = await readRawBody(req);
        } catch {
          req.resume();
          return sendJson(res, 413, { error: "Payload Too Large: body exceeded 2MB limit" });
        }

        const sigHeader = req.headers["x-hub-signature-256"];
        const deliveryId = req.headers["x-github-delivery"];
        const eventType = req.headers["x-github-event"];

        // Verify HMAC signature
        try {
          verifyGitHubSignature(rawBody, sigHeader, webhookSecret);
        } catch (authErr) {
          auditLog.record({
            eventType: "WEBHOOK_AUTH_FAILED",
            githubFacts: { error: authErr.message, deliveryId, eventType },
            requiresHumanReview: true,
          });
          return sendJson(res, authErr.status || 401, { error: authErr.message });
        }

        // Duplicate replay protection
        if (deliveryId && deliveryTracker.isDuplicate(deliveryId)) {
          return sendJson(res, 200, {
            status: "duplicate",
            message: `Delivery ${deliveryId} already processed`,
          });
        }

        // Parse JSON
        let payload;
        try {
          payload = JSON.parse(rawBody.toString("utf8"));
        } catch {
          return sendJson(res, 400, { error: "Invalid JSON payload" });
        }

        const classified = classifyWebhookEvent(eventType, payload);

        // Process Event
        let responseData = { status: "processed", eventType };

        if (classified.type === "pull_request") {
          // Strictly resolve agent identity from registered task metadata
          const branch = classified.headRef || "";
          const idRes = engine.resolveAgentIdentity({
            branch,
            prNumber: classified.number,
          });
          const agentName = idRes.agentName; // "Codex", "Gemini", or "UNKNOWN"

          // Fetch files & checks via client if not in payload
          let files = (payload.files || []).map((f) => f.filename || f);
          let apiError = null;
          if (files.length === 0 && githubClient) {
            const filesRes = await githubClient.getPullRequestFiles(classified.number);
            if (filesRes.ok && Array.isArray(filesRes.data)) {
              files = filesRes.data.map((f) => f.filename);
            } else if (!filesRes.ok) {
              apiError = filesRes.error || `Failed to fetch PR files: status ${filesRes.status}`;
            }
          }

          let checkRuns = [];
          if (githubClient && classified.headSha) {
            const checksRes = await githubClient.getCommitCheckRuns(classified.headSha);
            if (checksRes.ok && Array.isArray(checksRes.data?.check_runs)) {
              checkRuns = checksRes.data.check_runs;
            } else if (!checksRes.ok && !apiError) {
              apiError = checksRes.error || `Failed to fetch check runs: status ${checksRes.status}`;
            }
          }

          const verification = engine.verifyPullRequest({
            prNumber: classified.number,
            headSha: classified.headSha,
            agentName,
            branch,
            files,
            diff: payload.diff || "",
            checkRuns,
            title: classified.title,
            description: classified.body,
            apiError,
          });

          currentConflicts = verification.conflicts;
          auditLog.record({
            eventType: "PULL_REQUEST_VERIFIED",
            agent: agentName,
            reference: `PR #${classified.number}`,
            githubFacts: {
              prNumber: classified.number,
              headSha: classified.headSha,
              files,
              checksCount: checkRuns.length,
            },
            botConclusions: verification,
            requiresHumanReview: verification.requiresHumanReview,
          });

          responseData = { status: "verified", verification };
        } else if (classified.type === "push") {
          const pushEval = engine.evaluateMainBranchPush({
            branch: classified.branch,
            forced: classified.forced,
            commits: classified.commits,
            headCommit: classified.headCommit,
            pusher: classified.pusher,
          });

          if (pushEval.isProtected) {
            currentMainBranchEvents.push(pushEval);
          }

          auditLog.record({
            eventType: "PUSH_EVALUATED",
            agent: classified.pusher,
            reference: classified.branch,
            githubFacts: {
              branch: classified.branch,
              forced: classified.forced,
              commitsCount: classified.commits.length,
            },
            botConclusions: pushEval,
            requiresHumanReview: pushEval.requiresHumanReview,
          });

          responseData = { status: "evaluated", pushEvaluation: pushEval };
        }

        return sendJson(res, 200, responseData);
      }

      // 3. Status snapshot (mobile friendly)
      if (pathname === "/api/v1/status" && method === "GET") {
        const overall = currentConflicts.length > 0 ? VERIFICATION_STATES.CONFLICT : VERIFICATION_STATES.VERIFIED;
        const snapshot = buildMobileStatusSnapshot({
          overallStatus: overall,
          policy,
          engine,
          auditLog,
          activeConflicts: currentConflicts,
        });
        return sendJson(res, 200, snapshot);
      }

      // 4. Agents
      if (pathname === "/api/v1/agents" && method === "GET") {
        return sendJson(res, 200, {
          Codex: {
            policy: policy.agents?.Codex,
            activeWork: engine.activeAgentWork.get("Codex") || null,
          },
          Gemini: {
            policy: policy.agents?.Gemini,
            activeWork: engine.activeAgentWork.get("Gemini") || null,
          },
        });
      }

      // 5. Tasks (GET / POST)
      if (pathname === "/api/v1/tasks") {
        if (method === "GET") {
          return sendJson(res, 200, { tasks: engine.getActiveTasks() });
        }
        if (method === "POST") {
          const ownerTokenHeader = req.headers["x-owner-token"];
          const expectedToken = process.env.VERIFICATION_BOT_OWNER_TOKEN || policy.ownerToken || "test-owner-token-secret";

          let isAuthorized = false;
          if (ownerTokenHeader && typeof ownerTokenHeader === "string") {
            const bufA = Buffer.from(ownerTokenHeader);
            const bufB = Buffer.from(expectedToken);
            if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
              isAuthorized = true;
            }
          }

          if (!isAuthorized) {
            auditLog.record({
              eventType: "UNAUTHORIZED_TASK_REGISTRATION",
              agent: "UNKNOWN",
              reference: pathname,
              githubFacts: { remoteAddress: req.socket?.remoteAddress },
              botConclusions: { error: "Missing or invalid X-Owner-Token header" },
              requiresHumanReview: true,
            });
            return sendJson(res, 401, { error: "Unauthorized: Invalid or missing X-Owner-Token" });
          }

          const raw = await readRawBody(req);
          const task = JSON.parse(raw.toString("utf8"));
          engine.registerActiveTask(task);
          auditLog.record({
            eventType: "TASK_REGISTERED",
            agent: task.agent,
            reference: task.taskId,
            botConclusions: { task },
          });
          return sendJson(res, 201, { status: "registered", task });
        }
      }

      // 6. Conflicts
      if (pathname === "/api/v1/conflicts" && method === "GET") {
        return sendJson(res, 200, { conflicts: currentConflicts });
      }

      // 7. Human review escalations
      if (pathname === "/api/v1/human-review" && method === "GET") {
        return sendJson(res, 200, {
          escalations: auditLog.getEscalations(),
          conflicts: currentConflicts,
        });
      }

      // 8. Audit log
      if (pathname === "/api/v1/audit-log" && method === "GET") {
        return sendJson(res, 200, { auditLog: auditLog.getAll() });
      }

      // 9. Plaintext ASCII report
      if (pathname === "/api/v1/report" && method === "GET") {
        const report = formatAsciiReport({
          overallStatus: currentConflicts.length > 0 ? VERIFICATION_STATES.CONFLICT : VERIFICATION_STATES.VERIFIED,
          policy,
          codexVerification: engine.getVerification("Codex"),
          geminiVerification: engine.getVerification("Gemini"),
          crossAgentConflicts: currentConflicts,
          mainBranchEvents: currentMainBranchEvents,
          specialConditions: policy.specialConditions,
          escalations: auditLog.getEscalations(),
        });
        return sendText(res, 200, report);
      }

      // Fallthrough: 404
      return sendJson(res, 404, { error: `Not found: ${method} ${pathname}` });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  });

  return {
    server,
    engine,
    auditLog,
    deliveryTracker,
    start: () => new Promise((resolve) => server.listen(port, resolve)),
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith("server.mjs")) {
  const bot = createVerificationBotServer({ port: process.env.PORT || 3001 });
  bot.start().then(() => {
    console.log(`Picksy GitHub Verification Bot listening on http://localhost:${process.env.PORT || 3001}`);
  });
}

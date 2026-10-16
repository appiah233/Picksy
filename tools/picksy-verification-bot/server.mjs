import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { URL } from "node:url";
import { AuditLog } from "./audit-log.mjs";
import { formatAsciiReport, buildMobileStatusSnapshot, formatPrCommentMarkdown } from "./formatter.mjs";
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
  webhookSecret = process.env.GITHUB_WEBHOOK_SECRET,
  ownerToken = process.env.VERIFICATION_BOT_OWNER_TOKEN,
  githubClient = new GitHubClient(),
  port = 3001,
} = {}) {
  if (typeof webhookSecret !== "string" || !webhookSecret) {
    throw new Error("A webhook secret is required");
  }
  if (typeof ownerToken !== "string" || !ownerToken) {
    throw new Error("An owner token is required");
  }
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

        async function verifyAndCommentPullRequest(prNumber, initialHeadSha = null, initialBranch = "") {
          const prRes = githubClient ? await githubClient.getPullRequest(prNumber) : { ok: false, error: "GitHub client unavailable" };
          const pr = prRes.ok && prRes.data && typeof prRes.data === "object" ? prRes.data : null;
          let apiError = pr ? null : prRes.error || "Failed to fetch pull request";
          if (pr && (pr.number !== prNumber || !/^[a-f0-9]{40}$/i.test(pr.head?.sha || ""))) {
            apiError = "GitHub returned invalid pull request metadata";
          }
          if (pr && initialHeadSha && pr.head?.sha !== initialHeadSha) {
            apiError = "Webhook head SHA differs from current GitHub pull request";
          }
          const branch = pr?.head?.ref || initialBranch || "";
          const headSha = pr?.head?.sha || initialHeadSha || "";

          const idRes = engine.resolveAgentIdentity({
            branch,
            prNumber,
          });
          const agentName = idRes.agentName; // "Codex", "Gemini", or "UNKNOWN"

          let files = [];
          if (!apiError && githubClient) {
            const filesRes = await githubClient.getPullRequestFiles(prNumber);
            if (filesRes.ok && Array.isArray(filesRes.data) && !filesRes.hasNextPage &&
                filesRes.data.every((file) => typeof file?.filename === "string" && file.filename.length > 0) &&
                (!pr || !Number.isSafeInteger(pr.changed_files) || filesRes.data.length === pr.changed_files)) {
              files = filesRes.data.map((f) => f.filename);
            } else {
              apiError = filesRes.hasNextPage ? "PR file list is paginated; cannot verify incomplete scope" : filesRes.error || "Incomplete or invalid PR file list";
            }
          }

          let checkRuns = [];
          if (!apiError && githubClient && headSha) {
            const checksRes = await githubClient.getCommitCheckRuns(headSha);
            if (checksRes.ok && Array.isArray(checksRes.data?.check_runs) && !checksRes.hasNextPage &&
                (!Number.isSafeInteger(checksRes.data.total_count) ||
                  checksRes.data.check_runs.length === checksRes.data.total_count)) {
              checkRuns = checksRes.data.check_runs;
            } else {
              apiError = checksRes.hasNextPage ? "Check run list is paginated; cannot verify incomplete checks" : checksRes.error || `Failed to fetch check runs: status ${checksRes.status}`;
            }
          }

          const verification = engine.verifyPullRequest({
            prNumber,
            headSha,
            agentName,
            branch,
            files,
            diff: "",
            checkRuns,
            title: pr?.title || "",
            description: pr?.body || "",
            apiError,
          });

          currentConflicts = verification.conflicts;
          auditLog.record({
            eventType: "PULL_REQUEST_VERIFIED",
            agent: agentName,
            reference: `PR #${prNumber}`,
            githubFacts: {
              prNumber,
              headSha,
              files,
              checksCount: checkRuns.length,
            },
            botConclusions: verification,
            requiresHumanReview: verification.requiresHumanReview,
          });

          // Post or update sticky PR comment if enabled in policy
          let commentResult = null;
          if (githubClient && typeof githubClient.postOrUpdatePrComment === "function" && policy.features?.prComments !== false) {
            try {
              const reportText = formatAsciiReport({
                policy,
                codexVerification: engine.getVerification("Codex"),
                geminiVerification: engine.getVerification("Gemini"),
                crossAgentConflicts: currentConflicts,
                mainBranchEvents: currentMainBranchEvents,
                specialConditions: policy.specialConditions,
              });
              const commentBody = formatPrCommentMarkdown({
                verification,
                policy,
                reportText,
              });
              commentResult = await githubClient.postOrUpdatePrComment(prNumber, commentBody);
            } catch (commentErr) {
              console.warn(`[Server] Failed to post/update PR comment on PR #${prNumber}:`, commentErr.message);
            }
          }

          return { verification, commentResult };
        }

        // X-GitHub-Event is outside the signed body. Derive actionable event
        // kind from the authenticated payload, then require the header to agree.
        const isPullRequest = typeof payload?.pull_request === "object" && payload.pull_request !== null &&
          Number.isSafeInteger(payload.pull_request.number) && payload.pull_request.number > 0 &&
          /^[a-f0-9]{40}$/i.test(payload.pull_request.head?.sha || "");
        const isPush = typeof payload?.ref === "string" && payload.ref.startsWith("refs/heads/") &&
          Array.isArray(payload.commits);
        const isReview = isPullRequest && payload.review && typeof payload.review === "object";
        const isCheckRun = payload?.check_run && typeof payload.check_run === "object" &&
          typeof payload.check_run.name === "string";
        const isCheckSuite = payload?.check_suite && typeof payload.check_suite === "object";

        if ((isReview && eventType === "pull_request_review") ||
            (isCheckSuite && eventType === "check_suite")) {
          return sendJson(res, 200, { status: "ignored", eventType });
        }

        if (isPullRequest && isPush) {
          return sendJson(res, 400, { error: "Event header does not match signed payload" });
        }
        if (eventType === "pull_request" && !isPullRequest) {
          return sendJson(res, 400, { error: "Event header does not match signed payload" });
        }
        if (eventType === "push" && !isPush) {
          return sendJson(res, 400, { error: "Event header does not match signed payload" });
        }
        if (eventType === "check_run" && !isCheckRun) {
          return sendJson(res, 400, { error: "Event header does not match signed payload" });
        }
        if (!["pull_request", "push", "check_run"].includes(eventType)) {
          return sendJson(res, 400, { error: "Event header does not match signed payload" });
        }

        const classified = classifyWebhookEvent(eventType, payload);

        // Process Event
        let responseData = { status: "processed", eventType };

        if (classified.type === "pull_request") {
          const { verification, commentResult } = await verifyAndCommentPullRequest(
            classified.number,
            classified.headSha,
            classified.headRef
          );
          responseData = { status: verification.state.toLowerCase(), verification, commentResult };
        } else if (classified.type === "check_run") {
          const checkPrs = classified.pullRequests || [];
          const verifications = [];

          if (checkPrs.length > 0) {
            for (const cPr of checkPrs) {
              const vRes = await verifyAndCommentPullRequest(cPr.number, cPr.headSha || classified.headSha, cPr.headRef);
              verifications.push(vRes);
            }
          } else if (classified.headSha) {
            const cachedPr = engine.getVerification(classified.headSha);
            if (cachedPr && cachedPr.prNumber) {
              const vRes = await verifyAndCommentPullRequest(cachedPr.prNumber, classified.headSha, cachedPr.branch);
              verifications.push(vRes);
            }
          }

          auditLog.record({
            eventType: "CHECK_RUN_EVALUATED",
            reference: classified.headSha,
            githubFacts: {
              name: classified.name,
              status: classified.status,
              conclusion: classified.conclusion,
              headSha: classified.headSha,
              prsCount: checkPrs.length,
            },
            botConclusions: { checkName: classified.name, conclusion: classified.conclusion, verificationsCount: verifications.length },
            requiresHumanReview: verifications.some((v) => v.verification?.requiresHumanReview),
          });

          responseData = { status: "processed", checkRun: classified.name, verifications };
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
          const expectedToken = ownerToken;

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

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { loadConfig, loadPolicy, WEBHOOK_PATH } from "./config.mjs";
import { createGitLabClient } from "./gitlab.mjs";
import { reviewMergeRequest } from "./reviewer.mjs";
import { GuardianError } from "./util.mjs";
import { authenticateWebhook, classifyEvent, deliveryId } from "./webhook.mjs";

const MAX_BODY_BYTES = 1_000_000;
const MAX_ACTIVE_MERGE_REQUESTS = 10;
const MAX_REMEMBERED_DELIVERIES = 1000;

// Structured log line. Callers pass identifiers and fixed strings only: never payloads,
// headers, diffs, tokens or model output.
function writeLog(entry) {
  process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new GuardianError("body_too_large", "Request body too large."));
        request.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

export function createGuardian({
  config,
  policy,
  fetchImpl = fetch,
  now = Date.now,
  log = writeLog,
}) {
  const gitlab = createGitLabClient({
    baseUrl: config.gitlabUrl,
    projectId: config.projectId,
    token: config.gitlabToken,
    fetchImpl,
  });
  const deliveries = new Set();
  const reviews = new Map();

  // Reviews of one Merge Request run one at a time, so two deliveries can never both create a
  // note. A delivery that arrives while one is already waiting is coalesced: the waiting review
  // reads the latest head when it starts.
  function schedule(iid) {
    const current = reviews.get(iid);
    if (current?.waiting) return "coalesced";
    if (!current && reviews.size >= MAX_ACTIVE_MERGE_REQUESTS) return "overloaded";

    const entry = { waiting: true };
    entry.done = (current?.done ?? Promise.resolve()).then(async () => {
      entry.waiting = false;
      try {
        const outcome = await reviewMergeRequest({ iid, config, policy, gitlab, fetchImpl });
        log({ event: "review", iid, ...outcome });
      } catch (error) {
        log({
          event: "review_failed",
          iid,
          reason: error instanceof GuardianError ? error.message : "Unexpected error.",
        });
      } finally {
        if (reviews.get(iid) === entry) reviews.delete(iid);
      }
    });
    reviews.set(iid, entry);
    return "accepted";
  }

  function remember(id) {
    if (deliveries.has(id)) return false;
    deliveries.add(id);
    if (deliveries.size > MAX_REMEMBERED_DELIVERIES) {
      deliveries.delete(deliveries.values().next().value);
    }
    return true;
  }

  async function handle(request) {
    const { pathname } = new URL(request.url ?? "/", "http://guardian.invalid");
    if (pathname === "/healthz" && request.method === "GET") return [200, { status: "ok" }];
    if (pathname !== WEBHOOK_PATH) return [404, { error: "not_found" }];
    if (request.method !== "POST") return [405, { error: "method_not_allowed" }];

    let rawBody;
    try {
      rawBody = await readBody(request);
    } catch {
      return [413, { error: "body_too_large" }];
    }
    const { headers } = request;
    const nowSeconds = Math.floor(now() / 1000);
    if (!authenticateWebhook({ headers, rawBody, config, nowSeconds })) {
      log({ event: "rejected", reason: "unauthenticated" });
      return [401, { error: "unauthenticated" }];
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return [400, { error: "malformed" }];
    }
    const event = classifyEvent({ headers, payload, config });
    if (event.kind === "malformed") return [400, { error: "malformed" }];
    if (event.kind === "forbidden") {
      log({ event: "rejected", reason: "wrong_project" });
      return [403, { error: "wrong_project" }];
    }
    // Authentic but irrelevant deliveries are acknowledged so GitLab does not disable the hook.
    if (event.kind === "ignored") return [200, { status: "ignored", reason: event.reason }];

    const id = deliveryId(headers);
    if (id && !remember(id)) return [200, { status: "duplicate" }];
    const scheduled = schedule(event.iid);
    if (scheduled === "overloaded") {
      if (id) deliveries.delete(id);
      return [503, { error: "busy" }];
    }
    log({ event: "delivery", iid: event.iid, scheduled });
    return [202, { status: scheduled }];
  }

  const server = createServer((request, response) => {
    handle(request)
      .catch(() => [500, { error: "internal" }])
      .then(([status, body]) => {
        response.writeHead(status, {
          "content-type": "application/json",
          ...(status === 405 ? { allow: "POST" } : {}),
        });
        response.end(JSON.stringify(body));
      });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;

  return {
    server,
    // Resolves when no review is running or waiting.
    async idle() {
      while (reviews.size) await Promise.all([...reviews.values()].map((entry) => entry.done));
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const config = loadConfig();
    const policy = loadPolicy();
    const { server } = createGuardian({ config, policy });
    server.listen(config.port, config.host, () => {
      writeLog({ event: "listening", port: config.port, policy: policy.version });
    });
  } catch (error) {
    writeLog({
      event: "startup_failed",
      reason: error instanceof GuardianError ? error.message : "Unexpected error.",
    });
    process.exitCode = 1;
  }
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const TIMESTAMP_TOLERANCE_SECONDS = 300;
const REVIEW_ACTIONS = new Set(["open", "reopen", "update"]);
const PIPELINE_EVENTS = new Set(["success", "failed", "canceled", "skipped"]);
export const GUARDIAN_TARGET_BRANCH = "main";

function sameSecret(received, expected) {
  const digest = (value) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}

function validSignature(headers, rawBody, key, nowSeconds) {
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signatures = headers["webhook-signature"];
  if (typeof id !== "string" || typeof signatures !== "string") return false;
  if (!/^\d{1,12}$/.test(timestamp ?? "")) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.`).update(rawBody).digest();
  return signatures.split(" ").some((signature) => {
    if (!signature.startsWith("v1,")) return false;
    const received = Buffer.from(signature.slice(3), "base64");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

// Every configured mechanism must pass. The signing token also bounds replay by timestamp.
export function authenticateWebhook({ headers, rawBody, config, nowSeconds }) {
  if (!config.webhookSigningKey && !config.webhookSecret) return false;
  if (
    config.webhookSigningKey &&
    !validSignature(headers, rawBody, config.webhookSigningKey, nowSeconds)
  ) {
    return false;
  }
  if (config.webhookSecret) {
    const token = headers["x-gitlab-token"];
    if (typeof token !== "string" || !sameSecret(token, config.webhookSecret)) return false;
  }
  return true;
}

export function deliveryId(headers) {
  const id = headers["idempotency-key"] ?? headers["webhook-id"] ?? headers["x-gitlab-event-uuid"];
  return typeof id === "string" && id.length <= 200 ? id : undefined;
}

// Classifies an authenticated delivery. The payload only selects which Merge Request to look at;
// the project is fixed by configuration and everything reviewed is re-read from the GitLab API.
export function classifyEvent({ headers, payload, config }) {
  const eventName = headers["x-gitlab-event"];
  if (eventName === "Pipeline Hook") {
    const pipeline = payload?.object_attributes;
    const project = payload?.project;
    const mergeRequest =
      payload?.merge_request ??
      pipeline?.merge_request ??
      payload?.object_attributes?.merge_request;
    const iid = mergeRequest?.iid ?? pipeline?.merge_request_iid;
    if (
      payload === null ||
      typeof payload !== "object" ||
      payload.object_kind !== "pipeline" ||
      pipeline === null ||
      typeof pipeline !== "object" ||
      typeof project !== "object" ||
      project === null ||
      project.id !== config.projectId ||
      (config.projectPath && project.path_with_namespace !== config.projectPath) ||
      !Number.isSafeInteger(iid) ||
      iid <= 0
    ) {
      return { kind: "malformed" };
    }
    if (!PIPELINE_EVENTS.has(pipeline.status)) {
      return { kind: "ignored", reason: "pipeline_not_finished" };
    }
    return { kind: "review", iid };
  }
  if (eventName !== "Merge Request Hook") {
    return { kind: "ignored", reason: "unsupported_event" };
  }
  const attributes = payload?.object_attributes;
  if (
    payload === null ||
    typeof payload !== "object" ||
    payload.object_kind !== "merge_request" ||
    attributes === null ||
    typeof attributes !== "object" ||
    typeof payload.project !== "object" ||
    payload.project === null
  ) {
    return { kind: "malformed" };
  }
  if (
    payload.project.id !== config.projectId ||
    attributes.target_project_id !== config.projectId ||
    (config.projectPath && payload.project.path_with_namespace !== config.projectPath)
  ) {
    return { kind: "forbidden" };
  }
  const { iid, action, state } = attributes;
  if (!Number.isSafeInteger(iid) || iid <= 0 || typeof state !== "string") {
    return { kind: "malformed" };
  }
  if (!REVIEW_ACTIONS.has(action)) return { kind: "ignored", reason: "irrelevant_action" };
  if (state !== "opened") return { kind: "ignored", reason: "not_open" };
  if (attributes.target_branch !== GUARDIAN_TARGET_BRANCH) {
    return { kind: "ignored", reason: "wrong_target_branch" };
  }
  return { kind: "review", iid };
}

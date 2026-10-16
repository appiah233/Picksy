import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_REMEMBERED_DELIVERIES = 2000;

export class WebhookAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = "WebhookAuthError";
    this.status = status;
  }
}

/**
 * Validates GitHub webhook HMAC signature with constant-time comparison.
 * @param {Buffer} rawBody - Raw Buffer of request body
 * @param {string} signatureHeader - 'sha256=<hex>' header value
 * @param {string|Buffer} secret - Webhook secret string or buffer
 */
export function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) {
    throw new WebhookAuthError("Missing signature or webhook secret", 401);
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    throw new WebhookAuthError("Invalid signature format; expected sha256=<hex>", 400);
  }

  const expectedSignatureHex = parts[1];
  const computedSignatureHex = createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignatureHex, "hex");
  const computedBuffer = Buffer.from(computedSignatureHex, "hex");

  if (expectedBuffer.length !== computedBuffer.length) {
    throw new WebhookAuthError("Signature length mismatch", 401);
  }

  if (!timingSafeEqual(expectedBuffer, computedBuffer)) {
    throw new WebhookAuthError("Signature verification failed", 401);
  }

  return true;
}

/**
 * Bounded set to prevent webhook replay attacks based on X-GitHub-Delivery.
 */
export class DeliveryTracker {
  constructor(maxEntries = MAX_REMEMBERED_DELIVERIES) {
    this.maxEntries = maxEntries;
    this.deliveries = new Set();
  }

  isDuplicate(deliveryId) {
    if (!deliveryId) return false;
    if (this.deliveries.has(deliveryId)) {
      return true;
    }
    if (this.deliveries.size >= this.maxEntries) {
      // Evict oldest (first inserted) entry in Set
      const first = this.deliveries.values().next().value;
      if (first !== undefined) {
        this.deliveries.delete(first);
      }
    }
    this.deliveries.add(deliveryId);
    return false;
  }

  clear() {
    this.deliveries.clear();
  }
}

/**
 * Classifies an incoming webhook payload into a normalized structure.
 */
export function classifyWebhookEvent(eventType, payload) {
  switch (eventType) {
    case "pull_request":
      return {
        type: "pull_request",
        action: payload.action,
        number: payload.pull_request?.number,
        title: payload.pull_request?.title,
        body: payload.pull_request?.body || "",
        sender: payload.sender?.login,
        headSha: payload.pull_request?.head?.sha,
        headRef: payload.pull_request?.head?.ref,
        baseRef: payload.pull_request?.base?.ref,
        merged: Boolean(payload.pull_request?.merged),
        mergeCommitSha: payload.pull_request?.merge_commit_sha,
        raw: payload,
      };

    case "push":
      return {
        type: "push",
        ref: payload.ref,
        branch: payload.ref ? payload.ref.replace(/^refs\/heads\//, "") : "",
        before: payload.before,
        after: payload.after,
        forced: Boolean(payload.forced),
        deleted: Boolean(payload.deleted),
        created: Boolean(payload.created),
        pusher: payload.pusher?.name || payload.sender?.login,
        commits: (payload.commits || []).map((c) => ({
          id: c.id,
          message: c.message,
          author: c.author?.name || c.author?.email,
          added: c.added || [],
          modified: c.modified || [],
          removed: c.removed || [],
        })),
        headCommit: payload.head_commit,
        raw: payload,
      };

    case "check_run":
      return {
        type: "check_run",
        action: payload.action,
        name: payload.check_run?.name,
        status: payload.check_run?.status, // "queued", "in_progress", "completed"
        conclusion: payload.check_run?.conclusion, // "success", "failure", "neutral", "cancelled", "timed_out", "action_required"
        headSha: payload.check_run?.head_sha,
        raw: payload,
      };

    case "check_suite":
      return {
        type: "check_suite",
        action: payload.action,
        status: payload.check_suite?.status,
        conclusion: payload.check_suite?.conclusion,
        headSha: payload.check_suite?.head_sha,
        raw: payload,
      };

    case "pull_request_review":
      return {
        type: "pull_request_review",
        action: payload.action,
        number: payload.pull_request?.number,
        reviewState: payload.review?.state, // "approved", "changes_requested", "commented", "dismissed"
        body: payload.review?.body || "",
        sender: payload.sender?.login,
        raw: payload,
      };

    default:
      return {
        type: eventType,
        action: payload.action,
        raw: payload,
      };
  }
}

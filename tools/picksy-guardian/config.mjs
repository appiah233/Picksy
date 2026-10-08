import { readFileSync } from "node:fs";
import { GuardianError } from "./util.mjs";

export const DEFAULT_MODEL = "gpt-4.1-mini";
export const WEBHOOK_PATH = "/webhooks/gitlab";

// The policy is read from Guardian's own deployment, never from the revision under review.
export function loadPolicy(url = new URL("./policy.json", import.meta.url)) {
  return JSON.parse(readFileSync(url, "utf8"));
}

function positiveInteger(value) {
  return /^[1-9]\d{0,14}$/.test(value ?? "") ? Number(value) : undefined;
}

function gitlabOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    return undefined;
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

function signingKey(token) {
  if (!token) return undefined;
  const key = Buffer.from(token.replace(/^whsec_/, ""), "base64");
  return key.length >= 16 ? key : null;
}

// Reports configuration problems by variable name only; values are never echoed.
export function loadConfig(env = process.env) {
  const problems = [];
  const gitlabUrl = gitlabOrigin(env.GUARDIAN_GITLAB_URL || "https://gitlab.com");
  if (!gitlabUrl) problems.push("GUARDIAN_GITLAB_URL must be an https origin");

  const projectId = positiveInteger(env.GUARDIAN_GITLAB_PROJECT_ID);
  if (!projectId) problems.push("GUARDIAN_GITLAB_PROJECT_ID must be the numeric project ID");

  if (!env.GUARDIAN_GITLAB_TOKEN) problems.push("GUARDIAN_GITLAB_TOKEN is required");

  const webhookSigningKey = signingKey(env.GUARDIAN_WEBHOOK_SIGNING_TOKEN);
  if (webhookSigningKey === null) problems.push("GUARDIAN_WEBHOOK_SIGNING_TOKEN is not valid");
  const webhookSecret = env.GUARDIAN_WEBHOOK_SECRET || undefined;
  if (webhookSecret && webhookSecret.length < 32) {
    problems.push("GUARDIAN_WEBHOOK_SECRET must be at least 32 characters");
  }
  if (!webhookSigningKey && !webhookSecret) {
    problems.push("GUARDIAN_WEBHOOK_SIGNING_TOKEN or GUARDIAN_WEBHOOK_SECRET is required");
  }

  const port = env.PORT ? positiveInteger(env.PORT) : 8080;
  if (!port || port > 65535) problems.push("PORT must be a valid port");

  if (problems.length) {
    throw new GuardianError("config", `Invalid Guardian configuration: ${problems.join("; ")}.`);
  }

  return {
    gitlabUrl,
    projectId,
    projectPath: env.GUARDIAN_GITLAB_PROJECT_PATH || undefined,
    gitlabToken: env.GUARDIAN_GITLAB_TOKEN,
    webhookSigningKey: webhookSigningKey ?? undefined,
    webhookSecret,
    openaiApiKey: env.OPENAI_API_KEY || undefined,
    openaiModel: env.OPENAI_MODEL || DEFAULT_MODEL,
    host: env.GUARDIAN_HOST || "127.0.0.1",
    port,
  };
}

// Error whose message is authored by Guardian and is therefore safe to log.
export class GuardianError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function readBounded(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new GuardianError("response_too_large", "Response exceeded the size limit.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// `proven` formats are specific credential shapes; the assignment pattern is a heuristic.
const secretPatterns = [
  { kind: "private key", proven: true, pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    kind: "GitLab token",
    proven: true,
    pattern: /\bgl(?:pat|ptt|dt|rt|cbt|soat|ft|imt)-[A-Za-z0-9_.-]{20,}/,
  },
  {
    kind: "OpenAI API key",
    proven: true,
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/,
  },
  { kind: "GitHub token", proven: true, pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { kind: "AWS access key", proven: true, pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: "webhook signing token", proven: true, pattern: /\bwhsec_[A-Za-z0-9+/=]{20,}/ },
  {
    kind: "credential assignment",
    proven: false,
    pattern:
      /\b[A-Za-z0-9_]*(?:API_?KEY|SECRET|TOKEN|PASSWORD|PRIVATE_?KEY)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/i,
  },
];

const privateKeyBlock =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g;

export function findSecret(text) {
  return secretPatterns.find(({ pattern }) => pattern.test(text));
}

export function redactSecrets(value) {
  let text = String(value ?? "").replace(privateKeyBlock, "[REDACTED]");
  for (const { pattern } of secretPatterns) {
    text = text.replace(new RegExp(pattern.source, `${pattern.flags}g`), "[REDACTED]");
  }
  return text;
}

// Renders untrusted text as inert Markdown: one line, no control or bidi characters, and every
// character that could start markup, a link, a mention, a reference or HTML becomes an entity.
export function mdText(value, maxLength = 300) {
  const flat = redactSecrets(value)
    .replace(/\p{C}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cut = flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
  return cut.replace(/[^\p{L}\p{N} .,;'/?%…-]/gu, (char) => `&#${char.codePointAt(0)};`);
}

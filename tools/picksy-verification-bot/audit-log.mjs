const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9_\-.~+/]+=*/gi,
  /(?:github_pat|ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/gi,
  /(?:sk|pk)_(?:test|live)_[A-Za-z0-9]{20,}/gi,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/gi,
  /(?:token|secret|password|key)\s*[:=]\s*["']?([A-Za-z0-9_\-.~+/]{8,})["']?/gi,
];

/**
 * Sanitizes arbitrary objects or strings to prevent leaking credentials in logs.
 */
export function redactSecrets(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    let sanitized = data;
    for (const pat of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pat, (match) => {
        if (match.startsWith("Bearer ") || match.includes("=")) {
          return match.slice(0, 10) + "...[REDACTED]";
        }
        return "[REDACTED_SECRET]";
      });
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(redactSecrets);
  }

  if (typeof data === "object") {
    const copy = {};
    for (const [key, val] of Object.entries(data)) {
      if (/token|secret|password|key|auth/i.test(key) && typeof val === "string") {
        copy[key] = "[REDACTED]";
      } else {
        copy[key] = redactSecrets(val);
      }
    }
    return copy;
  }

  return data;
}

/**
 * Append-only structured audit logger for Picksy Verification Bot.
 */
export class AuditLog {
  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
    this.entries = [];
  }

  record({
    eventType,
    agent = "SYSTEM",
    reference = "",
    githubFacts = {},
    botConclusions = {},
    requiresHumanReview = false,
  }) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      eventType,
      agent,
      reference,
      githubFacts: redactSecrets(githubFacts),
      botConclusions: redactSecrets(botConclusions),
      requiresHumanReview: Boolean(requiresHumanReview),
    };

    if (this.entries.length >= this.maxEntries) {
      this.entries.shift(); // Bound memory footprint
    }

    this.entries.push(entry);
    return entry;
  }

  getAll() {
    return [...this.entries];
  }

  getEscalations() {
    return this.entries.filter((e) => e.requiresHumanReview);
  }

  getByAgent(agentName) {
    return this.entries.filter((e) => e.agent?.toLowerCase() === agentName.toLowerCase());
  }

  getByReference(ref) {
    return this.entries.filter((e) => e.reference === ref);
  }
}

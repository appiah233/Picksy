const DEFAULT_BASE_URL = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5_000_000; // 5 MB cap to prevent memory exhaustion

export class GitHubApiError extends Error {
  constructor(message, { status, endpoint, details } = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status || 500;
    this.endpoint = endpoint || "";
    this.details = details || null;
  }
}

/**
 * Read-only, fail-closed GitHub REST API Client.
 */
export class GitHubClient {
  constructor({
    owner = "appiah233",
    repo = "Picksy",
    token = process.env.GITHUB_TOKEN || "",
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = {}) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;

    // Validate origin
    this._validateBaseUrl(this.baseUrl);
  }

  _validateBaseUrl(urlStr) {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(`Unsupported protocol: ${parsed.protocol}`);
      }
      // In production, must be api.github.com; in testing, local addresses are allowed
      if (process.env.NODE_ENV === "production" && parsed.hostname !== "api.github.com") {
        throw new Error(`Invalid GitHub API host in production: ${parsed.hostname}`);
      }
    } catch (err) {
      throw new GitHubApiError(`Invalid GitHub API baseUrl '${urlStr}': ${err.message}`, {
        status: 400,
      });
    }
  }

  async _get(path, queryParams = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null) {
        url.searchParams.append(k, String(v));
      }
    }

    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Picksy-Verification-Bot/1.0.0",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url.toString(), {
        method: "GET", // Strictly GET only
        headers,
        redirect: "error", // Refuse redirects to prevent SSRF hopping
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errBody = null;
        try {
          errBody = await response.json();
        } catch {
          // ignore parsing error
        }
        return {
          ok: false,
          status: response.status,
          error: `GitHub API error ${response.status} on ${path}`,
          details: errBody,
        };
      }

      // Check content-length header
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
        return {
          ok: false,
          status: 413,
          error: `Response size exceeds limit of ${MAX_RESPONSE_BYTES} bytes`,
        };
      }

      const data = await response.json();
      return { ok: true, status: response.status, data };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err.name === "AbortError";
      return {
        ok: false,
        status: isAbort ? 504 : 500,
        error: isAbort ? `GitHub API request timed out after ${this.timeoutMs}ms` : err.message,
        details: err,
      };
    }
  }

  async getPullRequest(pullNumber) {
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}`);
  }

  async getPullRequestFiles(pullNumber) {
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/files`);
  }

  async getPullRequestCommits(pullNumber) {
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/commits`);
  }

  async getPullRequestReviews(pullNumber) {
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/reviews`);
  }

  async getCommitCheckRuns(ref) {
    return this._get(`/repos/${this.owner}/${this.repo}/commits/${ref}/check-runs`);
  }

  async getCommitStatus(ref) {
    return this._get(`/repos/${this.owner}/${this.repo}/commits/${ref}/status`);
  }

  async getCommit(sha) {
    return this._get(`/repos/${this.owner}/${this.repo}/commits/${sha}`);
  }

  async compareCommits(base, head) {
    return this._get(`/repos/${this.owner}/${this.repo}/compare/${base}...${head}`);
  }

  async getCodeScanningAlerts() {
    return this._get(`/repos/${this.owner}/${this.repo}/code-scanning/alerts`);
  }
}

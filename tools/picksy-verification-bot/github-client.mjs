const DEFAULT_BASE_URL = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5_000_000; // 5 MB cap to prevent memory exhaustion

function validPullNumber(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validSha(value) {
  return typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
}

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

  async _request(method, path, body = null, queryParams = {}) {
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

    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url.toString(), {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
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
      const hasNextPage = /<[^>]+>;\s*rel="next"/.test(response.headers.get("link") || "");
      return { ok: true, status: response.status, data, hasNextPage };
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

  async _get(path, queryParams = {}) {
    return this._request("GET", path, null, queryParams);
  }

  async getPullRequest(pullNumber) {
    if (!validPullNumber(pullNumber)) return { ok: false, status: 400, error: "Invalid pull request number" };
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}`);
  }

  async getPullRequestFiles(pullNumber) {
    if (!validPullNumber(pullNumber)) return { ok: false, status: 400, error: "Invalid pull request number" };
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/files`);
  }

  async getPullRequestCommits(pullNumber) {
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/commits`);
  }

  async getPullRequestReviews(pullNumber) {
    return this._get(`/repos/${this.owner}/${this.repo}/pulls/${pullNumber}/reviews`);
  }

  async getCommitCheckRuns(ref) {
    if (!validSha(ref)) return { ok: false, status: 400, error: "Invalid commit SHA" };
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

  async getCodeScanningAlerts(state = "open") {
    const query = state ? `?state=${encodeURIComponent(state)}` : "";
    return this._get(`/repos/${this.owner}/${this.repo}/code-scanning/alerts${query}`);
  }

  async getIssueComments(issueOrPrNumber, page = 1) {
    const num = Number(issueOrPrNumber);
    if (!validPullNumber(num)) return { ok: false, status: 400, error: "Invalid issue or PR number" };
    if (!Number.isSafeInteger(page) || page < 1 || page > 20) return { ok: false, status: 400, error: "Invalid comment page" };
    return this._request("GET", `/repos/${this.owner}/${this.repo}/issues/${num}/comments`, null, { per_page: 100, page });
  }

  async createIssueComment(issueOrPrNumber, body) {
    const num = Number(issueOrPrNumber);
    if (!validPullNumber(num)) return { ok: false, status: 400, error: "Invalid issue or PR number" };
    if (!body || typeof body !== "string") return { ok: false, status: 400, error: "Comment body must be a non-empty string" };
    return this._request("POST", `/repos/${this.owner}/${this.repo}/issues/${num}/comments`, { body });
  }

  async updateIssueComment(commentId, body) {
    const numId = Number(commentId);
    if (!Number.isSafeInteger(numId) || numId <= 0) return { ok: false, status: 400, error: "Invalid comment ID" };
    if (!body || typeof body !== "string") return { ok: false, status: 400, error: "Comment body must be a non-empty string" };
    return this._request("PATCH", `/repos/${this.owner}/${this.repo}/issues/comments/${numId}`, { body });
  }

  async postOrUpdatePrComment(issueOrPrNumber, commentBody, marker = "<!-- picksy-verification-bot -->") {
    try {
      const existingRes = await this.getIssueComments(issueOrPrNumber);
      if (!existingRes.ok) {
        console.warn(`[GitHubClient] Unable to fetch comments for PR #${issueOrPrNumber}: ${existingRes.error}`);
        return { ok: false, error: existingRes.error, status: existingRes.status };
      }

      const comments = Array.isArray(existingRes.data) ? existingRes.data : [];
      const botComment = comments.find((c) => c.body && c.body.includes(marker));

      if (botComment && botComment.id) {
        const updateRes = await this.updateIssueComment(botComment.id, commentBody);
        if (!updateRes.ok) {
          console.warn(`[GitHubClient] Failed to update comment ${botComment.id} on PR #${issueOrPrNumber}: ${updateRes.error}`);
        }
        return updateRes;
      } else {
        const createRes = await this.createIssueComment(issueOrPrNumber, commentBody);
        if (!createRes.ok) {
          console.warn(`[GitHubClient] Failed to create comment on PR #${issueOrPrNumber}: ${createRes.error}`);
        }
        return createRes;
      }
    } catch (err) {
      console.warn(`[GitHubClient] Error in postOrUpdatePrComment for PR #${issueOrPrNumber}:`, err.message);
      return { ok: false, error: err.message, status: 500 };
    }
  }

  async createPullRequestReview(pullNumber, { body, event = "COMMENT", commitId = null } = {}) {
    const num = Number(pullNumber);
    if (!validPullNumber(num)) return { ok: false, status: 400, error: "Invalid pull request number" };
    if (!body || typeof body !== "string") return { ok: false, status: 400, error: "Review body must be a non-empty string" };

    const payload = { body, event };
    if (commitId && validSha(commitId)) {
      payload.commit_id = commitId;
    }

    try {
      let res = await this._request("POST", `/repos/${this.owner}/${this.repo}/pulls/${num}/reviews`, payload);
      if (!res.ok && res.status === 422 && event !== "COMMENT") {
        payload.event = "COMMENT";
        res = await this._request("POST", `/repos/${this.owner}/${this.repo}/pulls/${num}/reviews`, payload);
      }
      return res;
    } catch (err) {
      console.warn(`[GitHubClient] Error creating PR review for PR #${pullNumber}:`, err.message);
      return { ok: false, error: err.message, status: 500 };
    }
  }

  async mergePullRequest(pullNumber, headSha) {
    const num = Number(pullNumber);
    if (!validPullNumber(num)) return { ok: false, status: 400, error: "Invalid pull request number" };
    if (!validSha(headSha)) return { ok: false, status: 400, error: "A valid current head SHA is required" };
    return this._request("PUT", `/repos/${this.owner}/${this.repo}/pulls/${num}/merge`, {
      sha: headSha,
      merge_method: "squash",
    });
  }
}

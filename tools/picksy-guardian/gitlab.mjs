import { GuardianError, readBounded } from "./util.mjs";

const MAX_RESPONSE_BYTES = 8_000_000;
const MAX_NOTE_PAGES = 10;
const PER_PAGE = 100;

// The only GitLab surface Guardian uses. Reads are GET; the only writes create or update a note
// on a Merge Request of the single configured project. URLs are built from configuration and
// validated integers, never from webhook or repository content, and redirects are refused.
export function createGitLabClient({ baseUrl, projectId, token, fetchImpl = fetch }) {
  const api = `${baseUrl}/api/v4`;
  const project = `${api}/projects/${projectId}`;
  let currentUserId;

  async function request(label, method, path, { query = {}, body, allowNotFound } = {}) {
    const url = new URL((path === "/user" ? api : project) + path);
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, String(value));
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          "PRIVATE-TOKEN": token,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new GuardianError("gitlab_unreachable", `GitLab ${label} request failed.`);
    }
    if (allowNotFound && response.status === 404) return { text: null };
    if (!response.ok) {
      throw new GuardianError("gitlab_http", `GitLab ${label} returned HTTP ${response.status}.`);
    }
    return {
      text: await readBounded(response, MAX_RESPONSE_BYTES),
      nextPage: response.headers.get("x-next-page") || undefined,
    };
  }

  async function json(label, method, path, options) {
    const result = await request(label, method, path, options);
    try {
      return { ...result, data: JSON.parse(result.text) };
    } catch {
      throw new GuardianError("gitlab_invalid", `GitLab ${label} returned invalid JSON.`);
    }
  }

  function mergeRequest(iid) {
    if (!Number.isSafeInteger(iid) || iid <= 0) {
      throw new GuardianError("invalid_iid", "Invalid Merge Request IID.");
    }
    return `/merge_requests/${iid}`;
  }

  return {
    async getCurrentUserId() {
      if (currentUserId === undefined) {
        const { data } = await json("current user", "GET", "/user");
        if (!Number.isSafeInteger(data?.id)) {
          throw new GuardianError("gitlab_invalid", "GitLab current user has no ID.");
        }
        currentUserId = data.id;
      }
      return currentUserId;
    },

    async getMergeRequest(iid) {
      const { data } = await json("merge request", "GET", mergeRequest(iid));
      if (data === null || typeof data !== "object") {
        throw new GuardianError("gitlab_invalid", "GitLab merge request is not an object.");
      }
      return data;
    },

    // Returns at most `maxFiles` entries and whether more exist.
    async listDiffs(iid, maxFiles) {
      const diffs = [];
      let page = "1";
      while (page) {
        const { data, nextPage } = await json("diffs", "GET", `${mergeRequest(iid)}/diffs`, {
          query: { page, per_page: PER_PAGE },
        });
        if (!Array.isArray(data)) {
          throw new GuardianError("gitlab_invalid", "GitLab diffs response is not an array.");
        }
        diffs.push(...data);
        if (diffs.length > maxFiles) return { diffs: diffs.slice(0, maxFiles), truncated: true };
        page = nextPage;
      }
      return { diffs, truncated: false };
    },

    async listNotes(iid) {
      const notes = [];
      let page = "1";
      for (let count = 0; page; count += 1) {
        if (count === MAX_NOTE_PAGES) {
          throw new GuardianError("too_many_notes", "Merge Request has too many notes to scan.");
        }
        const { data, nextPage } = await json("notes", "GET", `${mergeRequest(iid)}/notes`, {
          query: { page, per_page: PER_PAGE, sort: "asc", order_by: "created_at" },
        });
        if (!Array.isArray(data)) {
          throw new GuardianError("gitlab_invalid", "GitLab notes response is not an array.");
        }
        notes.push(...data);
        page = nextPage;
      }
      return notes;
    },

    async createNote(iid, body) {
      await request("note creation", "POST", `${mergeRequest(iid)}/notes`, { body: { body } });
    },

    async updateNote(iid, noteId, body) {
      if (!Number.isSafeInteger(noteId) || noteId <= 0) {
        throw new GuardianError("invalid_note", "Invalid note ID.");
      }
      await request("note update", "PUT", `${mergeRequest(iid)}/notes/${noteId}`, {
        body: { body },
      });
    },

    async getFileAtRef(filePath, sha) {
      const { text } = await request(
        "file",
        "GET",
        `/repository/files/${encodeURIComponent(filePath)}/raw`,
        { query: { ref: sha }, allowNotFound: true }
      );
      return text;
    },

    async listPipelineJobs(pipelineId) {
      if (!Number.isSafeInteger(pipelineId) || pipelineId <= 0) {
        throw new GuardianError("invalid_pipeline", "Invalid pipeline ID.");
      }
      const { data } = await json("pipeline jobs", "GET", `/pipelines/${pipelineId}/jobs`, {
        query: { per_page: PER_PAGE },
      });
      if (!Array.isArray(data)) {
        throw new GuardianError("gitlab_invalid", "GitLab jobs response is not an array.");
      }
      return data;
    },
  };
}

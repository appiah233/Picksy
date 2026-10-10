const BINARY_EXTENSION =
  /\.(?:png|jpe?g|gif|webp|avif|ico|bmp|pdf|zip|gz|tgz|tar|7z|woff2?|ttf|otf|eot|mp[34]|mov|webm|wasm|exe|dll|so|dylib|bin)$/i;
const MINIFIED_NAME = /\.min\.(?:js|css)$|\.map$/i;

export function matchesPath(path, patterns) {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern
  );
}

export function safePath(value) {
  if (typeof value !== "string") return undefined;
  const path = value.replaceAll("\\", "/");
  if (!path || path.length > 500 || path.startsWith("/") || /^[A-Za-z]:\//.test(path)) {
    return undefined;
  }
  const unsafe = path.split("/").some((part) => part === "" || part === "." || part === "..");
  return unsafe ? undefined : path;
}

// Parses GitLab's per-file unified diff into added lines (with new-file line numbers) and
// removed lines.
export function parseDiff(diff) {
  const added = [];
  const removed = [];
  let line = 0;
  let inHunk = false;
  for (const raw of diff.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      line = Number(hunk[1]);
      inHunk = true;
    } else if (!inHunk || raw.startsWith("\\")) {
      continue;
    } else if (raw.startsWith("+")) {
      added.push({ line, text: raw.slice(1) });
      line += 1;
    } else if (raw.startsWith("-")) {
      removed.push(raw.slice(1));
    } else {
      line += 1;
    }
  }
  return { added, removed };
}

function describeChange(change, policy) {
  const path = safePath(change?.new_path ?? change?.old_path);
  if (!path) return undefined;
  const diff = typeof change.diff === "string" ? change.diff : "";
  const { added, removed } = parseDiff(diff);
  const bytes = Buffer.byteLength(diff, "utf8");
  const { paths, limits } = policy;
  const name = path.slice(path.lastIndexOf("/") + 1);

  // `kind` decides how much of the file Guardian can honestly claim to have reviewed.
  let kind = "text";
  if (change.too_large || change.collapsed) kind = "unavailable";
  else if (bytes > limits.maxFileDiffBytes) kind = "oversized";
  else if (paths.lockfiles.includes(name)) kind = "lockfile";
  else if (change.generated_file || matchesPath(path, paths.generated)) kind = "generated";
  else if (BINARY_EXTENSION.test(path) || /^Binary files /m.test(diff)) kind = "binary";
  else if (
    MINIFIED_NAME.test(path) ||
    added.some(({ text }) => text.length > limits.maxLineLength)
  ) {
    kind = "minified";
  } else if (!diff && !change.renamed_file && !change.deleted_file) kind = "binary";

  return {
    path,
    oldPath: change.renamed_file ? safePath(change.old_path) : undefined,
    status: change.deleted_file
      ? "deleted"
      : change.new_file
        ? "added"
        : change.renamed_file
          ? "renamed"
          : "modified",
    kind,
    bytes,
    diff,
    added,
    removed,
  };
}

// Builds the bounded review context. `incomplete` lists everything that prevents Guardian from
// claiming it reviewed the whole revision; `excluded` lists files deliberately kept from the AI.
export async function collectContext({ gitlab, iid, policy }) {
  const { limits } = policy;
  const { diffs, truncated } = await gitlab.listDiffs(iid, limits.maxChangedFiles);
  const incomplete = [];
  const excluded = [];
  const files = [];

  if (truncated) {
    incomplete.push(
      `The Merge Request changes more than ${limits.maxChangedFiles} files; the remainder was not retrieved.`
    );
  }
  let unsafePaths = 0;
  for (const change of diffs) {
    const file = describeChange(change, policy);
    if (!file) {
      unsafePaths += 1;
      continue;
    }
    files.push(file);
    if (file.kind === "unavailable") {
      incomplete.push(`GitLab did not provide the diff for ${file.path} (too large or collapsed).`);
    } else if (file.kind === "oversized") {
      incomplete.push(
        `The diff for ${file.path} is ${file.bytes} bytes; the per-file limit is ${limits.maxFileDiffBytes}.`
      );
    } else if (file.kind !== "text") {
      excluded.push({ path: file.path, kind: file.kind });
    }
  }
  if (unsafePaths) incomplete.push(`${unsafePaths} changed path(s) were unsafe and not reviewed.`);
  if (!diffs.length) incomplete.push("GitLab returned no diff for this revision.");

  const reviewable = files.filter((file) => file.kind === "text");
  const reviewableBytes = reviewable.reduce((total, file) => total + file.bytes, 0);
  if (reviewableBytes > limits.maxTotalDiffBytes) {
    incomplete.push(
      `The reviewable diff is ${reviewableBytes} bytes; the limit is ${limits.maxTotalDiffBytes}.`
    );
  }

  return { files, reviewable, excluded, incomplete };
}

// Pipeline evidence for exactly the reviewed SHA. Job logs are never read.
export async function collectPipeline({ gitlab, mergeRequest, sha }) {
  const pipeline = mergeRequest.head_pipeline;
  if (!pipeline || !Number.isSafeInteger(pipeline.id)) return { state: "none" };
  if (pipeline.sha !== sha) return { state: "stale", id: pipeline.id };
  const jobs = await gitlab.listPipelineJobs(pipeline.id);
  return {
    state: "found",
    id: pipeline.id,
    status: String(pipeline.status ?? "unknown"),
    jobs: jobs.map((job) => ({
      name: String(job?.name ?? ""),
      status: String(job?.status ?? "unknown"),
      allowFailure: job?.allow_failure === true,
    })),
  };
}

export function pipelineHasFinished(pipeline) {
  return pipeline.state === "found" && ["success", "failed", "canceled", "skipped"].includes(pipeline.status);
}

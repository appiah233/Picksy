import { SEVERITIES } from "./openai.mjs";
import { mdText } from "./util.mjs";

const RANK = { PASS: 0, WARN: 1, INCONCLUSIVE: 2, FAIL: 3 };
const ICON = { PASS: "✅", WARN: "⚠️", INCONCLUSIVE: "❔", FAIL: "❌" };
const MAX_HISTORY = 10;
const MARKER =
  /^<!-- picksy-guardian:v1 policy=([\w.-]{1,40}) project=(\d{1,15}) mr=(\d{1,15}) sha=([0-9a-f]{40,64}) status=(PASS|WARN|INCONCLUSIVE|FAIL) retry=([01]) history=((?:[0-9a-f]{12}:[A-Z]+,?)*) -->/;

const AI_OUTCOME = {
  unconfigured: "not configured",
  skipped: "skipped, context incomplete",
  refusal: "model refused",
  malformed: "invalid structured output",
  incomplete: "response incomplete",
  timeout: "timed out",
  unavailable: "unavailable",
};
// Transient failures: a later delivery for the same revision may refresh the review.
const RETRYABLE = new Set(["timeout", "unavailable"]);

export function reviewKey({ projectId, iid, sha, policyVersion }) {
  return `${projectId}:${iid}:${sha}:${policyVersion}`;
}

// The marker is machine state only: identifiers, a status and short revision history.
export function buildMarker({ policyVersion, projectId, iid, sha, status, retry, history }) {
  const entries = history.map((entry) => `${entry.sha}:${entry.status}`).join(",");
  return `<!-- picksy-guardian:v1 policy=${policyVersion} project=${projectId} mr=${iid} sha=${sha} status=${status} retry=${retry ? 1 : 0} history=${entries} -->`;
}

export function parseMarker(body) {
  const match = MARKER.exec(typeof body === "string" ? body : "");
  if (!match) return undefined;
  return {
    policyVersion: match[1],
    projectId: Number(match[2]),
    iid: Number(match[3]),
    sha: match[4],
    status: match[5],
    retry: match[6] === "1",
    history: match[7]
      .split(",")
      .filter(Boolean)
      .map((entry) => {
        const [sha, status] = entry.split(":");
        return { sha, status };
      })
      .filter((entry) => entry.status in RANK),
  };
}

function aiFindings(review, changedPaths) {
  return review.findings.map((item, index) => {
    const known = item.file !== null && changedPaths.has(item.file);
    return {
      ...item,
      // Model-chosen IDs are replaced so a model cannot imitate a deterministic finding.
      id: `AI-${index + 1}`,
      file: known ? item.file : null,
      line: known ? item.line : null,
      source: "ai",
      proven: false,
    };
  });
}

// One row per rule and file; repeated hits on further lines are counted, not listed.
function mergeFindings(findings) {
  const merged = new Map();
  for (const item of findings) {
    const key = item.source === "ai" ? item.id : `${item.id}|${item.file}|${item.title}`;
    const existing = merged.get(key);
    if (existing) existing.occurrences += 1;
    else merged.set(key, { ...item, occurrences: 1 });
  }
  return [...merged.values()].sort(
    (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)
  );
}

// Applies the policy's decision rules. The AI can only make the result worse, never better.
export function decide({ policy, context, policyFindings, ai, previous, identity }) {
  const changedPaths = new Set(context.files.map((file) => file.path));
  const findings = mergeFindings([
    ...policyFindings,
    ...(ai.ok ? aiFindings(ai.review, changedPaths) : []),
  ]);
  const complete = context.incomplete.length === 0 && ai.ok;

  let status = "PASS";
  if (findings.some((item) => item.severity === "BLOCKING")) status = "FAIL";
  else if (!complete) status = "INCONCLUSIVE";
  else if (findings.some((item) => ["HIGH", "MEDIUM"].includes(item.severity))) status = "WARN";
  if (ai.ok && RANK[ai.review.status] > RANK[status]) status = ai.review.status;

  const limitations = [...context.incomplete];
  if (context.excluded.length) {
    const names = context.excluded.slice(0, 10).map((file) => `${file.path} (${file.kind})`);
    const more = context.excluded.length - names.length;
    limitations.push(
      `Not analysed beyond pattern checks: ${names.join(", ")}${more > 0 ? ` and ${more} more` : ""}.`
    );
  }
  if (!ai.ok) {
    limitations.push(
      `AI review did not produce a result (${AI_OUTCOME[ai.kind]}). Architecture, security and scope analysis is missing.`
    );
  } else {
    limitations.push(...ai.review.limitations);
  }

  const history = [...(previous?.history ?? [])];
  if (previous && previous.sha !== identity.sha) {
    history.unshift({ sha: previous.sha.slice(0, 12), status: previous.status });
  }

  return {
    ...identity,
    policy,
    status,
    retry: !ai.ok && RETRYABLE.has(ai.kind),
    findings,
    limitations,
    ai,
    history: history.slice(0, MAX_HISTORY),
  };
}

function location(item) {
  if (!item.file) return "—";
  return `${mdText(item.file, 120)}${item.line ? `:${item.line}` : ""}`;
}

function details(summary, lines) {
  return ["<details>", `<summary>${summary}</summary>`, "", ...lines, "", "</details>", ""];
}

function pipelineLabel(pipeline) {
  if (pipeline.state === "found") return `${mdText(pipeline.status, 20)} · #${pipeline.id}`;
  if (pipeline.state === "stale") return "none for this revision";
  return pipeline.state === "unavailable" ? "unavailable" : "none";
}

// Renders the single Guardian summary comment. All text that originates from GitLab or the
// model passes through mdText, so it cannot produce markup, links, mentions or quick actions.
export function formatReview(review, { pipeline, model }) {
  const { policy, status, findings, limitations, ai } = review;
  const shown = findings.slice(0, policy.limits.maxFindings);
  const count = (severity) => findings.filter((item) => item.severity === severity).length;
  const aiLabel = ai.ok ? `completed · ${mdText(model, 40)}` : AI_OUTCOME[ai.kind];

  const lines = [
    buildMarker({ ...review, policyVersion: policy.version }),
    `## Picksy Guardian · ${ICON[status]} ${status}`,
    "",
    "| Revision | Policy | Gate 3 | Pipeline | AI review |",
    "| --- | --- | --- | --- | --- |",
    `| \`${review.sha.slice(0, 12)}\` | ${policy.version} | ${policy.gate.status} · ${policy.gate.readiness} | ${pipelineLabel(pipeline)} | ${aiLabel} |`,
    "",
  ];
  if (ai.ok) lines.push(`**AI assessment (advisory):** ${mdText(ai.review.summary, 500)}`, "");

  if (!findings.length) {
    lines.push("**No findings.**", "");
  } else {
    lines.push(
      `### Findings · ${count("BLOCKING")} blocking · ${count("HIGH")} high · ${count("MEDIUM")} medium · ${count("LOW") + count("INFO")} low`,
      "",
      "| ID | Severity | Finding | Location | Basis |",
      "| --- | --- | --- | --- | --- |"
    );
    for (const item of shown) {
      const basis = item.source === "ai" ? "AI" : item.proven ? "Check" : "Heuristic";
      const repeat = item.occurrences > 1 ? ` (×${item.occurrences})` : "";
      lines.push(
        `| ${mdText(item.id, 30)} | ${item.severity} | ${mdText(item.title, 140)}${repeat} | ${location(item)} | ${basis} |`
      );
    }
    if (findings.length > shown.length) {
      lines.push("", `${findings.length - shown.length} lower-severity finding(s) not shown.`);
    }
    lines.push(
      "",
      ...details(
        "Evidence and required actions",
        shown.flatMap((item) => [
          `**${mdText(item.id, 30)} · ${mdText(item.title, 140)}**`,
          `- Evidence: ${mdText(item.evidence, 400)}`,
          `- Why it matters: ${mdText(item.reason, 400)}`,
          `- Required action: ${mdText(item.requiredAction, 400)}`,
          "",
        ])
      )
    );
  }

  if (limitations.length) {
    lines.push(
      ...details(
        `Not reviewed and limitations (${limitations.length})`,
        limitations.map((item) => `- ${mdText(item, 500)}`)
      )
    );
  }

  const evidence = policy.gate.openPrerequisites.map(
    (item) => `| ${item.id} · ${mdText(item.requirement, 200)} | ${item.status} | Policy |`
  );
  if (ai.ok) {
    for (const item of ai.review.externalEvidence) {
      // Guardian cannot verify external evidence, so a model's VERIFIED is never passed on.
      const claimed = item.status === "VERIFIED" ? "UNVERIFIED" : item.status;
      evidence.push(`| ${mdText(item.requirement, 200)} | ${claimed} | AI, advisory |`);
    }
  }
  const gate = [
    `Gate ${policy.gate.current} is **${policy.gate.status}** and **${policy.gate.readiness}**. Nothing in this review changes that.`,
    "",
    "| External requirement | Status | Basis |",
    "| --- | --- | --- |",
    ...evidence,
  ];
  if (ai.ok && ai.review.gateImpact.changesReadiness) {
    gate.push(
      "",
      `AI note on Gate readiness (advisory, not a decision): ${mdText(ai.review.gateImpact.explanation, 400)}`
    );
  }
  lines.push(...details("Gate and external evidence", gate));

  if (review.history.length) {
    lines.push(
      ...details(
        "Earlier revisions reviewed",
        review.history.map((entry) => `- \`${entry.sha}\` ${entry.status}`)
      )
    );
  }

  lines.push(
    "---",
    "_Advisory review of this revision only, limited to the Merge Request diff, metadata and pipeline status. Guardian cannot approve, merge, deploy or authorize a Gate. A human reviewer decides._"
  );
  return lines.join("\n");
}

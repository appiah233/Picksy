import { collectContext, collectPipeline, pipelineHasFinished } from "./context.mjs";
import { reviewWithOpenAi } from "./openai.mjs";
import { evaluatePolicy } from "./policy-engine.mjs";
import { decide, formatReview, parseMarker, reviewKey } from "./report.mjs";
import { GuardianError } from "./util.mjs";

const SHA = /^[0-9a-f]{40,64}$/;

// Guardian's summary note is one written by Guardian's own account that starts with a valid
// marker for this Merge Request. A marker pasted by anyone else is ignored.
async function findOwnNote({ gitlab, iid, projectId }) {
  const botId = await gitlab.getCurrentUserId();
  const notes = await gitlab.listNotes(iid);
  for (const note of notes) {
    if (note?.system || note?.author?.id !== botId) continue;
    const marker = parseMarker(note.body);
    if (marker && marker.projectId === projectId && marker.iid === iid) {
      return { id: note.id, marker };
    }
  }
  return undefined;
}

// Reviews the current head of one Merge Request and creates or updates the single Guardian note.
// The revision, state and content all come from the GitLab API, never from the webhook payload.
export async function reviewMergeRequest({ iid, config, policy, gitlab, fetchImpl }) {
  const mergeRequest = await gitlab.getMergeRequest(iid);
  if (mergeRequest.state !== "opened") return { action: "skipped", reason: "not_open" };
  if (mergeRequest.target_branch !== "main") {
    return { action: "skipped", reason: "wrong_target_branch" };
  }
  const sha = mergeRequest.sha;
  if (typeof sha !== "string" || !SHA.test(sha)) {
    return { action: "skipped", reason: "no_revision" };
  }

  const identity = { projectId: config.projectId, iid, sha };
  const existing = await findOwnNote({ gitlab, iid, projectId: config.projectId });
  const previous = existing?.marker;
  if (
    previous &&
    !previous.retry &&
    reviewKey(previous) === reviewKey({ ...identity, policyVersion: policy.version })
  ) {
    return { action: "skipped", reason: "already_reviewed", sha };
  }

  let pipeline;
  try {
    pipeline = await collectPipeline({ gitlab, mergeRequest, sha });
  } catch (error) {
    if (!(error instanceof GuardianError)) throw error;
    return { action: "skipped", reason: "pipeline_unavailable", sha };
  }
  if (!pipelineHasFinished(pipeline)) {
    return { action: "skipped", reason: "pipeline_not_finished", sha };
  }

  const context = await collectContext({ gitlab, iid, policy });
  const catalogueSource = await gitlab.getFileAtRef(policy.paths.productionCatalogue, sha);

  const policyFindings = evaluatePolicy({
    policy,
    context,
    catalogueSource,
    pipeline,
    mergeRequest,
  });
  const ai = context.incomplete.length
    ? { ok: false, kind: "skipped" }
    : await reviewWithOpenAi({
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
        fetchImpl,
        policy,
        mergeRequest,
        context,
        findings: policyFindings,
        pipeline,
      });

  const review = decide({ policy, context, policyFindings, ai, previous, identity });
  const body = formatReview(review, { pipeline, model: config.openaiModel });
  if (existing) await gitlab.updateNote(iid, existing.id, body);
  else await gitlab.createNote(iid, body);
  return { action: existing ? "updated" : "created", status: review.status, sha };
}

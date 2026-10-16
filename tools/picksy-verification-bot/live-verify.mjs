import { execSync } from "node:child_process";
import { formatAsciiReport } from "./formatter.mjs";
import { GitHubClient } from "./github-client.mjs";
import { loadPolicy } from "./types-and-policy.mjs";
import { VerificationEngine } from "./verification-engine.mjs";

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  try {
    const token = execSync("gh auth token", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (token) return token;
  } catch {
    // gh CLI might not be installed or authenticated
  }
  return "";
}

/**
 * Runs live read-only verification against the real appiah233/Picksy GitHub repository.
 */
export async function runLiveGitHubVerification({
  owner = "appiah233",
  repo = "Picksy",
  token = getGitHubToken(),
  policy = loadPolicy(),
} = {}) {
  const client = new GitHubClient({ owner, repo, token });
  const engine = new VerificationEngine(policy);

  console.log(`Connecting to GitHub API for ${owner}/${repo}...`);

  // 1. Fetch main branch commit SHA
  let mainSha = "unknown";
  const branchRes = await client._get(`/repos/${owner}/${repo}/branches/main`);
  if (branchRes.ok && branchRes.data?.commit?.sha) {
    mainSha = branchRes.data.commit.sha;
  }

  // 2. Fetch and evaluate PR #7 (Codex strict security gate)
  let pr7Eval = null;
  const pr7Res = await client.getPullRequest(7);
  if (pr7Res.ok) {
    const pr7 = pr7Res.data;
    const filesRes = await client.getPullRequestFiles(7);
    const checksRes = await client.getCommitCheckRuns(pr7.head?.sha);
    pr7Eval = engine.verifyPullRequest({
      prNumber: 7,
      headSha: pr7.head?.sha,
      branch: pr7.head?.ref,
      files: filesRes.ok ? filesRes.data.map((f) => f.filename) : [],
      checkRuns: checksRes.ok ? checksRes.data?.check_runs || [] : [],
      title: pr7.title,
      description: pr7.body,
    });
  }

  // 3. Fetch and evaluate PR #8 (Codex controlled remediation)
  let pr8Eval = null;
  const pr8Res = await client.getPullRequest(8);
  if (pr8Res.ok) {
    const pr8 = pr8Res.data;
    const filesRes = await client.getPullRequestFiles(8);
    const checksRes = await client.getCommitCheckRuns(pr8.head?.sha);
    pr8Eval = engine.verifyPullRequest({
      prNumber: 8,
      headSha: pr8.head?.sha,
      branch: pr8.head?.ref,
      files: filesRes.ok ? filesRes.data.map((f) => f.filename) : [],
      checkRuns: checksRes.ok ? checksRes.data?.check_runs || [] : [],
      title: pr8.title,
      description: pr8.body,
    });
  }

  // 4. Fetch and evaluate PR #5 (Gemini home discovery)
  let pr5Eval = null;
  const pr5Res = await client.getPullRequest(5);
  if (pr5Res.ok) {
    const pr5 = pr5Res.data;
    const filesRes = await client.getPullRequestFiles(5);
    const checksRes = await client.getCommitCheckRuns(pr5.head?.sha);
    pr5Eval = engine.verifyPullRequest({
      prNumber: 5,
      headSha: pr5.head?.sha,
      branch: pr5.head?.ref,
      files: filesRes.ok ? filesRes.data.map((f) => f.filename) : [],
      checkRuns: checksRes.ok ? checksRes.data?.check_runs || [] : [],
      title: pr5.title,
      description: pr5.body,
    });
  }

  // 5. Fetch and evaluate PR #3 (Unknown task ownership demonstration)
  let pr3Eval = null;
  const pr3Res = await client.getPullRequest(3);
  if (pr3Res.ok) {
    const pr3 = pr3Res.data;
    const filesRes = await client.getPullRequestFiles(3);
    const checksRes = await client.getCommitCheckRuns(pr3.head?.sha);
    pr3Eval = engine.verifyPullRequest({
      prNumber: 3,
      headSha: pr3.head?.sha,
      branch: pr3.head?.ref, // copilot/fix-github-actions-failure (not in task registry)
      files: filesRes.ok ? filesRes.data.map((f) => f.filename) : [],
      checkRuns: checksRes.ok ? checksRes.data?.check_runs || [] : [],
      title: pr3.title,
      description: pr3.body,
    });
  }

  // 6. Fetch Code Scanning alerts
  const alertsRes = await client.getCodeScanningAlerts();
  const alertsCount = (alertsRes.ok && Array.isArray(alertsRes.data)) ? alertsRes.data.length : 0;

  // 7. Format ASCII report
  const asciiReport = formatAsciiReport({
    policy,
    observedMainSha: mainSha,
    codexVerification: pr8Eval || pr7Eval,
    geminiVerification: pr5Eval,
    crossAgentConflicts: [],
    mainBranchEvents: [],
    specialConditions: policy.specialConditions,
    escalations: (pr7Eval?.requiresHumanReview || pr3Eval?.requiresHumanReview) ? [
      { eventType: "LIVE_PR_EVAL", reference: "PR #7", botConclusions: { summary: "PR #7 dependency audit failure" } },
      { eventType: "LIVE_PR_EVAL", reference: "PR #3", botConclusions: { summary: "PR #3 unknown agent ownership" } },
    ] : [],
  });

  return {
    observedMainSha: mainSha,
    codeScanningAlertsCount: alertsCount,
    pr7: pr7Eval,
    pr8: pr8Eval,
    pr5: pr5Eval,
    pr3: pr3Eval,
    asciiReport,
  };
}

if (process.argv[1] && process.argv[1].endsWith("live-verify.mjs")) {
  runLiveGitHubVerification().then((result) => {
    console.log("\n" + result.asciiReport);
    console.log("\nLIVE REPOSITORY CHECKS CORRELATION TABLE:");
    console.table([
      { PR: 7, Branch: result.pr7?.branch || "fix/strict-release-dependency-gate", Agent: result.pr7?.agentName, Scope: result.pr7?.scope?.overallScope, Checks: result.pr7?.checks?.overallState, Verdict: result.pr7?.state, HumanReview: result.pr7?.requiresHumanReview },
      { PR: 8, Branch: result.pr8?.branch || "fix/controlled-release-remediation", Agent: result.pr8?.agentName, Scope: result.pr8?.scope?.overallScope, Checks: result.pr8?.checks?.overallState, Verdict: result.pr8?.state, HumanReview: result.pr8?.requiresHumanReview },
      { PR: 5, Branch: result.pr5?.branch || "feat/homepage-discovery-design", Agent: result.pr5?.agentName, Scope: result.pr5?.scope?.overallScope, Checks: result.pr5?.checks?.overallState, Verdict: result.pr5?.state, HumanReview: result.pr5?.requiresHumanReview },
      { PR: 3, Branch: result.pr3?.branch || "copilot/fix-actions", Agent: result.pr3?.agentName, Scope: result.pr3?.scope?.overallScope, Checks: result.pr3?.checks?.overallState, Verdict: result.pr3?.state, HumanReview: result.pr3?.requiresHumanReview },
    ]);
  }).catch((err) => {
    console.error("Live verification error:", err);
    process.exit(1);
  });
}

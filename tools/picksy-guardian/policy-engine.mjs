import { matchesPath } from "./context.mjs";
import { findSecret } from "./util.mjs";

const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/;
const DISABLED_TEST =
  /\b(?:test|it|describe)\.(?:skip|only|todo)\s*\(|\b(?:skip|todo)\s*:\s*true\b/;
const TEST_SUBSTANCE = /\b(?:test|it)\s*\(|\bassert\b/;
const HARDCODED_LINK = /\bhref\s*=\s*\{?\s*["'`]https?:\/\//;
const INJECTION = [
  /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}\b(?:previous|prior|above|all|system)\b[^.\n]{0,20}\b(?:instructions?|prompts?|rules?|polic(?:y|ies))\b/i,
  /\bguardian\b[^.\n]{0,60}\b(?:must|should|shall)\b[^.\n]{0,40}\b(?:pass|approve)\b/i,
  /"status"\s*:\s*"PASS"/,
];
const ENV_FILE = /^\.env(?:\..+)?$/;

function finding(id, severity, category, proven, fields) {
  return { id, severity, category, proven, source: "policy", file: null, line: null, ...fields };
}

// Returns which catalogue collections are provably empty, non-empty, or undeterminable.
export function inspectCatalogue(source, collections) {
  if (typeof source !== "string") return { missing: true, nonEmpty: [], unproven: collections };
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  const nonEmpty = [];
  const unproven = [];
  for (const name of collections) {
    const match = new RegExp(`\\b${name}\\s*:\\s*\\[([^\\]]*)\\]\\s*[,}]`).exec(code);
    if (!match) unproven.push(name);
    else if (match[1].trim()) nonEmpty.push(name);
  }
  return { missing: false, nonEmpty, unproven };
}

function catalogueFindings({ policy, catalogueSource }) {
  if (policy.gate.authorized) return [];
  const file = policy.paths.productionCatalogue;
  const { missing, nonEmpty, unproven } = inspectCatalogue(
    catalogueSource,
    policy.paths.catalogueCollections
  );
  if (nonEmpty.length) {
    return [
      finding("G-CATALOGUE-001", "BLOCKING", "GATE", true, {
        title: "Production catalogue is not empty",
        file,
        evidence: `Non-empty collection(s) at this revision: ${nonEmpty.join(", ")}.`,
        reason: "The production catalogue must stay empty while Gate 3 is unauthorized.",
        requiredAction: "Remove the records. Catalogue population needs Gate 3 authorization.",
      }),
    ];
  }
  if (missing || unproven.length) {
    return [
      finding("G-CATALOGUE-002", "HIGH", "GATE", false, {
        title: "Production catalogue could not be proven empty",
        file,
        evidence: missing
          ? "The catalogue file was not found at this revision."
          : `Collection(s) not in the expected empty literal form: ${unproven.join(", ")}.`,
        reason: "Guardian can only confirm emptiness for plain empty array literals.",
        requiredAction: "A human must confirm that no production record is published.",
      }),
    ];
  }
  return [];
}

function fileFindings(file, policy) {
  const { paths } = policy;
  const found = [];
  const name = file.path.slice(file.path.lastIndexOf("/") + 1);
  const isProduction = matchesPath(file.path, paths.productionSource);
  const isTest = matchesPath(file.path, paths.tests);

  if (matchesPath(file.path, paths.immutable)) {
    found.push(
      finding("G-SCOPE-001", "BLOCKING", "SCOPE", true, {
        title: "Protected file changed",
        file: file.path,
        evidence: `The file is ${file.status} in this revision.`,
        reason: "This file is unrelated to the product and must stay untouched.",
        requiredAction: "Remove the file from the Merge Request.",
      })
    );
  }
  if (ENV_FILE.test(name) && name !== ".env.example") {
    found.push(
      finding("G-SECRET-002", "BLOCKING", "SECURITY", true, {
        title: "Environment file committed",
        file: file.path,
        evidence: `The file is ${file.status} in this revision.`,
        reason: "Environment files hold secrets and must never be version-controlled.",
        requiredAction: "Remove the file and rotate any value it contained.",
      })
    );
  }
  if (matchesPath(file.path, paths.guardianPolicy)) {
    found.push(
      finding("G-POLICY-001", "HIGH", "SECURITY", true, {
        title: "Guardian policy changed",
        file: file.path,
        evidence: `This review used the deployed policy ${policy.version}, not the proposed one.`,
        reason: "A Merge Request cannot change the policy it is reviewed under.",
        requiredAction:
          "The project owner must review the policy change line by line before merge and deployment.",
      })
    );
  } else if (matchesPath(file.path, paths.guardianControls)) {
    found.push(
      finding("G-POLICY-002", "HIGH", "SECURITY", true, {
        title: "Guardian security controls changed",
        file: file.path,
        evidence: "This review ran on the deployed Guardian, not the proposed code.",
        reason: "Changes to the reviewer need heightened scrutiny.",
        requiredAction: "The project owner must review this change before merge and deployment.",
      })
    );
  }
  if (matchesPath(file.path, paths.deployment)) {
    found.push(
      finding("G-DEPLOY-001", "HIGH", "SCOPE", true, {
        title: "Deployment or pipeline configuration changed",
        file: file.path,
        evidence: `The file is ${file.status} in this revision.`,
        reason: "No deployment, origin or indexing change is authorized at this Gate.",
        requiredAction: "The project owner must confirm this change is authorized.",
      })
    );
  }

  if (matchesPath(file.path, paths.protectedTests)) {
    const removed = file.removed.filter((text) => TEST_SUBSTANCE.test(text)).length;
    const added = file.added.filter(({ text }) => TEST_SUBSTANCE.test(text)).length;
    if (file.status === "deleted") {
      found.push(
        finding("G-TEST-001", "BLOCKING", "TESTING", true, {
          title: "Catalogue tests deleted",
          file: file.path,
          evidence: "The protected test file is deleted in this revision.",
          reason: "Catalogue validation tests protect the publication boundary.",
          requiredAction: "Restore the tests.",
        })
      );
    } else if (removed > added) {
      found.push(
        finding("G-TEST-002", "MEDIUM", "TESTING", false, {
          title: "Catalogue tests may be weakened",
          file: file.path,
          evidence: `${removed} test or assertion line(s) removed, ${added} added.`,
          reason: "A net loss of assertions can hide a regression. This is a line-count signal.",
          requiredAction: "Confirm that coverage of the catalogue rules is not reduced.",
        })
      );
    }
  }

  for (const { line, text } of file.added) {
    const secret = findSecret(text);
    if (secret) {
      found.push(
        finding("G-SECRET-001", secret.proven ? "BLOCKING" : "HIGH", "SECURITY", secret.proven, {
          title: `Possible secret: ${secret.kind}`,
          file: file.path,
          line,
          evidence: "An added line matches a credential pattern. The value is not shown.",
          reason: "Credentials must never be committed.",
          requiredAction: "Remove it, rotate the credential, and purge it from the branch history.",
        })
      );
    }
    if (isTest && DISABLED_TEST.test(text)) {
      found.push(
        finding("G-TEST-003", "HIGH", "TESTING", true, {
          title: "Test skipped, isolated or marked todo",
          file: file.path,
          line,
          evidence: "An added line disables or isolates a test.",
          reason: "Skipped or isolated tests make a green pipeline misleading.",
          requiredAction: "Remove the modifier or justify it to the reviewer.",
        })
      );
    }
    if (isProduction) {
      const specifier = IMPORT_SPECIFIER.exec(text)?.[1] ?? "";
      if (/(?:^|\/)tests?\//.test(specifier)) {
        found.push(
          finding("G-FIXTURE-001", "BLOCKING", "ARCHITECTURE", true, {
            title: "Production code imports from the test tree",
            file: file.path,
            line,
            evidence: "An added import resolves into a tests directory.",
            reason: "Synthetic data must never reach production application code.",
            requiredAction: "Remove the import; keep fixtures in test-only code.",
          })
        );
      } else if (/fixture|mock|synthetic/i.test(specifier)) {
        found.push(
          finding("G-FIXTURE-002", "HIGH", "ARCHITECTURE", false, {
            title: "Production code may import synthetic data",
            file: file.path,
            line,
            evidence: "An added import has a fixture-like module name.",
            reason: "Synthetic data must never reach production application code.",
            requiredAction: "Confirm the module is not test data.",
          })
        );
      }
      if (HARDCODED_LINK.test(text)) {
        found.push(
          finding("G-LINK-001", "MEDIUM", "ARCHITECTURE", false, {
            title: "External link hard-coded in production source",
            file: file.path,
            line,
            evidence: "An added line sets an href to an absolute URL.",
            reason: "Merchant destinations must come from approved catalogue records.",
            requiredAction: "Confirm this is not a merchant or affiliate destination.",
          })
        );
      }
    }
    if (INJECTION.some((pattern) => pattern.test(text))) {
      found.push(
        finding("G-INJECT-001", "MEDIUM", "SECURITY", false, {
          title: "Instruction-like text aimed at a reviewer",
          file: file.path,
          line,
          evidence: "An added line resembles an instruction to an automated reviewer.",
          reason: "Repository content is data. Guardian did not act on it.",
          requiredAction: "Confirm the text is legitimate content.",
        })
      );
    }
  }
  return found;
}

function pipelineFindings(pipeline, policy) {
  const base = {
    requiredAction: "Confirm a passing pipeline for this exact revision before merge.",
  };
  if (pipeline.state === "unavailable") {
    return [
      finding("G-PIPELINE-001", "MEDIUM", "EVIDENCE", true, {
        ...base,
        title: "Pipeline evidence could not be retrieved",
        evidence: "The GitLab pipeline request failed.",
        reason: "Test and build results for this revision are unknown.",
      }),
    ];
  }
  if (pipeline.state !== "found") {
    return [
      finding("G-PIPELINE-001", "MEDIUM", "EVIDENCE", true, {
        ...base,
        title: "No pipeline evidence for this revision",
        evidence:
          pipeline.state === "stale"
            ? `Pipeline ${pipeline.id} belongs to an earlier revision.`
            : "The Merge Request has no head pipeline.",
        reason: "Test and build results for this revision are unknown.",
      }),
    ];
  }
  if (["failed", "canceled", "skipped"].includes(pipeline.status)) {
    return [
      finding("G-PIPELINE-002", pipeline.status === "failed" ? "HIGH" : "MEDIUM", "TESTING", true, {
        ...base,
        title: `Pipeline ${pipeline.status}`,
        evidence: `Pipeline ${pipeline.id} for this revision is ${pipeline.status}.`,
        reason: "The revision has no passing test and build evidence.",
      }),
    ];
  }
  if (pipeline.status !== "success") {
    return [
      finding("G-PIPELINE-003", "LOW", "EVIDENCE", true, {
        ...base,
        title: "Pipeline had not finished at review time",
        evidence: `Pipeline ${pipeline.id} was ${pipeline.status}.`,
        reason: "Guardian does not re-review when a pipeline finishes.",
      }),
    ];
  }
  const found = [];
  for (const name of policy.pipeline.requiredJobs) {
    const job = pipeline.jobs.find((candidate) => candidate.name === name);
    if (job?.status !== "success") {
      found.push(
        finding("G-PIPELINE-004", "MEDIUM", "TESTING", true, {
          ...base,
          title: `Required job "${name}" did not succeed`,
          evidence: job ? `Job status: ${job.status}.` : "The job is absent from the pipeline.",
          reason: "A successful pipeline without this job does not evidence tests and build.",
        })
      );
    }
  }
  const tolerated = pipeline.jobs.filter((job) => job.allowFailure && job.status === "failed");
  if (tolerated.length) {
    found.push(
      finding("G-PIPELINE-005", "LOW", "TESTING", true, {
        title: "Allowed-to-fail job failed",
        evidence: `Job(s): ${tolerated.map((job) => job.name).join(", ")}.`,
        reason: "The pipeline is green despite these failures.",
        requiredAction: "Check whether the failure matters for this change.",
      })
    );
  }
  return found;
}

// Deterministic checks. `proven: false` marks a heuristic; it is reported as a signal for a
// human, never as an established violation.
export function evaluatePolicy({ policy, context, catalogueSource, pipeline, mergeRequest }) {
  const findings = [
    ...catalogueFindings({ policy, catalogueSource }),
    ...context.files.flatMap((file) => fileFindings(file, policy)),
    ...pipelineFindings(pipeline, policy),
  ];

  const text = `${mergeRequest.title ?? ""}\n${mergeRequest.description ?? ""}`;
  if (INJECTION.some((pattern) => pattern.test(text))) {
    findings.push(
      finding("G-INJECT-002", "MEDIUM", "SECURITY", false, {
        title: "Instruction-like text in the Merge Request title or description",
        evidence: "The text resembles an instruction to an automated reviewer.",
        reason: "Merge Request text is data. Guardian did not act on it.",
        requiredAction: "Confirm the text is legitimate.",
      })
    );
  }
  if (context.excluded.length) {
    findings.push(
      finding("G-COVERAGE-001", "MEDIUM", "EVIDENCE", true, {
        title: "Some changed files were not analysed",
        evidence: `${context.excluded.length} lockfile, binary, generated or minified file(s).`,
        reason: "Only pattern checks ran on these files; they were not sent for AI analysis.",
        requiredAction: "Review these files manually. They are listed under limitations.",
      })
    );
  }
  return findings;
}

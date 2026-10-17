import assert from "node:assert/strict";
import test from "node:test";
import {
  isPrivateOrReservedIp,
  isPrivateOrReservedIpv4,
  isPrivateOrReservedIpv6,
  validateUrlSyntax,
  validateSourceUrlWithDns,
} from "../src/lib/importer/url-validator.ts";
import {
  generatePreviewToken,
  verifyPreviewToken,
  checkRateLimit,
  resetRateLimits,
} from "../src/lib/importer/auth.ts";
import { sanitizeText, slugify, normalizeCandidate, inferCategoryId } from "../src/lib/importer/normalizer.ts";
import { detectDuplicates } from "../src/lib/importer/duplicate-detector.ts";
import { MemoryDraftStore, draftStore } from "../src/lib/importer/draft-store.ts";
import { publishImportDraft } from "../src/lib/importer/publisher.ts";
import { getSourceAdapter, isSupportedSource } from "../src/lib/importer/adapters/registry.ts";

process.env.IMPORTER_PREVIEW_SECRET = "synthetic-backend-preview-secret-at-least-32-bytes";

test("URL syntax validator enforces HTTPS, standard ports, and blocks IP literals", () => {
  // Disallowed schemes & credentials
  assert.equal(validateUrlSyntax("http://merchant.example/product").ok, false);
  assert.equal(validateUrlSyntax("ftp://merchant.example/product").ok, false);
  assert.equal(validateUrlSyntax("https://user:pass@merchant.example/product").ok, false);

  // Nonstandard ports
  assert.equal(validateUrlSyntax("https://merchant.example:8443/product").ok, false);
  assert.equal(validateUrlSyntax("https://merchant.example:8080/product").ok, false);

  // Fragments / hashes
  assert.equal(validateUrlSyntax("https://merchant.example/product#section").ok, false);

  // Direct IP literals
  assert.equal(validateUrlSyntax("https://127.0.0.1/api").ok, false);
  assert.equal(validateUrlSyntax("https://10.0.0.1/api").ok, false);
  assert.equal(validateUrlSyntax("https://169.254.169.254/latest/meta-data").ok, false);
  assert.equal(validateUrlSyntax("https://[::1]/api").ok, false);
  assert.equal(validateUrlSyntax("https://2130706433/product").ok, false); // Decimal IP representation

  // Malformed hosts
  assert.equal(validateUrlSyntax("https://.invalid/product").ok, false);
  assert.equal(validateUrlSyntax("https://invalid./product").ok, false);
  assert.equal(validateUrlSyntax("https://localhost/product").ok, false);

  // Valid HTTPS URL
  const valid = validateUrlSyntax("https://merchant.example/products/item-123");
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.url.hostname, "merchant.example");
  }
});

test("isPrivateOrReservedIp accurately classifies IPv4 private and reserved ranges", () => {
  // Loopback (127.0.0.0/8)
  assert.equal(isPrivateOrReservedIpv4("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIpv4("127.255.255.255"), true);

  // Current network (0.0.0.0/8)
  assert.equal(isPrivateOrReservedIpv4("0.0.0.0"), true);

  // RFC1918 Private ranges
  assert.equal(isPrivateOrReservedIpv4("10.0.0.1"), true);
  assert.equal(isPrivateOrReservedIpv4("10.254.12.34"), true);
  assert.equal(isPrivateOrReservedIpv4("172.16.0.1"), true);
  assert.equal(isPrivateOrReservedIpv4("172.31.255.255"), true);
  assert.equal(isPrivateOrReservedIpv4("192.168.0.1"), true);
  assert.equal(isPrivateOrReservedIpv4("192.168.100.50"), true);

  // Link-local / AWS metadata (169.254.0.0/16)
  assert.equal(isPrivateOrReservedIpv4("169.254.169.254"), true);
  assert.equal(isPrivateOrReservedIpv4("169.254.1.1"), true);

  // Carrier-grade NAT (100.64.0.0/10)
  assert.equal(isPrivateOrReservedIpv4("100.64.0.1"), true);
  assert.equal(isPrivateOrReservedIpv4("100.127.255.254"), true);

  // Multicast and Broadcast (224.0.0.0/4 and 240.0.0.0/4)
  assert.equal(isPrivateOrReservedIpv4("224.0.0.1"), true);
  assert.equal(isPrivateOrReservedIpv4("239.255.255.250"), true);
  assert.equal(isPrivateOrReservedIpv4("255.255.255.255"), true);

  // Public valid internet addresses
  assert.equal(isPrivateOrReservedIpv4("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIpv4("1.1.1.1"), false);
  assert.equal(isPrivateOrReservedIpv4("93.184.216.34"), false);
  assert.equal(isPrivateOrReservedIpv4("172.32.0.1"), false); // outside 172.16.0.0/12
});

test("isPrivateOrReservedIp accurately classifies IPv6 private and reserved ranges", () => {
  // Loopback (::1) and Unspecified (::)
  assert.equal(isPrivateOrReservedIpv6("::1"), true);
  assert.equal(isPrivateOrReservedIpv6("0:0:0:0:0:0:0:1"), true);
  assert.equal(isPrivateOrReservedIpv6("::"), true);

  // IPv4-mapped loopback/private IPv6
  assert.equal(isPrivateOrReservedIpv6("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIpv6("::ffff:169.254.169.254"), true);
  assert.equal(isPrivateOrReservedIpv6("::ffff:192.168.1.1"), true);

  // Unique Local (fc00::/7)
  assert.equal(isPrivateOrReservedIpv6("fc00::1"), true);
  assert.equal(isPrivateOrReservedIpv6("fd12:3456:789a::1"), true);

  // Link-Local (fe80::/10)
  assert.equal(isPrivateOrReservedIpv6("fe80::1"), true);
  assert.equal(isPrivateOrReservedIpv6("fe80::c001:1dff:feee:0"), true);

  // Multicast (ff00::/8)
  assert.equal(isPrivateOrReservedIpv6("ff02::1"), true);

  // Public IPv6
  assert.equal(isPrivateOrReservedIpv6("2606:4700:4700::1111"), false);
  assert.equal(isPrivateOrReservedIpv6("2001:4860:4860::8888"), false);

  // General isPrivateOrReservedIp wrapper
  assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("::1"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false);
});

test("validateSourceUrlWithDns detects DNS rebinding and private IP resolutions", async () => {
  // Simulated DNS rebinding resolving to loopback
  const fakeRebindingDns = async () => [{ address: "127.0.0.1", family: 4 }];
  const rebindingCheck = await validateSourceUrlWithDns("https://merchant.example/path", {
    approvedHosts: ["merchant.example"],
    dnsLookup: fakeRebindingDns,
  });
  assert.equal(rebindingCheck.ok, false);
  assert.equal(rebindingCheck.code, "INVALID_URL");

  // Simulated DNS resolving to link-local cloud metadata
  const fakeMetadataDns = async () => [{ address: "169.254.169.254", family: 4 }];
  const metaCheck = await validateSourceUrlWithDns("https://merchant.example/path", {
    approvedHosts: ["merchant.example"],
    dnsLookup: fakeMetadataDns,
  });
  assert.equal(metaCheck.ok, false);
  assert.equal(metaCheck.code, "INVALID_URL");

  // Simulated unapproved host
  const unapprovedCheck = await validateSourceUrlWithDns("https://evil.attacker.com/path", {
    approvedHosts: ["merchant.example"],
    dnsLookup: async () => [{ address: "93.184.216.34", family: 4 }],
  });
  assert.equal(unapprovedCheck.ok, false);
  assert.equal(unapprovedCheck.code, "SOURCE_NOT_AUTHORIZED");

  // Simulated valid public resolution on approved host
  const validCheck = await validateSourceUrlWithDns("https://merchant.example/path", {
    approvedHosts: ["merchant.example"],
    dnsLookup: async () => [{ address: "93.184.216.34", family: 4 }],
  });
  assert.equal(validCheck.ok, true);
  if (validCheck.ok) {
    assert.equal(validCheck.hostname, "merchant.example");
  }
});

test("Sanitizer strips HTML and XSS injection vectors", () => {
  const result = sanitizeText('<script>alert("xss")</script>Professional <b>SEO</b> Suite');
  assert.equal(result.hadHtml, true);
  assert.equal(result.text, "Professional SEO Suite");

  const eventHandler = sanitizeText('<img src="x" onerror="stealCookie()">Fast Cloud Hosting');
  assert.equal(eventHandler.hadHtml, true);
  assert.equal(eventHandler.text, "Fast Cloud Hosting");

  const encoded = sanitizeText("Marketing &amp; Sales &lt;Pro&gt;");
  assert.equal(encoded.text, "Marketing & Sales Pro");
  assert.equal(encoded.hadHtml, true);
});

test("Sanitizer keeps malformed and encoded markup inert as plain text", () => {
  for (const input of [
    "&lt;script&gt;alert(1)&lt;/script&gt;",
    "&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;",
    "<script>alert(1)</script >Professional",
    "<style>body{display:none}</style >Professional",
    "<<script>script>alert(1)</<script>script>",
    "&lt;img src=x onerror=alert(1)&gt;",
  ]) {
    const result = sanitizeText(input);
    assert.equal(result.hadHtml, true, input);
    assert.doesNotMatch(result.text, /[<>]/, input);
  }

  // This function produces display text, never a URL. Protocol-looking text
  // must remain inert without a partial scheme denylist.
  for (const input of ["javascript:alert(1)", "vbscript:msgbox(1)", "data:text/html,hello"]) {
    const result = sanitizeText(input);
    assert.doesNotMatch(result.text, /[<>]/, input);
  }
});

test("Slug generation produces clean kebab-case slugs", () => {
  assert.equal(slugify("HighLevel CRM & Automation"), "highlevel-crm-automation");
  assert.equal(slugify("SE Ranking — All-in-One SEO"), "se-ranking-all-in-one-seo");
  assert.equal(slugify("Systeme.io Course Platform!"), "systeme-io-course-platform");
});

test("Category inference matches domain keywords", () => {
  assert.equal(inferCategoryId("SE Ranking", "Rank tracker and SEO keyword audit"), "seo-tools");
  assert.equal(inferCategoryId("ActiveCampaign", "Email newsletter broadcast and automation"), "email-marketing");
  assert.equal(inferCategoryId("Kinsta", "Managed WordPress cloud hosting"), "managed-hosting");
  assert.equal(inferCategoryId("Bitdefender", "Endpoint malware protection and antivirus"), "cybersecurity");
});

test("Normalizer produces complete candidate with provenance and warnings", () => {
  const candidate = normalizeCandidate({
    sourceId: "impact",
    sourceUrl: "https://impact.com/campaigns/456/products/789",
    name: "<b>Acme</b> CRM Software",
    description: "Lead pipeline <script>hack()</script> automation system.",
    price: "49.00",
    currency: "USD",
    destinationUrl: "https://acme.example/app",
  });

  assert.equal(candidate.sourceId, "impact");
  assert.equal(candidate.name, "Acme CRM Software");
  assert.equal(candidate.slug, "acme-crm-software");
  assert.equal(candidate.categoryId, "crm-automation");
  assert.equal(candidate.price, "49.00");
  assert.equal(candidate.merchantDomain, "acme.example");
  assert.ok(candidate.warnings.length > 0);
  assert.ok(candidate.warnings.some((w) => w.includes("Normalized markup")));
  assert.ok(candidate.provenance.name.sourceUrl.includes("impact.com"));
  assert.ok(candidate.provenance.summary.retrievedAt);
});

test("Duplicate detector catches matching canonical URL, external ID, and slug", () => {
  const existingDraft = {
    id: "draft_123",
    sourceId: "impact",
    canonicalUrl: "https://merchant.example/product-a",
    externalProductId: "PROD-99",
    state: "draft",
    candidate: {
      sourceId: "impact",
      canonicalUrl: "https://merchant.example/product-a",
      externalProductId: "PROD-99",
      name: "Product A",
      slug: "product-a",
      categoryId: "seo-tools",
      merchantName: "Merchant Example",
      merchantDomain: "merchant.example",
      officialSource: "https://merchant.example/product-a",
      summary: "Product A summary",
      intendedUser: "Marketers",
      intendedWorkflow: "SEO auditing",
      price: "10.00",
      currency: "USD",
      affiliateUrl: "https://merchant.example/product-a",
      destinationUrl: "https://merchant.example/product-a",
      imageUrl: null,
      retrievedAt: new Date().toISOString(),
      warnings: [],
      provenance: {},
    },
    edits: {},
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Match canonical URL
  const dupCanonical = detectDuplicates(
    {
      ...existingDraft.candidate,
      canonicalUrl: "https://merchant.example/product-a/",
    },
    [existingDraft]
  );
  assert.equal(dupCanonical.isDuplicate, true);
  assert.equal(dupCanonical.matchField, "canonicalUrl");

  // Match external product ID
  const dupExternalId = detectDuplicates(
    {
      ...existingDraft.candidate,
      canonicalUrl: "https://merchant.example/product-b",
      externalProductId: "PROD-99",
      slug: "product-b",
    },
    [existingDraft]
  );
  assert.equal(dupExternalId.isDuplicate, true);
  assert.equal(dupExternalId.matchField, "externalProductId");

  // No match
  const uniqueCandidate = detectDuplicates(
    {
      ...existingDraft.candidate,
      canonicalUrl: "https://merchant.example/product-unique",
      externalProductId: "PROD-100",
      slug: "product-unique",
    },
    [existingDraft]
  );
  assert.equal(uniqueCandidate.isDuplicate, false);
});

test("DraftStore creates, retrieves, and enforces optimistic locking on version", async () => {
  const store = new MemoryDraftStore();
  const candidate = normalizeCandidate({
    sourceId: "partnerstack",
    sourceUrl: "https://app.partnerstack.com/programs/test-prog",
    name: "PartnerStack Tool",
    description: "Automated partner workflows",
    destinationUrl: "https://tool.example",
  });

  // Create
  const { draft, isExisting } = await store.createDraft(candidate);
  assert.equal(isExisting, false);
  assert.equal(draft.version, 1);
  assert.equal(draft.state, "draft");

  // Valid update with version 1 -> advances to version 2
  const updateResult = await store.updateDraft(draft.id, { name: "Updated Tool Name" }, 1);
  assert.equal(updateResult.ok, true);
  assert.equal(updateResult.draft.version, 2);
  assert.equal(updateResult.draft.edits.name, "Updated Tool Name");

  // Outdated update using version 1 should fail with CONFLICT
  const conflictResult = await store.updateDraft(draft.id, { name: "Conflicting Name" }, 1);
  assert.equal(conflictResult.ok, false);
  assert.equal(conflictResult.code, "CONFLICT");

  // Update using non-existent draft
  const notFoundResult = await store.updateDraft("non_existent_id", {}, 1);
  assert.equal(notFoundResult.ok, false);
  assert.equal(notFoundResult.code, "NOT_FOUND");
});

test("Preview tokens issue and verify with 15-minute expiration", () => {
  const token = generatePreviewToken("impact", "https://merchant.example/item");
  assert.ok(typeof token === "string" && token.includes("."));

  const verified = verifyPreviewToken(token);
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.equal(verified.payload.sourceId, "impact");
    assert.equal(verified.payload.canonicalUrl, "https://merchant.example/item");
  }

  // Tampered token
  const tampered = `${token}tampered`;
  assert.equal(verifyPreviewToken(tampered).ok, false);

  // Missing or empty token
  assert.equal(verifyPreviewToken("").ok, false);
});

test("Rate limiter tracks sliding window limits", () => {
  resetRateLimits();
  const id = "test-user-rate-limit";

  // Within limit
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(id, 5, 10_000);
    assert.equal(res.allowed, true);
  }

  // Exceeded limit
  const exceeded = checkRateLimit(id, 5, 10_000);
  assert.equal(exceeded.allowed, false);
  assert.equal(exceeded.remaining, 0);

  resetRateLimits();
});

test("Publication gate rejects incomplete reviews and accepts valid publication records", async () => {
  const candidate = normalizeCandidate({
    sourceId: "direct-feed",
    sourceUrl: "https://seranking.com/product",
    name: "SE Ranking Platform",
    description: "Rank tracking and SEO auditing software",
    destinationUrl: "https://seranking.com",
    categoryId: "seo-tools",
  });

  const { draft } = await draftStore.createDraft(candidate);

  // 1. Incomplete review (missing sources, future dates)
  const incompleteReview = {
    author: "Test Reviewer",
    evaluatedOn: "2026-10-15", // future date
    publishedOn: "2026-10-15",
    reviewedOn: "2026-10-15",
    methodology: "Hands-on audit",
    sources: [], // empty sources
    strengths: ["Strong rank tracking"],
    limitations: ["Learning curve"],
    suitableFor: "SEO Agencies",
    notSuitableFor: "Simple bloggers",
    conclusion: "Recommended",
    authorizationReference: "AUTH-12345",
    offerLabel: "Try SE Ranking Platform",
    disclosure: "Affiliate disclosure statement",
  };

  const failResult = await publishImportDraft(draft.id, draft.version, incompleteReview, {
    today: "2026-10-10",
  });
  assert.equal(failResult.ok, false);
  assert.equal(failResult.code, "VALIDATION_FAILED");

  // 2. Complete, valid editorial review matching catalog invariants
  const completeReview = {
    author: "Editorial Lead",
    evaluatedOn: "2026-10-01",
    publishedOn: "2026-10-05",
    reviewedOn: "2026-10-08",
    methodology: "Comprehensive 40-hour hands-on workflow evaluation.",
    sources: ["https://seranking.com/docs"],
    strengths: ["Accurate rank tracking", "Intuitive competitor comparison"],
    limitations: ["API access requires higher tier"],
    suitableFor: "SEO agencies and in-house growth marketers",
    notSuitableFor: "Hobbyist bloggers seeking basic free tools",
    conclusion: "Top-tier SEO suite offering reliable rank intelligence.",
    authorizationReference: "AUTH-SERANKING-2026",
    offerLabel: "Try SE Ranking Platform today",
    disclosure: "Picksy may earn a commission from purchases made through this link at no additional cost to you.",
  };

  const passResult = await publishImportDraft(draft.id, draft.version, completeReview, {
    today: "2026-10-10",
  });
  assert.equal(passResult.ok, true);
  assert.equal(passResult.state, "published");
  assert.equal(passResult.productId, "se-ranking-platform");
});

test("Adapter registry identifies known sources but enables no unapproved retrieval", () => {
  assert.equal(isSupportedSource("impact"), true);
  assert.equal(isSupportedSource("partnerstack"), true);
  assert.equal(isSupportedSource("direct-feed"), true);
  assert.equal(isSupportedSource("unsupported-source"), false);

  assert.equal(getSourceAdapter("impact"), null);
  assert.equal(getSourceAdapter("partnerstack"), null);
  assert.equal(getSourceAdapter("direct-feed"), null);
});

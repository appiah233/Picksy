"""Fail closed on unusable dependency reports, critical vulnerabilities, or unapproved high vulnerabilities."""

from datetime import datetime, timezone
import json
from pathlib import Path
import sys

if len(sys.argv) < 2:
    raise SystemExit("Usage: check-dependency-audit.py <path-to-dependency-audit.json>")

report_path = Path(sys.argv[1])
if not report_path.is_file():
    raise SystemExit(f"Dependency audit report file does not exist: {report_path}")

try:
    content = report_path.read_text(encoding="utf-8").strip()
    if not content:
        raise SystemExit(f"Dependency audit report file is empty: {report_path}")
    report = json.loads(content)
except Exception as e:
    raise SystemExit(f"Failed to parse dependency audit report JSON: {e}")

if not isinstance(report, dict) or "vulnerabilities" not in report:
    raise SystemExit("Audit report is missing 'vulnerabilities' object")

metadata = report.get("metadata", {}).get("vulnerabilities", {})
vulnerabilities = report.get("vulnerabilities", {})

# 1. Zero tolerance on critical severity
critical_count = metadata.get("critical", 0)
if critical_count > 0:
    critical_pkgs = [k for k, v in vulnerabilities.items() if v.get("severity") == "critical"]
    raise SystemExit(f"CRITICAL dependency vulnerabilities detected ({critical_count}): {', '.join(critical_pkgs)}")

# 2. Time-bound, SecurityAgent-approved exceptions for frozen transitive high vulnerabilities
# Policy: Any suppression requires rule ID, component, evidence, technical justification, scope, date, and SecurityAgent approval.
APPROVED_EXCEPTIONS = {
    # Root chain 1: adm-zip archive handling advisories in Sanity CLI / runtime tooling
    "adm-zip": {
        "root_chain": "adm-zip",
        "reason": "Transitive archive handling in @sanity/cli/@sanity/runtime-cli. Sanity Studio runs in controlled administrative context; archive extraction is not exposed to untrusted runtime web input. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "@sanity/runtime-cli": {
        "root_chain": "adm-zip",
        "reason": "Transitive wrapper for @sanity/cli pulling adm-zip. Tooling only, not exposed to public web requests. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "@sanity/cli": {
        "root_chain": "adm-zip / braces",
        "reason": "Transitive Sanity CLI dependency. Tooling only; no CLI execution in public runtime. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "sanity": {
        "root_chain": "adm-zip / braces",
        "reason": "Core Sanity library pulling transitive tooling packages (@sanity/cli, chokidar, preferred-pm). Pinned to sanity@^4.22.1 per ADR-012 to support Next.js 15.5.27 and React 19.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    # Root chain 2: braces glob stack exhaustion in Sanity file-watching and codegen tooling
    "braces": {
        "root_chain": "braces",
        "reason": "Deeply nested glob pattern stack exhaustion in file-watching/codegen tooling. braces@3.0.3 is latest on npm (no upstream patch). Input reachability absent in public runtime.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "micromatch": {
        "root_chain": "braces",
        "reason": "Transitive glob matching dependency pulling braces. Tooling only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "fast-glob": {
        "root_chain": "braces",
        "reason": "Transitive glob dependency pulling micromatch -> braces. Tooling only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "globby": {
        "root_chain": "braces",
        "reason": "Transitive glob dependency pulling fast-glob -> micromatch -> braces. Tooling only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "@sanity/codegen": {
        "root_chain": "braces",
        "reason": "Transitive Sanity schema codegen pulling globby. Build-time tooling only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "chokidar": {
        "root_chain": "braces",
        "reason": "Transitive file watcher in Sanity Studio pulling braces. Studio runs in admin context only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "find-yarn-workspace-root2": {
        "root_chain": "braces",
        "reason": "Transitive workspace resolution pulling micromatch -> braces. Tooling only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    "preferred-pm": {
        "root_chain": "braces",
        "reason": "Transitive package manager detection in Sanity pulling find-yarn-workspace-root2. Tooling only. Pinned to sanity@^4.22.1 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
    # Root chain 3: postcss CSS stringification / source map advisories in Next.js 15
    "postcss": {
        "root_chain": "postcss",
        "reason": "Transitive CSS parsing advisory inside Next.js 15.5.27 bundler. Build-time compilation only; untrusted CSS input is not accepted at runtime. Pinned to Next.js 15.5.27 per ADR-012.",
        "expires_on": "2026-11-16",
        "approved_by": "SecurityAgent",
    },
}

today = datetime.now(timezone.utc).date()
unapproved_high = []
expired_exceptions = []

for pkg, details in vulnerabilities.items():
    severity = details.get("severity")
    if severity == "critical":
        unapproved_high.append(f"{pkg} (CRITICAL)")
        continue
    if severity == "high":
        if pkg not in APPROVED_EXCEPTIONS:
            unapproved_high.append(f"{pkg} (HIGH - UNAPPROVED)")
            continue

        exception = APPROVED_EXCEPTIONS[pkg]
        expiry_date = datetime.strptime(exception["expires_on"], "%Y-%m-%d").date()
        if today > expiry_date:
            expired_exceptions.append(f"{pkg} (EXPIRED on {exception['expires_on']})")

if expired_exceptions:
    print(f"Expired SecurityAgent exceptions ({len(expired_exceptions)}):")
    for item in expired_exceptions:
        print(f"  - {item}")
    raise SystemExit("Time-bound security exception has expired. Triage renewal or remediation required.")

if unapproved_high:
    print(f"Unapproved high-risk dependency vulnerabilities ({len(unapproved_high)}):")
    for item in unapproved_high:
        print(f"  - {item}")
    raise SystemExit("Unapproved high-risk dependency finding blocks pipeline.")

high_count = metadata.get("high", 0)
moderate_count = metadata.get("moderate", 0)
low_count = metadata.get("low", 0)
info_count = metadata.get("info", 0)

print(
    f"Production dependency audit PASSED: "
    f"critical={critical_count}, high={high_count} (all {len(APPROVED_EXCEPTIONS)} covered by active SecurityAgent exceptions until 2026-11-16), "
    f"moderate={moderate_count}, low={low_count}, info={info_count}."
)

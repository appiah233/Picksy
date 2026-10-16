"""Fail the production audit when any high or critical vulnerability is reported."""

import json
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit("Usage: check-dependency-audit.py <path-to-dependency-audit.json>")

report_path = Path(sys.argv[1])
try:
    report = json.loads(report_path.read_text(encoding="utf-8-sig"))
except (OSError, UnicodeError, json.JSONDecodeError) as error:
    raise SystemExit(f"Cannot read production dependency audit: {error}") from error

if not isinstance(report, dict):
    raise SystemExit("Production dependency audit must be a JSON object")

vulnerabilities = report.get("vulnerabilities")
counts = report.get("metadata", {}).get("vulnerabilities")
if not isinstance(vulnerabilities, dict) or not isinstance(counts, dict):
    raise SystemExit("Production dependency audit is missing vulnerability results")

for severity in ("critical", "high"):
    count = counts.get(severity)
    if type(count) is not int or count < 0:
        raise SystemExit(f"Production dependency audit has invalid {severity} count")

for package, entry in vulnerabilities.items():
    if (
        not isinstance(entry, dict)
        or entry.get("severity") not in ("info", "low", "moderate", "high", "critical")
    ):
        raise SystemExit(f"Production dependency audit has invalid entry: {package}")

findings = [
    f"{package} ({entry['severity']})"
    for package, entry in vulnerabilities.items()
    if isinstance(entry, dict) and entry.get("severity") in ("critical", "high")
]
if counts["critical"] or counts["high"] or findings:
    raise SystemExit(
        "Production dependency audit BLOCKED: "
        f"critical={counts['critical']}, high={counts['high']}; "
        + ", ".join(findings)
    )

print("Production dependency audit PASSED: no high or critical vulnerabilities")

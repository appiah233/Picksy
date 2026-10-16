"""Fail closed on unusable or out-of-scope public ZAP baseline reports."""

import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit


report = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
sites = report.get("site")
if not isinstance(sites, list) or not sites:
    raise SystemExit("ZAP did not report a scanned site")

counts = Counter()
out_of_scope = []
high = []
for site in sites:
    if site.get("@host") != "127.0.0.1" or str(site.get("@port")) != "3000":
        out_of_scope.append(str(site.get("@name", "unknown site")))
    for alert in site.get("alerts", []):
        risk = int(alert["riskcode"])
        counts[risk] += 1
        if risk >= 3:
            high.append(f"{alert.get('pluginid', '?')}: {alert.get('name', 'unnamed')}")
        for instance in alert.get("instances", []):
            uri = instance.get("uri", "")
            parsed = urlsplit(uri)
            if (
                parsed.scheme != "http"
                or parsed.hostname != "127.0.0.1"
                or parsed.port != 3000
                or parsed.path.split("/")[1:2] in (["api"], ["admin"], ["studio"])
            ):
                out_of_scope.append(uri)

print(
    "ZAP public baseline alerts: "
    f"high={counts[3]}, medium={counts[2]}, low={counts[1]}, informational={counts[0]}"
)
if out_of_scope:
    raise SystemExit(f"ZAP report contains {len(out_of_scope)} out-of-scope URL(s)")
if high:
    print("High alerts requiring verification: " + "; ".join(high))
    raise SystemExit("High-risk ZAP alert requires security review")

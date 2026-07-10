#!/usr/bin/env python3
"""
One-off investigation: for each species cached as "not_found", query the
iNaturalist taxa endpoint with is_active=any to see whether an inactive
taxon exists under that name. When one does, follow iNat's
current_synonymous_taxon_ids (if present) to find the active replacement
and report what the species should be renamed to.

Output: a CSV-ish table to stdout plus data/inactive-taxa-report.json.
"""

import json
import time
from pathlib import Path

import requests

API_URL = "https://api.inaturalist.org/v1/taxa"
TAXON_URL = "https://api.inaturalist.org/v1/taxa/{id}"
USER_AGENT = "tree-related-microhabitats/1.0 (https://trems.nicksynes.com)"
REQUEST_DELAY_S = 1.0
TIMEOUT_S = 15

CACHE_PATH = Path("data/inaturalist-photos.json")
REPORT_PATH = Path("data/inactive-taxa-report.json")


def search_any(session, name):
    """Search including inactive taxa; return the first exact-name match."""
    resp = session.get(
        API_URL,
        params={"q": name, "rank": "species", "is_active": "any", "per_page": 10},
        timeout=TIMEOUT_S,
    )
    resp.raise_for_status()
    target = name.strip().lower()
    for r in resp.json().get("results", []):
        if (r.get("name") or "").strip().lower() == target:
            return r
    return None


def fetch_active_replacement(session, taxon_id):
    """Given an inactive taxon's id, try to find its current accepted name.

    iNat exposes this via `current_synonymous_taxon_ids` on the inactive
    taxon's detail page. Returns a dict with `name`/`id`/`rank` or None.
    """
    resp = session.get(TAXON_URL.format(id=taxon_id), timeout=TIMEOUT_S)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if not results:
        return None
    entry = results[0]
    replacement_ids = entry.get("current_synonymous_taxon_ids") or []
    if not replacement_ids:
        return None
    # Fetch the first replacement taxon's basic info
    time.sleep(REQUEST_DELAY_S)
    resp = session.get(TAXON_URL.format(id=replacement_ids[0]), timeout=TIMEOUT_S)
    resp.raise_for_status()
    rep_results = resp.json().get("results", [])
    if not rep_results:
        return None
    rep = rep_results[0]
    return {"id": rep.get("id"), "name": rep.get("name"), "rank": rep.get("rank")}


def main():
    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    not_found_names = sorted(k for k, v in cache.items() if v.get("not_found"))
    print(f"Investigating {len(not_found_names)} not_found species...\n")

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    session.headers["Accept"] = "application/json"

    report = []
    print(f"{'idx':>3}  {'marker':6}  {'original name':38}  {'status':10}  {'taxon_id':>8}  current name")
    print("-" * 110)
    for i, name in enumerate(not_found_names, start=1):
        try:
            hit = search_any(session, name)
        except Exception as exc:  # noqa: BLE001
            print(f"{i:>3}  ERROR   {name:38}  {exc}")
            time.sleep(REQUEST_DELAY_S)
            continue

        if hit is None:
            print(f"{i:>3}  ✗       {name:38}  absent      {'-':>8}  (not in iNat database at all)")
            report.append({"name": name, "status": "absent"})
            time.sleep(REQUEST_DELAY_S)
            continue

        is_active = hit.get("is_active")
        taxon_id = hit.get("id")
        rank = hit.get("rank")
        if is_active:
            # Odd - was reported not_found before but now active. Log and move on.
            print(f"{i:>3}  ?       {name:38}  active      {taxon_id:>8}  (rank={rank}; worth refetching)")
            report.append({"name": name, "status": "active_now", "taxon_id": taxon_id, "rank": rank})
            time.sleep(REQUEST_DELAY_S)
            continue

        # Inactive taxon - try to find its current accepted replacement
        time.sleep(REQUEST_DELAY_S)
        try:
            replacement = fetch_active_replacement(session, taxon_id)
        except Exception as exc:  # noqa: BLE001
            replacement = None
            print(f"      replacement lookup error for {name}: {exc}")
        current_name = replacement["name"] if replacement else "(no replacement recorded)"
        current_id = replacement["id"] if replacement else None
        print(f"{i:>3}  ✓       {name:38}  inactive    {taxon_id:>8}  {current_name}")
        report.append({
            "name": name,
            "status": "inactive",
            "inactive_taxon_id": taxon_id,
            "inactive_rank": rank,
            "current_name": current_name if replacement else None,
            "current_taxon_id": current_id,
        })
        time.sleep(REQUEST_DELAY_S)

    REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=False, sort_keys=False),
        encoding="utf-8",
    )
    print(f"\nReport saved to {REPORT_PATH}")

    # Summary
    from collections import Counter
    summary = Counter(r["status"] for r in report)
    print("\n=== Summary ===")
    for k, v in summary.most_common():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()

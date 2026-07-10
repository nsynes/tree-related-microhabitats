#!/usr/bin/env python3
"""
Convert data/inactive-taxa-report.json into data/inactive-taxa.csv so the
renames can be reviewed in a spreadsheet. One row per species; the
status column distinguishes renamed-on-iNat ("inactive") from
not-on-iNat ("absent").
"""

import csv
import json
from pathlib import Path

REPORT_PATH = Path("data/inactive-taxa-report.json")
CSV_PATH = Path("data/inactive-taxa.csv")


def main():
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))

    fieldnames = [
        "original_name",
        "status",
        "suggested_rename",
        "inat_url",
        "notes",
    ]

    # Sort: inactive first (actionable), then absent, each alphabetical.
    def sort_key(r):
        return (0 if r["status"] == "inactive" else 1, r["name"].lower())

    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in sorted(report, key=sort_key):
            status = r["status"]
            if status == "inactive":
                writer.writerow({
                    "original_name": r["name"],
                    "status": "Renamed on iNat",
                    "suggested_rename": r.get("current_name") or "",
                    "inat_url": f"https://www.inaturalist.org/taxa/{r['inactive_taxon_id']}",
                    "notes": "iNat marks the old name inactive; link goes to that page which points to the new name.",
                })
            elif status == "absent":
                writer.writerow({
                    "original_name": r["name"],
                    "status": "Not on iNat",
                    "suggested_rename": "",
                    "inat_url": "",
                    "notes": "No taxon with this exact name on iNat (active or inactive).",
                })
            else:
                writer.writerow({
                    "original_name": r["name"],
                    "status": status,
                    "suggested_rename": "",
                    "inat_url": "",
                    "notes": "",
                })

    print(f"✓ Wrote {len(report)} rows to {CSV_PATH}")


if __name__ == "__main__":
    main()

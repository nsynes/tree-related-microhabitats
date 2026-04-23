#!/usr/bin/env python3
"""
Fetch iNaturalist default-photo metadata for each species and cache it to
data/inaturalist-photos.json keyed by scientific name.

Cached entries are never re-fetched unless --refresh is passed. The cache
is saved after every successful request so a Ctrl-C loses at most one
in-flight lookup.

Usage:
    python scripts/fetch-photos.py                 # fetch every uncached species
    python scripts/fetch-photos.py --pilot         # stratified sample (~30)
    python scripts/fetch-photos.py --limit 50      # first 50 species
    python scripts/fetch-photos.py --refresh       # re-fetch everything
    python scripts/fetch-photos.py --species "Abdera biflexuosa"
"""

import argparse
import json
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

API_URL = "https://api.inaturalist.org/v1/taxa"
USER_AGENT = "tree-related-microhabitats/1.0 (https://trems.nicksynes.com)"
REQUEST_DELAY_S = 1.0  # iNat asks for <=100/min; 1s/req is well under
MAX_BACKOFF_S = 60
TIMEOUT_S = 15

SPECIES_PATH = Path("react-app/src/data/species.json")
CACHE_PATH = Path("data/inaturalist-photos.json")

# Classes worth pilot-sampling, in rough proportion to dataset size (635 total).
PILOT_STRATIFICATION = {
    "Insect": 10,
    "Vertebrate": 6,
    "Lichen": 4,
    "Arachnid": 3,
    "Millipede": 2,
    "Mollusc": 2,
    "Fungi": 2,
    "Moss": 1,
}


def load_species():
    if not SPECIES_PATH.exists():
        sys.exit(
            f"✗ {SPECIES_PATH} not found — run scripts/process-data.py first."
        )
    return json.loads(SPECIES_PATH.read_text(encoding="utf-8"))


def load_cache():
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )


def pilot_sample(species):
    """Stratified sample across classes to gauge coverage."""
    by_class = defaultdict(list)
    for s in species:
        by_class[s.get("class", "")].append(s)
    sample = []
    for cls, quota in PILOT_STRATIFICATION.items():
        sample.extend(by_class.get(cls, [])[:quota])
    return sample


def _fetch_exact(session, query):
    """Single iNaturalist lookup; exact case-insensitive name match required."""
    params = {"q": query, "rank": "species", "per_page": 5}
    backoff = 2
    while True:
        resp = session.get(API_URL, params=params, timeout=TIMEOUT_S)
        if resp.status_code == 429:
            if backoff > MAX_BACKOFF_S:
                return {"error": "rate_limited", "fetched_at": now_iso()}
            time.sleep(backoff)
            backoff *= 2
            continue
        if resp.status_code >= 500:
            if backoff > MAX_BACKOFF_S:
                return {"error": f"http_{resp.status_code}", "fetched_at": now_iso()}
            time.sleep(backoff)
            backoff *= 2
            continue
        resp.raise_for_status()
        break

    target = query.strip().lower()
    match = next(
        (r for r in resp.json().get("results", [])
         if (r.get("name") or "").strip().lower() == target),
        None,
    )
    if match is None:
        return {"not_found": True, "fetched_at": now_iso()}

    photo = match.get("default_photo") or {}
    entry = {
        "taxon_id": match.get("id"),
        "iconic_taxon": match.get("iconic_taxon_name"),
        "fetched_at": now_iso(),
    }
    if photo:
        entry.update(
            {
                "photo_square_url": photo.get("square_url"),
                "photo_small_url": photo.get("small_url"),
                "photo_medium_url": photo.get("medium_url"),
                "photo_large_url": photo.get("large_url"),
                "attribution": photo.get("attribution"),
                "license_code": photo.get("license_code"),
            }
        )
    else:
        entry["no_photo"] = True
    return entry


def fetch_one(session, scientific_name):
    """Fetch with a binomial-fallback retry for trinomial/subspecies names."""
    entry = _fetch_exact(session, scientific_name)
    if not entry.get("not_found"):
        return entry
    parts = scientific_name.split()
    if len(parts) <= 2:
        return entry
    time.sleep(REQUEST_DELAY_S)  # space out the follow-up call
    binomial = " ".join(parts[:2])
    fallback = _fetch_exact(session, binomial)
    if fallback.get("not_found"):
        return entry  # keep original not_found result
    fallback["matched_as"] = binomial
    return fallback


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pilot", action="store_true", help="Stratified ~30-species sample")
    parser.add_argument("--limit", type=int, help="Process only the first N species")
    parser.add_argument("--refresh", action="store_true", help="Re-fetch cached entries")
    parser.add_argument("--species", help="Fetch one species by scientific name")
    args = parser.parse_args()

    all_species = load_species()
    cache = load_cache()

    if args.species:
        targets = [{"scientificName": args.species, "class": "?"}]
    elif args.pilot:
        targets = pilot_sample(all_species)
    elif args.limit:
        targets = all_species[: args.limit]
    else:
        targets = all_species

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    session.headers["Accept"] = "application/json"

    stats = defaultdict(int)
    to_fetch = [
        s for s in targets
        if s.get("scientificName")
        and (args.refresh or s["scientificName"] not in cache)
    ]
    skipped = len(targets) - len(to_fetch)

    print(f"🌿 Targets: {len(targets)}  to fetch: {len(to_fetch)}  cached (skipped): {skipped}")

    for i, species in enumerate(to_fetch, start=1):
        name = species["scientificName"]
        cls = species.get("class", "")
        try:
            entry = fetch_one(session, name)
        except Exception as exc:  # noqa: BLE001
            entry = {"error": str(exc), "fetched_at": now_iso()}

        cache[name] = entry
        save_cache(cache)  # incremental

        if entry.get("not_found"):
            marker = "✗"
            stats["not_found"] += 1
        elif entry.get("error"):
            marker = "!"
            stats["error"] += 1
        elif entry.get("no_photo"):
            marker = "○"
            stats["no_photo"] += 1
        else:
            marker = "✓"
            stats["photo"] += 1
            stats[f"license:{entry.get('license_code') or 'unknown'}"] += 1

        print(f"  [{i:3d}/{len(to_fetch)}]  {marker}  {cls:12s}  {name}")
        time.sleep(REQUEST_DELAY_S)

    # Re-count coverage across the *target* set including cache hits
    for species in targets:
        name = species.get("scientificName")
        if not name or name not in cache:
            continue
        if name in {s["scientificName"] for s in to_fetch}:
            continue  # already counted above
        entry = cache[name]
        if entry.get("not_found"):
            stats["not_found_cached"] += 1
        elif entry.get("no_photo"):
            stats["no_photo_cached"] += 1
        elif entry.get("error"):
            stats["error_cached"] += 1
        else:
            stats["photo_cached"] += 1

    print("\n=== Summary ===")
    for k in sorted(stats):
        print(f"  {k}: {stats[k]}")


if __name__ == "__main__":
    main()

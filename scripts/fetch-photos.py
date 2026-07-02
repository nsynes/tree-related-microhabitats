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
    python scripts/fetch-photos.py --refresh-arr   # re-fetch only all-rights-reserved cache entries
    python scripts/fetch-photos.py --species "Abdera biflexuosa"

When iNaturalist's curator-selected default photo for a species is all-rights-
reserved (license_code=None, which we can't use), the script hits the taxon
detail endpoint and picks the first Creative-Commons-licensed photo from the
broader taxon_photos list. This recovers coverage for common species whose
default upload happens to retain copyright.
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

# Creative Commons licences we can use (includes non-commercial since this is
# a public-sector research tool). Anything outside this set — notably None,
# which iNat uses for "all rights reserved" — is unusable and triggers the
# taxon-photos fallback.
USABLE_LICENSES = frozenset({
    "cc0", "pd", "cc-by", "cc-by-sa",
    "cc-by-nc", "cc-by-nc-sa", "cc-by-nc-nd", "cc-by-nd",
})

SPECIES_PATH = Path("react-app/src/data/species.json")
CACHE_PATH = Path("data/inaturalist-photos.json")
OVERRIDES_PATH = Path("data/photo-overrides.json")

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


def load_overrides():
    """Per-species photo overrides, keyed by scientificName.
    See data/photo-overrides.json's _readme for shape and semantics.
    Missing file → no overrides; _readme keys are ignored at lookup time."""
    if not OVERRIDES_PATH.exists():
        return {}
    return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))


def pilot_sample(species):
    """Stratified sample across classes to gauge coverage."""
    by_class = defaultdict(list)
    for s in species:
        by_class[s.get("class", "")].append(s)
    sample = []
    for cls, quota in PILOT_STRATIFICATION.items():
        sample.extend(by_class.get(cls, [])[:quota])
    return sample


def _fetch_exact(session, query, rank="species"):
    """Single iNaturalist lookup; exact case-insensitive name match required.

    We include `is_active=any` so renamed species (e.g. Corvus monedula →
    Coloeus monedula) still resolve to an iNat taxon id. When the matched
    taxon is inactive we still record the id — the UI can link through to
    the iNat page, which shows the rename — but we intentionally don't
    store photo fields for it (photos belong to whatever the current
    accepted taxon is; the client can update the name in the source data
    and we refetch for real photos).

    rank=None drops the rank filter so subspecies queries (e.g.
    "Aegithalos caudatus rosaceus") can resolve to iNat's subspecies-rank
    taxon. Used by the photo-override path.
    """
    params = {"q": query, "is_active": "any", "per_page": 5}
    if rank:
        params["rank"] = rank
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
    matches = [r for r in resp.json().get("results", [])
               if (r.get("name") or "").strip().lower() == target]
    if not matches:
        return {"not_found": True, "fetched_at": now_iso()}

    # Prefer active taxa when iNat returns both (rare but possible).
    match = next((m for m in matches if m.get("is_active")), matches[0])

    entry = {
        "taxon_id": match.get("id"),
        "iconic_taxon": match.get("iconic_taxon_name"),
        "fetched_at": now_iso(),
    }

    if match.get("is_active") is False:
        # Keep the taxon_id for the UI link (iNat's inactive-taxon page shows
        # the rename) but skip photo fields — we don't want to present photos
        # attached to deprecated taxonomy.
        entry["inactive_taxon"] = True
        return entry

    photo = match.get("default_photo") or {}
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


def _find_cc_photo(session, taxon_id):
    """Query /v1/taxa/<id> and return the first taxon_photo whose license is in
    USABLE_LICENSES. Returns a dict with the photo's url fields, or None if
    no usable photo was found."""
    url = f"{API_URL}/{taxon_id}"
    backoff = 2
    while True:
        resp = session.get(url, timeout=TIMEOUT_S)
        if resp.status_code == 429:
            if backoff > MAX_BACKOFF_S:
                return None
            time.sleep(backoff)
            backoff *= 2
            continue
        if resp.status_code >= 500:
            if backoff > MAX_BACKOFF_S:
                return None
            time.sleep(backoff)
            backoff *= 2
            continue
        resp.raise_for_status()
        break

    results = resp.json().get("results", [])
    if not results:
        return None
    for tp in results[0].get("taxon_photos", []):
        photo = tp.get("photo") or {}
        if photo.get("license_code") in USABLE_LICENSES:
            return photo
    return None


def fetch_one(session, scientific_name, override=None):
    """Fetch with two fallbacks: binomial retry for trinomial names, and
    taxon-photos lookup when iNat's default photo is all-rights-reserved.

    If `override` is supplied (from data/photo-overrides.json), the photo
    fields on the returned entry come from a second lookup using the
    override's inatQuery — but the species-level taxon_id is kept, so the
    "View on iNaturalist" link still points at the species page rather
    than the subspecies. The override is applied after the ARR fallback
    so it always wins for the photo, whatever the species-level default
    turned out to be.
    """
    entry = _fetch_exact(session, scientific_name)

    # Binomial fallback for subspecies-style trinomial queries that missed.
    if entry.get("not_found"):
        parts = scientific_name.split()
        if len(parts) > 2:
            time.sleep(REQUEST_DELAY_S)
            binomial = " ".join(parts[:2])
            fallback = _fetch_exact(session, binomial)
            if not fallback.get("not_found"):
                fallback["matched_as"] = binomial
                entry = fallback

    # Taxon-photos fallback when the default is present but all-rights-reserved.
    if (entry.get("photo_medium_url")
            and not entry.get("license_code")
            and entry.get("taxon_id")):
        time.sleep(REQUEST_DELAY_S)
        cc_photo = _find_cc_photo(session, entry["taxon_id"])
        if cc_photo is not None:
            entry["photo_square_url"] = cc_photo.get("square_url")
            entry["photo_small_url"] = cc_photo.get("small_url")
            entry["photo_medium_url"] = cc_photo.get("medium_url")
            entry["photo_large_url"] = cc_photo.get("large_url")
            entry["attribution"] = cc_photo.get("attribution")
            entry["license_code"] = cc_photo.get("license_code")
            entry["used_taxon_photos_fallback"] = True

    # Photo override — replace only the photo fields, keep species taxon_id.
    override_query = (override or {}).get("inatQuery")
    if override_query and not entry.get("not_found"):
        time.sleep(REQUEST_DELAY_S)
        override_entry = _fetch_exact(session, override_query, rank=None)
        override_photo_url = override_entry.get("photo_medium_url")
        override_license = override_entry.get("license_code")
        if override_photo_url and override_license in USABLE_LICENSES:
            entry["photo_square_url"] = override_entry.get("photo_square_url")
            entry["photo_small_url"] = override_entry.get("photo_small_url")
            entry["photo_medium_url"] = override_photo_url
            entry["photo_large_url"] = override_entry.get("photo_large_url")
            entry["attribution"] = override_entry.get("attribution")
            entry["license_code"] = override_license
            entry["photo_override_query"] = override_query
            # An ARR-fallback photo on the species is now irrelevant since
            # we've overwritten the photo fields with the subspecies pick.
            entry.pop("used_taxon_photos_fallback", None)

    return entry


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pilot", action="store_true", help="Stratified ~30-species sample")
    parser.add_argument("--limit", type=int, help="Process only the first N species")
    parser.add_argument("--refresh", action="store_true", help="Re-fetch cached entries")
    parser.add_argument("--refresh-arr", action="store_true",
                        help="Re-fetch only cached entries whose default photo is all-rights-reserved")
    parser.add_argument("--species", help="Fetch one species by scientific name")
    args = parser.parse_args()

    all_species = load_species()
    cache = load_cache()
    overrides = load_overrides()

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

    def _entry_is_arr(entry):
        return bool(entry) and bool(entry.get("photo_medium_url")) and not entry.get("license_code")

    def _override_out_of_date(name):
        """A species with a new/changed override should refetch even if
        cached — otherwise the user has to remember --refresh whenever
        they edit photo-overrides.json."""
        override = overrides.get(name)
        if not override or not override.get("inatQuery"):
            return False
        cached = cache.get(name) or {}
        return cached.get("photo_override_query") != override["inatQuery"]

    if args.refresh_arr:
        to_fetch = [
            s for s in targets
            if s.get("scientificName") and _entry_is_arr(cache.get(s["scientificName"]))
        ]
    else:
        to_fetch = [
            s for s in targets
            if s.get("scientificName")
            and (args.refresh
                 or s["scientificName"] not in cache
                 or _override_out_of_date(s["scientificName"]))
        ]
    skipped = len(targets) - len(to_fetch)

    print(f"🌿 Targets: {len(targets)}  to fetch: {len(to_fetch)}  cached (skipped): {skipped}")

    for i, species in enumerate(to_fetch, start=1):
        name = species["scientificName"]
        cls = species.get("class", "")
        try:
            entry = fetch_one(session, name, override=overrides.get(name))
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

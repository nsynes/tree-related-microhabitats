/**
 * URL codec for the species explorer's shareable links.
 *
 * Wire format:
 *   ?h=<comma-separated habitat shortCodes>
 *   &<groupId>=<comma-separated option codes>     (one param per speciesFilters group)
 *   &m=<scientific-name slug>
 *
 * Habitat codes share a single global namespace (one `h` param). Species
 * filter codes are namespaced per speciesFilters group, each emitted as its
 * own param keyed by group.id. Within each param, codes are sorted
 * alphabetically so identical state always produces an identical URL.
 *
 * shortCodes are authored in data/column-mapping.json and validated for
 * uniqueness + format by scripts/process-data.py. No code, group id, or
 * filter id is hardcoded here — everything is derived from `config`.
 *
 * Unknown codes are silently dropped at decode time so stale URLs degrade
 * gracefully (a renamed filter just drops out of the view; everything else
 * still applies).
 */

import { iterLevelFilters } from './dataHelpers';

// Wire-format constants. Single source of truth.
const HABITAT_PARAM = 'h';
const MODAL_PARAM = 'm';
const VALUE_SEPARATOR = ',';

/**
 * Build code↔id reverse maps for one config. Memoised by config reference;
 * the React data is immutable so identity check is sufficient.
 *
 * Returns:
 *   {
 *     habitat: { byCode: Map<code, id>, byId: Map<id, code> },
 *     groups:  Map<groupId, { byCode: Map, byId: Map }>,
 *   }
 */
const _mapsCache = new WeakMap();
export function buildCodecMaps(config) {
  if (!config) return null;
  const cached = _mapsCache.get(config);
  if (cached) return cached;

  const habitatByCode = new Map();
  const habitatById = new Map();
  for (const level of config.filterHierarchy || []) {
    for (const f of iterLevelFilters(level)) {
      if (!f.shortCode) continue;
      habitatByCode.set(f.shortCode, f.id);
      habitatById.set(f.id, f.shortCode);
    }
  }

  const groups = new Map();
  for (const group of config.speciesFilters || []) {
    const byCode = new Map();
    const byId = new Map();
    for (const opt of group.options || []) {
      const code = opt.shortCode || opt.id;
      byCode.set(code, opt.id);
      byId.set(opt.id, code);
    }
    groups.set(group.id, { byCode, byId });
  }

  const maps = { habitat: { byCode: habitatByCode, byId: habitatById }, groups };
  _mapsCache.set(config, maps);
  return maps;
}

/**
 * Lowercase, replace any run of non-alphanumerics with `-`, trim outer
 * hyphens. Stable for any species name we're likely to encounter
 * (binomials are Latin ASCII).
 */
export function slugifyScientificName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Encode current state to a search string (no leading `?`). Empty when
 * there's no state to share. Drops ids the maps don't know (defensive;
 * shouldn't happen at runtime since both sides read the same config).
 *
 * Built manually rather than via URLSearchParams so that the comma
 * separator survives unescaped — URLSearchParams.toString() encodes
 * commas as %2C, which is correct but ugly and longer. Our codes and
 * slugs are constrained to safe characters by build-time validation,
 * so no escaping is needed for them; the slug gets a defensive
 * encodeURIComponent for belt-and-braces.
 */
export function encodeStateToUrl({ filterIds, speciesFilters, modalSlug }, maps, config) {
  if (!maps) return '';
  const parts = [];

  // Habitat: collect codes for each id we recognise, then sort and emit.
  const habitatCodes = [];
  for (const id of filterIds || []) {
    const code = maps.habitat.byId.get(id);
    if (code) habitatCodes.push(code);
  }
  if (habitatCodes.length) {
    habitatCodes.sort();
    parts.push(`${HABITAT_PARAM}=${habitatCodes.join(VALUE_SEPARATOR)}`);
  }

  // Species filters: bucket composite ids by group, look up codes, emit one
  // param per group in config order so URLs are deterministic.
  if (speciesFilters && speciesFilters.size > 0 && config?.speciesFilters) {
    for (const group of config.speciesFilters) {
      const groupMaps = maps.groups.get(group.id);
      if (!groupMaps) continue;
      const prefix = `${group.id}:`;
      const codes = [];
      for (const composite of speciesFilters) {
        if (!composite.startsWith(prefix)) continue;
        const optId = composite.slice(prefix.length);
        const code = groupMaps.byId.get(optId);
        if (code) codes.push(code);
      }
      if (codes.length) {
        codes.sort();
        parts.push(`${group.id}=${codes.join(VALUE_SEPARATOR)}`);
      }
    }
  }

  if (modalSlug) parts.push(`${MODAL_PARAM}=${encodeURIComponent(modalSlug)}`);

  return parts.join('&');
}

/**
 * Parse URL params back to state. Unknown codes are dropped silently.
 * The modal slug is returned as a raw string — the caller is responsible
 * for resolving it to a species and applying the "passes filters" guard.
 */
export function decodeUrlToState(params, maps, config) {
  const filterIds = new Set();
  const speciesFilters = new Set();
  let modalSlug = null;

  if (!maps) return { filterIds, speciesFilters, modalSlug };

  const habitatRaw = params.get(HABITAT_PARAM);
  if (habitatRaw) {
    for (const code of habitatRaw.split(VALUE_SEPARATOR)) {
      const id = maps.habitat.byCode.get(code);
      if (id) filterIds.add(id);
    }
  }

  if (config?.speciesFilters) {
    for (const group of config.speciesFilters) {
      const raw = params.get(group.id);
      if (!raw) continue;
      const groupMaps = maps.groups.get(group.id);
      if (!groupMaps) continue;
      for (const code of raw.split(VALUE_SEPARATOR)) {
        const optId = groupMaps.byCode.get(code);
        if (optId) speciesFilters.add(`${group.id}:${optId}`);
      }
    }
  }

  const m = params.get(MODAL_PARAM);
  if (m) modalSlug = m;

  return { filterIds, speciesFilters, modalSlug };
}

/**
 * Prefix a search string from encodeStateToUrl with `?` when non-empty.
 * Caller pairs the result with location.pathname for the full URL.
 */
export function searchPrefix(search) {
  return search ? `?${search}` : '';
}
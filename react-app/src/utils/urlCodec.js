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
 * filter id is hardcoded here - everything is derived from `config`.
 *
 * Unknown codes are silently dropped at decode time so stale URLs degrade
 * gracefully (a renamed filter just drops out of the view; everything else
 * still applies).
 */

import { iterLevelFilters } from './dataHelpers';

// Wire-format constants. Single source of truth.
const HABITAT_PARAM = 'h';
const MODAL_PARAM = 'm';
const SORT_PARAM = 'sort';
const VALUE_SEPARATOR = ',';

/**
 * Whitelist of sort URL codes. `name` is the default sort and is
 * deliberately absent so the default view produces a clean URL. Unknown
 * codes at decode time fall through to the default too.
 */
const SORT_KEY_TO_CODE = {
  iucnSeverity: 'iucn',
  order: 'order',
};
const SORT_CODE_TO_KEY = new Map(
  Object.entries(SORT_KEY_TO_CODE).map(([key, code]) => [code, key])
);
const DEFAULT_SORT_KEY = 'name';

/**
 * Build code↔id reverse maps for one config. Memoised by config reference;
 * the React data is immutable so identity check is sufficient.
 *
 * Species-filter groups sharing a `sectionId` (or, absent that, a
 * `section` display string) collapse into a single URL param - so all
 * chips inside "Taxon designations" ride under one `tdi`
 * param rather than separate `priority` / `eif` / `iucn` params. Groups
 * with neither field fall back to their `id` (e.g. Taxa → `?class=…`),
 * so ungrouped groups keep their existing URL shape.
 *
 * Values stored in the section maps are composite ids of the form
 * `${groupId}:${optionId}` - that way the decoder can hand them back
 * directly to the store's `selectedSpeciesFilters` set without needing
 * to know which group each code came from.
 *
 * Returns:
 *   {
 *     habitat:  { byCode: Map<code, id>, byId: Map<id, code> },
 *     sections: Map<sectionKey, { byCode: Map<code, composite>,
 *                                 byId:   Map<composite, code> }>,
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

  const sections = new Map();
  for (const group of config.speciesFilters || []) {
    const sectionKey = group.sectionId || group.section || group.id;
    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, { byCode: new Map(), byId: new Map() });
    }
    const { byCode, byId } = sections.get(sectionKey);
    for (const opt of group.options || []) {
      const code = opt.shortCode || opt.id;
      const composite = `${group.id}:${opt.id}`;
      byCode.set(code, composite);
      byId.set(composite, code);
    }
  }

  const maps = { habitat: { byCode: habitatByCode, byId: habitatById }, sections };
  _mapsCache.set(config, maps);
  return maps;
}

/** Same fallback resolution as buildCodecMaps - kept in one place. */
function sectionKeyOf(group) {
  return group.sectionId || group.section || group.id;
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
 * separator survives unescaped - URLSearchParams.toString() encodes
 * commas as %2C, which is correct but ugly and longer. Our codes and
 * slugs are constrained to safe characters by build-time validation,
 * so no escaping is needed for them; the slug gets a defensive
 * encodeURIComponent for belt-and-braces.
 */
export function encodeStateToUrl({ filterIds, speciesFilters, modalSlug, sortKey }, maps, config) {
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

  // Species filters: one param per section in config order (deduping
  // groups that share a sectionKey so we don't emit `?tdi=…` three times).
  if (speciesFilters && speciesFilters.size > 0 && config?.speciesFilters) {
    const emittedSections = new Set();
    for (const group of config.speciesFilters) {
      const sectionKey = sectionKeyOf(group);
      if (emittedSections.has(sectionKey)) continue;
      emittedSections.add(sectionKey);
      const sectionMaps = maps.sections.get(sectionKey);
      if (!sectionMaps) continue;
      const codes = [];
      for (const composite of speciesFilters) {
        const code = sectionMaps.byId.get(composite);
        if (code) codes.push(code);
      }
      if (codes.length) {
        codes.sort();
        parts.push(`${sectionKey}=${codes.join(VALUE_SEPARATOR)}`);
      }
    }
  }

  // Sort: whitelist lookup drops the default automatically (name has no
  // entry in the map), so `?sort=…` only shows up when the reader has
  // deliberately picked a non-default order.
  const sortCode = SORT_KEY_TO_CODE[sortKey];
  if (sortCode) parts.push(`${SORT_PARAM}=${sortCode}`);

  if (modalSlug) parts.push(`${MODAL_PARAM}=${encodeURIComponent(modalSlug)}`);

  return parts.join('&');
}

/**
 * Parse URL params back to state. Unknown codes are dropped silently.
 * The modal slug is returned as a raw string - the caller is responsible
 * for resolving it to a species and applying the "passes filters" guard.
 */
export function decodeUrlToState(params, maps, config) {
  const filterIds = new Set();
  const speciesFilters = new Set();
  let modalSlug = null;
  let sortKey = DEFAULT_SORT_KEY;

  // Read sort before the early-return so URLs still round-trip sort even
  // when the codec has no maps (unlikely, but keeps the return shape
  // consistent).
  const sortRaw = params.get(SORT_PARAM);
  if (sortRaw) {
    const decoded = SORT_CODE_TO_KEY.get(sortRaw);
    if (decoded) sortKey = decoded;
  }

  if (!maps) return { filterIds, speciesFilters, modalSlug, sortKey };

  const habitatRaw = params.get(HABITAT_PARAM);
  if (habitatRaw) {
    for (const code of habitatRaw.split(VALUE_SEPARATOR)) {
      const id = maps.habitat.byCode.get(code);
      if (id) filterIds.add(id);
    }
  }

  if (config?.speciesFilters) {
    const readSections = new Set();
    for (const group of config.speciesFilters) {
      const sectionKey = sectionKeyOf(group);
      if (readSections.has(sectionKey)) continue;
      readSections.add(sectionKey);
      const raw = params.get(sectionKey);
      if (!raw) continue;
      const sectionMaps = maps.sections.get(sectionKey);
      if (!sectionMaps) continue;
      for (const code of raw.split(VALUE_SEPARATOR)) {
        const composite = sectionMaps.byCode.get(code);
        if (composite) speciesFilters.add(composite);
      }
    }
  }

  const m = params.get(MODAL_PARAM);
  if (m) modalSlug = m;

  return { filterIds, speciesFilters, modalSlug, sortKey };
}

/**
 * Prefix a search string from encodeStateToUrl with `?` when non-empty.
 * Caller pairs the result with location.pathname for the full URL.
 */
export function searchPrefix(search) {
  return search ? `?${search}` : '';
}
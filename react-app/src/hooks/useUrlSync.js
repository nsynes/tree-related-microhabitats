import { useEffect } from 'react';
import useFilterStore from '../store/useFilterStore';
import {
  buildCodecMaps,
  decodeUrlToState,
  encodeStateToUrl,
  searchPrefix,
} from '../utils/urlCodec';

/**
 * Two-way sync between the URL and the filter store.
 *
 * Subscribes once to the store (via zustand.subscribe, outside React's
 * render cycle) and writes the URL when filter state or modal state
 * changes. Reads the URL on mount and on browser back/forward (popstate)
 * and applies it to the store.
 *
 * Modal opens use history.pushState — the entry sits on the browser back
 * stack, so the Back button closes the modal. Filter changes use
 * history.replaceState, keeping the history flat (per filter click would
 * otherwise create a deep, useless back stack).
 *
 * Cycles are prevented two ways:
 *   - pushState / replaceState do not fire popstate, so writes can't
 *     trigger the URL→store path.
 *   - During initial mount we suppress writes until after the URL has
 *     been applied, so the in-flight intermediate state (filters set but
 *     speciesFilters not yet set, etc.) doesn't get persisted as the URL.
 */
export function useUrlSync(config) {
  useEffect(() => {
    if (!config) return;

    const maps = buildCodecMaps(config);
    const store = useFilterStore;

    // Apply URL → store. Suppress writes until done so the multi-step
    // setter sequence below doesn't write the URL three times.
    let suppressWrites = true;

    const applyUrlToStore = () => {
      const decoded = decodeUrlToState(
        new URLSearchParams(window.location.search),
        maps,
        config,
      );
      const s = store.getState();
      s.setSelectedFilterIds(decoded.filterIds);
      s.setSelectedSpeciesFilters(decoded.speciesFilters);
      // openSpeciesBySlug applies the "modal only opens if species passes
      // current filters" invariant. By this point filterSpecies has run
      // twice (once per setter above), so filteredSpecies is current.
      s.openSpeciesBySlug(decoded.modalSlug);
    };

    applyUrlToStore();
    let prevModalSlug = store.getState().selectedSpeciesSlug;
    let lastUrl = window.location.pathname + window.location.search;

    // Re-canonicalise: if the URL we just applied differed from what the
    // canonical encode would produce (stale codes dropped, ?m for an
    // excluded species cleared, etc.), rewrite it to the canonical form.
    {
      const search = encodeStateToUrl(
        {
          filterIds: store.getState().selectedFilterIds,
          speciesFilters: store.getState().selectedSpeciesFilters,
          modalSlug: store.getState().selectedSpeciesSlug,
        },
        maps,
        config,
      );
      const canonicalUrl = window.location.pathname + searchPrefix(search);
      if (canonicalUrl !== lastUrl) {
        window.history.replaceState(window.history.state, '', canonicalUrl);
        lastUrl = canonicalUrl;
      }
    }

    suppressWrites = false;

    // Store → URL. Subscribe to every state change; only act on the
    // slices we care about.
    const unsubscribe = store.subscribe((state, prev) => {
      if (suppressWrites) return;
      if (
        state.selectedFilterIds === prev.selectedFilterIds &&
        state.selectedSpeciesFilters === prev.selectedSpeciesFilters &&
        state.selectedSpeciesSlug === prev.selectedSpeciesSlug
      ) {
        return;
      }
      const search = encodeStateToUrl(
        {
          filterIds: state.selectedFilterIds,
          speciesFilters: state.selectedSpeciesFilters,
          modalSlug: state.selectedSpeciesSlug,
        },
        maps,
        config,
      );
      const newUrl = window.location.pathname + searchPrefix(search);
      if (newUrl === lastUrl) return;

      const modalOpening = !prevModalSlug && state.selectedSpeciesSlug;
      if (modalOpening) {
        window.history.pushState({ tremsModal: true }, '', newUrl);
      } else {
        window.history.replaceState(window.history.state, '', newUrl);
      }
      lastUrl = newUrl;
      prevModalSlug = state.selectedSpeciesSlug;
    });

    // URL → store on browser back/forward.
    const onPopstate = () => {
      suppressWrites = true;
      applyUrlToStore();
      prevModalSlug = store.getState().selectedSpeciesSlug;
      lastUrl = window.location.pathname + window.location.search;
      suppressWrites = false;
    };
    window.addEventListener('popstate', onPopstate);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', onPopstate);
    };
  }, [config]);
}
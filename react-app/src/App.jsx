import { useEffect, useState } from 'react';
import useFilterStore from './store/useFilterStore';
import FilterPanel from './components/FilterPanel';
import SpeciesGrid from './components/SpeciesGrid';
import Modal from './components/Modal';
import PanelTabs from './components/PanelTabs';
import { useUrlSync } from './hooks/useUrlSync';
import config from './data/config.json';
import speciesData from './data/species.json';

function App() {
  const [loading, setLoading] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // Mobile-only tab switcher. On desktop CSS hides the tab bar and shows
  // both panels side-by-side regardless of this value; on mobile the
  // active tab determines which panel is visible.
  const [activeTab, setActiveTab] = useState('habitats');
  const setSpecies = useFilterStore(state => state.setSpecies);
  const setConfig = useFilterStore(state => state.setConfig);

  useEffect(() => {
    // Hydrate the store with config + species on mount. Config informs the
    // store about hierarchy levels (it has no hardcoded knowledge of them).
    setConfig(config);
    setSpecies(speciesData);
    setLoading(false);
  }, [setConfig, setSpecies]);

  // Two-way sync between the URL and the store. Only kicks in once the
  // config has been applied so the codec has its code maps available.
  useUrlSync(loading ? null : config);

  if (loading) {
    return (
      <div className="loading">
        <p>🌳 Loading species data...</p>
      </div>
    );
  }

  return (
    <>
      <header className="main-title">
        <h1>{config.app.title}</h1>
        <div className="header-icons">
          <button
            className="icon-btn"
            onClick={() => setIsInfoOpen(true)}
            title="About"
            aria-label="About"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => setIsHelpOpen(true)}
            title="Help"
            aria-label="Help"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" />
              <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </header>
      
      <PanelTabs activeTab={activeTab} onChange={setActiveTab} />

      <main className={`app-layout app-layout--tab-${activeTab}`}>
        <FilterPanel config={config} />
        <SpeciesGrid config={config} />
      </main>

      {/* Info Modal */}
      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="About"
        size="large"
      >
        
        
        <h2>What are Tree-related Microhabitats (TreMs)?</h2>
        <img
          className="modal-image"
          src="/trems-overview-image.jpg"
          alt="Overview of tree-related microhabitat categories"
        />
        <p>
          Tree-related Microhabitats are small-scale structural features on trees that provide
          habitat for a wide range of species, including invertebrates, fungi, lichens, and birds.
        </p>
        <p>
          The Tree-related Microhabitats Species Explorer helps you discover which species 
          are associated with specific tree features and habitats.
        </p>
        
        <h2>Data Source</h2>
        <p>
          This application uses data from the Tree-related Microhabitats species database,
          which includes 635 priority species across multiple taxonomic groups.
        </p>
        <p>
          <a
            className="modal-download-link"
            href="/trems-species-data.xlsx"
            download="trems-species-data.xlsx"
          >
            Download the full spreadsheet (.xlsx)
          </a>
        </p>
        
        <h2>Contact and Credits</h2>
        <p>
          Researched and designed by <a target="_blank" rel="noopener noreferrer"
          href="https://www.forestresearch.gov.uk/staff/katty-baird/">Katty Baird</a>,
          developed by <a target="_blank" rel="noopener noreferrer"
          href="https://nicksynes.com">Nick Synes</a>.
        </p>
        
      </Modal>

      {/* Help Modal */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Help"
        size="large"
      >
        <h2>Tree-related Microhabitats</h2>
        <img
          className="modal-image"
          src="/trems-overview-image.jpg"
          alt="Overview of tree-related microhabitat categories"
        />
        <p>
          A Tree-related Microhabitat (TreM) is “<i>a morphological feature present on a tree,
          which is used by sometimes highly specialised species during at least part of their
          life cycle</i>” (
            <a target="_blank" rel="noopener noreferrer" href="https://infoscience.epfl.ch/handle/20.500.14299/242133">Butler et al 2024</a>
          ). TreMs are used as shelters, breeding sites or a
          source of food. Different species use different TreMs and therefore the greater the
          variety of TreM features on a tree, the greater the variety of species that can be
          expected to be supported.
        </p>

        <h2>How to use the tool</h2>
        <p>
          This tool aims to provide an indication of some of the species that could be expected
          to be using a tree, based on TreM features present. It is designed to be used in
          conjunction with surveys of TreMs described in the Field
          Guide to Tree-related Microhabitats (
            <a target="_blank" rel="noopener noreferrer" href="https://infoscience.epfl.ch/handle/20.500.14299/242133">Butler et al 2024</a>
          ).
        </p>
        <p>
          It refers to UK species, with a focus on rare, priority and specialist species. The
          output lists potential species that could be supported by the tree and
          should only be used as a guide. Many organisms have specific requirements within
          each microhabitat e.g. for tree species, humidity, fungal decay type, prey species
          as well as requirements for resources beyond the tree e.g. water or nectar. Some are
          also very restricted in range to just one or a few locations in the UK. This
          information is given, where known, in the descriptions for each species, and should
          be used to help interpret the outputs. However, where knowledge of the
          presence/absence of particular species is important, targeted field surveys are
          always recommended.
        </p>
        <p>
          Recognising the broad scope and complexity of associations, we welcome feedback from
          users on the species that have been included. Inaccuracies or omissions will be
          corrected in future versions.
        </p>
        
        <h3>Habitat Filters</h3>
          <h4>Region</h4>
          <p>
            A user can choose to filter on country (England, Wales or
            Scotland). Where species are only known from part of a country, this is denoted in
            the output by
            “(part)”. For some species, more details of distribution are given in the species
            description. Note that knowledge of species' distribution is often incomplete,
            particularly for less-well studied taxa, and as distributions are changing, for
            example in response to climate change, the literature sources used could be out of
            date.
          </p>
          <h4>Woodland and Tree Characteristics</h4>
          <p>
            A user can choose to consider species associated with closed canopy or open grown
            woodlands. Broadlead or conifer can also be
            selected to see species associated with one of these tree types.
          </p>
        
        <h3>Microhabitat Filters</h3>
        <p>
          The TreMs are grouped into the seven categories described by <a
          target="_blank" rel="noopener noreferrer" href="https://infoscience.epfl.ch/handle/20.500.14299/242133">
            Butler et al (2024)</a>:
          Cavities, Injuries, Crown deadwood, Excrescences, Epiphytic and epixylic structures,
          Fungal Fruiting bodies, Exudates. Selecting any of these categories will return all
          species associated with any of the TreMs within each.
        </p>
        <p>
          Individual TreMs can also be selected. Information on species'
          requirements for microhabitats in the literature does not always provide the same
          detail as in <a
          target="_blank" rel="noopener noreferrer" href="https://infoscience.epfl.ch/handle/20.500.14299/242133">
            Butler et al (2024)</a> descriptions, in which case pragmatic decisions were
          made e.g. both bark pocket and bark shelter microhabitats are used for species
          “found under loose bark” without consideration of the size of the bark piece needed;
          Hollow branch microhabitat needs to have a cavity entrance &gt;10cm to be included,
          therefore for birds, only species likely to nest in a cavity of this size are scored
          as associated with this TreM. 
        </p>

        <h3>Output</h3>
        <p>
          As different fields are selected, the species list is filtered accordingly. The
          species appear in the right hand panel. A user can toggle between a simple list and
          species cards. Species cards provide more information about the species. Selecting
          any of the species will show all of its associated attributes.
        </p>

        
      </Modal>
    </>
  );
}

export default App;
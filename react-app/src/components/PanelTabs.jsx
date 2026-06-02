/**
 * Two-button tab strip for swapping between the Habitat Features and
 * Associated Species panels on narrow viewports. Hidden by CSS at the
 * desktop breakpoint where both panels show side-by-side.
 */
function PanelTabs({ activeTab, onChange }) {
  return (
    <div className="panel-tabs" role="tablist" aria-label="Panel">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'habitats'}
        className={`panel-tab${activeTab === 'habitats' ? ' active' : ''}`}
        onClick={() => onChange('habitats')}
      >
        Habitat Features
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'species'}
        className={`panel-tab${activeTab === 'species' ? ' active' : ''}`}
        onClick={() => onChange('species')}
      >
        Associated Species
      </button>
    </div>
  );
}

export default PanelTabs;

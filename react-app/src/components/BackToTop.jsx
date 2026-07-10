import { useEffect, useState } from 'react';

/**
 * Floating "back to top" button, shown on mobile only.
 *
 * The app's tabs (Habitat Features / Associated Species) sit at the top
 * of the page on narrow viewports, so once a user has scrolled deep
 * into either panel they need a way to jump back and switch. Hidden
 * above the 1024 px breakpoint by CSS - desktop shows both panels
 * side-by-side, so there's nowhere to "return to".
 *
 * The button only appears once the user has scrolled past a threshold,
 * so it doesn't clutter the first fold.
 */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 15 12 9 18 15" />
      </svg>
    </button>
  );
}

export default BackToTop;
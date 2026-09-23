import React, { useEffect } from 'react';
import '../styles/modal.css';

/**
 * Reusable Modal Component
 * 
 * Features:
 * - Click outside to close
 * - Close button (X)
 * - Scrollable content
 * - Clean, professional styling matching forest theme
 */
function Modal({ isOpen, onClose, title, children, size = 'default' }) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent page scroll when modal is open. Locks both <html> and
  // <body> because on mobile they both have overflow:auto (see the
  // mobile block in theme.css); locking only <body> leaves <html>
  // scrollable, and touch drags fall through onto the page behind.
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content${size === 'large' ? ' modal-content--large' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
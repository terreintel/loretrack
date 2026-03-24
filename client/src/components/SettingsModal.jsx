/**
 * Bottom-sheet settings panel where field workers enter their name
 * and the supervisor's email address. Values persist in localStorage.
 */
export default function SettingsModal({ workerName, supervisorEmail, onSave, onClose }) {
  const [name, setName] = React.useState(workerName);
  const [email, setEmail] = React.useState(supervisorEmail);

  const handleSave = () => {
    onSave(name.trim(), email.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="workerName">Your Name</label>
          <input
            id="workerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Smith"
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="supervisorEmail">
            Supervisor Email <span className="required">*</span>
          </label>
          <input
            id="supervisorEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="supervisor@example.com"
            autoComplete="email"
            inputMode="email"
          />
          <p className="field-hint">Reports will be sent to this address after each recording.</p>
        </div>

        <div className="modal-footer">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!email.trim()}
          >
            Save Settings
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// React is needed in scope for JSX in this file
import React from 'react';

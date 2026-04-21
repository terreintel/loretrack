/**
 * Bottom-sheet modal showing the GBR engagement report
 * extracted from a Regional Engagement Lead's voice recording.
 */

const CONSENT_COLOURS = {
  'Consented':            '#1a7a4a',
  'In deliberation':      '#b45309',
  'Declined':             '#922B21',
  'Withdrawn':            '#922B21',
  'Initial contact made': '#1B3A4B',
  'Not yet approached':   '#6B6B6B',
};

export default function ReportModal({ report, onClose }) {
  if (!report) return null;

  const topics    = report.topicsDiscussed  ?? [];
  const followUp  = report.followUpActions  ?? [];
  const incidents = report.incidentsOrIssues ?? [];
  const consentColour = CONSENT_COLOURS[report.consentStatus] || '#1B3A4B';

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Engagement Report">
      <div className="modal report-modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Engagement Report</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close report">✕</button>
        </div>

        <div className="report-body">

          {/* Engagement details */}
          <div className="report-section">
            <h3>Engagement Details</h3>
            <dl>
              <dt>Regional Lead</dt>
              <dd>{report.workerName || '—'}</dd>
              <dt>Date</dt>
              <dd>{report.date || '—'}</dd>
              <dt>Region</dt>
              <dd>{report.region || '—'}</dd>
              <dt>TO Group</dt>
              <dd>{report.toGroup || '—'}</dd>
              <dt>Engagement Type</dt>
              <dd>{report.engagementType || '—'}</dd>
              <dt>Attendees</dt>
              <dd>{report.attendees || '—'}</dd>
            </dl>
          </div>

          {/* Topics discussed */}
          <div className="report-section">
            <h3>Topics Discussed</h3>
            {topics.length > 0 ? (
              <ul>{topics.map((t, i) => <li key={i}>{t}</li>)}</ul>
            ) : (
              <p className="muted">None reported</p>
            )}
          </div>

          {/* Consent status */}
          <div className="report-section">
            <h3>Consent Status</h3>
            {report.consentStatus ? (
              <span style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '14px',
                color: '#fff',
                background: consentColour,
                marginBottom: '8px'
              }}>
                {report.consentStatus}
              </span>
            ) : (
              <p className="muted">Not recorded</p>
            )}
            {report.consentNotes && (
              <p style={{ fontSize: '14px', color: '#444', marginTop: '8px' }}>
                {report.consentNotes}
              </p>
            )}
          </div>

          {/* Cultural protocol notes */}
          {report.culturalProtocolNotes && (
            <div className="report-section">
              <h3>Cultural Protocol Notes</h3>
              <div style={{
                background: '#FFF8E7',
                borderLeft: '4px solid #C9A96E',
                padding: '12px 14px',
                borderRadius: '0 8px 8px 0',
                fontSize: '14px'
              }}>
                {report.culturalProtocolNotes}
              </div>
            </div>
          )}

          {/* Follow-up actions */}
          <div className="report-section">
            <h3>Follow-Up Actions</h3>
            {followUp.length > 0 ? (
              <ul>{followUp.map((f, i) => <li key={i}>{f}</li>)}</ul>
            ) : (
              <p className="muted">None</p>
            )}
            {report.nextContact && (
              <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '10px' }}>
                📅 Next contact: <strong>{report.nextContact}</strong>
              </p>
            )}
          </div>

          {/* Incidents */}
          {incidents.length > 0 && (
            <div className="report-section">
              <h3>Incidents / Issues</h3>
              <ul className="incident-list">
                {incidents.map((inc, i) => <li key={i}>{inc}</li>)}
              </ul>
            </div>
          )}

          {/* Additional notes */}
          {report.additionalNotes && (
            <div className="report-section">
              <h3>Additional Notes</h3>
              <p>{report.additionalNotes}</p>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <p className="email-confirm">✓ Report emailed to supervisor</p>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>

      </div>
    </div>
  );
}
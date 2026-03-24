/**
 * Bottom-sheet modal showing the structured report extracted from a recording.
 */
export default function ReportModal({ report, onClose }) {
  if (!report) return null;

  const tasks = report.tasksCompleted ?? [];
  const incidents = report.incidentsOrIssues ?? [];
  const staff = report.staffSummary ?? {};

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Field Report">
      <div className="modal report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Field Report</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close report">
            ✕
          </button>
        </div>

        <div className="report-body">
          {/* Worker details */}
          <div className="report-section">
            <h3>Worker Details</h3>
            <dl>
              <dt>Name</dt>
              <dd>{report.workerName || '—'}</dd>
              <dt>Date</dt>
              <dd>{report.date || '—'}</dd>
              <dt>Hours Worked</dt>
              <dd>{report.hoursWorked || '—'}</dd>
            </dl>
          </div>

          {/* Tasks */}
          <div className="report-section">
            <h3>Tasks Completed</h3>
            {tasks.length > 0 ? (
              <ul>
                {tasks.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">None reported</p>
            )}
          </div>

          {/* Incidents */}
          <div className="report-section">
            <h3>Incidents / Issues</h3>
            {incidents.length > 0 ? (
              <ul className="incident-list">
                {incidents.map((inc, i) => (
                  <li key={i}>{inc}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">None</p>
            )}
          </div>

          {/* Staff summary (only shown if Claude extracted data) */}
          {(staff.totalHoursAllStaff ||
            staff.totalHoursIndigenousStaff ||
            staff.maleStaffCount != null ||
            staff.femaleStaffCount != null) && (
            <div className="report-section">
              <h3>Staff Summary</h3>
              <dl>
                {staff.totalHoursAllStaff && (
                  <>
                    <dt>Total Hours (All Staff)</dt>
                    <dd>{staff.totalHoursAllStaff}</dd>
                  </>
                )}
                {staff.totalHoursIndigenousStaff && (
                  <>
                    <dt>Total Hours (Indigenous Staff)</dt>
                    <dd>{staff.totalHoursIndigenousStaff}</dd>
                  </>
                )}
                {staff.maleStaffCount != null && (
                  <>
                    <dt>Male Staff Count</dt>
                    <dd>{staff.maleStaffCount}</dd>
                  </>
                )}
                {staff.femaleStaffCount != null && (
                  <>
                    <dt>Female Staff Count</dt>
                    <dd>{staff.femaleStaffCount}</dd>
                  </>
                )}
                {staff.otherNotes && (
                  <>
                    <dt>Notes</dt>
                    <dd>{staff.otherNotes}</dd>
                  </>
                )}
              </dl>
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
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

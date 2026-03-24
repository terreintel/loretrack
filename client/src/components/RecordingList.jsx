import { deleteRecording } from '../services/db.js';

const STATUS_ICON = {
  pending: '⏳',
  uploading: '⬆',
  done: '✓',
  error: '✗',
};

const STATUS_LABEL = {
  pending: 'Waiting to upload',
  uploading: 'Uploading…',
  done: 'Report sent',
  error: 'Upload failed',
};

function RecordingItem({ recording, onViewReport, onDelete }) {
  const date = new Date(recording.timestamp).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`recording-item status-${recording.status}`}>
      <div className="recording-meta">
        <span className="recording-status-icon" aria-label={STATUS_LABEL[recording.status]}>
          {STATUS_ICON[recording.status]}
        </span>
        <div className="recording-info">
          <div className="recording-name">
            {recording.workerName || 'Unnamed worker'}
          </div>
          <div className="recording-date">{date}</div>
          {recording.status === 'error' && (
            <div className="recording-error">{recording.error}</div>
          )}
        </div>
      </div>

      <div className="recording-actions">
        {recording.report && (
          <button
            className="btn-sm btn-view"
            onClick={() => onViewReport(recording.report)}
          >
            View Report
          </button>
        )}
        {(recording.status === 'done' || recording.status === 'error') && (
          <button
            className="btn-sm btn-delete"
            onClick={() => onDelete(recording.id)}
            aria-label="Delete recording"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function RecordingList({ recordings, onViewReport, onRefresh }) {
  if (recordings.length === 0) return null;

  const handleDelete = async (id) => {
    await deleteRecording(id);
    onRefresh();
  };

  return (
    <section className="recording-list">
      <h2 className="section-title">Recent Recordings</h2>
      {recordings.map((r) => (
        <RecordingItem
          key={r.id}
          recording={r}
          onViewReport={onViewReport}
          onDelete={handleDelete}
        />
      ))}
    </section>
  );
}

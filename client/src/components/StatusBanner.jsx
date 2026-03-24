/**
 * Online/offline indicator strip shown below the header.
 */
export default function StatusBanner({ isOnline, pendingCount }) {
  return (
    <div className={`status-banner ${isOnline ? 'online' : 'offline'}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>{isOnline ? 'Online' : 'Offline – recordings saved for later'}</span>
      {pendingCount > 0 && (
        <span className="pending-pill" aria-label={`${pendingCount} pending upload${pendingCount !== 1 ? 's' : ''}`}>
          {pendingCount} pending
        </span>
      )}
    </div>
  );
}

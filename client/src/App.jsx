import { useState, useEffect, useCallback } from 'react';
import RecordButton from './components/RecordButton.jsx';
import StatusBanner from './components/StatusBanner.jsx';
import RecordingList from './components/RecordingList.jsx';
import ReportModal from './components/ReportModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { startRecording, stopRecording } from './services/recorder.js';
import { saveRecording, getAllRecordings } from './services/db.js';
import { syncQueue } from './services/sync.js';

// ── Persisted settings ────────────────────────────────────────
function loadSetting(key, fallback = '') {
  return localStorage.getItem(key) ?? fallback;
}
function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [recordings, setRecordings] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [currentReport, setCurrentReport] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [workerName, setWorkerName] = useState(() => loadSetting('workerName'));
  const [supervisorEmail, setSupervisorEmail] = useState(() => loadSetting('supervisorEmail'));

  // ── Load recordings list ────────────────────────────────────
  const refreshRecordings = useCallback(async () => {
    const all = await getAllRecordings();
    setRecordings(all);
  }, []);

  useEffect(() => {
    refreshRecordings();
  }, [refreshRecordings]);

  // ── Online / offline sync ───────────────────────────────────
  const runSync = useCallback(async () => {
    setStatusMsg('Syncing pending recordings…');
    await syncQueue((progress) => {
      if (progress.type === 'done') {
        setCurrentReport(progress.report);
        refreshRecordings();
      }
      if (progress.type === 'error') {
        refreshRecordings();
      }
    });
    await refreshRecordings();
    setStatusMsg('');
  }, [refreshRecordings]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Attempt sync on initial load if online
    if (navigator.onLine) runSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runSync]);

  // ── Recording lifecycle ─────────────────────────────────────
  const handleStartRecording = async () => {
    try {
      await startRecording();
      setIsRecording(true);
      setStatusMsg('');
    } catch {
      setStatusMsg('Could not access microphone. Please allow microphone permission and try again.');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setStatusMsg('Saving recording…');

    try {
      const result = await stopRecording();
      if (!result) {
        setStatusMsg('');
        return;
      }

      await saveRecording({
        blob: result.blob,
        mimeType: result.mimeType,
        workerName,
        supervisorEmail,
      });

      await refreshRecordings();

      if (isOnline) {
        await runSync();
      } else {
        setStatusMsg('Saved offline. Will upload automatically when you reconnect.');
      }
    } catch (err) {
      setStatusMsg(`Error saving recording: ${err.message}`);
    }
  };

  // ── Settings ────────────────────────────────────────────────
  const handleSaveSettings = (name, email) => {
    setWorkerName(name);
    setSupervisorEmail(email);
    saveSetting('workerName', name);
    saveSetting('supervisorEmail', email);
    setShowSettings(false);
  };

  const pendingCount = recordings.filter((r) => r.status === 'pending').length;
  const isFirstRun = !supervisorEmail;

  return (
    <div className="app">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">🌿</span>
          <h1>LoreTrack</h1>
        </div>
        <button
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          aria-label="Open settings"
        >
          ⚙
        </button>
      </header>

      {/* ── Status banner ─────────────────────────────────────── */}
      <StatusBanner isOnline={isOnline} pendingCount={pendingCount} />

      {/* ── Processing status ─────────────────────────────────── */}
      {statusMsg && (
        <div className="status-msg" role="alert">
          {statusMsg}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="app-main">
        {/* Worker name display */}
        <div className="worker-greeting">
          {workerName ? (
            <p>
              Recording as <strong>{workerName}</strong>
            </p>
          ) : (
            <p className="hint-warn">
              Tap ⚙ to set your name and supervisor email
            </p>
          )}
        </div>

        {/* Big record button — central UI element */}
        <RecordButton
          isRecording={isRecording}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          disabled={isFirstRun}
        />

        {/* First-run prompt */}
        {isFirstRun && (
          <button className="setup-cta" onClick={() => setShowSettings(true)}>
            Set up LoreTrack →
          </button>
        )}

        {/* Recent recordings list */}
        <RecordingList
          recordings={recordings}
          onViewReport={setCurrentReport}
          onRefresh={refreshRecordings}
        />
      </main>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {currentReport && (
        <ReportModal report={currentReport} onClose={() => setCurrentReport(null)} />
      )}

      {showSettings && (
        <SettingsModal
          workerName={workerName}
          supervisorEmail={supervisorEmail}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

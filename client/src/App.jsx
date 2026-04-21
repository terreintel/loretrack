import { useState, useEffect, useCallback } from 'react';
import RecordButton from './components/RecordButton.jsx';
import StatusBanner from './components/StatusBanner.jsx';
import RecordingList from './components/RecordingList.jsx';
import ReportModal from './components/ReportModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Dashboard from './components/Dashboard.jsx';
import { startRecording, stopRecording } from './services/recorder.js';
import { saveRecording, getAllRecordings } from './services/db.js';
import { syncQueue } from './services/sync.js';

function loadSetting(key, fallback = '') {
  return localStorage.getItem(key) ?? fallback;
}
function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

export default function App() {
  const [isRecording, setIsRecording]       = useState(false);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);
  const [recordings, setRecordings]         = useState([]);
  const [statusMsg, setStatusMsg]           = useState('');
  const [currentReport, setCurrentReport]   = useState(null);
  const [showSettings, setShowSettings]     = useState(false);
  const [showDashboard, setShowDashboard]   = useState(false);
  const [workerName, setWorkerName]         = useState(() => loadSetting('workerName'));
  const [supervisorEmail, setSupervisorEmail] = useState(() => loadSetting('supervisorEmail'));

  const refreshRecordings = useCallback(async () => {
    const all = await getAllRecordings();
    setRecordings(all);
  }, []);

  useEffect(() => { refreshRecordings(); }, [refreshRecordings]);

  const runSync = useCallback(async () => {
    setStatusMsg('Syncing pending recordings…');
    await syncQueue((progress) => {
      if (progress.type === 'done') {
        setCurrentReport(progress.report);
        refreshRecordings();
      }
      if (progress.type === 'error') refreshRecordings();
    });
    await refreshRecordings();
    setStatusMsg('');
  }, [refreshRecordings]);

  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true); runSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) runSync();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runSync]);

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
      if (!result) { setStatusMsg(''); return; }
      await saveRecording({ blob: result.blob, mimeType: result.mimeType, workerName, supervisorEmail });
      await refreshRecordings();
      if (isOnline) await runSync();
      else setStatusMsg('Saved offline. Will upload automatically when you reconnect.');
    } catch (err) {
      setStatusMsg(`Error saving recording: ${err.message}`);
    }
  };

  const handleSaveSettings = (name, email) => {
    setWorkerName(name);
    setSupervisorEmail(email);
    saveSetting('workerName', name);
    saveSetting('supervisorEmail', email);
    setShowSettings(false);
  };

  const pendingCount = recordings.filter((r) => r.status === 'pending').length;
  const isFirstRun   = !supervisorEmail;

  if (showDashboard) {
    return <Dashboard onClose={() => setShowDashboard(false)} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">🌿</span>
          <h1>LoreTrack Wulgu</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="dashboard-btn"
            onClick={() => setShowDashboard(true)}
            aria-label="Open supervisor dashboard"
            title="Supervisor Dashboard"
          >
            📊
          </button>
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <StatusBanner isOnline={isOnline} pendingCount={pendingCount} />

      {statusMsg && (
        <div className="status-msg" role="alert">{statusMsg}</div>
      )}

      <main className="app-main">
        <div className="worker-greeting">
          {workerName ? (
            <p>Recording as <strong>{workerName}</strong></p>
          ) : (
            <p className="hint-warn">Tap ⚙ to set your name and supervisor email</p>
          )}
        </div>

        <RecordButton
          isRecording={isRecording}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          disabled={isFirstRun}
        />

        {isFirstRun && (
          <button className="setup-cta" onClick={() => setShowSettings(true)}>
            Set up LoreTrack Wulgu →
          </button>
        )}

        <RecordingList
          recordings={recordings}
          onViewReport={setCurrentReport}
          onRefresh={refreshRecordings}
        />
      </main>

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
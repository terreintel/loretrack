import { useState, useEffect, useRef } from 'react';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Large, accessible record button for field workers.
 * Props:
 *   isRecording  – boolean
 *   onStart      – () => void
 *   onStop       – () => void
 *   disabled     – boolean
 */
export default function RecordButton({ isRecording, onStart, onStop, disabled }) {
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const handleClick = () => {
    if (disabled) return;
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="record-wrapper">
      <button
        className={`record-btn${isRecording ? ' recording' : ''}${disabled ? ' disabled' : ''}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        aria-pressed={isRecording}
      >
        {/* Mic icon when idle, square stop icon when recording */}
        {isRecording ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="56" height="56">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="56" height="56">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 9a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V23h-2v-2.06A9 9 0 0 1 3 12h2z" />
          </svg>
        )}
      </button>

      <p className="record-label">
        {isRecording ? (
          <>
            <span className="recording-dot" aria-hidden="true" /> Recording…{' '}
            <span className="record-timer">{formatTime(duration)}</span>
          </>
        ) : disabled ? (
          'Set supervisor email in Settings first'
        ) : (
          'Tap to Record'
        )}
      </p>
    </div>
  );
}

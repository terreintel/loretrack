import { getPendingRecordings, updateRecordingStatus } from './db.js';

// In development, Vite proxies /api → https://loretrack-production-22db.up.railway.app
// In production (server serves client), /api is the same origin
// Override with VITE_API_URL env var if hosting separately
const API_BASE = import.meta.env.VITE_API_URL || '';

let isSyncing = false;

/**
 * Upload a single recording to the server.
 * @param {Object} recording - IndexedDB record
 * @returns {Promise<Object>} Parsed JSON response (transcript + report)
 */
export async function uploadRecording(recording) {
  const { blob, mimeType, workerName, supervisorEmail, timestamp } = recording;

  // Determine file extension for Groq's file type detection
  const ext = mimeType?.includes('webm')
    ? 'webm'
    : mimeType?.includes('mp4')
    ? 'mp4'
    : mimeType?.includes('ogg')
    ? 'ogg'
    : 'webm';

  const formData = new FormData();
  formData.append('audio', blob, `recording.${ext}`);
  formData.append('workerName', workerName || '');
  formData.append('supervisorEmail', supervisorEmail || '');
  formData.append('timestamp', String(timestamp));

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

/**
 * Flush all pending recordings in the IndexedDB queue.
 * Calls onProgress with status updates so the UI can react.
 *
 * @param {Function} onProgress - ({ type, id, report?, error? }) => void
 */
export async function syncQueue(onProgress) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const pending = await getPendingRecordings();

    for (const recording of pending) {
      try {
        await updateRecordingStatus(recording.id, 'uploading');
        onProgress?.({ type: 'uploading', id: recording.id });

        const result = await uploadRecording(recording);

        await updateRecordingStatus(recording.id, 'done', { report: result.report });
        onProgress?.({ type: 'done', id: recording.id, report: result.report });
      } catch (err) {
        const message = err.message || 'Unknown error';
        await updateRecordingStatus(recording.id, 'error', { error: message });
        onProgress?.({ type: 'error', id: recording.id, error: message });
      }
    }
  } finally {
    isSyncing = false;
  }
}

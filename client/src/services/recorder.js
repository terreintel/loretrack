/**
 * Wrapper around the browser MediaRecorder API.
 * Handles MIME type negotiation for cross-browser/cross-device support.
 */

let mediaRecorder = null;
let chunks = [];

// Prefer formats Groq Whisper supports well
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
];

function getSupportedMimeType() {
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

/**
 * Request microphone access and start recording.
 * @throws if microphone permission is denied.
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];

  const mimeType = getSupportedMimeType();
  const options = mimeType ? { mimeType } : {};

  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Collect data every second so we don't lose too much if the app is backgrounded
  mediaRecorder.start(1000);
}

/**
 * Stop the current recording and return the audio blob.
 * @returns {Promise<{blob: Blob, mimeType: string} | null>}
 */
export function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });

      // Release the microphone
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      chunks = [];

      resolve({ blob, mimeType });
    };

    mediaRecorder.stop();
  });
}

export function isCurrentlyRecording() {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}
